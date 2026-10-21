-- Batch 7-2: tours booked by calendar (ADR-097). Mirrors src/lib/tours/calendar.ts.
-- Tours have rates, not pre-made sessions: the customer picks a date and start time, a mode and the party, and pays
-- (the 4f-2c tour orders and their 60-minute hold, kept). A shared slot (tour, rate, start) takes at most 8 guests;
-- private tours, transfers and meet and assist are the party's own and never fill it. The Luxor and Aswan offices run
-- the tours: each sees its own tours' bookings and can cancel a slot it can't run (everyone is refunded in full).
-- The fixed sessions of Batch 4d stay readable for orders already made.

-- ── The office that runs a tour ─────────────────────────────────────────────────────────────────────────────
alter table public.tours add column office_id uuid references public.organisations (id) on delete set null;
create index tours_office_idx on public.tours (office_id);

create or replace function app.check_tour_office() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.office_id is not null and not exists (select 1 from public.organisations o where o.id = new.office_id and o.kind = 'tour_office') then
    raise exception 'A tour is run by a tour office' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger tours_office_kind before insert or update of office_id on public.tours for each row execute function app.check_tour_office();

-- Members of an approved office that runs the tour.
create or replace function app.is_tour_office_of(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.tours t join public.organisations o on o.id = t.office_id
    join public.memberships m on m.org_id = o.id
    where t.id = target and o.status = 'approved' and m.user_id = auth.uid()
  );
$$;
revoke execute on function app.is_tour_office_of(uuid) from public;
grant execute on function app.is_tour_office_of(uuid) to anon, authenticated, service_role;

-- ── Rates ───────────────────────────────────────────────────────────────────────────────────────────────────
create type public.tour_rate_mode as enum ('shared', 'private', 'transfer', 'assist');

-- Amounts in minor units (US cents).
--   shared   {"adult", "child611", "child35"}: per person; under-3s free
--   private  {"tiers": [{"min", "max" (null = and over), "pp"}], "child_pct", "child35_pct"}: per person by party size;
--            children 6–11 pay child_pct of the adult price, 3–5 child35_pct (25 when absent, Faris 21 Oct)
--   transfer {"vehicles": [{"name", "max", "price"}], "night_extra"}: per vehicle, one way
--   assist   {"tiers": [{"max", "price"}]}: per party
create or replace function app.valid_tour_prices(mode public.tour_rate_mode, p jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare
  x jsonb;
begin
  if jsonb_typeof(p) is distinct from 'object' then return false; end if;
  case mode
    when 'shared' then
      return jsonb_typeof(p -> 'adult') = 'number' and (p ->> 'adult')::bigint > 0
        and jsonb_typeof(p -> 'child611') = 'number' and (p ->> 'child611')::bigint >= 0
        and jsonb_typeof(p -> 'child35') = 'number' and (p ->> 'child35')::bigint >= 0;
    when 'private' then
      if jsonb_typeof(p -> 'tiers') <> 'array' or jsonb_array_length(p -> 'tiers') = 0 then return false; end if;
      if jsonb_typeof(p -> 'child_pct') <> 'number' or (p ->> 'child_pct')::numeric not between 0 and 100 then return false; end if;
      if p ? 'child35_pct' and (jsonb_typeof(p -> 'child35_pct') <> 'number' or (p ->> 'child35_pct')::numeric not between 0 and 100) then
        return false;
      end if;
      for x in select * from jsonb_array_elements(p -> 'tiers') loop
        if jsonb_typeof(x -> 'min') <> 'number' or jsonb_typeof(x -> 'pp') <> 'number' or (x ->> 'pp')::bigint <= 0
           or (x ->> 'min')::int < 1 or (jsonb_typeof(x -> 'max') = 'number' and (x ->> 'max')::int < (x ->> 'min')::int)
           or coalesce(jsonb_typeof(x -> 'max'), 'null') not in ('number', 'null') then return false; end if;
      end loop;
      return true;
    when 'transfer' then
      if jsonb_typeof(p -> 'vehicles') <> 'array' or jsonb_array_length(p -> 'vehicles') = 0 then return false; end if;
      if jsonb_typeof(p -> 'night_extra') <> 'number' or (p ->> 'night_extra')::bigint < 0 then return false; end if;
      for x in select * from jsonb_array_elements(p -> 'vehicles') loop
        if jsonb_typeof(x -> 'name') <> 'string' or jsonb_typeof(x -> 'max') <> 'number' or (x ->> 'max')::int < 1
           or jsonb_typeof(x -> 'price') <> 'number' or (x ->> 'price')::bigint <= 0 then return false; end if;
      end loop;
      return true;
    else
      if jsonb_typeof(p -> 'tiers') <> 'array' or jsonb_array_length(p -> 'tiers') = 0 then return false; end if;
      for x in select * from jsonb_array_elements(p -> 'tiers') loop
        if jsonb_typeof(x -> 'max') <> 'number' or (x ->> 'max')::int < 1
           or jsonb_typeof(x -> 'price') <> 'number' or (x ->> 'price')::bigint <= 0 then return false; end if;
      end loop;
      return true;
  end case;
end $$;

create table public.tour_rates (
  id uuid primary key default gen_random_uuid(),
  tour_id uuid not null references public.tours (id) on delete cascade,
  mode public.tour_rate_mode not null,
  -- A transfer's or meet and assist's direction ("Airport → ship or hotel"); empty for day trips.
  label text not null default '' check (length(label) <= 120),
  -- ISO weekdays it runs (1 Monday … 7 Sunday), in Cairo.
  days smallint[] not null default '{1,2,3,4,5,6,7}' check (cardinality(days) between 1 and 7 and days <@ '{1,2,3,4,5,6,7}'),
  -- Start times in Cairo; none means flexible (any quarter hour the customer picks).
  start_times time[] not null default '{}' check (cardinality(start_times) <= 24),
  lead_hours smallint not null default 24 check (lead_hours between 0 and 720),
  -- Shared only: places per slot (ADR-097: at most 8) and the minimum to run.
  max_guests smallint not null default 8 check (max_guests between 1 and 8),
  min_guests smallint not null default 1 check (min_guests between 1 and 8 and min_guests <= max_guests),
  currency public.currency_code not null default 'USD' check (currency = 'USD'),
  prices jsonb not null,
  tickets_included boolean,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint prices_shape check (app.valid_tour_prices(mode, prices)),
  -- Only transfers and meet and assist have a direction.
  constraint label_for_transfers check (mode in ('transfer', 'assist') or label = ''),
  unique (tour_id, mode, label)
);
create index tour_rates_tour_idx on public.tour_rates (tour_id);
create trigger tour_rates_updated_at before update on public.tour_rates for each row execute function app.set_updated_at();

-- Seasons: a percentage between two dates for one group of rates or all.
create table public.tour_seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 120),
  starts_on date not null,
  ends_on date not null,
  pct integer not null check (pct between -50 and 200 and pct <> 0),
  applies text not null default 'all' check (applies in ('all', 'shared', 'private', 'transfers')),
  created_at timestamptz not null default now(),
  check (ends_on >= starts_on)
);

-- A slot the office can't run: closed to new bookings, and its orders were cancelled with a full refund.
create table public.tour_slot_closures (
  rate_id uuid not null references public.tour_rates (id) on delete cascade,
  starts_at timestamptz not null,
  reason text not null check (length(trim(reason)) between 3 and 500),
  closed_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (rate_id, starts_at)
);

-- ── Orders gain a rate and a start (sessions stay for earlier orders) ────────────────────────────────────────
alter table public.tour_orders alter column session_id drop not null;
alter table public.tour_orders add column rate_id uuid references public.tour_rates (id) on delete restrict;
alter table public.tour_orders add column mode public.tour_rate_mode;
alter table public.tour_orders add column vehicle text check (length(vehicle) <= 60);
alter table public.tour_orders add column label text check (length(label) <= 120);
alter table public.tour_orders add column starts_at timestamptz;
update public.tour_orders o set starts_at = s.starts_at, mode = s.kind::text::public.tour_rate_mode
from public.tour_sessions s where s.id = o.session_id;
create or replace function app.tour_order_start() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.session_id is not null and new.starts_at is null then
    select s.starts_at, s.kind::text::public.tour_rate_mode into new.starts_at, new.mode from public.tour_sessions s where s.id = new.session_id;
  end if;
  return new;
end $$;
create trigger tour_orders_start before insert on public.tour_orders for each row execute function app.tour_order_start();
alter table public.tour_orders alter column starts_at set not null;
alter table public.tour_orders alter column mode set not null;
alter table public.tour_orders add constraint session_or_rate check ((session_id is null) <> (rate_id is null));
create index tour_orders_slot_idx on public.tour_orders (rate_id, starts_at);
create index tour_orders_tour_start_idx on public.tour_orders (tour_id, starts_at);

-- ── Pricing, places and the booking window ────────────────────────────────────────────────────────────────
-- Guests on a shared slot: confirmed orders, and unpaid ones still within their hold.
create or replace function app.slot_taken(rate uuid, starts timestamptz) returns integer
language sql stable security definer set search_path = '' as $$
  select coalesce(sum(cardinality(o.ages)), 0)::int from public.tour_orders o
  where o.rate_id = rate and o.starts_at = starts
    and (o.status = 'confirmed' or (o.status = 'awaiting_payment' and o.hold_until > now()));
$$;

create or replace function app.tour_season_pct(mode public.tour_rate_mode, on_day date) returns integer
language sql stable security definer set search_path = '' as $$
  select coalesce(max(s.pct), 0)::int from public.tour_seasons s
  where on_day between s.starts_on and s.ends_on
    and (s.applies = 'all' or s.applies = case when mode in ('transfer', 'assist') then 'transfers' else mode::text end);
$$;

-- The price of a party on a slot, as quoteTour does on the page. Raises with the page's wording when it can't be sold.
create or replace function app.tour_slot_price(r public.tour_rates, guest_ages integer[], starts timestamptz,
  out total bigint, out vehicle text)
language plpgsql stable security definer set search_path = '' as $$
declare
  local timestamp := starts at time zone 'Africa/Cairo';
  n integer := coalesce(cardinality(guest_ages), 0);
  party integer;
  tier jsonb;
  v jsonb;
  hour integer := extract(hour from local);
  pct integer;
begin
  if n = 0 then raise exception 'Add at least one guest.' using errcode = '22023'; end if;
  if not exists (select 1 from unnest(guest_ages) a where a >= 12) then
    raise exception 'Each booking needs a guest aged 12 or over.' using errcode = '22023';
  end if;
  total := 0;
  case r.mode
    when 'shared' then
      if n >= 9 then raise exception 'Parties of 9 or more book the private tour.' using errcode = '22023'; end if;
      if n > r.max_guests then raise exception 'A shared group takes at most % guests.', r.max_guests using errcode = '22023'; end if;
      select sum(case when a >= 12 then (r.prices ->> 'adult')::bigint when a >= 6 then (r.prices ->> 'child611')::bigint
                      when a >= 3 then (r.prices ->> 'child35')::bigint else 0 end)
      into total from unnest(guest_ages) a;
    when 'private' then
      party := (select count(*) from unnest(guest_ages) a where a >= 3);
      select x into tier from jsonb_array_elements(r.prices -> 'tiers') x
      where party >= (x ->> 'min')::int and (coalesce(jsonb_typeof(x -> 'max'), 'null') = 'null' or party <= (x ->> 'max')::int)
      order by (x ->> 'min')::int limit 1;
      if tier is null then raise exception 'There is no private price for this party size.' using errcode = '22023'; end if;
      select sum(case when a >= 12 then (tier ->> 'pp')::bigint
                      when a >= 6 then round((tier ->> 'pp')::numeric * (r.prices ->> 'child_pct')::numeric / 100)::bigint
                      when a >= 3 then round((tier ->> 'pp')::numeric * coalesce((r.prices ->> 'child35_pct')::numeric, 25) / 100)::bigint
                      else 0 end)
      into total from unnest(guest_ages) a;
    when 'transfer' then
      select x into v from jsonb_array_elements(r.prices -> 'vehicles') x
      where (x ->> 'max')::int >= n order by (x ->> 'max')::int limit 1;
      if v is null then raise exception 'No vehicle seats this many guests: send a request instead.' using errcode = '22023'; end if;
      total := (v ->> 'price')::bigint + case when hour >= 22 or hour < 6 then (r.prices ->> 'night_extra')::bigint else 0 end;
      vehicle := v ->> 'name';
    else
      select x into tier from jsonb_array_elements(r.prices -> 'tiers') x
      where (x ->> 'max')::int >= n order by (x ->> 'max')::int limit 1;
      if tier is null then raise exception 'There is no price for a party this size.' using errcode = '22023'; end if;
      total := (tier ->> 'price')::bigint;
  end case;
  pct := app.tour_season_pct(r.mode, local::date);
  if pct <> 0 then total := round(total * (100 + pct) / 100.0)::bigint; end if;
end $$;

-- Is this start on sale? The tour runs that weekday at that time (or any quarter hour when flexible), from the lead time
-- up to 12 months ahead (ADR-097), and the office hasn't closed it.
create or replace function app.slot_problem(r public.tour_rates, starts timestamptz) returns text
language plpgsql stable security definer set search_path = '' as $$
declare
  local timestamp := starts at time zone 'Africa/Cairo';
begin
  if not r.active or not public.tour_is_bookable(r.tour_id) then return 'This tour can''t be booked'; end if;
  if extract(isodow from local)::smallint <> all (r.days) then return 'The tour doesn''t run on that day'; end if;
  if cardinality(r.start_times) > 0 and local::time <> all (r.start_times) then return 'The tour doesn''t start at that time'; end if;
  if cardinality(r.start_times) = 0 and (extract(minute from local)::int % 15 <> 0 or extract(second from local) <> 0) then
    return 'Pick a time on the quarter hour';
  end if;
  if starts < now() + make_interval(hours => r.lead_hours) then
    return format('Book at least %s hours before the start', r.lead_hours);
  end if;
  if starts > now() + interval '12 months' then return 'Book up to 12 months ahead'; end if;
  if exists (select 1 from public.tour_slot_closures c where c.rate_id = r.id and c.starts_at = starts) then
    return 'This start has been cancelled by the office';
  end if;
  return null;
end $$;

-- DASH-ADM-073, ADR-097: a tour is bookable on its old sessions (a supplier, bands and a future session) or on its
-- rates (an office and an active rate; the standard cancellation applies when it sets none).
create or replace function public.tour_is_bookable(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.tours t
    where t.id = target and t.visibility = 'published' and (
      (t.supplier_id is not null and jsonb_array_length(t.cancellation_bands) > 0
        and exists (select 1 from public.tour_sessions s where s.tour_id = t.id and s.status = 'scheduled' and s.starts_at > now()))
      or (t.office_id is not null and exists (select 1 from public.tour_rates r where r.tour_id = t.id and r.active))
    )
  );
$$;

-- Anyone: the price and places for a party on a start (prices are public, ADR-087). Raises when it can't be sold.
create or replace function public.tour_slot_quote(rate uuid, starts timestamptz, guest_ages integer[])
returns table (total_minor bigint, vehicle text, places_left integer)
language plpgsql stable security definer set search_path = '' as $$
declare
  r public.tour_rates;
  problem text;
  p record;
begin
  select * into r from public.tour_rates where id = rate;
  if r.id is null then raise exception 'Rate not found' using errcode = 'P0002'; end if;
  problem := app.slot_problem(r, starts);
  if problem is not null then raise exception '%', problem using errcode = '22023'; end if;
  select * into p from app.tour_slot_price(r, guest_ages, starts);
  total_minor := p.total;
  vehicle := p.vehicle;
  places_left := case when r.mode = 'shared' then greatest(r.max_guests - app.slot_taken(r.id, starts), 0) end;
  return next;
end $$;

-- Anyone: guests booked on each shared start in a range, and the starts the office closed (for the calendar).
create or replace function public.tour_slots(rate uuid, from_day date, to_day date)
returns table (starts_at timestamptz, taken integer, closed boolean)
language sql stable security definer set search_path = '' as $$
  with bounds as (
    select (from_day::timestamp at time zone 'Africa/Cairo') lo, ((to_day + 1)::timestamp at time zone 'Africa/Cairo') hi
  ), booked as (
    select o.starts_at, sum(cardinality(o.ages))::int taken from public.tour_orders o, bounds
    where o.rate_id = rate and o.starts_at >= lo and o.starts_at < hi
      and (o.status = 'confirmed' or (o.status = 'awaiting_payment' and o.hold_until > now()))
      and exists (select 1 from public.tour_rates r where r.id = rate and r.mode = 'shared')
    group by 1
  ), shut as (
    select c.starts_at from public.tour_slot_closures c, bounds where c.rate_id = rate and c.starts_at >= lo and c.starts_at < hi
  )
  select coalesce(b.starts_at, s.starts_at), coalesce(b.taken, 0), s.starts_at is not null
  from booked b full join shut s on s.starts_at = b.starts_at
  where to_day - from_day <= 62;
$$;

-- ── Customer: book a start (DASH-PAY-014, ADR-097) ─────────────────────────────────────────────────────────
create or replace function public.order_tour_slot(rate uuid, starts timestamptz, guest_ages integer[], lead text,
  order_notes text, terms_read boolean)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  r public.tour_rates;
  t public.tours;
  problem text;
  p record;
  new_id uuid;
begin
  if auth.uid() is null then raise exception 'Sign in to order' using errcode = '42501'; end if;
  if not coalesce(terms_read, false) then
    raise exception 'Confirm that you have read the terms and the cancellation policy' using errcode = '22023';
  end if;
  select * into r from public.tour_rates where id = rate;
  if r.id is null then raise exception 'Rate not found' using errcode = 'P0002'; end if;
  -- One booking per slot at a time: two parties can't both take the last places.
  perform pg_advisory_xact_lock(hashtextextended(r.id::text || '@' || starts::text, 0));
  select * into t from public.tours where id = r.tour_id;
  problem := app.slot_problem(r, starts);
  if problem is not null then raise exception '%', problem using errcode = '22023'; end if;
  if guest_ages is null or exists (select 1 from unnest(guest_ages) a where a is null or a < 0 or a > 120) then
    raise exception 'Every guest needs an age' using errcode = '22023';
  end if;
  if t.adults_only and exists (select 1 from unnest(guest_ages) a where a < 18) then
    raise exception 'This tour is for adults only (18 and over)' using errcode = '22023';
  end if;
  select * into p from app.tour_slot_price(r, guest_ages, starts);
  if r.mode = 'shared' and app.slot_taken(r.id, starts) + cardinality(guest_ages) > r.max_guests then
    raise exception 'Only % places left', greatest(r.max_guests - app.slot_taken(r.id, starts), 0) using errcode = '23514';
  end if;
  insert into public.tour_orders (reference, customer_id, tour_id, rate_id, starts_at, mode, vehicle, label, ages, lead_name,
    notes, currency, total_minor, policy, hold_until)
  values (app.new_tour_reference(), auth.uid(), t.id, r.id, starts, r.mode, p.vehicle, nullif(r.label, ''),
    guest_ages::smallint[], trim(lead), nullif(trim(order_notes), ''), r.currency, p.total,
    jsonb_build_object(
      -- ADR-097: free until 48 hours before, then 100 %, unless the tour sets its own.
      'bands', case when jsonb_array_length(t.cancellation_bands) > 0 then t.cancellation_bands
                    else '[{"from_days": 2, "percent": 0}, {"from_days": 0, "percent": 100}]'::jsonb end,
      'terms', (select jsonb_object_agg(locale, cancellation_terms) from public.tour_translations
                where tour_id = t.id and cancellation_terms is not null)),
    now() + interval '60 minutes')
  returning id into new_id;
  return new_id;
end $$;

-- ── Payment: a late payment on a full or closed slot is given back ───────────────────────────────────────────
create or replace function public.service_tour_payment(target uuid, session_id text, intent text, amount bigint, cur text)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  o public.tour_orders;
  s public.tour_sessions;
  r public.tour_rates;
  gone boolean := false;
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception 'Service role only' using errcode = '42501'; end if;
  if exists (select 1 from public.tour_payments where stripe_payment_intent_id = intent) then return 'duplicate'; end if;
  select * into o from public.tour_orders where id = target for update;
  if o.id is null then raise exception 'Tour order not found' using errcode = 'P0002'; end if;
  if o.session_id is not null then
    select * into s from public.tour_sessions where id = o.session_id for update;
    gone := o.hold_until <= now() and (
      (s.kind = 'private' and app.session_active_orders(s.id) > 0)
      or (s.kind = 'shared' and app.session_taken(s.id) + cardinality(o.ages) > s.capacity));
  else
    perform pg_advisory_xact_lock(hashtextextended(o.rate_id::text || '@' || o.starts_at::text, 0));
    select * into r from public.tour_rates where id = o.rate_id;
    gone := exists (select 1 from public.tour_slot_closures c where c.rate_id = o.rate_id and c.starts_at = o.starts_at)
      or (o.hold_until <= now() and r.mode = 'shared' and app.slot_taken(r.id, o.starts_at) + cardinality(o.ages) > r.max_guests);
  end if;
  -- Late (hold over and the places gone), closed, cancelled, wrong amount or currency: give it back.
  if o.status <> 'awaiting_payment' or upper(cur) <> o.currency::text or amount <> o.total_minor or gone then
    return 'refund';
  end if;
  insert into public.tour_payments (order_id, status, amount_minor, currency, stripe_session_id, stripe_payment_intent_id, receipt_number)
  values (o.id, 'verified', amount, upper(cur)::public.currency_code, session_id, intent, app.next_receipt());
  update public.tour_orders set status = 'confirmed' where id = o.id;
  insert into public.notifications (user_id, kind, title, link)
  values (o.customer_id, 'tour.confirmed', 'Tour order ' || o.reference || ' is paid and confirmed', '/dashboard/journey/tours/' || o.id || '/');
  return 'recorded';
end $$;

-- Cancellation days count from the order's own start (rates and sessions alike).
create or replace function app.tour_cancel_quote(o public.tour_orders, on_day date)
returns table (days_before integer, percent integer, charge_minor bigint, paid_minor bigint, refund_minor bigint)
language plpgsql stable security definer set search_path = '' as $$
declare
  pct integer;
  paid bigint;
begin
  days_before := (o.starts_at at time zone 'Africa/Cairo')::date - on_day;
  if days_before < 0 then raise exception 'This tour has already taken place' using errcode = '22023'; end if;
  select (b ->> 'percent')::int into pct from jsonb_array_elements(o.policy -> 'bands') b
  where (b ->> 'from_days')::int <= days_before order by (b ->> 'from_days')::int desc limit 1;
  if pct is null then raise exception 'No cancellation band covers this date' using errcode = '22023'; end if;
  paid := coalesce((select sum(amount_minor) from public.tour_payments where order_id = o.id and status = 'verified'), 0);
  percent := pct;
  charge_minor := floor(o.total_minor * pct / 100.0 + 0.5);
  paid_minor := paid;
  refund_minor := greatest(paid - floor(o.total_minor * pct / 100.0 + 0.5)::bigint, 0);
  return next;
end $$;

-- ── The office: cancel a start it can't run ────────────────────────────────────────────────────────────────
-- Closes the start to new bookings and cancels every order on it: unpaid ones let go, paid ones approved for a full
-- refund that finance issues through the usual refund flow. The customers are told.
create or replace function public.office_cancel_slot(rate uuid, starts timestamptz, why text) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  r public.tour_rates;
  o public.tour_orders;
  paid bigint;
  n integer := 0;
begin
  select * into r from public.tour_rates where id = rate;
  if r.id is null then raise exception 'Rate not found' using errcode = 'P0002'; end if;
  if not (app.is_tour_office_of(r.tour_id) or app.is_tour_admin()) then
    raise exception 'Only the tour''s office cancels its starts' using errcode = '42501';
  end if;
  if coalesce(length(trim(why)), 0) < 3 then raise exception 'Give the reason for cancelling' using errcode = '22023'; end if;
  if starts <= now() then raise exception 'This start has already passed' using errcode = '22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended(r.id::text || '@' || starts::text, 0));
  insert into public.tour_slot_closures (rate_id, starts_at, reason) values (r.id, starts, trim(why)) on conflict do nothing;
  for o in select * from public.tour_orders where rate_id = r.id and starts_at = starts and status <> 'cancelled' for update loop
    paid := coalesce((select sum(amount_minor) from public.tour_payments where order_id = o.id and status = 'verified'), 0);
    update public.tour_orders set status = 'cancelled', cancelled_at = now(),
      cancelled_reason = 'Cancelled by the tour office: ' || trim(why),
      cancel_state = case when paid > 0 then 'approved'::public.tour_cancel_state end,
      cancel_requested_on = case when paid > 0 then (now() at time zone 'Africa/Cairo')::date end,
      cancel_percent = case when paid > 0 then 0 end, cancel_charge_minor = case when paid > 0 then 0 end,
      cancel_refund_minor = case when paid > 0 then paid end,
      cancel_note = case when paid > 0 then 'The office cancelled this start; refunded in full.' end,
      cancel_decided_by = auth.uid(), cancel_decided_at = now()
    where id = o.id;
    insert into public.notifications (user_id, kind, title, link)
    values (o.customer_id, 'tour.cancelled',
      'Tour order ' || o.reference || ' is cancelled by the tour office' || case when paid > 0 then '; you will be refunded in full' else '' end,
      '/dashboard/journey/tours/' || o.id || '/');
    n := n + 1;
  end loop;
  return n;
end $$;

-- ── Access ───────────────────────────────────────────────────────────────────────────────────────────────────
alter table public.tour_rates enable row level security;
alter table public.tour_seasons enable row level security;
alter table public.tour_slot_closures enable row level security;

-- Prices are public with a published tour (ADR-087).
create policy "tour_rates: with tour" on public.tour_rates for select to anon, authenticated
  using (app.tour_is_public(tour_id) or app.is_admin() or app.is_tour_office_of(tour_id));
create policy "tour_rates: tour admins write" on public.tour_rates for all to authenticated
  using (app.is_tour_admin()) with check (app.is_tour_admin());
create policy "tour_seasons: anyone reads" on public.tour_seasons for select to anon, authenticated using (true);
create policy "tour_seasons: tour admins write" on public.tour_seasons for all to authenticated
  using (app.is_tour_admin()) with check (app.is_tour_admin());
create policy "tour_slot_closures: the office and admins" on public.tour_slot_closures for select to authenticated
  using (app.is_admin() or exists (select 1 from public.tour_rates r where r.id = rate_id and app.is_tour_office_of(r.tour_id)));

-- The office reads its own tours (published or not) and their bookings; never payments.
create policy "tours: the office reads its own" on public.tours for select to authenticated using (app.is_tour_office_of(id));
create policy "tour_orders: the tour's office" on public.tour_orders for select to authenticated using (app.is_tour_office_of(tour_id));

grant select on public.tour_rates, public.tour_seasons to anon;
grant select, insert, update, delete on public.tour_rates, public.tour_seasons to authenticated, service_role;
grant select on public.tour_slot_closures to authenticated;
grant select, insert, update, delete on public.tour_slot_closures to service_role;

revoke execute on function app.valid_tour_prices(public.tour_rate_mode, jsonb), app.slot_taken(uuid, timestamptz),
  app.tour_season_pct(public.tour_rate_mode, date), app.tour_slot_price(public.tour_rates, integer[], timestamptz),
  app.slot_problem(public.tour_rates, timestamptz), app.check_tour_office(), app.tour_order_start() from public, anon, authenticated;
grant execute on function app.valid_tour_prices(public.tour_rate_mode, jsonb) to authenticated, service_role;
revoke execute on function public.tour_slot_quote(uuid, timestamptz, integer[]), public.tour_slots(uuid, date, date),
  public.order_tour_slot(uuid, timestamptz, integer[], text, text, boolean), public.office_cancel_slot(uuid, timestamptz, text) from public;
grant execute on function public.tour_slot_quote(uuid, timestamptz, integer[]), public.tour_slots(uuid, date, date)
  to anon, authenticated, service_role;
grant execute on function public.order_tour_slot(uuid, timestamptz, integer[], text, text, boolean),
  public.office_cancel_slot(uuid, timestamptz, text) to authenticated;

create trigger audit_tour_rates after insert or update or delete on public.tour_rates for each row execute function app.audit_row();
create trigger audit_tour_seasons after insert or update or delete on public.tour_seasons for each row execute function app.audit_row();
create trigger audit_tour_slot_closures after insert or update or delete on public.tour_slot_closures for each row execute function app.audit_row();
