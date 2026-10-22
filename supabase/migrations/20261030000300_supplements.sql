-- Vessel onboarding spec, gaps 4 and 7 (ADR-103):
--   supplements: compulsory, per person, dated charges a ship adds to its fare (gala dinners, peak dates). In the cruise
--   total, so payment, commission and cancellation follow it; each booked line keeps its supplement part to show it.
--   when availability was confirmed, for "Availability updated 3 hours ago" on each sailing.

create table public.supplements (
  id uuid primary key default gen_random_uuid(),
  vessel_id uuid not null references public.vessels (id) on delete cascade,
  -- One cabin type, or every cabin type when null.
  cabin_type_id uuid references public.cabin_types (id) on delete cascade,
  kind text not null check (kind in ('gala_dinner', 'peak')),
  name text not null check (length(trim(name)) between 1 and 120),
  -- The nights it covers: a sailing on board any of these nights (departs on or before ends_on, returns after starts_on).
  starts_on date not null,
  ends_on date not null,
  -- Per guest, in minor units; children pay the same share as of the fare (its age bands).
  currency public.currency_code not null check (currency in ('USD', 'EUR', 'EGP')),
  amount_minor bigint not null check (amount_minor > 0 and amount_minor <= 100000000),
  active boolean not null default true,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on >= starts_on and ends_on <= starts_on + 366)
);
create index supplements_vessel_idx on public.supplements (vessel_id, starts_on, ends_on) where active;
create trigger supplements_updated_at before update on public.supplements for each row execute function app.set_updated_at();

create or replace function app.check_supplement() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.cabin_type_id is not null
     and not exists (select 1 from public.cabin_types c where c.id = new.cabin_type_id and c.vessel_id = new.vessel_id) then
    raise exception 'The cabin type isn''t on this ship' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger supplements_check before insert or update on public.supplements for each row execute function app.check_supplement();

-- An adult's supplements on a sailing for a cabin type, in one currency.
create or replace function app.supplement_pp(dep uuid, cab uuid, cur text) returns bigint
language sql stable security definer set search_path = '' as $$
  select coalesce(sum(s.amount_minor), 0)::bigint
  from public.supplements s join public.departures d on d.id = dep
  where s.active and s.vessel_id = d.vessel_id and (s.cabin_type_id is null or s.cabin_type_id = cab)
    and s.currency::text = cur and d.departs_on <= s.ends_on and d.returns_on > s.starts_on;
$$;

-- One guest's share of an amount: adults all of it, children by the band for their age.
create or replace function app.guest_share(amount bigint, age integer, bands jsonb) returns bigint
language sql immutable set search_path = '' as $$
  select case when age >= 18 then amount else floor(amount * coalesce((
    select (b ->> 'percent')::numeric from jsonb_array_elements(bands) b
    where (b ->> 'from')::int <= age and ((b ->> 'to') is null or age < (b ->> 'to')::int) limit 1), 100) / 100.0 + 0.5)::bigint end;
$$;

-- ── A cabin's price for a party: the fare plus the supplements (same as 20261027000100 otherwise) ───────────
drop function app.public_cabin_price(uuid, uuid, text, integer[], text);
create function app.public_cabin_price(dep uuid, cab uuid, cur text, ages integer[], pkg text default 'cruise')
returns table (amount_minor bigint, tier text, supplement_minor bigint)
language plpgsql stable security definer set search_path = '' as $$
declare
  occ integer := (select count(*) from unnest(ages) a where a >= 3);
  maxocc integer;
  rate bigint;
  supp bigint;
  bands jsonb;
  t text;
  fare bigint := 0;
  extra bigint := 0;
  a integer;
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
  supp := app.supplement_pp(dep, cab, cur);
  foreach a in array ages loop
    fare := fare + app.guest_share(rate, a, bands);
    if supp > 0 then extra := extra + app.guest_share(supp, a, bands); end if;
  end loop;
  amount_minor := fare + extra;
  tier := t;
  supplement_minor := extra;
  return next;
end $$;
revoke execute on function app.public_cabin_price(uuid, uuid, text, integer[], text) from public, anon, authenticated;

-- The agency's price: the same, at its rate (same as 20261020000300 otherwise).
drop function app.partner_cabin_price(uuid, uuid, uuid, text, integer[]);
create function app.partner_cabin_price(org uuid, dep uuid, cab uuid, cur text, ages integer[])
returns table (amount_minor bigint, tier text, supplement_minor bigint)
language plpgsql stable security definer set search_path = '' as $$
declare
  occ integer := (select count(*) from unnest(ages) a where a >= 3);
  maxocc integer;
  rate bigint;
  supp bigint;
  bands jsonb;
  t text;
  fare bigint := 0;
  extra bigint := 0;
  a integer;
begin
  select max_occupancy into maxocc from public.cabin_types where id = cab;
  if not exists (select 1 from unnest(ages) x where x >= 12) then raise exception 'A cabin needs at least one adult' using errcode = '22023'; end if;
  if occ > maxocc then raise exception 'This cabin sleeps %; infants under 3 don''t count', maxocc using errcode = '22023'; end if;
  select x.amount_minor, x.child_bands, x.tr into rate, bands, t from (
    select p.amount_minor, p.child_bands, 'company' as tr, 1 as rk from public.partner_rates p
      where p.partner_org_id = org and p.departure_id = dep and p.cabin_type_id = cab and p.occupancy = occ and p.currency::text = cur
    union all
    select r.amount_minor, r.child_bands, 'trade', 2 from public.rates r
      where r.departure_id = dep and r.cabin_type_id = cab and r.occupancy = occ and r.currency::text = cur and r.rate_plan = 'trade'
    union all
    select r.amount_minor, r.child_bands, 'public', 3 from public.rates r
      where r.departure_id = dep and r.cabin_type_id = cab and r.occupancy = occ and r.currency::text = cur and r.rate_plan = 'international'
  ) x order by x.rk limit 1;
  if rate is null then raise exception 'There is no % rate for % guests in this cabin', cur, occ using errcode = '22023'; end if;
  supp := app.supplement_pp(dep, cab, cur);
  foreach a in array ages loop
    fare := fare + app.guest_share(rate, a, bands);
    if supp > 0 then extra := extra + app.guest_share(supp, a, bands); end if;
  end loop;
  amount_minor := fare + extra;
  tier := t;
  supplement_minor := extra;
  return next;
end $$;
revoke execute on function app.partner_cabin_price(uuid, uuid, uuid, text, integer[]) from public, anon, authenticated;

-- ── Each booked line keeps its supplement part ───────────────────────────────────────────────────────────────
-- Already in price_minor; kept apart only to show it. Offers are priced by hand by the operator, so they carry none.
alter table public.reservation_cabins add column supplement_minor bigint not null default 0 check (supplement_minor >= 0);

create or replace function app.stamp_supplement() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  r public.reservations;
  ages integer[];
begin
  select * into r from public.reservations where id = new.reservation_id;
  if r.offer_id is not null then return new; end if;
  ages := array_fill(18, array[new.adults::int]) || new.child_ages::integer[];
  new.supplement_minor := coalesce(case
    when r.buyer_org_id is not null then (select p.supplement_minor from app.partner_cabin_price(r.buyer_org_id, r.departure_id, new.cabin_type_id, r.currency::text, ages) p)
    else (select p.supplement_minor from app.public_cabin_price(r.departure_id, new.cabin_type_id, r.currency::text, ages, r.package) p) end, 0);
  return new;
end $$;
create trigger reservation_cabins_supplement before insert on public.reservation_cabins
  for each row execute function app.stamp_supplement();

-- Signed-in visitors: the supplements on one sailing, to say what the price includes.
create or replace function public.sailing_supplements(dep uuid)
returns table (cabin_type_id uuid, kind text, name text, starts_on date, ends_on date, currency text, amount_minor bigint)
language sql stable security definer set search_path = '' as $$
  select s.cabin_type_id, s.kind, s.name, s.starts_on, s.ends_on, s.currency::text, s.amount_minor
  from public.supplements s join public.departures d on d.id = dep
  join public.vessels v on v.id = d.vessel_id and v.visibility = 'published'
  where auth.uid() is not null and s.active and s.vessel_id = d.vessel_id
    and d.departs_on <= s.ends_on and d.returns_on > s.starts_on
  order by s.starts_on, s.name;
$$;

-- ── Cabins shown as a number ────────────────────────────────────────────────────────────────────────────────
-- ADR-099 and the spec: an exact count only from an allotment or live data (feed, API or an operator's answer within
-- 2 hours), never from manual or sheet data, even when a freesale lets that data book instantly. Null: no number to show.
create or replace function app.shown_left(dep uuid, cab uuid) returns integer
language sql stable security definer set search_path = '' as $$
  with live as (
    select i.available from public.inventory i
    where i.departure_id = dep and i.cabin_type_id = cab and app.booking_mode(i) = 'instant'
      and app.inventory_instant(i.confirmed_at, i.source))
  select case when app.allotment_left(dep, cab) > 0 or exists (select 1 from live)
    then app.allotment_left(dep, cab) + coalesce((select available from live), 0) end;
$$;
revoke execute on function app.shown_left(uuid, uuid) from public, anon, authenticated;

-- ── Prices a signed-in person sees: plus each sailing's supplement per adult and when availability was confirmed ─
drop function public.vessel_departure_prices(uuid, text);
create function public.vessel_departure_prices(target uuid, pkg text default 'cruise')
returns table (departure_id uuid, schedule_id uuid, departs_on date, returns_on date, cabin_type_id uuid, currency text,
  single_minor bigint, double_minor bigint, triple_minor bigint, places_left integer, bookable boolean, booking_mode text,
  supplement_minor bigint, confirmed_at timestamptz)
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
    -- Places left only from an allotment or live data (never manual or sheet counts, freesale included).
    case when app.cabin_mode(de.id, c.id) = 'instant' then app.shown_left(de.id, c.id) end,
    public.departure_bookable(de.id),
    app.cabin_mode(de.id, c.id),
    app.supplement_pp(de.id, c.id, r.currency::text),
    (select i.confirmed_at from public.inventory i where i.departure_id = de.id and i.cabin_type_id = c.id)
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

-- Partner search: the same additions, and the count shown only from an allotment or live data (same as
-- 20261023000500 otherwise).
drop function public.partner_search(uuid, date, date, text, text, integer, integer);
create function public.partner_search(org uuid, from_day date, to_day date, route_origin text default null,
  route_destination text default null, nights_min integer default 1, nights_max integer default 21)
returns table (departure_id uuid, vessel_id uuid, vessel_name text, schedule_id uuid, origin text, destination text, nights integer,
  departs_on date, returns_on date, sailing_period text, sails_at time, cabin_type_id uuid, cabin_name text, deck text,
  max_occupancy integer, available integer, occupancy integer, currency text, amount_minor bigint, child_bands jsonb,
  gratuity_usd_minor bigint, tier text, booking_mode text, operator_org_id uuid, supplement_minor bigint, confirmed_at timestamptz)
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
    select x.*, case when x.mode = 'instant' then app.shown_left(x.dep, x.cab) end as avail
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
    q.occ, q.cur, q.amt, q.bands, q.grat, q.tr, q.mode, q.op, app.supplement_pp(q.dep, q.cab, q.cur),
    (select i.confirmed_at from public.inventory i where i.departure_id = q.dep and i.cabin_type_id = q.cab)
  from priced q
  order by q.dep, q.cab, q.occ, q.cur, q.rank
  limit 2000;
end $$;
revoke execute on function public.partner_search(uuid, date, date, text, text, integer, integer) from public, anon;
grant execute on function public.partner_search(uuid, date, date, text, text, integer, integer) to authenticated;

-- ── Access ───────────────────────────────────────────────────────────────────────────────────────────────────
alter table public.supplements enable row level security;
create policy "supplements: team and admins read" on public.supplements for select to authenticated
  using (app.is_admin() or exists (select 1 from public.vessels v where v.id = vessel_id and v.operator_org_id in (select app.my_org_ids())));
create policy "supplements: editors write" on public.supplements for all to authenticated
  using (app.can_edit_product(vessel_id)) with check (app.can_edit_product(vessel_id));
grant select, insert, update, delete on public.supplements to authenticated, service_role;

revoke execute on function app.check_supplement(), app.supplement_pp(uuid, uuid, text), app.guest_share(bigint, integer, jsonb),
  app.stamp_supplement() from public, anon, authenticated;
revoke execute on function public.sailing_supplements(uuid) from public, anon;
grant execute on function public.sailing_supplements(uuid) to authenticated;

create trigger audit_supplements after insert or update or delete on public.supplements for each row execute function app.audit_row();
