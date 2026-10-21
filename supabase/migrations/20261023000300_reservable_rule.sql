-- Operator loop, Part C (ADR-099; Faris, 21 Oct: customers pay only for cabins the operator has confirmed).
-- What a customer can book instantly, and what becomes a booking request:
--   feed, API or an operator's answer (`tap`) no older than 2 hours   instant: reserve and pay as today
--   manual, paste or sheet no older than 7 days                       request: the operator confirms first, then pay
--   older                                                             to be confirmed: not bookable (as before)
--   none free                                                         sold out
-- Exact counts are shown only for instant data. Allotments contracted to Nilecruz don't exist yet, so there is no row
-- for them. Travel partners' bookings (partner_reserve) are unchanged.

create or replace function app.inventory_instant(confirmed_at timestamptz, source public.inventory_source) returns boolean
language sql stable security definer set search_path = '' as $$
  select source in ('feed', 'api', 'tap') and app.inventory_is_fresh(confirmed_at, source);
$$;
grant execute on function app.inventory_instant(timestamptz, public.inventory_source) to anon, authenticated, service_role;

create or replace function app.booking_mode(i public.inventory) returns text
language sql stable security definer set search_path = '' as $$
  select case
    when i.departure_id is null then 'unconfirmed'
    when i.available = 0 then 'sold_out'
    when not app.inventory_is_fresh(i.confirmed_at, i.source) then 'unconfirmed'
    when app.inventory_instant(i.confirmed_at, i.source) then 'instant'
    else 'request' end;
$$;
grant execute on function app.booking_mode(public.inventory) to anon, authenticated, service_role;

-- Prices after sign-in, now with each cabin's booking mode; places left only from instant data.
drop function public.vessel_departure_prices(uuid);
create function public.vessel_departure_prices(target uuid)
returns table (departure_id uuid, schedule_id uuid, departs_on date, returns_on date, cabin_type_id uuid, currency text,
  single_minor bigint, double_minor bigint, triple_minor bigint, places_left integer, bookable boolean, booking_mode text)
language sql stable security definer set search_path = '' as $$
  with today as (select (now() at time zone 'Africa/Cairo')::date as d)
  select de.id, de.schedule_id, de.departs_on, de.returns_on, c.id, r.currency::text,
    max(r.amount_minor) filter (where r.occupancy = 1),
    max(r.amount_minor) filter (where r.occupancy = 2),
    max(r.amount_minor) filter (where r.occupancy = 3),
    max(i.available) filter (where app.inventory_instant(i.confirmed_at, i.source)),
    public.departure_bookable(de.id),
    coalesce(min(app.booking_mode(i)), 'unconfirmed')
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

-- Direct booking: instant data only. Manual and sheet data go through a booking request.
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
  if exists (
    select 1 from (select distinct (c ->> 'cabin_type_id')::uuid cab from jsonb_array_elements(cabins) c) x
    left join public.inventory i on i.departure_id = d.id and i.cabin_type_id = x.cab
    where i.departure_id is null or not app.inventory_instant(i.confirmed_at, i.source)
  ) then
    raise exception 'The operator confirms these cabins before you pay: send a booking request instead. Nothing was booked.'
      using errcode = '22023';
  end if;
  select * into made from app.make_reservation(auth.uid(), d, cur, cabins, guests, false);
  return made.ref;
end $$;

-- A booking request needs availability no older than its freshness and something free on each cabin type asked for.
create or replace function app.requestable(d public.departures, cabins jsonb) returns boolean
language sql stable security definer set search_path = '' as $$
  select not exists (
    select 1 from (select distinct (c ->> 'cabin_type_id')::uuid cab from jsonb_array_elements(cabins) c) x
    left join public.inventory i on i.departure_id = d.id and i.cabin_type_id = x.cab
    where app.booking_mode(i) not in ('instant', 'request')
  );
$$;

create or replace function public.customer_request_booking(dep uuid, cur text, cabins jsonb, guests jsonb, terms_read boolean)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  d public.departures;
  v public.vessels;
  total bigint;
  req_id uuid;
  ref text;
begin
  if auth.uid() is null then raise exception 'Sign in to send a booking request' using errcode = '42501'; end if;
  if not coalesce(terms_read, false) then raise exception 'Read and accept the terms first' using errcode = '22023'; end if;
  select * into d from public.departures where id = dep;
  if d.id is null or not public.departure_bookable(d.id) or not app.requestable(d, cabins) then
    raise exception 'These cabins can''t be requested right now: they are sold out or waiting for the operator to update them'
      using errcode = '22023';
  end if;
  select * into v from public.vessels where id = d.vessel_id;
  total := app.check_direct_booking(d, cur, cabins, guests);
  ref := app.new_request_reference();
  insert into public.booking_requests (reference, customer_id, org_id, vessel_id, departure_id, currency, total_minor, cabins,
    guest_count, lead_nationality, shown)
  values (ref, auth.uid(), v.operator_org_id, v.id, d.id, cur::public.currency_code, total, cabins,
    jsonb_array_length(guests), nullif(upper(trim(guests -> 0 ->> 'nationality')), ''),
    (select coalesce(jsonb_agg(jsonb_build_object('cabin_type_id', x.cab, 'available', i.available, 'source', i.source,
       'confirmed_at', i.confirmed_at)), '[]'::jsonb)
     from (select distinct (c ->> 'cabin_type_id')::uuid cab from jsonb_array_elements(cabins) c) x
     left join public.inventory i on i.departure_id = d.id and i.cabin_type_id = x.cab))
  returning id into req_id;
  insert into public.booking_request_guests (request_id, guests) values (req_id, guests);
  insert into public.notifications (org_id, kind, title, link)
  values (v.operator_org_id, 'booking_request.new', 'Booking request ' || ref || ': please confirm the cabins',
    '/dashboard/operator/' || v.operator_org_id || '/requests/booking/' || req_id || '/');
  insert into public.notifications (user_id, kind, title, link)
  values (auth.uid(), 'booking_request.new', 'Booking request ' || ref || ' is with the operator', '/dashboard/journey/requests/booking/' || req_id || '/');
  return req_id;
end $$;

revoke execute on function app.requestable(public.departures, jsonb) from public, anon, authenticated;
