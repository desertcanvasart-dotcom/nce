-- Operator loop, Part A (docs/briefs/BATCH-08-OPERATOR-LOOP.md, ADR-099): booking requests answered with one tap.
-- A booking request is for one sailing: its cabins and guests, as a direct booking would be. The operator's reservations
-- contacts get one message by email (and WhatsApp, when switched on) with four signed actions: confirm, decline, hold for
-- 72 hours, offer something else. Every answer is timed and writes availability through app.apply_inventory_rows with
-- source `tap`. Confirming makes the reservation through the same path as a direct booking; the customer then pays as
-- today. Operators see guest counts and the lead's nationality, never names, until the booking is confirmed.

update public.platform_settings set value = value || '{"tap": 2, "sheet": 168}'::jsonb where key = 'freshness_hours';

-- ── Contacts: people who answer requests or send sheets; no login needed ────────────────────────────────────
create table public.operator_contacts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations (id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 120),
  email text check (email is null or email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  -- International format, e.g. +201001234567.
  whatsapp text check (whatsapp is null or whatsapp ~ '^\+[1-9][0-9]{7,14}$'),
  -- Gets booking requests; sends vacancy sheets (Part B).
  reservations boolean not null default true,
  sheets boolean not null default false,
  -- WhatsApp only messages a number that agreed to it.
  whatsapp_opt_in_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (email is not null or whatsapp is not null)
);
create index operator_contacts_org_idx on public.operator_contacts (org_id);
create trigger operator_contacts_updated_at before update on public.operator_contacts for each row execute function app.set_updated_at();

-- Per operator: how quickly Nilecruz expects an answer (admins set it).
create table public.operator_settings (
  org_id uuid primary key references public.organisations (id) on delete cascade,
  reply_sla_hours smallint not null default 6 check (reply_sla_hours between 1 and 72),
  updated_at timestamptz not null default now()
);
create trigger operator_settings_updated_at before update on public.operator_settings for each row execute function app.set_updated_at();
create or replace function app.reply_sla_hours(target_org uuid) returns integer
language sql stable security definer set search_path = '' as $$
  select coalesce((select reply_sla_hours from public.operator_settings where org_id = target_org), 6)::int;
$$;

-- ── Booking requests ────────────────────────────────────────────────────────────────────────────────────────
create type public.booking_request_status as enum ('waiting', 'held', 'confirmed', 'declined', 'alternative_offered', 'expired', 'withdrawn');

create table public.booking_requests (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique check (reference ~ '^NQ-[A-HJ-NP-Z2-9]{6}$'),
  customer_id uuid not null references auth.users (id) on delete restrict,
  org_id uuid not null references public.organisations (id) on delete restrict,
  vessel_id uuid not null references public.vessels (id) on delete restrict,
  departure_id uuid not null references public.departures (id) on delete restrict,
  currency public.currency_code not null check (currency in ('USD', 'EUR')),
  -- The published price when asked; confirming prices it again at the same rate.
  total_minor bigint not null check (total_minor > 0),
  -- [{"cabin_type_id": …, "ages": [40, 38]}], as customer_reserve takes them.
  cabins jsonb not null check (jsonb_typeof(cabins) = 'array' and jsonb_array_length(cabins) between 1 and 5),
  guest_count smallint not null check (guest_count between 1 and 30),
  lead_nationality text check (lead_nationality ~ '^[A-Z]{2}$'),
  -- What our data showed for each cabin type when the request was made: [{cabin_type_id, available, source, confirmed_at}].
  shown jsonb not null default '[]'::jsonb,
  status public.booking_request_status not null default 'waiting',
  hold_until timestamptz,
  -- Cabins taken by a hold, per cabin type, so expiry gives back exactly those.
  held jsonb,
  -- The first answer, for reply-time metrics; the latest answer and how it came.
  responded_at timestamptz,
  response text check (response in ('confirm', 'decline', 'hold', 'other')),
  response_channel text check (response_channel in ('email', 'whatsapp', 'dashboard')),
  responded_contact uuid references public.operator_contacts (id) on delete set null,
  -- Offer other: {"departure_id"?, "cabin_type_id"?, "cabins", "note"}.
  alternative jsonb,
  reservation_id uuid references public.reservations (id) on delete set null,
  reminded_at timestamptz,
  escalated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'held' or hold_until is not null),
  check (status <> 'confirmed' or reservation_id is not null)
);
create index booking_requests_org_idx on public.booking_requests (org_id, created_at desc);
create index booking_requests_customer_idx on public.booking_requests (customer_id, created_at desc);
create index booking_requests_open_idx on public.booking_requests (status) where status in ('waiting', 'held');
create trigger booking_requests_updated_at before update on public.booking_requests for each row execute function app.set_updated_at();

-- Guests' names and birth dates: the customer and admins only (the operator gets them with the confirmed reservation).
create table public.booking_request_guests (
  request_id uuid primary key references public.booking_requests (id) on delete cascade,
  guests jsonb not null check (jsonb_typeof(guests) = 'array')
);

-- Every message sent (or not, when a channel is off), for the record and for tests.
create table public.outbound_messages (
  id uuid primary key default gen_random_uuid(),
  channel text not null check (channel in ('email', 'whatsapp')),
  kind text not null check (kind ~ '^[a-z_.]+$'),
  to_address text not null check (length(to_address) <= 320),
  subject text check (length(subject) <= 300),
  body_text text check (length(body_text) <= 20000),
  org_id uuid references public.organisations (id) on delete set null,
  booking_request_id uuid references public.booking_requests (id) on delete set null,
  status text not null check (status in ('sent', 'skipped', 'failed')),
  provider_id text check (length(provider_id) <= 200),
  error text check (length(error) <= 1000),
  created_at timestamptz not null default now()
);
create index outbound_messages_request_idx on public.outbound_messages (booking_request_id);
create index outbound_messages_org_idx on public.outbound_messages (org_id, created_at desc);

-- Signed action links are single use.
create table public.used_action_tokens (
  token_hash text primary key check (token_hash ~ '^[0-9a-f]{64}$'),
  request_id uuid not null references public.booking_requests (id) on delete cascade,
  used_at timestamptz not null default now()
);

create or replace function app.new_request_reference() returns text
language plpgsql volatile set search_path = '' as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  ref text;
begin
  loop
    ref := 'NQ-' || (select string_agg(substr(alphabet, 1 + (get_byte(b, i) % 32), 1), '')
                     from (select extensions.gen_random_bytes(6) b) x, generate_series(0, 5) i);
    exit when not exists (select 1 from public.booking_requests where reference = ref);
  end loop;
  return ref;
end $$;

-- ── Shared: check a booking's cabins and guests and price it (as customer_reserve always has) ─────────────────
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
begin
  if cur not in ('USD', 'EUR') then raise exception 'Bookings at the published rate are in US$ or €' using errcode = '22023'; end if;
  if jsonb_typeof(cabins) <> 'array' or jsonb_array_length(cabins) = 0 or jsonb_array_length(cabins) > 5 then
    raise exception 'Choose 1 to 5 cabins; for more, send a request for offers' using errcode = '22023';
  end if;
  for c in select value from jsonb_array_elements(cabins) loop
    if not exists (select 1 from public.cabin_types ct where ct.id = (c ->> 'cabin_type_id')::uuid and ct.vessel_id = d.vessel_id and ct.active) then
      raise exception 'That cabin type isn''t on this ship' using errcode = '22023';
    end if;
    ages := array(select (x)::int from jsonb_array_elements_text(c -> 'ages') x);
    select * into priced from app.public_cabin_price(d.id, (c ->> 'cabin_type_id')::uuid, cur, ages);
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

-- An operator's answer changes availability through the one write path, with source `tap`, confirmed now.
create or replace function app.tap_inventory(d public.departures, cab uuid, new_available integer) returns void
language plpgsql security definer set search_path = '' as $$
declare
  outcome jsonb;
  v public.vessels;
begin
  select * into v from public.vessels where id = d.vessel_id;
  outcome := app.apply_inventory_rows(v.operator_org_id, 'tap', jsonb_build_array(jsonb_build_object(
    'vessel', v.slug, 'date', d.departs_on, 'schedule', (select code from public.schedules where id = d.schedule_id),
    'cabin', (select code from public.cabin_types where id = cab), 'available', greatest(new_available, 0),
    'confirmed_at', now())), false);
  if (outcome ->> 'failed')::int > 0 then
    raise exception 'Availability couldn''t be updated: %', outcome -> 'results' -> 0 -> 'messages' using errcode = '22023';
  end if;
end $$;

-- Make the reservation. A direct booking takes cabins from fresh availability; a booking the operator confirmed takes
-- them through `tap` (the operator has just said they exist), unless a hold already took them.
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
  need record;
  inv public.inventory;
  pol uuid;
  line integer := 0;
  pos integer := 0;
  cab public.cabin_types;
begin
  total := app.check_direct_booking(d, cur, cabins, guests);
  select * into v from public.vessels where id = d.vessel_id;
  for need in
    select (x ->> 'cabin_type_id')::uuid as cabin_type_id, count(*)::int as n from jsonb_array_elements(cabins) x
    group by 1 order by 1
  loop
    select * into inv from public.inventory where departure_id = d.id and cabin_type_id = need.cabin_type_id for update;
    if by_operator then
      if not already_taken then perform app.tap_inventory(d, need.cabin_type_id, coalesce(inv.available, 0) - need.n); end if;
    else
      if inv.departure_id is null or inv.available < need.n then
        raise exception 'Not enough cabins left. Nothing was booked.' using errcode = '23514';
      end if;
      if not app.inventory_is_fresh(inv.confirmed_at, inv.source) then
        raise exception 'Availability for this sailing is being confirmed. Try again shortly.' using errcode = '22023';
      end if;
      update public.inventory set available = available - need.n where departure_id = d.id and cabin_type_id = need.cabin_type_id;
    end if;
  end loop;

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
  values (customer, 'reservation.new',
    case when by_operator then 'The operator confirmed your cabins: reservation ' || ref || ' is made. You can pay now.'
         else 'Reservation ' || ref || ' is made. Payment details follow.' end,
    '/dashboard/journey/reservations/' || res_id || '/');
end $$;

-- Direct booking at the published rate (DASH-PUB-009): unchanged behaviour, now through app.make_reservation.
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
  select * into made from app.make_reservation(auth.uid(), d, cur, cabins, guests, false);
  return made.ref;
end $$;

-- ── Customer: ask the operator to confirm ───────────────────────────────────────────────────────────────────
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
  if d.id is null or not public.departure_bookable(d.id) then
    raise exception 'This sailing can''t be requested right now' using errcode = '22023';
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

-- ── The operator's answer (signed link, WhatsApp button or dashboard) ───────────────────────────────────────
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
begin
  if act not in ('confirm', 'decline', 'hold', 'other') then raise exception 'Unknown answer' using errcode = '22023'; end if;
  select * into r from public.booking_requests where id = req for update;
  if r.id is null then raise exception 'Booking request not found' using errcode = 'P0002'; end if;
  -- Already answered (or a hold being held again): nothing changes; the page shows the recorded answer.
  if r.status not in ('waiting', 'held') or (act = 'hold' and r.status = 'held') then
    return jsonb_build_object('status', r.status, 'reference', r.reference, 'changed', false);
  end if;
  select * into d from public.departures where id = r.departure_id;
  update public.booking_requests set responded_at = coalesce(responded_at, now()), response = act, response_channel = channel,
    responded_contact = coalesce(contact, responded_contact) where id = r.id;

  if act = 'confirm' then
    select * into made from app.make_reservation(r.customer_id, d, r.currency::text, r.cabins,
      (select guests from public.booking_request_guests where request_id = r.id), true, r.status = 'held');
    update public.booking_requests set status = 'confirmed', reservation_id = made.res_id, hold_until = null where id = r.id;
  elsif act = 'decline' then
    -- Their answer is the newest word on these cabin types: none free.
    for need in select distinct (c ->> 'cabin_type_id')::uuid cab from jsonb_array_elements(r.cabins) c loop
      perform app.tap_inventory(d, need.cab, 0);
    end loop;
    update public.booking_requests set status = 'declined', hold_until = null, held = null where id = r.id;
    insert into public.notifications (user_id, kind, title, link)
    values (r.customer_id, 'booking_request.declined', 'The operator can''t offer the cabins for ' || r.reference || '. See other dates.',
      '/dashboard/journey/requests/booking/' || r.id || '/');
  elsif act = 'hold' then
    for need in
      select (c ->> 'cabin_type_id')::uuid cab, count(*)::int n from jsonb_array_elements(r.cabins) c group by 1 order by 1
    loop
      select * into inv from public.inventory where departure_id = d.id and cabin_type_id = need.cab for update;
      taken := taken || jsonb_build_object(need.cab::text, least(coalesce(inv.available, 0), need.n));
      perform app.tap_inventory(d, need.cab, coalesce(inv.available, 0) - need.n);
    end loop;
    update public.booking_requests set status = 'held', hold_until = now() + interval '72 hours', held = taken where id = r.id;
    insert into public.notifications (user_id, kind, title, link)
    values (r.customer_id, 'booking_request.held', 'The operator is holding your cabins for ' || r.reference || ' while they confirm',
      '/dashboard/journey/requests/booking/' || r.id || '/');
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
    -- A hold on the original cabins goes back.
    if r.status = 'held' then perform app.release_hold(r); end if;
    update public.booking_requests set status = 'alternative_offered', hold_until = null, held = null,
      alternative = jsonb_strip_nulls(jsonb_build_object('departure_id', alt ->> 'departure_id', 'cabin_type_id', alt ->> 'cabin_type_id',
        'cabins', (alt ->> 'cabins')::int, 'note', left(nullif(trim(alt ->> 'note'), ''), 500)))
    where id = r.id;
    insert into public.notifications (user_id, kind, title, link)
    values (r.customer_id, 'booking_request.alternative', 'The operator offers something else for ' || r.reference,
      '/dashboard/journey/requests/booking/' || r.id || '/');
  end if;
  select * into r from public.booking_requests where id = req;
  return jsonb_build_object('status', r.status, 'reference', r.reference, 'changed', true, 'reservation_id', r.reservation_id);
end $$;

-- Give back the cabins a hold took.
create or replace function app.release_hold(r public.booking_requests) returns void
language plpgsql security definer set search_path = '' as $$
declare
  d public.departures;
  k text;
  inv public.inventory;
begin
  select * into d from public.departures where id = r.departure_id;
  for k in select jsonb_object_keys(coalesce(r.held, '{}'::jsonb)) loop
    select * into inv from public.inventory where departure_id = d.id and cabin_type_id = k::uuid for update;
    if d.departs_on > (now() at time zone 'Africa/Cairo')::date then
      perform app.tap_inventory(d, k::uuid, coalesce(inv.available, 0) + (r.held ->> k)::int);
    end if;
  end loop;
end $$;

-- Service role: an answer from a verified signed link or WhatsApp button (no signed-in person).
create or replace function public.service_answer_booking_request(req uuid, act text, channel text, contact uuid default null,
  alt jsonb default null, token_hash text default null)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  answer jsonb;
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception 'Service role only' using errcode = '42501'; end if;
  if channel not in ('email', 'whatsapp') then raise exception 'Email or WhatsApp only' using errcode = '22023'; end if;
  if token_hash is not null then
    if exists (select 1 from public.used_action_tokens where used_action_tokens.token_hash = service_answer_booking_request.token_hash) then
      select jsonb_build_object('status', status, 'reference', reference, 'changed', false) into answer from public.booking_requests where id = req;
      return answer;
    end if;
    insert into public.used_action_tokens (token_hash, request_id) values (service_answer_booking_request.token_hash, req);
  end if;
  return app.answer_booking_request(req, act, channel, contact, alt);
end $$;

-- The operator's team answers in the dashboard.
create or replace function public.operator_answer_booking_request(req uuid, act text, alt jsonb default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  owner_org uuid;
begin
  select org_id into owner_org from public.booking_requests where id = req;
  if owner_org is null or not (app.has_org_role(owner_org, array['owner', 'reservations']::public.team_role[]) or app.is_catalogue_admin()) then
    raise exception 'Booking request not found' using errcode = 'P0002';
  end if;
  return app.answer_booking_request(req, act, 'dashboard', null, alt);
end $$;

-- The customer takes the operator's other offer (same number of cabins and guests): booked as confirmed by the operator.
create or replace function public.customer_accept_alternative(req uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  r public.booking_requests;
  d public.departures;
  cabins jsonb;
  made record;
begin
  select * into r from public.booking_requests where id = req and customer_id = auth.uid() for update;
  if r.id is null then raise exception 'Booking request not found' using errcode = 'P0002'; end if;
  if r.status <> 'alternative_offered' then raise exception 'There is no other offer to accept' using errcode = '22023'; end if;
  if (r.alternative ->> 'cabins')::int <> jsonb_array_length(r.cabins) then
    raise exception 'The operator offers % cabins: send a new request with your party in them', r.alternative ->> 'cabins' using errcode = '22023';
  end if;
  select * into d from public.departures where id = coalesce((r.alternative ->> 'departure_id')::uuid, r.departure_id);
  cabins := (select jsonb_agg(case when r.alternative ? 'cabin_type_id' then c || jsonb_build_object('cabin_type_id', r.alternative ->> 'cabin_type_id') else c end)
             from jsonb_array_elements(r.cabins) c);
  select * into made from app.make_reservation(r.customer_id, d, r.currency::text, cabins,
    (select guests from public.booking_request_guests where request_id = r.id), true);
  update public.booking_requests set status = 'confirmed', reservation_id = made.res_id where id = r.id;
  return made.res_id;
end $$;

create or replace function public.customer_withdraw_booking_request(req uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  r public.booking_requests;
begin
  select * into r from public.booking_requests where id = req and customer_id = auth.uid() for update;
  if r.id is null then raise exception 'Booking request not found' using errcode = 'P0002'; end if;
  if r.status not in ('waiting', 'held', 'alternative_offered') then raise exception 'This request is already closed' using errcode = '22023'; end if;
  if r.status = 'held' then perform app.release_hold(r); end if;
  update public.booking_requests set status = 'withdrawn', hold_until = null, held = null where id = r.id;
end $$;

-- Holds past 72 hours go back; requests nobody answered in 7 days (the links' life) expire. Every 15 minutes.
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
    insert into public.notifications (user_id, kind, title, link)
    values (r.customer_id, 'booking_request.expired', 'Booking request ' || r.reference || ' has expired without a confirmation',
      '/dashboard/journey/requests/booking/' || r.id || '/');
    n := n + 1;
  end loop;
  return n;
end $$;
select cron.schedule('nilecruz-expire-booking-requests', '*/15 * * * *', 'select app.expire_booking_requests()');

-- ── Reply times: reminders and escalations (the app sends them; the scheduler asks it every 5 minutes) ─────────
create or replace function public.service_due_booking_requests()
returns table (request_id uuid, org_id uuid, due text)
language sql stable security definer set search_path = '' as $$
  select r.id, r.org_id,
    case when r.escalated_at is null and r.created_at <= now() - make_interval(hours => 2 * app.reply_sla_hours(r.org_id)) then 'escalate'
         else 'remind' end
  from public.booking_requests r
  where coalesce(auth.role(), '') = 'service_role' and r.status = 'waiting'
    and ((r.reminded_at is null and r.created_at <= now() - make_interval(hours => app.reply_sla_hours(r.org_id)))
      or (r.escalated_at is null and r.created_at <= now() - make_interval(hours => 2 * app.reply_sla_hours(r.org_id))));
$$;

create or replace function public.service_mark_booking_request(req uuid, what text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception 'Service role only' using errcode = '42501'; end if;
  if what = 'remind' then update public.booking_requests set reminded_at = now() where id = req;
  elsif what = 'escalate' then update public.booking_requests set reminded_at = coalesce(reminded_at, now()), escalated_at = now() where id = req;
  else raise exception 'Unknown mark' using errcode = '22023'; end if;
end $$;

create or replace function app.request_booking_tick() returns text
language plpgsql security definer set search_path = '' as $$
declare
  target text;
  secret text;
  ts text := extract(epoch from now())::bigint::text;
  digest boolean := extract(hour from now() at time zone 'Africa/Cairo') = 9 and extract(minute from now() at time zone 'Africa/Cairo') < 5;
begin
  select decrypted_secret into target from vault.decrypted_secrets where name = 'requests_tick_url';
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'feed_pull_secret';
  if target is null or secret is null then return 'not configured'; end if;
  if not digest and not exists (select 1 from public.service_due_booking_requests_internal()) then return 'nothing due'; end if;
  perform net.http_post(
    url := target,
    body := jsonb_build_object('digest', digest),
    headers := jsonb_build_object('Content-Type', 'application/json', 'Nilecruz-Timestamp', ts,
      'Nilecruz-Signature', encode(extensions.hmac('requests-tick.' || ts, secret, 'sha256'), 'hex')),
    timeout_milliseconds := 55000);
  return 'requested';
end $$;
-- The scheduler's own check (not limited to the service role).
create or replace function public.service_due_booking_requests_internal() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select r.id from public.booking_requests r
  where r.status = 'waiting'
    and ((r.reminded_at is null and r.created_at <= now() - make_interval(hours => app.reply_sla_hours(r.org_id)))
      or (r.escalated_at is null and r.created_at <= now() - make_interval(hours => 2 * app.reply_sla_hours(r.org_id))));
$$;
select cron.schedule('nilecruz-booking-request-tick', '*/5 * * * *', 'select app.request_booking_tick()');

-- ── Metrics over the last 90 days ───────────────────────────────────────────────────────────────────────────
-- Answered requests, median reply in minutes, share answered within the reply time, and how often an operator declined
-- when our data had shown the cabins free (a data-accuracy score). "Confirmed within X hours" for the site: the median
-- rounded up to the hour, at least 4; 24 until 5 requests are answered.
create or replace function app.operator_reply_stats(target_org uuid)
returns table (answered integer, median_minutes numeric, within_sla_pct numeric, shown_free integer, shown_free_declined integer,
  decline_rate_pct numeric, confirm_within_hours integer)
language sql stable security definer set search_path = '' as $$
  with a as (
    select r.*, extract(epoch from (r.responded_at - r.created_at)) / 60 as minutes,
      not exists (
        select 1 from (select (c ->> 'cabin_type_id') cab, count(*) n from jsonb_array_elements(r.cabins) c group by 1) need
        left join lateral (select (s ->> 'available')::int av from jsonb_array_elements(r.shown) s where s ->> 'cabin_type_id' = need.cab) sh on true
        where coalesce(sh.av, 0) < need.n) as was_free
    from public.booking_requests r
    where r.org_id = target_org and r.responded_at is not null and r.created_at > now() - interval '90 days'
  )
  select count(*)::int,
    round((percentile_cont(0.5) within group (order by minutes))::numeric, 1),
    round(100.0 * count(*) filter (where minutes <= 60 * app.reply_sla_hours(target_org)) / nullif(count(*), 0), 1),
    count(*) filter (where was_free)::int,
    count(*) filter (where was_free and response = 'decline')::int,
    round(100.0 * count(*) filter (where was_free and response = 'decline') / nullif(count(*) filter (where was_free), 0), 1),
    case when count(*) < 5 then 24 else greatest(4, ceil((percentile_cont(0.5) within group (order by minutes)) / 60))::int end
  from a;
$$;
create or replace function public.operator_reply_stats(target_org uuid)
returns table (answered integer, median_minutes numeric, within_sla_pct numeric, shown_free integer, shown_free_declined integer,
  decline_rate_pct numeric, confirm_within_hours integer)
language sql stable security definer set search_path = '' as $$
  select * from app.operator_reply_stats(target_org) where app.can_read_connections(target_org);
$$;
-- Anyone: the hours a customer waits for the operator's confirmation.
create or replace function public.operator_confirm_hours(target_org uuid) returns integer
language sql stable security definer set search_path = '' as $$
  select confirm_within_hours from app.operator_reply_stats(target_org);
$$;

-- ── Access ───────────────────────────────────────────────────────────────────────────────────────────────────
alter table public.operator_contacts enable row level security;
alter table public.operator_settings enable row level security;
alter table public.booking_requests enable row level security;
alter table public.booking_request_guests enable row level security;
alter table public.outbound_messages enable row level security;
alter table public.used_action_tokens enable row level security;

create policy "operator_contacts: the team and admins read" on public.operator_contacts for select to authenticated
  using (app.can_read_connections(org_id));
create policy "operator_contacts: owners and catalogue admins write" on public.operator_contacts for all to authenticated
  using (app.can_manage_connections(org_id)) with check (app.can_manage_connections(org_id));
create policy "operator_settings: the team and admins read" on public.operator_settings for select to authenticated
  using (app.can_read_connections(org_id));
create policy "operator_settings: catalogue admins write" on public.operator_settings for all to authenticated
  using (app.is_catalogue_admin()) with check (app.is_catalogue_admin());
create policy "booking_requests: the customer, the operator's team and admins" on public.booking_requests for select to authenticated
  using (customer_id = auth.uid() or app.is_admin()
    or app.has_org_role(org_id, array['owner', 'reservations', 'finance', 'viewer']::public.team_role[]));
create policy "booking_request_guests: the customer and admins" on public.booking_request_guests for select to authenticated
  using (app.is_admin() or exists (select 1 from public.booking_requests r where r.id = request_id and r.customer_id = auth.uid()));
create policy "outbound_messages: admins" on public.outbound_messages for select to authenticated using (app.is_admin());
create policy "used_action_tokens: admins" on public.used_action_tokens for select to authenticated using (app.is_admin());

grant select, insert, update, delete on public.operator_contacts, public.operator_settings to authenticated, service_role;
grant select on public.booking_requests, public.booking_request_guests, public.outbound_messages to authenticated;
grant select, insert, update, delete on public.booking_requests, public.booking_request_guests, public.outbound_messages,
  public.used_action_tokens to service_role;

revoke execute on function app.reply_sla_hours(uuid), app.new_request_reference(), app.check_direct_booking(public.departures, text, jsonb, jsonb),
  app.tap_inventory(public.departures, uuid, integer), app.make_reservation(uuid, public.departures, text, jsonb, jsonb, boolean, boolean),
  app.answer_booking_request(uuid, text, text, uuid, jsonb), app.release_hold(public.booking_requests), app.expire_booking_requests(),
  app.request_booking_tick(), app.operator_reply_stats(uuid) from public, anon, authenticated;
revoke execute on function public.customer_request_booking(uuid, text, jsonb, jsonb, boolean),
  public.service_answer_booking_request(uuid, text, text, uuid, jsonb, text), public.operator_answer_booking_request(uuid, text, jsonb),
  public.customer_accept_alternative(uuid), public.customer_withdraw_booking_request(uuid), public.service_due_booking_requests(),
  public.service_mark_booking_request(uuid, text), public.service_due_booking_requests_internal(),
  public.operator_reply_stats(uuid), public.operator_confirm_hours(uuid) from public, anon;
grant execute on function public.customer_request_booking(uuid, text, jsonb, jsonb, boolean), public.operator_answer_booking_request(uuid, text, jsonb),
  public.customer_accept_alternative(uuid), public.customer_withdraw_booking_request(uuid), public.operator_reply_stats(uuid)
  to authenticated;
revoke execute on function public.service_answer_booking_request(uuid, text, text, uuid, jsonb, text), public.service_due_booking_requests(),
  public.service_mark_booking_request(uuid, text), public.service_due_booking_requests_internal() from authenticated;
grant execute on function public.service_answer_booking_request(uuid, text, text, uuid, jsonb, text), public.service_due_booking_requests(),
  public.service_mark_booking_request(uuid, text), public.service_due_booking_requests_internal() to service_role;
grant execute on function public.operator_confirm_hours(uuid) to anon, authenticated, service_role;

create trigger audit_operator_contacts after insert or update or delete on public.operator_contacts for each row execute function app.audit_row();
create trigger audit_operator_settings after insert or update or delete on public.operator_settings for each row execute function app.audit_row();
create trigger audit_booking_requests after insert or update or delete on public.booking_requests for each row execute function app.audit_row();
