-- Batch 8-3b-1 (ADR-102): an approved vessel's own price with sightseeing, from the "from" price to the reservation.
-- A booking's cabins say their package ("package": "with_sightseeing" in each cabin of the cabins JSON); without it a
-- cabin is cruise only, so every existing caller is unchanged. Nilecruz's own programmes are 8-3b-2.

-- ── What a reservation bought ────────────────────────────────────────────────────────────────────────────────
alter table public.reservations add column package text not null default 'cruise'
  check (package in ('cruise', 'with_sightseeing'));
-- What the sightseeing included when booked (guide, tickets, sites), kept like the terms and the policy.
alter table public.reservations add column sightseeing jsonb;

-- Is this sailing sold with sightseeing by its vessel right now? Approved, and the itinerary says what's included.
create or replace function app.sells_sightseeing(d public.departures) returns boolean
language sql stable security definer set search_path = '' as $$
  select app.sightseeing_approved(d.vessel_id)
     and exists (select 1 from public.schedule_sightseeing s where s.schedule_id = d.schedule_id);
$$;
revoke execute on function app.sells_sightseeing(public.departures) from public, anon, authenticated;

-- The booking's package: every cabin the same.
create or replace function app.booking_package(cabins jsonb) returns text
language plpgsql immutable set search_path = '' as $$
declare
  pkgs text[] := array(select distinct coalesce(c ->> 'package', 'cruise') from jsonb_array_elements(cabins) c);
begin
  if cardinality(pkgs) > 1 then raise exception 'Book every cabin with the same package' using errcode = '22023'; end if;
  if pkgs[1] not in ('cruise', 'with_sightseeing') then raise exception 'Unknown package' using errcode = '22023'; end if;
  return coalesce(pkgs[1], 'cruise');
end $$;
revoke execute on function app.booking_package(jsonb) from public, anon, authenticated;

-- ── A cabin's price for a party, in a package ────────────────────────────────────────────────────────────────
drop function app.public_cabin_price(uuid, uuid, text, integer[]);
create function app.public_cabin_price(dep uuid, cab uuid, cur text, ages integer[], pkg text default 'cruise')
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
  if pkg = 'with_sightseeing' then
    if not app.sells_sightseeing((select d from public.departures d where d.id = dep)) then
      raise exception 'This sailing isn''t sold with sightseeing by its vessel' using errcode = '22023';
    end if;
    select r.amount_minor, r.child_bands, 'public' into rate, bands, t from public.sightseeing_rates r
    where r.departure_id = dep and r.cabin_type_id = cab and r.occupancy = occ and r.currency::text = cur and r.rate_plan = 'international';
  else
    select r.amount_minor, r.child_bands, 'public' into rate, bands, t from public.rates r
    where r.departure_id = dep and r.cabin_type_id = cab and r.occupancy = occ and r.currency::text = cur and r.rate_plan = 'international';
  end if;
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
revoke execute on function app.public_cabin_price(uuid, uuid, text, integer[], text) from public, anon, authenticated;

-- Same as 20261023000200, pricing each cabin in the booking's package.
create or replace function app.check_direct_booking(d public.departures, cur text, cabins jsonb, guests jsonb)
returns bigint
language plpgsql stable security definer set search_path = '' as $$
declare
  c jsonb;
  g jsonb;
  ages integer[];
  all_ages integer[] := '{}';
  guest_ages integer[] := '{}';
  priced record;
  total bigint := 0;
  pkg text;
begin
  if cur not in ('USD', 'EUR') then raise exception 'Bookings at the published rate are in US$ or €' using errcode = '22023'; end if;
  if jsonb_typeof(cabins) <> 'array' or jsonb_array_length(cabins) = 0 or jsonb_array_length(cabins) > 5 then
    raise exception 'Choose 1 to 5 cabins; for more, send a request for offers' using errcode = '22023';
  end if;
  pkg := app.booking_package(cabins);
  for c in select value from jsonb_array_elements(cabins) loop
    if not exists (select 1 from public.cabin_types ct where ct.id = (c ->> 'cabin_type_id')::uuid and ct.vessel_id = d.vessel_id and ct.active) then
      raise exception 'That cabin type isn''t on this ship' using errcode = '22023';
    end if;
    ages := array(select (x)::int from jsonb_array_elements_text(c -> 'ages') x);
    select * into priced from app.public_cabin_price(d.id, (c ->> 'cabin_type_id')::uuid, cur, ages, pkg);
    total := total + priced.amount_minor;
    all_ages := all_ages || ages;
  end loop;
  if jsonb_typeof(guests) <> 'array' or jsonb_array_length(guests) <> cardinality(all_ages) then
    raise exception 'Give the name and date of birth of all % guests', cardinality(all_ages) using errcode = '22023';
  end if;
  for g in select value from jsonb_array_elements(guests) loop
    if g ->> 'date_of_birth' is null or g ->> 'date_of_birth' !~ '^\d{4}-\d{2}-\d{2}$' or coalesce(length(trim(g ->> 'full_name')), 0) < 2 then
      raise exception 'Every guest needs a full name and a date of birth' using errcode = '22023';
    end if;
    guest_ages := guest_ages || extract(year from age(d.departs_on, (g ->> 'date_of_birth')::date))::int;
  end loop;
  if (select count(*) from unnest(guest_ages) x where x >= 18) <> (select count(*) from unnest(all_ages) x where x >= 18)
     or (select array_agg(x order by x) from unnest(guest_ages) x where x < 18) is distinct from
        (select array_agg(x order by x) from unnest(all_ages) x where x < 18) then
    raise exception 'The guests'' ages on the departure date don''t match the cabins' using errcode = '22023';
  end if;
  return total;
end $$;

-- Same as 20261023000500, plus the package: priced in it, and what the sightseeing included kept on the reservation.
create or replace function app.make_reservation(customer uuid, d public.departures, cur text, cabins jsonb, guests jsonb,
  by_operator boolean, already_taken boolean default false, out ref text, out res_id uuid)
language plpgsql security definer set search_path = '' as $$
declare
  v public.vessels;
  c jsonb;
  g jsonb;
  ages integer[];
  priced record;
  total bigint;
  taken jsonb;
  pol uuid;
  line integer := 0;
  pos integer := 0;
  cab public.cabin_types;
  pkg text := app.booking_package(cabins);
  incl jsonb;
begin
  total := app.check_direct_booking(d, cur, cabins, guests);
  select * into v from public.vessels where id = d.vessel_id;
  if pkg = 'with_sightseeing' then
    select jsonb_build_object('guide', s.guide, 'tickets_included', s.tickets_included, 'sites', to_jsonb(s.sites), 'note', s.note)
      into incl from public.schedule_sightseeing s where s.schedule_id = d.schedule_id;
  end if;
  taken := app.take_cabins(d, cabins, by_operator, already_taken);
  pol := app.policy_for_departure(d.id);
  if pol is null then raise exception 'This sailing has no cancellation policy yet' using errcode = '22023'; end if;
  ref := app.new_reference();
  insert into public.reservations (reference, offer_id, customer_id, org_id, vessel_id, departure_id, rate_plan, currency, total_minor,
    gratuity_usd_minor, terms, policy, direct, package, sightseeing)
  values (ref, null, customer, v.operator_org_id, v.id, d.id, 'international', cur::public.currency_code, total, v.gratuity_usd_minor,
    'Booked through Nilecruz, acting as booking agent for the operator of ' || v.name || ', at the published rate, '
      || 'from check-in on the first day to check-out on the last. '
      || case when pkg = 'with_sightseeing' then 'Sightseeing by the vessel is included as listed. ' else '' end
      || 'Transfers, flights and tours are not included unless stated. The cancellation policy below applies.',
    jsonb_build_object('bands', (select bands from public.cancellation_policies where id = pol),
      'terms', (select jsonb_object_agg(locale, terms) from public.cancellation_policy_translations where policy_id = pol)),
    true, pkg, incl)
  returning id into res_id;
  for c in select value from jsonb_array_elements(cabins) loop
    line := line + 1;
    ages := array(select (x)::int from jsonb_array_elements_text(c -> 'ages') x);
    select * into cab from public.cabin_types where id = (c ->> 'cabin_type_id')::uuid;
    select * into priced from app.public_cabin_price(d.id, cab.id, cur, ages, pkg);
    insert into public.reservation_cabins (reservation_id, line, cabin_type_id, deck, cabin_name, adults, child_ages, price_minor)
    values (res_id, line, cab.id, cab.deck, cab.name, (select count(*) from unnest(ages) a where a >= 18),
      array(select a from unnest(ages) a where a < 18 order by a)::smallint[], priced.amount_minor);
  end loop;
  perform app.stamp_allotment(res_id, taken);
  for g in select value from jsonb_array_elements(guests) loop
    pos := pos + 1;
    insert into public.passengers (reservation_id, position, full_name, date_of_birth, nationality)
    values (res_id, pos, trim(g ->> 'full_name'), (g ->> 'date_of_birth')::date,
      case when pos = 1 then nullif(upper(trim(g ->> 'nationality')), '') end);
  end loop;
  insert into public.notifications (org_id, kind, title, link)
  values (v.operator_org_id, 'reservation.new',
    'New booking ' || ref || ' at the published rate'
      || case when pkg = 'with_sightseeing' then ', with sightseeing' else '' end
      || case when taken <> '{}'::jsonb then ', from the Nilecruz allotment' else '' end,
    '/dashboard/operator/' || v.operator_org_id || '/bookings/' || res_id || '/');
  insert into public.notifications (user_id, kind, title, link)
  values (customer, 'reservation.new',
    case when by_operator then 'The operator confirmed your cabins: reservation ' || ref || ' is made. You can pay now.'
         else 'Reservation ' || ref || ' is made. Payment details follow.' end,
    '/dashboard/journey/reservations/' || res_id || '/');
end $$;

-- ── Prices a signed-in person sees: every departure and cabin, in a package ──────────────────────────────────
drop function public.vessel_departure_prices(uuid);
create function public.vessel_departure_prices(target uuid, pkg text default 'cruise')
returns table (departure_id uuid, schedule_id uuid, departs_on date, returns_on date, cabin_type_id uuid, currency text,
  single_minor bigint, double_minor bigint, triple_minor bigint, places_left integer, bookable boolean, booking_mode text)
language sql stable security definer set search_path = '' as $$
  with today as (select (now() at time zone 'Africa/Cairo')::date as d),
  priced as (
    select r.departure_id, r.cabin_type_id, r.currency, r.occupancy, r.amount_minor from public.rates r
    where pkg = 'cruise' and r.vessel_id = target and r.rate_plan = 'international'
    union all
    select r.departure_id, r.cabin_type_id, r.currency, r.occupancy, r.amount_minor from public.sightseeing_rates r
    join public.departures dd on dd.id = r.departure_id
    where pkg = 'with_sightseeing' and r.vessel_id = target and r.rate_plan = 'international' and app.sells_sightseeing(dd)
  )
  select de.id, de.schedule_id, de.departs_on, de.returns_on, c.id, r.currency::text,
    max(r.amount_minor) filter (where r.occupancy = 1),
    max(r.amount_minor) filter (where r.occupancy = 2),
    max(r.amount_minor) filter (where r.occupancy = 3),
    -- Places left only from an allotment or instant data (never manual or sheet counts).
    case when app.cabin_mode(de.id, c.id) = 'instant' then app.instant_left(de.id, c.id) end,
    public.departure_bookable(de.id),
    app.cabin_mode(de.id, c.id)
  from public.departures de
  cross join today
  join public.vessels v on v.id = de.vessel_id and v.visibility = 'published'
  join public.cabin_types c on c.vessel_id = v.id and c.active
  join priced r on r.departure_id = de.id and r.cabin_type_id = c.id
  where auth.uid() is not null and v.id = target and de.status = 'scheduled'
    and de.departs_on > today.d and de.departs_on <= today.d + 365
  group by de.id, de.schedule_id, de.departs_on, de.returns_on, c.id, r.currency
  order by de.departs_on, c.id;
$$;
revoke execute on function public.vessel_departure_prices(uuid, text) from public, anon;
grant execute on function public.vessel_departure_prices(uuid, text) to authenticated, service_role;

drop function public.public_party_price(uuid, uuid, text, integer[]);
create function public.public_party_price(dep uuid, cab uuid, cur text, ages integer[], pkg text default 'cruise') returns bigint
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Sign in to see prices' using errcode = '42501'; end if;
  if not exists (select 1 from public.departures d join public.vessels v on v.id = d.vessel_id and v.visibility = 'published'
                 where d.id = dep) then
    raise exception 'Departure not found' using errcode = 'P0002';
  end if;
  return (select amount_minor from app.public_cabin_price(dep, cab, cur, ages, pkg));
end $$;
revoke execute on function public.public_party_price(uuid, uuid, text, integer[], text) from public, anon;
grant execute on function public.public_party_price(uuid, uuid, text, integer[], text) to authenticated;

-- ── The public "from" prices: cruise only, and with the vessel's own sightseeing where it sells it ───────────
drop function public.public_vessel_prices();
create function public.public_vessel_prices()
returns table (vessel_id uuid, amount_minor bigint, currency text, bookable boolean,
  sightseeing_amount_minor bigint, sightseeing_currency text)
language sql stable security definer set search_path = '' as $$
  with today as (select (now() at time zone 'Africa/Cairo')::date as d),
  ok as (
    select de.id, de.vessel_id, de.schedule_id
    from public.departures de
    join public.vessels v on v.id = de.vessel_id and v.visibility = 'published'
    cross join today
    where de.departs_on > today.d and de.departs_on <= today.d + 365
      and public.departure_bookable(de.id)
  ),
  priced as (
    select ok.vessel_id, r.amount_minor, r.currency::text as cur
    from ok
    join public.rates r on r.departure_id = ok.id and r.rate_plan = 'international' and r.occupancy = 2
    join public.cabin_types c on c.id = r.cabin_type_id and c.active
    join public.inventory i on i.departure_id = ok.id and i.cabin_type_id = c.id and i.available > 0
      and app.inventory_is_fresh(i.confirmed_at, i.source)
  ),
  with_sightseeing as (
    select ok.vessel_id, r.amount_minor, r.currency::text as cur
    from ok
    join public.departures dd on dd.id = ok.id
    join public.sightseeing_rates r on r.departure_id = ok.id and r.rate_plan = 'international' and r.occupancy = 2
    join public.cabin_types c on c.id = r.cabin_type_id and c.active
    join public.inventory i on i.departure_id = ok.id and i.cabin_type_id = c.id and i.available > 0
      and app.inventory_is_fresh(i.confirmed_at, i.source)
    where app.sells_sightseeing(dd)
  )
  select v.id, p.amount_minor, p.cur, exists (select 1 from ok where ok.vessel_id = v.id), s.amount_minor, s.cur
  from public.vessels v
  left join lateral (
    select priced.amount_minor, priced.cur from priced where priced.vessel_id = v.id
    order by case priced.cur when 'USD' then 0 when 'EUR' then 1 else 2 end, priced.amount_minor
    limit 1
  ) p on true
  left join lateral (
    select w.amount_minor, w.cur from with_sightseeing w where w.vessel_id = v.id
    order by case w.cur when 'USD' then 0 when 'EUR' then 1 else 2 end, w.amount_minor
    limit 1
  ) s on true
  where v.visibility in ('published', 'showcase');
$$;
revoke execute on function public.public_vessel_prices() from public;
grant execute on function public.public_vessel_prices() to anon, authenticated, service_role;
