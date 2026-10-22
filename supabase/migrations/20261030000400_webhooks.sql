-- Vessel onboarding spec, gap 5 (ADR-103): webhooks to operators' own systems.
-- An operator's owner (or a catalogue admin) sets one https address. Three events go to it:
--   inventory.changed   availability for a sailing and cabin type changed here (a booking, a hold, a sheet, an answer);
--                       not echoed back when the operator's own feed or API call set it
--   hold.expired        a hold ended without a booking
--   booking.confirmed   a reservation is confirmed (paid); cabins, guests by age, lead nationality, never names
-- Deliveries are queued here and sent by the scheduler's tick (src/server/connections/webhooks.ts), signed with
-- Nilecruz's Ed25519 key, retried with back-off for 24 hours. Several changes to one sailing and cabin type waiting to be
-- sent are merged into one delivery carrying the latest figures.

create table public.webhook_endpoints (
  org_id uuid primary key references public.organisations (id) on delete cascade,
  url text not null check (url ~ '^https://[^\s/?#@]+(/[^\s]*)?$' and length(url) <= 500),
  active boolean not null default true,
  last_sent_at timestamptz,
  last_error text check (length(last_error) <= 500),
  last_error_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger webhook_endpoints_updated_at before update on public.webhook_endpoints for each row execute function app.set_updated_at();

create table public.webhook_deliveries (
  -- Also the event id the operator sees (Nilecruz-Event-Id), so a retried delivery can be recognised.
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations (id) on delete cascade,
  event text not null check (event in ('inventory.changed', 'hold.expired', 'booking.confirmed')),
  -- Deliveries with the same key, still waiting, are merged.
  dedupe_key text check (length(dedupe_key) <= 200),
  payload jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  attempts smallint not null default 0,
  next_attempt_at timestamptz not null default now(),
  last_status smallint,
  last_error text check (length(last_error) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz
);
create unique index webhook_deliveries_merge_idx on public.webhook_deliveries (org_id, dedupe_key)
  where status = 'pending' and dedupe_key is not null;
create index webhook_deliveries_due_idx on public.webhook_deliveries (next_attempt_at) where status = 'pending';
create index webhook_deliveries_org_idx on public.webhook_deliveries (org_id, created_at desc);
create trigger webhook_deliveries_updated_at before update on public.webhook_deliveries for each row execute function app.set_updated_at();

create or replace function app.queue_webhook(target_org uuid, ev text, key text, data jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.webhook_endpoints where org_id = target_org and active) then return; end if;
  insert into public.webhook_deliveries (org_id, event, dedupe_key, payload)
  values (target_org, ev, key, data || jsonb_build_object('occurred_at', now()))
  on conflict (org_id, dedupe_key) where status = 'pending' and dedupe_key is not null
  do update set payload = excluded.payload;
end $$;

-- What the operator's system needs to find the sailing and cabin type: the ship's slug, the date, the schedule and
-- cabin codes, as in format v1 (ADR-080).
create or replace function app.webhook_sailing(dep uuid, cab uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('vessel', v.slug, 'date', d.departs_on, 'schedule', s.code, 'cabin', c.code)
  from public.departures d join public.vessels v on v.id = d.vessel_id join public.schedules s on s.id = d.schedule_id
  join public.cabin_types c on c.id = cab
  where d.id = dep;
$$;

-- ── inventory.changed ────────────────────────────────────────────────────────────────────────────────────────
-- The figures as they are now; queued again (and merged) by every change to availability or holds, so the last
-- change of a transaction leaves the right numbers.
create or replace function app.queue_inventory_webhook(dep uuid, cab uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  i public.inventory;
begin
  select * into i from public.inventory where departure_id = dep and cabin_type_id = cab;
  if i.departure_id is null then return; end if;
  perform app.queue_webhook((select operator_org_id from public.vessels where id = i.vessel_id), 'inventory.changed',
    'inventory:' || dep || ':' || cab,
    app.webhook_sailing(dep, cab) || jsonb_build_object(
      'available', i.available, 'source', i.source, 'confirmed_at', i.confirmed_at,
      'held', coalesce((select sum(h.cabins) from public.holds h
                        where h.departure_id = dep and h.cabin_type_id = cab and h.status = 'active'), 0),
      'booking_mode', app.cabin_mode(dep, cab)));
end $$;

create or replace function app.webhook_inventory() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and new.available = old.available and new.source = old.source and new.confirmed_at = old.confirmed_at then
    return null;
  end if;
  -- The operator's own feed or API call: it already knows.
  if new.source in ('feed', 'api') and (tg_op = 'INSERT' or new.confirmed_at is distinct from old.confirmed_at) then
    return null;
  end if;
  perform app.queue_inventory_webhook(new.departure_id, new.cabin_type_id);
  return null;
end $$;
create trigger inventory_webhook after insert or update on public.inventory
  for each row execute function app.webhook_inventory();

create or replace function app.webhook_hold_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform app.queue_inventory_webhook(new.departure_id, new.cabin_type_id);
  return null;
end $$;
create trigger holds_inventory_webhook after insert or update of status on public.holds
  for each row execute function app.webhook_hold_change();

-- ── hold.expired ─────────────────────────────────────────────────────────────────────────────────────────────
create or replace function app.webhook_hold() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform app.queue_webhook(new.org_id, 'hold.expired', null,
    app.webhook_sailing(new.departure_id, new.cabin_type_id) || jsonb_build_object(
      'hold_id', new.id, 'cabins', new.cabins, 'expired_at', new.ended_at,
      'booking_request', (select r.reference from public.booking_requests r where r.id = new.booking_request_id)));
  return null;
end $$;
create trigger holds_webhook after update of status on public.holds
  for each row when (new.status = 'expired' and old.status = 'active') execute function app.webhook_hold();

-- ── booking.confirmed ────────────────────────────────────────────────────────────────────────────────────────
create or replace function app.webhook_booking() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform app.queue_webhook(new.org_id, 'booking.confirmed', null, jsonb_build_object(
    'reference', new.reference,
    'vessel', (select slug from public.vessels where id = new.vessel_id),
    'date', (select departs_on from public.departures where id = new.departure_id),
    'schedule', (select s.code from public.departures d join public.schedules s on s.id = d.schedule_id where d.id = new.departure_id),
    'currency', new.currency, 'total_minor', new.total_minor,
    'channel', case when new.buyer_org_id is not null then 'travel_partner' else 'nilecruz' end,
    'lead_nationality', (select p.nationality from public.passengers p where p.reservation_id = new.id and p.position = 1),
    'cabins', (select coalesce(jsonb_agg(jsonb_build_object('cabin', c.code, 'adults', rc.adults, 'child_ages', to_jsonb(rc.child_ages),
                 'from_allotment', rc.allotment_id is not null) order by rc.line), '[]'::jsonb)
               from public.reservation_cabins rc join public.cabin_types c on c.id = rc.cabin_type_id
               where rc.reservation_id = new.id)));
  return null;
end $$;
create trigger reservations_webhook after update of status on public.reservations
  for each row when (new.status = 'confirmed' and old.status is distinct from 'confirmed') execute function app.webhook_booking();

-- ── Sending (service role, from the tick) ────────────────────────────────────────────────────────────────────
-- Claims what's due, at most `n`, for two minutes, so an overlapping tick doesn't send it twice. A delivery whose
-- address was removed or switched off, or that has waited 24 hours, fails here.
create or replace function public.service_claim_webhooks(n integer default 50)
returns table (id uuid, org_id uuid, event text, payload jsonb, created_at timestamptz, attempts smallint, url text)
language plpgsql security definer set search_path = '' as $$
begin
  update public.webhook_deliveries w set status = 'failed', last_error = 'No active webhook address, or not delivered within 24 hours'
  where w.status = 'pending' and (w.created_at < now() - interval '24 hours'
    or not exists (select 1 from public.webhook_endpoints e where e.org_id = w.org_id and e.active));
  return query
  with due as (
    select w.id from public.webhook_deliveries w
    where w.status = 'pending' and w.next_attempt_at <= now()
    order by w.next_attempt_at limit least(greatest(n, 1), 200)
    for update skip locked
  )
  update public.webhook_deliveries w set next_attempt_at = now() + interval '2 minutes'
  from due, public.webhook_endpoints e
  where w.id = due.id and e.org_id = w.org_id
  returning w.id, w.org_id, w.event, w.payload, w.created_at, w.attempts, e.url;
end $$;

-- After 1 failure wait 1 minute, then 5, 15, 60 minutes, then every 3 hours, until 24 hours have passed.
create or replace function public.service_webhook_result(target uuid, ok boolean, http_status integer, error text default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  w public.webhook_deliveries;
  wait interval;
begin
  select * into w from public.webhook_deliveries where id = target for update;
  if w.id is null or w.status <> 'pending' then return; end if;
  if ok then
    update public.webhook_deliveries set status = 'sent', sent_at = now(), attempts = attempts + 1, last_status = http_status,
      last_error = null where id = w.id;
    update public.webhook_endpoints set last_sent_at = now() where org_id = w.org_id;
    return;
  end if;
  wait := case w.attempts when 0 then interval '1 minute' when 1 then interval '5 minutes' when 2 then interval '15 minutes'
    when 3 then interval '1 hour' else interval '3 hours' end;
  update public.webhook_deliveries set attempts = attempts + 1, last_status = http_status, last_error = left(error, 500),
    status = case when now() + wait > created_at + interval '24 hours' then 'failed' else 'pending' end,
    next_attempt_at = now() + wait
  where id = w.id;
  update public.webhook_endpoints set last_error = left(error, 500), last_error_at = now() where org_id = w.org_id;
end $$;

-- Sent and failed deliveries are kept 30 days, for the operator's connection health.
create or replace function app.prune_webhook_deliveries() returns void
language sql security definer set search_path = '' as $$
  delete from public.webhook_deliveries where status <> 'pending' and created_at < now() - interval '30 days';
$$;
select cron.schedule('nilecruz-prune-webhooks', '29 3 * * *', 'select app.prune_webhook_deliveries()');

-- ── The tick also runs when a webhook is due (same as 20261024000100 otherwise) ──────────────────────────────
create or replace function app.request_booking_tick() returns text
language plpgsql security definer set search_path = '' as $$
declare
  target text;
  secret text;
  ts text := extract(epoch from now())::bigint::text;
  digest boolean := extract(hour from now() at time zone 'Africa/Cairo') = 9 and extract(minute from now() at time zone 'Africa/Cairo') < 1;
begin
  select decrypted_secret into target from vault.decrypted_secrets where name = 'requests_tick_url';
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'feed_pull_secret';
  if target is null or secret is null then return 'not configured'; end if;
  if not digest and not exists (select 1 from public.service_due_booking_requests_internal())
     and not exists (select 1 from public.notifications where email_status = 'pending'
                     or (email_status = 'failed' and email_attempts < 3 and created_at > now() - interval '1 day'))
     and not exists (select 1 from public.webhook_deliveries where status = 'pending' and next_attempt_at <= now()) then
    return 'nothing due';
  end if;
  perform net.http_post(
    url := target,
    body := jsonb_build_object('digest', digest),
    headers := jsonb_build_object('Content-Type', 'application/json', 'Nilecruz-Timestamp', ts,
      'Nilecruz-Signature', encode(extensions.hmac('requests-tick.' || ts, secret, 'sha256'), 'hex')),
    timeout_milliseconds := 55000);
  return 'requested';
end $$;

-- ── Access ───────────────────────────────────────────────────────────────────────────────────────────────────
alter table public.webhook_endpoints enable row level security;
alter table public.webhook_deliveries enable row level security;
create policy "webhook_endpoints: the team and admins read" on public.webhook_endpoints for select to authenticated
  using (app.is_admin() or app.can_read_connections(org_id));
create policy "webhook_endpoints: owners and catalogue admins write" on public.webhook_endpoints for all to authenticated
  using (app.can_manage_connections(org_id)) with check (app.can_manage_connections(org_id));
create policy "webhook_deliveries: the team and admins read" on public.webhook_deliveries for select to authenticated
  using (app.is_admin() or app.can_read_connections(org_id));
grant select, insert, update, delete on public.webhook_endpoints to authenticated, service_role;
grant select on public.webhook_deliveries to authenticated, service_role;

revoke execute on function app.queue_webhook(uuid, text, text, jsonb), app.webhook_sailing(uuid, uuid), app.webhook_inventory(),
  app.queue_inventory_webhook(uuid, uuid), app.webhook_hold_change(), app.webhook_hold(), app.webhook_booking(), app.prune_webhook_deliveries() from public, anon, authenticated;
revoke execute on function public.service_claim_webhooks(integer), public.service_webhook_result(uuid, boolean, integer, text)
  from public, anon, authenticated;
grant execute on function public.service_claim_webhooks(integer), public.service_webhook_result(uuid, boolean, integer, text)
  to service_role;

create trigger audit_webhook_endpoints after insert or update or delete on public.webhook_endpoints
  for each row execute function app.audit_row();
