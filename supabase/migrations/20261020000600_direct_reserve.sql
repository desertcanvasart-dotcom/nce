-- Batch 5-2: the vessel page books (DATA-033, DASH-PUB-008, 009, DASH-CUS-016, ADR-093).
-- Signed-in customers see every cabin's price for every departure at the published (international) rate, with places
-- left from confirmed inventory, and reserve directly, the same way a travel partner does (4h-2a). A direct booking has
-- no offer and no buying company, so reservations gain `direct`.

alter table public.reservations add column direct boolean not null default false;
alter table public.reservations drop constraint offer_or_buyer;
alter table public.reservations add constraint has_source check (offer_id is not null or buyer_org_id is not null or direct);

-- One cabin's price for a party at the published international rate (mirrors linePrice; partner_cabin_price adds tiers).
create or replace function app.public_cabin_price(dep uuid, cab uuid, cur text, ages integer[])
returns table (amount_minor bigint, tier text)
language plpgsql stable security definer set search_path = '' as $$
declare
  occ integer := (select count(*) from unnest(ages) a where a >= 3);
  maxocc integer;
  rate bigint;
  bands jsonb;
  t text;
  total bigint := 0;
  a integer;
  pct numeric;
begin
  select max_occupancy into maxocc from public.cabin_types where id = cab;
  if not exists (select 1 from unnest(ages) x where x >= 12) then raise exception 'A cabin needs at least one adult' using errcode = '22023'; end if;
  if occ > maxocc then raise exception 'This cabin sleeps %; infants under 3 don''t count', maxocc using errcode = '22023'; end if;
  select r.amount_minor, r.child_bands, 'public' into rate, bands, t from public.rates r
  where r.departure_id = dep and r.cabin_type_id = cab and r.occupancy = occ and r.currency::text = cur and r.rate_plan = 'international';
  if rate is null then raise exception 'There is no % rate for % guests in this cabin', cur, occ using errcode = '22023'; end if;
  foreach a in array ages loop
    if a >= 18 then
      total := total + rate;
    else
      select (b ->> 'percent')::numeric into pct from jsonb_array_elements(bands) b
      where (b ->> 'from')::int <= a and ((b ->> 'to') is null or a < (b ->> 'to')::int) limit 1;
      total := total + floor(rate * coalesce(pct, 100) / 100.0 + 0.5);
    end if;
  end loop;
  amount_minor := total;
  tier := t;
  return next;
end $$;
revoke execute on function app.public_cabin_price(uuid, uuid, text, integer[]) from public, anon, authenticated;

-- ── Prices after sign-in (DATA-033, DASH-PUB-008): every cabin type and departure, for a signed-in person only ──
-- Per person for one, two and three sharing; places left only from confirmed inventory (BRAND-003); bookable as the
-- booking itself would decide. Never the trade, company or local rates.
create or replace function public.vessel_departure_prices(target uuid)
returns table (departure_id uuid, schedule_id uuid, departs_on date, returns_on date, cabin_type_id uuid, currency text,
  single_minor bigint, double_minor bigint, triple_minor bigint, places_left integer, bookable boolean)
language sql stable security definer set search_path = '' as $$
  with today as (select (now() at time zone 'Africa/Cairo')::date as d)
  select de.id, de.schedule_id, de.departs_on, de.returns_on, c.id, r.currency::text,
    max(r.amount_minor) filter (where r.occupancy = 1),
    max(r.amount_minor) filter (where r.occupancy = 2),
    max(r.amount_minor) filter (where r.occupancy = 3),
    max(i.available) filter (where app.inventory_is_fresh(i.confirmed_at, i.source)),
    public.departure_bookable(de.id)
  from public.departures de
  cross join today
  join public.vessels v on v.id = de.vessel_id and v.visibility = 'published'
  join public.cabin_types c on c.vessel_id = v.id and c.active
  join public.rates r on r.departure_id = de.id and r.cabin_type_id = c.id and r.rate_plan = 'international'
  left join public.inventory i on i.departure_id = de.id and i.cabin_type_id = c.id
  where auth.uid() is not null and v.id = target and de.status = 'scheduled'
    and de.departs_on > today.d and de.departs_on <= today.d + 365
  group by de.id, de.schedule_id, de.departs_on, de.returns_on, c.id, r.currency
  order by de.departs_on, c.id;
$$;
revoke execute on function public.vessel_departure_prices(uuid) from public, anon;
grant execute on function public.vessel_departure_prices(uuid) to authenticated, service_role;

-- ── Reserve at the published rate (DASH-PUB-009): signed in, 1–5 cabins, every guest named ────────────────────
-- cabins: [{"cabin_type_id": …, "ages": [40, 38]}]; guests: [{"full_name", "date_of_birth", "nationality"?}], lead first.
create or replace function public.customer_reserve(dep uuid, cur text, cabins jsonb, guests jsonb, terms_read boolean)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  d public.departures;
  v public.vessels;
  c jsonb;
  g jsonb;
  ages integer[];
  all_ages integer[] := '{}';
  guest_ages integer[] := '{}';
  priced record;
  total bigint := 0;
  need record;
  inv public.inventory;
  pol uuid;
  ref text;
  res_id uuid;
  line integer := 0;
  pos integer := 0;
  cab public.cabin_types;
begin
  if auth.uid() is null then raise exception 'Sign in to reserve' using errcode = '42501'; end if;
  if not coalesce(terms_read, false) then raise exception 'Read and accept the terms first' using errcode = '22023'; end if;
  select * into d from public.departures where id = dep;
  if d.id is null or not public.departure_bookable(d.id) then
    raise exception 'This sailing has no cabins left or can''t be booked right now. Nothing was booked.' using errcode = '22023';
  end if;
  if cur not in ('USD', 'EUR') then raise exception 'Bookings at the published rate are in US$ or €' using errcode = '22023'; end if;
  if jsonb_typeof(cabins) <> 'array' or jsonb_array_length(cabins) = 0 or jsonb_array_length(cabins) > 5 then
    raise exception 'Choose 1 to 5 cabins; for more, send a request for offers' using errcode = '22023';
  end if;
  select * into v from public.vessels where id = d.vessel_id;

  -- Price each cabin at the published international rate, and collect every guest's age.
  for c in select value from jsonb_array_elements(cabins) loop
    ages := array(select (x)::int from jsonb_array_elements_text(c -> 'ages') x);
    select * into priced from app.public_cabin_price(dep, (c ->> 'cabin_type_id')::uuid, cur, ages);
    total := total + priced.amount_minor;
    all_ages := all_ages || ages;
  end loop;

  -- Every guest named; their ages on the departure date match the cabins (DATA-020).
  if jsonb_typeof(guests) <> 'array' or jsonb_array_length(guests) <> cardinality(all_ages) then
    raise exception 'Give the name and date of birth of all % guests', cardinality(all_ages) using errcode = '22023';
  end if;
  for g in select value from jsonb_array_elements(guests) loop
    if g ->> 'date_of_birth' is null or g ->> 'date_of_birth' !~ '^\d{4}-\d{2}-\d{2}$' or coalesce(length(trim(g ->> 'full_name')), 0) < 2 then
      raise exception 'Every guest needs a full name and a date of birth' using errcode = '22023';
    end if;
    guest_ages := guest_ages || extract(year from age(d.departs_on, (g ->> 'date_of_birth')::date))::int;
  end loop;
  -- Adults (18 and over) match by number; children by their exact ages, as with offers.
  if (select count(*) from unnest(guest_ages) x where x >= 18) <> (select count(*) from unnest(all_ages) x where x >= 18)
     or (select array_agg(x order by x) from unnest(guest_ages) x where x < 18) is distinct from
        (select array_agg(x order by x) from unnest(all_ages) x where x < 18) then
    raise exception 'The guests'' ages on the departure date don''t match the cabins' using errcode = '22023';
  end if;

  -- Take the cabins: one inventory row per cabin type, locked in a fixed order.
  for need in
    select (x ->> 'cabin_type_id')::uuid as cabin_type_id, count(*)::int as n from jsonb_array_elements(cabins) x
    group by 1 order by 1
  loop
    select * into inv from public.inventory where departure_id = d.id and cabin_type_id = need.cabin_type_id for update;
    if inv.departure_id is null or inv.available < need.n then
      raise exception 'Not enough cabins left. Nothing was booked.' using errcode = '23514';
    end if;
    if not app.inventory_is_fresh(inv.confirmed_at, inv.source) then
      raise exception 'Availability for this sailing is being confirmed. Try again shortly.' using errcode = '22023';
    end if;
    update public.inventory set available = available - need.n where departure_id = d.id and cabin_type_id = need.cabin_type_id;
  end loop;

  pol := app.policy_for_departure(d.id);
  ref := app.new_reference();
  insert into public.reservations (reference, offer_id, customer_id, org_id, vessel_id, departure_id, rate_plan, currency, total_minor,
    gratuity_usd_minor, terms, policy, direct)
  values (ref, null, auth.uid(), v.operator_org_id, v.id, d.id, 'international', cur::public.currency_code, total, v.gratuity_usd_minor,
    'Booked on Nilecruz at the published rate for ' || v.name || ', from check-in on the first day to check-out on the last. '
      || 'Transfers, flights and tours are not included unless stated. The cancellation policy below applies.',
    jsonb_build_object('bands', (select bands from public.cancellation_policies where id = pol),
      'terms', (select jsonb_object_agg(locale, terms) from public.cancellation_policy_translations where policy_id = pol)),
    true)
  returning id into res_id;
  for c in select value from jsonb_array_elements(cabins) loop
    line := line + 1;
    ages := array(select (x)::int from jsonb_array_elements_text(c -> 'ages') x);
    select * into cab from public.cabin_types where id = (c ->> 'cabin_type_id')::uuid;
    select * into priced from app.public_cabin_price(dep, cab.id, cur, ages);
    insert into public.reservation_cabins (reservation_id, line, cabin_type_id, deck, cabin_name, adults, child_ages, price_minor)
    values (res_id, line, cab.id, cab.deck, cab.name, (select count(*) from unnest(ages) a where a >= 18),
      array(select a from unnest(ages) a where a < 18 order by a)::smallint[], priced.amount_minor);
  end loop;
  for g in select value from jsonb_array_elements(guests) loop
    pos := pos + 1;
    insert into public.passengers (reservation_id, position, full_name, date_of_birth, nationality)
    values (res_id, pos, trim(g ->> 'full_name'), (g ->> 'date_of_birth')::date,
      case when pos = 1 then nullif(upper(trim(g ->> 'nationality')), '') end);
  end loop;
  insert into public.notifications (org_id, kind, title, link)
  values (v.operator_org_id, 'reservation.new', 'New booking ' || ref || ' at the published rate',
    '/dashboard/operator/' || v.operator_org_id || '/bookings/' || res_id || '/');
  insert into public.notifications (user_id, kind, title, link)
  values (auth.uid(), 'reservation.new', 'Reservation ' || ref || ' is made. Payment details follow.', '/dashboard/journey/reservations/' || res_id || '/');
  return ref;
end $$;
revoke execute on function public.customer_reserve(uuid, text, jsonb, jsonb, boolean) from public, anon;
grant execute on function public.customer_reserve(uuid, text, jsonb, jsonb, boolean) to authenticated;

-- The quote before reserving: one cabin's price for the party, exactly as customer_reserve will charge it.
create or replace function public.public_party_price(dep uuid, cab uuid, cur text, ages integer[]) returns bigint
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Sign in to see prices' using errcode = '42501'; end if;
  if not exists (select 1 from public.departures d join public.vessels v on v.id = d.vessel_id and v.visibility = 'published'
                 where d.id = dep) then
    raise exception 'Departure not found' using errcode = 'P0002';
  end if;
  return (select amount_minor from app.public_cabin_price(dep, cab, cur, ages));
end $$;
revoke execute on function public.public_party_price(uuid, uuid, text, integer[]) from public, anon;
grant execute on function public.public_party_price(uuid, uuid, text, integer[]) to authenticated;
