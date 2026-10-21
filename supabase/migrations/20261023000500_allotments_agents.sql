-- Operator loop follow-up (ADR-100; Faris, 21 Oct: "apply the new rule for travel agents as well; add allotments").
--
-- Allotments: cabins an operator contracts to Nilecruz, per sailing, for a cabin type over a range of departure dates,
-- until a release period before each departure (14 days by default). Until then they book instantly, for customers
-- and travel partners, whatever the age of the operator's other data. Bookings count against the allotment (not the
-- operator's availability figure); a cancelled booking gives the cabin back; after the release date unsold allotment
-- cabins simply stop counting. Nilecruz admins enter them; the operator reads them.
--
-- Travel partners: the reservable rule of Part C now applies to them too. Instant from an allotment, or from feed, API
-- or an operator's answer within 2 hours; manual or sheet data within 7 days becomes a booking request in the agency's
-- name, at its own rate, which the operator confirms before the agency pays.

-- ── Allotments ───────────────────────────────────────────────────────────────────────────────────────────────
create table public.allotments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations (id) on delete cascade,
  vessel_id uuid not null references public.vessels (id) on delete cascade,
  cabin_type_id uuid not null references public.cabin_types (id) on delete cascade,
  -- Departures from this date to this date (inclusive) carry the allotment.
  starts_on date not null,
  ends_on date not null,
  -- Cabins per sailing.
  cabins smallint not null check (cabins between 1 and 100),
  -- Unsold allotment cabins go back to the operator this many days before departure.
  release_days smallint not null default 14 check (release_days between 0 and 120),
  contract_ref text check (length(contract_ref) <= 120),
  notes text check (length(notes) <= 1000),
  active boolean not null default true,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on >= starts_on and ends_on <= starts_on + 731)
);
create index allotments_cover_idx on public.allotments (vessel_id, cabin_type_id, starts_on, ends_on) where active;
create index allotments_org_idx on public.allotments (org_id);
create trigger allotments_updated_at before update on public.allotments for each row execute function app.set_updated_at();

create or replace function app.check_allotment() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.vessels v where v.id = new.vessel_id and v.operator_org_id = new.org_id) then
    raise exception 'The ship isn''t this operator''s' using errcode = '23514';
  end if;
  if not exists (select 1 from public.cabin_types c where c.id = new.cabin_type_id and c.vessel_id = new.vessel_id) then
    raise exception 'The cabin type isn''t on this ship' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger allotments_check before insert or update on public.allotments for each row execute function app.check_allotment();

-- Which booked cabins came from an allotment.
alter table public.reservation_cabins add column allotment_id uuid references public.allotments (id) on delete set null;
create index reservation_cabins_allotment_idx on public.reservation_cabins (allotment_id) where allotment_id is not null;

-- Cabins still in allotments on a sailing for a cabin type: the active allotments that cover it and aren't released,
-- less the cabins already booked from them (any booking not cancelled).
create or replace function app.allotment_left(dep uuid, cab uuid) returns integer
language sql stable security definer set search_path = '' as $$
  with d as (select departs_on, vessel_id from public.departures where id = dep)
  select greatest(
    coalesce((select sum(a.cabins) from public.allotments a, d
              where a.active and a.vessel_id = d.vessel_id and a.cabin_type_id = cab and d.departs_on between a.starts_on and a.ends_on
                and d.departs_on - a.release_days > (now() at time zone 'Africa/Cairo')::date), 0)
    - (select count(*) from public.reservation_cabins rc join public.reservations r on r.id = rc.reservation_id
       where r.departure_id = dep and rc.cabin_type_id = cab and rc.allotment_id is not null and r.status <> 'cancelled'),
    0)::int;
$$;

-- The allotment to book from (the one released last, so earlier ones are used up first is not needed: one is enough).
create or replace function app.allotment_for(dep uuid, cab uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select a.id from public.allotments a join public.departures d on d.id = dep
  where a.active and a.vessel_id = d.vessel_id and a.cabin_type_id = cab and d.departs_on between a.starts_on and a.ends_on
    and d.departs_on - a.release_days > (now() at time zone 'Africa/Cairo')::date
  order by a.release_days, a.created_at limit 1;
$$;

-- Cabins bookable instantly on a sailing for a cabin type: allotment, plus instant data (feed, API or tap ≤ 2 hours).
create or replace function app.instant_left(dep uuid, cab uuid) returns integer
language sql stable security definer set search_path = '' as $$
  select app.allotment_left(dep, cab) + coalesce((
    select i.available from public.inventory i
    where i.departure_id = dep and i.cabin_type_id = cab and app.inventory_instant(i.confirmed_at, i.source)), 0);
$$;

-- Not enough instant cabins for any cabin type asked for: the booking must go through a request.
create or replace function app.instant_short(dep uuid, cabins jsonb) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from (select (c ->> 'cabin_type_id')::uuid cab, count(*)::int n from jsonb_array_elements(cabins) c group by 1) x
    where app.instant_left(dep, x.cab) < x.n
  );
$$;

-- A cabin's booking mode with allotments: instant whenever an allotment has a cabin left.
create or replace function app.cabin_mode(dep uuid, cab uuid) returns text
language sql stable security definer set search_path = '' as $$
  select case when app.allotment_left(dep, cab) > 0 then 'instant'
    else coalesce((select app.booking_mode(i) from public.inventory i where i.departure_id = dep and i.cabin_type_id = cab), 'unconfirmed') end;
$$;

-- Bookable or requestable: as before, or with an allotment cabin left.
create or replace function public.departure_bookable(dep uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.departures d
    join public.vessels v on v.id = d.vessel_id and v.visibility = 'published'
    join public.organisations o on o.id = v.operator_org_id and o.status = 'approved'
    where d.id = dep and d.status = 'scheduled' and d.departs_on > (now() at time zone 'Africa/Cairo')::date
      and app.policy_for_departure(d.id) is not null
      and exists (
        select 1 from public.cabin_types c
        left join public.inventory i on i.departure_id = d.id and i.cabin_type_id = c.id
        where c.vessel_id = d.vessel_id and c.active
          and ((i.available > 0 and app.inventory_is_fresh(i.confirmed_at, i.source)) or app.allotment_left(d.id, c.id) > 0)
          and exists (select 1 from public.rates r where r.departure_id = d.id and r.cabin_type_id = c.id)
      )
  );
$$;

-- ── Taking cabins, shared by every booking path ──────────────────────────────────────────────────────────────
-- Returns, per cabin type, how many cabins came from which allotment: {"<cabin type>": {"allotment": id, "n": k}}.
-- Direct bookings (customers and partners): allotment first, the rest from fresh availability, which is reduced.
-- A booking the operator confirmed: through `tap` (the operator has just said they exist), unless a hold took them.
create or replace function app.take_cabins(d public.departures, cabins jsonb, by_operator boolean, already_taken boolean)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  need record;
  inv public.inventory;
  k integer;
  rest integer;
  taken jsonb := '{}'::jsonb;
begin
  for need in
    select (x ->> 'cabin_type_id')::uuid as cab, count(*)::int as n from jsonb_array_elements(cabins) x group by 1 order by 1
  loop
    -- One booking at a time per sailing and cabin type, so two can't share the last allotment cabin.
    perform pg_advisory_xact_lock(hashtextextended('allotment@' || d.id::text || '@' || need.cab::text, 0));
    select * into inv from public.inventory where departure_id = d.id and cabin_type_id = need.cab for update;
    if by_operator then
      if not already_taken then perform app.tap_inventory(d, need.cab, coalesce(inv.available, 0) - need.n); end if;
      continue;
    end if;
    k := least(need.n, app.allotment_left(d.id, need.cab));
    if k > 0 then taken := taken || jsonb_build_object(need.cab::text, jsonb_build_object('allotment', app.allotment_for(d.id, need.cab), 'n', k)); end if;
    rest := need.n - k;
    if rest > 0 then
      if inv.departure_id is null or inv.available < rest then
        raise exception 'Not enough cabins left. Nothing was booked.' using errcode = '23514';
      end if;
      if not app.inventory_is_fresh(inv.confirmed_at, inv.source) then
        raise exception 'Availability for this sailing is being confirmed. Try again shortly.' using errcode = '22023';
      end if;
      update public.inventory set available = available - rest where departure_id = d.id and cabin_type_id = need.cab;
    end if;
  end loop;
  return taken;
end $$;

-- Stamp the booked lines that came from an allotment.
create or replace function app.stamp_allotment(res uuid, taken jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  k text;
begin
  for k in select jsonb_object_keys(taken) loop
    update public.reservation_cabins set allotment_id = (taken -> k ->> 'allotment')::uuid
    where reservation_id = res and (reservation_id, line) in (
      select reservation_id, line from public.reservation_cabins
      where reservation_id = res and cabin_type_id = k::uuid order by line limit (taken -> k ->> 'n')::int);
  end loop;
end $$;

-- ── Direct booking (customers): the same, now with allotments ────────────────────────────────────────────────
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
begin
  total := app.check_direct_booking(d, cur, cabins, guests);
  select * into v from public.vessels where id = d.vessel_id;
  taken := app.take_cabins(d, cabins, by_operator, already_taken);
  pol := app.policy_for_departure(d.id);
  if pol is null then raise exception 'This sailing has no cancellation policy yet' using errcode = '22023'; end if;
  ref := app.new_reference();
  insert into public.reservations (reference, offer_id, customer_id, org_id, vessel_id, departure_id, rate_plan, currency, total_minor,
    gratuity_usd_minor, terms, policy, direct)
  values (ref, null, customer, v.operator_org_id, v.id, d.id, 'international', cur::public.currency_code, total, v.gratuity_usd_minor,
    'Booked through Nilecruz, acting as booking agent for the operator of ' || v.name || ', at the published rate, '
      || 'from check-in on the first day to check-out on the last. '
      || 'Transfers, flights and tours are not included unless stated. The cancellation policy below applies.',
    jsonb_build_object('bands', (select bands from public.cancellation_policies where id = pol),
      'terms', (select jsonb_object_agg(locale, terms) from public.cancellation_policy_translations where policy_id = pol)),
    true)
  returning id into res_id;
  for c in select value from jsonb_array_elements(cabins) loop
    line := line + 1;
    ages := array(select (x)::int from jsonb_array_elements_text(c -> 'ages') x);
    select * into cab from public.cabin_types where id = (c ->> 'cabin_type_id')::uuid;
    select * into priced from app.public_cabin_price(d.id, cab.id, cur, ages);
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
    'New booking ' || ref || ' at the published rate' || case when taken <> '{}'::jsonb then ', from the Nilecruz allotment' else '' end,
    '/dashboard/operator/' || v.operator_org_id || '/bookings/' || res_id || '/');
  insert into public.notifications (user_id, kind, title, link)
  values (customer, 'reservation.new',
    case when by_operator then 'The operator confirmed your cabins: reservation ' || ref || ' is made. You can pay now.'
         else 'Reservation ' || ref || ' is made. Payment details follow.' end,
    '/dashboard/journey/reservations/' || res_id || '/');
end $$;

create or replace function public.customer_reserve(dep uuid, cur text, cabins jsonb, guests jsonb, terms_read boolean)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  d public.departures;
  made record;
begin
  if auth.uid() is null then raise exception 'Sign in to reserve' using errcode = '42501'; end if;
  if not coalesce(terms_read, false) then raise exception 'Read and accept the terms first' using errcode = '22023'; end if;
  select * into d from public.departures where id = dep;
  if d.id is null or not public.departure_bookable(d.id) then
    raise exception 'This sailing has no cabins left or can''t be booked right now. Nothing was booked.' using errcode = '22023';
  end if;
  if app.instant_short(d.id, cabins) then
    raise exception 'The operator confirms these cabins before you pay: send a booking request instead. Nothing was booked.'
      using errcode = '22023';
  end if;
  select * into made from app.make_reservation(auth.uid(), d, cur, cabins, guests, false);
  return made.ref;
end $$;

-- ── Travel partners ─────────────────────────────────────────────────────────────────────────────────────────
-- A partner booking's cabins and guests checked and priced at the agency's rate (as partner_reserve always has).
create or replace function app.check_partner_booking(org uuid, d public.departures, cur text, cabins jsonb, guests jsonb,
  out total bigint, out any_trade boolean)
language plpgsql stable security definer set search_path = '' as $$
declare
  c jsonb;
  g jsonb;
  ages integer[];
  all_ages integer[] := '{}';
  guest_ages integer[] := '{}';
  priced record;
begin
  total := 0;
  any_trade := false;
  if cur not in ('USD', 'EUR') then raise exception 'Trade bookings are in US$ or €' using errcode = '22023'; end if;
  if jsonb_typeof(cabins) <> 'array' or jsonb_array_length(cabins) = 0 or jsonb_array_length(cabins) > 20 then
    raise exception 'Choose 1 to 20 cabins' using errcode = '22023';
  end if;
  for c in select value from jsonb_array_elements(cabins) loop
    if not exists (select 1 from public.cabin_types ct where ct.id = (c ->> 'cabin_type_id')::uuid and ct.vessel_id = d.vessel_id and ct.active) then
      raise exception 'That cabin type isn''t on this ship' using errcode = '22023';
    end if;
    ages := array(select (x)::int from jsonb_array_elements_text(c -> 'ages') x);
    select * into priced from app.partner_cabin_price(org, d.id, (c ->> 'cabin_type_id')::uuid, cur, ages);
    total := total + priced.amount_minor;
    any_trade := any_trade or priced.tier in ('company', 'trade');
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
end $$;

create or replace function app.make_partner_reservation(booker uuid, org uuid, d public.departures, cur text, cabins jsonb, guests jsonb,
  client_ref text, selling_total bigint, by_operator boolean, already_taken boolean default false, out ref text, out res_id uuid)
language plpgsql security definer set search_path = '' as $$
declare
  v public.vessels;
  agency public.organisations;
  checked record;
  c jsonb;
  g jsonb;
  ages integer[];
  priced record;
  taken jsonb;
  pol uuid;
  line integer := 0;
  pos integer := 0;
  cab public.cabin_types;
begin
  select * into checked from app.check_partner_booking(org, d, cur, cabins, guests);
  select * into v from public.vessels where id = d.vessel_id;
  select * into agency from public.organisations where id = org;
  taken := app.take_cabins(d, cabins, by_operator, already_taken);
  pol := app.policy_for_departure(d.id);
  if pol is null then raise exception 'This sailing has no cancellation policy yet' using errcode = '22023'; end if;
  ref := app.new_reference();
  insert into public.reservations (reference, offer_id, customer_id, org_id, vessel_id, departure_id, rate_plan, currency, total_minor,
    gratuity_usd_minor, terms, policy, buyer_org_id, buyer_name, booked_by)
  values (ref, null, booker, v.operator_org_id, v.id, d.id,
    case when checked.any_trade then 'trade'::public.rate_plan else 'international'::public.rate_plan end,
    cur::public.currency_code, checked.total, v.gratuity_usd_minor,
    'Trade booking made through Nilecruz by ' || agency.display_name || '. The cancellation policy below applies.',
    jsonb_build_object('bands', (select bands from public.cancellation_policies where id = pol),
      'terms', (select jsonb_object_agg(locale, terms) from public.cancellation_policy_translations where policy_id = pol)),
    org, agency.display_name, booker)
  returning id into res_id;
  for c in select value from jsonb_array_elements(cabins) loop
    line := line + 1;
    ages := array(select (x)::int from jsonb_array_elements_text(c -> 'ages') x);
    select * into cab from public.cabin_types where id = (c ->> 'cabin_type_id')::uuid;
    select * into priced from app.partner_cabin_price(org, d.id, cab.id, cur, ages);
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
  insert into public.partner_booking_details (reservation_id, org_id, client_reference, selling_total_minor)
  values (res_id, org, nullif(trim(client_ref), ''), nullif(selling_total, 0));
  insert into public.notifications (org_id, kind, title, link)
  values (v.operator_org_id, 'reservation.new',
    'Trade booking ' || ref || ' from ' || agency.display_name || case when taken <> '{}'::jsonb then ', from the Nilecruz allotment' else '' end,
    '/dashboard/operator/' || v.operator_org_id || '/bookings/' || res_id || '/');
  insert into public.notifications (org_id, kind, title, link)
  values (org, 'reservation.new',
    case when by_operator then 'The operator confirmed the cabins: reservation ' || ref || ' is made. You can pay now.'
         else 'Reservation ' || ref || ' is made. Payment details follow.' end,
    '/dashboard/partner/' || org || '/bookings/' || res_id || '/');
end $$;

-- Trade booking (DASH-B2B-003): instant only from an allotment or instant data, as for customers.
create or replace function public.partner_reserve(org uuid, dep uuid, cur text, cabins jsonb, guests jsonb, client_ref text,
  selling_total bigint, terms_read boolean)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  d public.departures;
  made record;
begin
  if not app.can_trade(org) then raise exception 'Your company''s trade access isn''t active' using errcode = '42501'; end if;
  if not coalesce(terms_read, false) then raise exception 'Read and accept the terms first' using errcode = '22023'; end if;
  select * into d from public.departures where id = dep;
  if d.id is null or not public.departure_bookable(d.id) then
    raise exception 'This sailing has no cabins left or can''t be booked right now. Nothing was booked.' using errcode = '22023';
  end if;
  if app.instant_short(d.id, cabins) then
    raise exception 'The operator confirms these cabins before you pay: send a booking request instead. Nothing was booked.'
      using errcode = '22023';
  end if;
  select * into made from app.make_partner_reservation(auth.uid(), org, d, cur, cabins, guests, client_ref, selling_total, false);
  return made.ref;
end $$;

-- ── Booking requests from travel partners ────────────────────────────────────────────────────────────────────
alter table public.booking_requests add column buyer_org_id uuid references public.organisations (id) on delete restrict;
alter table public.booking_requests add column buyer_name text check (length(buyer_name) <= 120);
alter table public.booking_requests add column client_reference text check (length(client_reference) <= 120);
alter table public.booking_requests add column selling_total_minor bigint check (selling_total_minor > 0);
create index booking_requests_buyer_idx on public.booking_requests (buyer_org_id, created_at desc) where buyer_org_id is not null;

-- Who asked: the customer, or the travel partner's owners and reservations staff.
create or replace function app.is_requester(r public.booking_requests) returns boolean
language sql stable security definer set search_path = '' as $$
  select r.customer_id = auth.uid()
    or (r.buyer_org_id is not null and app.has_org_role(r.buyer_org_id, array['owner', 'reservations']::public.team_role[]));
$$;

-- Tell whoever asked: the customer, or the travel partner company, each on its own dashboard.
create or replace function app.notify_requester(r public.booking_requests, kind text, title text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if r.buyer_org_id is not null then
    insert into public.notifications (org_id, kind, title, link)
    values (r.buyer_org_id, kind, title, '/dashboard/partner/' || r.buyer_org_id || '/requests/booking/' || r.id || '/');
  else
    insert into public.notifications (user_id, kind, title, link)
    values (r.customer_id, kind, title, '/dashboard/journey/requests/booking/' || r.id || '/');
  end if;
end $$;

drop policy "booking_requests: the customer, the operator's team and admins" on public.booking_requests;
create policy "booking_requests: the requester, the operator's team and admins" on public.booking_requests for select to authenticated
  using (customer_id = auth.uid() or app.is_admin()
    or app.has_org_role(org_id, array['owner', 'reservations', 'finance', 'viewer']::public.team_role[])
    or (buyer_org_id is not null and app.has_org_role(buyer_org_id, array['owner', 'reservations', 'finance']::public.team_role[])));
drop policy "booking_request_guests: the customer and admins" on public.booking_request_guests;
create policy "booking_request_guests: the requester and admins" on public.booking_request_guests for select to authenticated
  using (app.is_admin() or exists (select 1 from public.booking_requests r where r.id = request_id and (r.customer_id = auth.uid()
    or (r.buyer_org_id is not null and app.has_org_role(r.buyer_org_id, array['owner', 'reservations', 'finance']::public.team_role[])))));

create or replace function public.partner_request_booking(org uuid, dep uuid, cur text, cabins jsonb, guests jsonb, client_ref text,
  selling_total bigint, terms_read boolean)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  d public.departures;
  v public.vessels;
  agency public.organisations;
  checked record;
  req_id uuid;
  ref text;
begin
  if not app.can_trade(org) then raise exception 'Your company''s trade access isn''t active' using errcode = '42501'; end if;
  if not coalesce(terms_read, false) then raise exception 'Read and accept the terms first' using errcode = '22023'; end if;
  select * into d from public.departures where id = dep;
  if d.id is null or not public.departure_bookable(d.id) or not app.requestable(d, cabins) then
    raise exception 'These cabins can''t be requested right now: they are sold out or waiting for the operator to update them'
      using errcode = '22023';
  end if;
  select * into v from public.vessels where id = d.vessel_id;
  select * into agency from public.organisations where id = org;
  select * into checked from app.check_partner_booking(org, d, cur, cabins, guests);
  ref := app.new_request_reference();
  insert into public.booking_requests (reference, customer_id, org_id, vessel_id, departure_id, currency, total_minor, cabins,
    guest_count, lead_nationality, shown, buyer_org_id, buyer_name, client_reference, selling_total_minor)
  values (ref, auth.uid(), v.operator_org_id, v.id, d.id, cur::public.currency_code, checked.total, cabins,
    jsonb_array_length(guests), nullif(upper(trim(guests -> 0 ->> 'nationality')), ''),
    (select coalesce(jsonb_agg(jsonb_build_object('cabin_type_id', x.cab, 'available', i.available, 'source', i.source,
       'confirmed_at', i.confirmed_at)), '[]'::jsonb)
     from (select distinct (c ->> 'cabin_type_id')::uuid cab from jsonb_array_elements(cabins) c) x
     left join public.inventory i on i.departure_id = d.id and i.cabin_type_id = x.cab),
    org, agency.display_name, nullif(trim(client_ref), ''), nullif(selling_total, 0))
  returning id into req_id;
  insert into public.booking_request_guests (request_id, guests) values (req_id, guests);
  insert into public.notifications (org_id, kind, title, link)
  values (v.operator_org_id, 'booking_request.new', 'Booking request ' || ref || ' from ' || agency.display_name || ': please confirm the cabins',
    '/dashboard/operator/' || v.operator_org_id || '/requests/booking/' || req_id || '/');
  insert into public.notifications (org_id, kind, title, link)
  values (org, 'booking_request.new', 'Booking request ' || ref || ' is with the operator',
    '/dashboard/partner/' || org || '/requests/booking/' || req_id || '/');
  return req_id;
end $$;

-- The operator's answer: as before; a partner's request becomes a trade booking for the agency.
create or replace function app.answer_booking_request(req uuid, act text, channel text, contact uuid, alt jsonb)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  r public.booking_requests;
  d public.departures;
  made record;
  need record;
  inv public.inventory;
  taken jsonb := '{}'::jsonb;
  alt_dep public.departures;
  guests jsonb;
begin
  if act not in ('confirm', 'decline', 'hold', 'other') then raise exception 'Unknown answer' using errcode = '22023'; end if;
  select * into r from public.booking_requests where id = req for update;
  if r.id is null then raise exception 'Booking request not found' using errcode = 'P0002'; end if;
  if r.status not in ('waiting', 'held') or (act = 'hold' and r.status = 'held') then
    return jsonb_build_object('status', r.status, 'reference', r.reference, 'changed', false);
  end if;
  select * into d from public.departures where id = r.departure_id;
  update public.booking_requests set responded_at = coalesce(responded_at, now()), response = act, response_channel = channel,
    responded_contact = coalesce(contact, responded_contact) where id = r.id;
  guests := (select g.guests from public.booking_request_guests g where g.request_id = r.id);

  if act = 'confirm' then
    if r.buyer_org_id is not null then
      select * into made from app.make_partner_reservation(r.customer_id, r.buyer_org_id, d, r.currency::text, r.cabins, guests,
        r.client_reference, coalesce(r.selling_total_minor, 0), true, r.status = 'held');
    else
      select * into made from app.make_reservation(r.customer_id, d, r.currency::text, r.cabins, guests, true, r.status = 'held');
    end if;
    update public.booking_requests set status = 'confirmed', reservation_id = made.res_id, hold_until = null where id = r.id;
  elsif act = 'decline' then
    for need in select distinct (c ->> 'cabin_type_id')::uuid cab from jsonb_array_elements(r.cabins) c loop
      perform app.tap_inventory(d, need.cab, 0);
    end loop;
    update public.booking_requests set status = 'declined', hold_until = null, held = null where id = r.id;
    perform app.notify_requester(r, 'booking_request.declined', 'The operator can''t offer the cabins for ' || r.reference || '. See other dates.');
  elsif act = 'hold' then
    for need in
      select (c ->> 'cabin_type_id')::uuid cab, count(*)::int n from jsonb_array_elements(r.cabins) c group by 1 order by 1
    loop
      select * into inv from public.inventory where departure_id = d.id and cabin_type_id = need.cab for update;
      taken := taken || jsonb_build_object(need.cab::text, least(coalesce(inv.available, 0), need.n));
      perform app.tap_inventory(d, need.cab, coalesce(inv.available, 0) - need.n);
    end loop;
    update public.booking_requests set status = 'held', hold_until = now() + interval '72 hours', held = taken where id = r.id;
    perform app.notify_requester(r, 'booking_request.held', 'The operator is holding the cabins for ' || r.reference || ' while they confirm');
  else
    if alt is null or (alt ->> 'departure_id' is null and alt ->> 'cabin_type_id' is null) then
      raise exception 'Choose another date or another cabin type' using errcode = '22023';
    end if;
    if alt ->> 'departure_id' is not null then
      select * into alt_dep from public.departures where id = (alt ->> 'departure_id')::uuid;
      if alt_dep.id is null or alt_dep.vessel_id <> r.vessel_id or alt_dep.status <> 'scheduled'
         or alt_dep.departs_on <= (now() at time zone 'Africa/Cairo')::date then
        raise exception 'Choose a coming sailing of the same ship' using errcode = '22023';
      end if;
    end if;
    if alt ->> 'cabin_type_id' is not null and not exists (
      select 1 from public.cabin_types where id = (alt ->> 'cabin_type_id')::uuid and vessel_id = r.vessel_id and active) then
      raise exception 'Choose a cabin type on the same ship' using errcode = '22023';
    end if;
    if coalesce((alt ->> 'cabins')::int, 0) not between 1 and 5 then
      raise exception 'Say how many cabins (1 to 5)' using errcode = '22023';
    end if;
    if r.status = 'held' then perform app.release_hold(r); end if;
    update public.booking_requests set status = 'alternative_offered', hold_until = null, held = null,
      alternative = jsonb_strip_nulls(jsonb_build_object('departure_id', alt ->> 'departure_id', 'cabin_type_id', alt ->> 'cabin_type_id',
        'cabins', (alt ->> 'cabins')::int, 'note', left(nullif(trim(alt ->> 'note'), ''), 500)))
    where id = r.id;
    perform app.notify_requester(r, 'booking_request.alternative', 'The operator offers something else for ' || r.reference);
  end if;
  select * into r from public.booking_requests where id = req;
  return jsonb_build_object('status', r.status, 'reference', r.reference, 'changed', true, 'reservation_id', r.reservation_id);
end $$;

create or replace function public.customer_accept_alternative(req uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  r public.booking_requests;
  d public.departures;
  cabins jsonb;
  guests jsonb;
  made record;
begin
  select * into r from public.booking_requests where id = req for update;
  if r.id is null or not app.is_requester(r) then raise exception 'Booking request not found' using errcode = 'P0002'; end if;
  if r.status <> 'alternative_offered' then raise exception 'There is no other offer to accept' using errcode = '22023'; end if;
  if (r.alternative ->> 'cabins')::int <> jsonb_array_length(r.cabins) then
    raise exception 'The operator offers % cabins: send a new request with your party in them', r.alternative ->> 'cabins' using errcode = '22023';
  end if;
  select * into d from public.departures where id = coalesce((r.alternative ->> 'departure_id')::uuid, r.departure_id);
  cabins := (select jsonb_agg(case when r.alternative ? 'cabin_type_id' then c || jsonb_build_object('cabin_type_id', r.alternative ->> 'cabin_type_id') else c end)
             from jsonb_array_elements(r.cabins) c);
  guests := (select g.guests from public.booking_request_guests g where g.request_id = r.id);
  if r.buyer_org_id is not null then
    select * into made from app.make_partner_reservation(r.customer_id, r.buyer_org_id, d, r.currency::text, cabins, guests,
      r.client_reference, coalesce(r.selling_total_minor, 0), true);
  else
    select * into made from app.make_reservation(r.customer_id, d, r.currency::text, cabins, guests, true);
  end if;
  update public.booking_requests set status = 'confirmed', reservation_id = made.res_id where id = r.id;
  return made.res_id;
end $$;

create or replace function public.customer_withdraw_booking_request(req uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  r public.booking_requests;
begin
  select * into r from public.booking_requests where id = req for update;
  if r.id is null or not app.is_requester(r) then raise exception 'Booking request not found' using errcode = 'P0002'; end if;
  if r.status not in ('waiting', 'held', 'alternative_offered') then raise exception 'This request is already closed' using errcode = '22023'; end if;
  if r.status = 'held' then perform app.release_hold(r); end if;
  update public.booking_requests set status = 'withdrawn', hold_until = null, held = null where id = r.id;
end $$;

create or replace function app.expire_booking_requests() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  r public.booking_requests;
  n integer := 0;
begin
  for r in select * from public.booking_requests
           where (status = 'held' and hold_until < now()) or (status = 'waiting' and created_at < now() - interval '7 days')
           for update skip locked loop
    if r.status = 'held' then perform app.release_hold(r); end if;
    update public.booking_requests set status = 'expired', hold_until = null, held = null where id = r.id;
    perform app.notify_requester(r, 'booking_request.expired', 'Booking request ' || r.reference || ' has expired without a confirmation');
    n := n + 1;
  end loop;
  return n;
end $$;

-- ── What the booking screens read ────────────────────────────────────────────────────────────────────────────
create or replace function public.vessel_departure_prices(target uuid)
returns table (departure_id uuid, schedule_id uuid, departs_on date, returns_on date, cabin_type_id uuid, currency text,
  single_minor bigint, double_minor bigint, triple_minor bigint, places_left integer, bookable boolean, booking_mode text)
language sql stable security definer set search_path = '' as $$
  with today as (select (now() at time zone 'Africa/Cairo')::date as d)
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
  join public.rates r on r.departure_id = de.id and r.cabin_type_id = c.id and r.rate_plan = 'international'
  where auth.uid() is not null and v.id = target and de.status = 'scheduled'
    and de.departs_on > today.d and de.departs_on <= today.d + 365
  group by de.id, de.schedule_id, de.departs_on, de.returns_on, c.id, r.currency
  order by de.departs_on, c.id;
$$;

-- Partner search: each cabin's booking mode; a count only when instant (from an allotment or instant data).
drop function public.partner_search(uuid, date, date, text, text, integer, integer);
create function public.partner_search(org uuid, from_day date, to_day date, route_origin text default null,
  route_destination text default null, nights_min integer default 1, nights_max integer default 21)
returns table (departure_id uuid, vessel_id uuid, vessel_name text, schedule_id uuid, origin text, destination text, nights integer,
  departs_on date, returns_on date, sailing_period text, sails_at time, cabin_type_id uuid, cabin_name text, deck text,
  max_occupancy integer, available integer, occupancy integer, currency text, amount_minor bigint, child_bands jsonb,
  gratuity_usd_minor bigint, tier text, booking_mode text, operator_org_id uuid)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not app.can_trade(org) then
    raise exception 'Your company''s trade access isn''t active' using errcode = '42501';
  end if;
  if to_day < from_day or to_day > from_day + 366 then raise exception 'Choose a date range of up to a year' using errcode = '22023'; end if;
  return query
  with candidates as (
    select d.id as dep, v.id as ves, v.name as vname, s.id as sch, s.origin as orig, s.destination as dest, s.nights::int as n,
      d.departs_on as dep_on, d.returns_on as ret_on, s.sailing_period::text as per, s.sails_at as at,
      c.id as cab, c.name as cname, c.deck as cdeck, c.max_occupancy::int as maxocc,
      app.cabin_mode(d.id, c.id) as mode, v.gratuity_usd_minor as grat, v.operator_org_id as op
    from public.departures d
    join public.schedules s on s.id = d.schedule_id and s.active
    join public.vessels v on v.id = d.vessel_id
    join public.cabin_types c on c.vessel_id = v.id and c.active
    where d.departs_on between greatest(from_day, (now() at time zone 'Africa/Cairo')::date + 1) and to_day
      and s.nights between nights_min and nights_max
      and (route_origin is null or s.origin ilike route_origin)
      and (route_destination is null or s.destination ilike route_destination)
      and public.departure_bookable(d.id)
  ),
  for_sale as (
    select x.*, case when x.mode = 'instant' then app.instant_left(x.dep, x.cab) end as avail
    from candidates x where x.mode in ('instant', 'request')
  ),
  priced as (
    select x.*, p.occupancy::int as occ, p.currency::text as cur, p.amount_minor as amt, p.child_bands as bands, 'company'::text as tr, 1 as rank
    from for_sale x join public.partner_rates p on p.departure_id = x.dep and p.cabin_type_id = x.cab and p.partner_org_id = org
    union all
    select x.*, r.occupancy::int, r.currency::text, r.amount_minor, r.child_bands, 'trade', 2
    from for_sale x join public.rates r on r.departure_id = x.dep and r.cabin_type_id = x.cab and r.rate_plan = 'trade'
    union all
    select x.*, r.occupancy::int, r.currency::text, r.amount_minor, r.child_bands, 'public', 3
    from for_sale x join public.rates r on r.departure_id = x.dep and r.cabin_type_id = x.cab and r.rate_plan = 'international'
  )
  select distinct on (q.dep, q.cab, q.occ, q.cur)
    q.dep, q.ves, q.vname, q.sch, q.orig, q.dest, q.n, q.dep_on, q.ret_on, q.per, q.at, q.cab, q.cname, q.cdeck, q.maxocc, q.avail,
    q.occ, q.cur, q.amt, q.bands, q.grat, q.tr, q.mode, q.op
  from priced q
  order by q.dep, q.cab, q.occ, q.cur, q.rank
  limit 2000;
end $$;

-- An allotment's next sailings: allotted, booked from it, and whether it's released.
create or replace function public.allotment_usage(target uuid)
returns table (departure_id uuid, departs_on date, cabins integer, booked integer, released boolean)
language sql stable security definer set search_path = '' as $$
  select d.id, d.departs_on, a.cabins::int,
    (select count(*)::int from public.reservation_cabins rc join public.reservations r on r.id = rc.reservation_id
     where rc.allotment_id = a.id and r.departure_id = d.id and r.status <> 'cancelled'),
    d.departs_on - a.release_days <= (now() at time zone 'Africa/Cairo')::date
  from public.allotments a
  join public.departures d on d.vessel_id = a.vessel_id and d.departs_on between a.starts_on and a.ends_on and d.status = 'scheduled'
  where a.id = target and d.departs_on > (now() at time zone 'Africa/Cairo')::date
    and (app.is_admin() or app.can_read_connections(a.org_id))
  order by d.departs_on
  limit 60;
$$;

-- ── Access ───────────────────────────────────────────────────────────────────────────────────────────────────
alter table public.allotments enable row level security;
create policy "allotments: admins and the operator's team read" on public.allotments for select to authenticated
  using (app.is_admin() or app.can_read_connections(org_id));
create policy "allotments: catalogue admins write" on public.allotments for all to authenticated
  using (app.is_catalogue_admin()) with check (app.is_catalogue_admin());
grant select, insert, update, delete on public.allotments to authenticated, service_role;

revoke execute on function app.check_allotment(), app.allotment_left(uuid, uuid), app.allotment_for(uuid, uuid), app.instant_left(uuid, uuid),
  app.instant_short(uuid, jsonb), app.take_cabins(public.departures, jsonb, boolean, boolean), app.stamp_allotment(uuid, jsonb),
  app.check_partner_booking(uuid, public.departures, text, jsonb, jsonb),
  app.make_partner_reservation(uuid, uuid, public.departures, text, jsonb, jsonb, text, bigint, boolean, boolean),
  app.is_requester(public.booking_requests), app.notify_requester(public.booking_requests, text, text) from public, anon, authenticated;
-- The booking mode is read inside visitor-facing functions run as their owner; nobody calls it directly.
revoke execute on function app.cabin_mode(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.partner_search(uuid, date, date, text, text, integer, integer), public.allotment_usage(uuid),
  public.partner_request_booking(uuid, uuid, text, jsonb, jsonb, text, bigint, boolean) from public, anon;
grant execute on function public.partner_search(uuid, date, date, text, text, integer, integer), public.allotment_usage(uuid),
  public.partner_request_booking(uuid, uuid, text, jsonb, jsonb, text, bigint, boolean) to authenticated;

create trigger audit_allotments after insert or update or delete on public.allotments for each row execute function app.audit_row();
