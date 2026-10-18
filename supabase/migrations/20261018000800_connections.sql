-- Batch 4c-2: inventory connections (DASH-ADM-006, 045–047, DASH-OPR-016, 024–027, SEC-007–009, ADR-080, ADR-081, ADR-085).
-- Paste, feed and API all end in one function, app.apply_inventory_rows, so every route checks a row the same way.
-- Operators' teams read their own connections; owners change them through the functions below; admins read all and
-- catalogue admins approve feeds. Feed and API writes come from the server's service role only.

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

-- ── Feeds (DASH-OPR-025, DASH-ADM-047, SEC-007) ────────────────────────────────────────────────────────────
create type public.feed_status as enum ('pending', 'active', 'paused', 'rejected');
create table public.inventory_feeds (
  id uuid primary key default gen_random_uuid(),
  -- One feed per company; it lists every vessel of the company (format v1 "cruises").
  org_id uuid not null unique references public.organisations (id) on delete cascade,
  -- https only (SEC-007). Private and internal addresses are refused by the server after DNS resolution.
  url text not null check (url ~ '^https://[^[:space:]]+$' and length(url) <= 2000),
  status public.feed_status not null default 'pending',
  status_reason text check (length(status_reason) <= 500),
  decided_by uuid references auth.users (id) on delete set null,
  decided_at timestamptz,
  requested_by uuid references auth.users (id) on delete set null,
  -- Health (DASH-OPR-027): written only by the service role.
  last_attempt_at timestamptz,
  last_success_at timestamptz,
  last_error text check (length(last_error) <= 1000),
  last_rows_changed integer,
  consecutive_failures integer not null default 0,
  next_pull_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger inventory_feeds_updated_at before update on public.inventory_feeds for each row execute function app.set_updated_at();
create index inventory_feeds_due_idx on public.inventory_feeds (next_pull_at) where status = 'active';

-- ── API keys (DASH-OPR-026, SEC-008, ADR-085) ───────────────────────────────────────────────────────────────
-- Requests are signed with an Ed25519 private key that only the operator holds. Nilecruz stores the public key,
-- which can verify a signature but never make one, so nothing stored here lets anyone call the API.
create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations (id) on delete cascade,
  key_id text not null unique check (key_id ~ '^nck_[0-9a-f]{20}$'),
  public_key text not null check (public_key ~ '^[A-Za-z0-9+/]{43}=$'),
  label text not null check (length(trim(label)) between 1 and 80),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid references auth.users (id) on delete set null
);
create index api_keys_org_idx on public.api_keys (org_id);

-- Idempotency (SEC-009): one row per company and key; a repeated call gets the stored answer and changes nothing.
create table public.api_idempotency (
  org_id uuid not null references public.organisations (id) on delete cascade,
  idempotency_key text not null check (idempotency_key ~ '^[A-Za-z0-9_.:-]{8,100}$'),
  api_key_id uuid references public.api_keys (id) on delete set null,
  body_sha256 text not null check (body_sha256 ~ '^[0-9a-f]{64}$'),
  status_code smallint,
  response jsonb,
  created_at timestamptz not null default now(),
  primary key (org_id, idempotency_key)
);

-- ── Runs: every paste, pull and API call (DASH-OPR-027) ─────────────────────────────────────────────────────
create type public.inventory_run_status as enum ('previewed', 'applied', 'discarded', 'failed');
create table public.inventory_runs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations (id) on delete cascade,
  source public.inventory_source not null check (source <> 'manual'),
  feed_id uuid references public.inventory_feeds (id) on delete set null,
  api_key_id uuid references public.api_keys (id) on delete set null,
  status public.inventory_run_status not null,
  label text check (length(label) <= 200),
  -- A pasted preview keeps its rows until it is applied or discarded; then they are cleared.
  rows jsonb,
  -- Previews keep every row's result; applied runs keep only the rows that were not applied (at most 200).
  results jsonb not null default '[]'::jsonb,
  rows_received integer not null default 0,
  rows_changed integer not null default 0,
  rows_unchanged integer not null default 0,
  rows_skipped integer not null default 0,
  rows_failed integer not null default 0,
  error text check (length(error) <= 1000),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
create index inventory_runs_org_idx on public.inventory_runs (org_id, created_at desc);

-- Availability changes are logged; a refresh that only re-confirms the same number is not (it happens hourly).
drop trigger audit_inventory on public.inventory;
create trigger audit_inventory_insert_delete after insert or delete on public.inventory
  for each row execute function app.audit_row();
create trigger audit_inventory_update after update on public.inventory
  for each row when (old.available is distinct from new.available) execute function app.audit_row();
create trigger audit_inventory_feeds after insert or update or delete on public.inventory_feeds
  for each row execute function app.audit_row();
create trigger audit_api_keys after insert or update or delete on public.api_keys
  for each row execute function app.audit_row();

-- ── Who may do what ─────────────────────────────────────────────────────────────────────────────────────────
-- Owners of an approved operator, and catalogue admins, manage connections (DASH-OPR-016; nav: owners only).
create or replace function app.can_manage_connections(target_org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select app.is_catalogue_admin() or exists (
    select 1 from public.organisations o
    where o.id = target_org and o.kind = 'operator' and o.status = 'approved'
      and app.has_org_role(o.id, array['owner']::public.team_role[])
  );
$$;
create or replace function app.can_read_connections(target_org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select app.is_admin() or app.has_org_role(target_org, array['owner', 'reservations', 'finance', 'viewer']::public.team_role[]);
$$;
revoke execute on function app.can_manage_connections(uuid), app.can_read_connections(uuid) from public, anon;
grant execute on function app.can_manage_connections(uuid), app.can_read_connections(uuid) to authenticated, service_role;

alter table public.inventory_feeds enable row level security;
alter table public.api_keys enable row level security;
alter table public.api_idempotency enable row level security;
alter table public.inventory_runs enable row level security;

create policy "inventory_feeds: team and admins read" on public.inventory_feeds for select to authenticated
  using (app.can_read_connections(org_id));
create policy "api_keys: team and admins read" on public.api_keys for select to authenticated
  using (app.can_read_connections(org_id));
create policy "inventory_runs: team and admins read" on public.inventory_runs for select to authenticated
  using (app.can_read_connections(org_id));
-- Only the service role (which bypasses RLS) uses idempotency records; signed-in people get nothing.
create policy "api_idempotency: service role only" on public.api_idempotency for select to authenticated using (false);

-- Reads only; every change goes through the functions below (or the service role).
grant select on public.inventory_feeds, public.api_keys, public.inventory_runs to authenticated;
grant select, insert, update, delete on public.inventory_feeds, public.api_keys, public.inventory_runs,
  public.api_idempotency to service_role;

-- ── The one place a row of availability and prices is checked and written ──────────────────────────────────
-- rows: the normalised rows produced by the server from format v1 (src/lib/connections/format.ts):
--   { label, vessel (slug), date, schedule?, cabin (code), available, confirmed_at?, rates: [{occupancy, plan,
--     currency, amount_minor}], errors: [], warnings: [] }
-- Returns { total, changed, unchanged, skipped, failed, results: [{ i, label, status, messages, … }] }.
-- status: new | changed | unchanged (re-confirmed) | skipped (Nilecruz has newer data) | error.
create or replace function app.apply_inventory_rows(target_org uuid, src public.inventory_source, input jsonb, dry_run boolean)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  r jsonb;
  rt jsonb;
  results jsonb := '[]'::jsonb;
  msgs text[];
  warns text[];
  st text;
  v_id uuid;
  v_name text;
  dep_id uuid;
  dep_status public.departure_status;
  dep_count integer;
  dep_date date;
  cab public.cabin_types;
  inv public.inventory;
  conf timestamptz;
  avail integer;
  occ integer;
  plan_txt text;
  cur text;
  amt bigint;
  old_amt bigint;
  changed boolean;
  seen text[] := '{}';
  rate_seen text[];
  k text;
  cairo_today date := (now() at time zone 'Africa/Cairo')::date;
  n integer := 0;
  n_changed integer := 0;
  n_unchanged integer := 0;
  n_skipped integer := 0;
  n_failed integer := 0;
begin
  if jsonb_typeof(input) is distinct from 'array' then
    raise exception 'Rows must be a list' using errcode = '22023';
  end if;
  if jsonb_array_length(input) > 5000 then
    raise exception 'At most 5,000 rows at a time' using errcode = '22023';
  end if;

  for r in select value from jsonb_array_elements(input) loop
    n := n + 1;
    msgs := array(select jsonb_array_elements_text(coalesce(r -> 'errors', '[]'::jsonb)));
    warns := array(select jsonb_array_elements_text(coalesce(r -> 'warnings', '[]'::jsonb)));
    st := null; v_id := null; v_name := null; dep_id := null; cab := null; inv := null; changed := false; avail := null;

    if cardinality(msgs) = 0 then
      select v.id, v.name into v_id, v_name from public.vessels v
      where v.operator_org_id = target_org and v.slug = lower(r ->> 'vessel');
      if v_id is null then
        msgs := msgs || format('No vessel “%s” belongs to your company. Use the vessel’s Nilecruz address name (slug).', r ->> 'vessel');
      end if;
    end if;

    if cardinality(msgs) = 0 then
      dep_date := (r ->> 'date')::date;
      select count(*)::int, (array_agg(d.id order by d.status, s.code))[1], (array_agg(d.status order by d.status, s.code))[1]
        into dep_count, dep_id, dep_status
      from public.departures d join public.schedules s on s.id = d.schedule_id
      where d.vessel_id = v_id and d.departs_on = dep_date
        and (r ->> 'schedule' is null or s.code = r ->> 'schedule');
      if dep_count = 0 then
        msgs := msgs || case when r ->> 'schedule' is null
          then format('%s has no sailing on %s. Departures come from the schedules in your dashboard.', v_name, dep_date)
          else format('%s has no sailing on %s in schedule “%s”.', v_name, dep_date, r ->> 'schedule') end;
      elsif dep_count > 1 and r ->> 'schedule' is null then
        msgs := msgs || format('%s has %s sailings on %s. Add the schedule code to say which one.', v_name, dep_count, dep_date);
      elsif dep_status = 'cancelled' then
        msgs := msgs || format('The %s sailing on %s is cancelled.', v_name, dep_date);
      elsif dep_date < cairo_today then
        msgs := msgs || format('The %s sailing on %s has already left.', v_name, dep_date);
      end if;
    end if;

    if cardinality(msgs) = 0 then
      select * into cab from public.cabin_types c where c.vessel_id = v_id and c.code = r ->> 'cabin';
      if cab.id is null then
        msgs := msgs || format('%s has no cabin type with the code “%s”.', v_name, r ->> 'cabin');
      elsif not cab.active then
        msgs := msgs || format('Cabin type “%s” is switched off for %s.', cab.code, v_name);
      end if;
    end if;

    if cardinality(msgs) = 0 then
      k := dep_id::text || '/' || cab.id::text;
      if k = any (seen) then
        msgs := msgs || 'This sailing and cabin type appear earlier in the same data; only the first is used.'::text;
      else
        seen := seen || k;
      end if;
      avail := (r ->> 'available')::int;
      conf := coalesce((r ->> 'confirmed_at')::timestamptz, now());
      if conf > now() + interval '5 minutes' then
        msgs := msgs || 'The confirmation time is in the future. Send the time the availability was last checked.'::text;
      end if;
    end if;

    if cardinality(msgs) = 0 then
      select * into inv from public.inventory i where i.departure_id = dep_id and i.cabin_type_id = cab.id;
      if inv.departure_id is not null and inv.confirmed_at > conf then
        st := 'skipped';
        warns := warns || format('Not applied: Nilecruz already has availability confirmed later (%s, %s).',
          to_char(inv.confirmed_at at time zone 'Africa/Cairo', 'DD Mon YYYY HH24:MI'), inv.source);
      end if;
    end if;

    if cardinality(msgs) = 0 and st is null then
      rate_seen := '{}';
      for rt in select value from jsonb_array_elements(coalesce(r -> 'rates', '[]'::jsonb)) loop
        occ := (rt ->> 'occupancy')::int;
        plan_txt := rt ->> 'plan';
        cur := rt ->> 'currency';
        amt := (rt ->> 'amount_minor')::bigint;
        k := occ || '/' || plan_txt || '/' || cur;
        if k = any (rate_seen) then
          msgs := msgs || format('The %s rate for %s guest(s) in %s is given twice.', plan_txt, occ, cur);
        end if;
        rate_seen := rate_seen || k;
        if occ > cab.max_occupancy then
          msgs := msgs || format('Cabin type “%s” sleeps at most %s; a rate for %s guests can’t be used.', cab.code, cab.max_occupancy, occ);
        end if;
        if cur = 'EGP' and plan_txt not in ('egyptian_citizen', 'foreign_resident') then
          msgs := msgs || 'E£ prices are only for the Egyptian-citizen and foreign-resident plans.'::text;
        end if;
        if cardinality(msgs) = 0 then
          select x.amount_minor into old_amt from public.rates x
          where x.departure_id = dep_id and x.cabin_type_id = cab.id and x.occupancy = occ
            and x.rate_plan = plan_txt::public.rate_plan and x.currency = cur::public.currency_code;
          if old_amt is distinct from amt then changed := true; end if;
        end if;
      end loop;
    end if;

    if cardinality(msgs) > 0 then
      st := 'error';
      n_failed := n_failed + 1;
    elsif st = 'skipped' then
      n_skipped := n_skipped + 1;
    else
      if inv.departure_id is null then
        st := 'new';
      elsif changed or inv.available <> avail then
        st := 'changed';
      else
        st := 'unchanged';
      end if;
      if st = 'unchanged' then n_unchanged := n_unchanged + 1; else n_changed := n_changed + 1; end if;

      if not dry_run then
        insert into public.inventory (departure_id, cabin_type_id, vessel_id, available, confirmed_at, source)
        values (dep_id, cab.id, v_id, avail, conf, src)
        on conflict (departure_id, cabin_type_id) do update
          set available = excluded.available, confirmed_at = excluded.confirmed_at, source = excluded.source;
        insert into public.rates as x (departure_id, cabin_type_id, vessel_id, occupancy, rate_plan, currency, amount_minor)
        select dep_id, cab.id, v_id, (j.rt ->> 'occupancy')::smallint, (j.rt ->> 'plan')::public.rate_plan,
               (j.rt ->> 'currency')::public.currency_code, (j.rt ->> 'amount_minor')::bigint
        from jsonb_array_elements(coalesce(r -> 'rates', '[]'::jsonb)) j(rt)
        on conflict (departure_id, cabin_type_id, occupancy, rate_plan, currency) do update
          set amount_minor = excluded.amount_minor
          where x.amount_minor is distinct from excluded.amount_minor;
      end if;
    end if;

    results := results || jsonb_build_object(
      'i', n, 'label', r ->> 'label', 'status', st, 'messages', to_jsonb(msgs || warns),
      'vessel', coalesce(v_name, r ->> 'vessel'), 'date', r ->> 'date', 'cabin', r ->> 'cabin', 'available', avail,
      'rates', jsonb_array_length(coalesce(r -> 'rates', '[]'::jsonb)));
  end loop;

  return jsonb_build_object('total', n, 'changed', n_changed, 'unchanged', n_unchanged, 'skipped', n_skipped,
    'failed', n_failed, 'results', results);
end $$;
revoke execute on function app.apply_inventory_rows(uuid, public.inventory_source, jsonb, boolean) from public, anon, authenticated;

-- Results kept on an applied run: the rows that need the operator's attention.
create or replace function app.attention_rows(outcome jsonb) returns jsonb
language sql immutable set search_path = '' as $$
  select coalesce(jsonb_agg(x), '[]'::jsonb)
  from jsonb_array_elements(outcome -> 'results') x
  where x ->> 'status' in ('error', 'skipped') or jsonb_array_length(x -> 'messages') > 0;
$$;
create or replace function app.first_rows(rows jsonb, keep integer) returns jsonb
language sql immutable set search_path = '' as $$
  select coalesce(jsonb_agg(x order by o), '[]'::jsonb) from jsonb_array_elements(rows) with ordinality t(x, o) where o <= keep;
$$;
revoke execute on function app.attention_rows(jsonb), app.first_rows(jsonb, integer) from public, anon;

-- A plain-words summary of rows that could not be applied, for the health panel.
create or replace function app.rows_problem(outcome jsonb) returns text
language sql immutable set search_path = '' as $$
  select case when (outcome ->> 'failed')::int > 0 then
    format('%s of %s rows could not be applied. First problem: %s', outcome ->> 'failed', outcome ->> 'total',
      (select x -> 'messages' ->> 0 from jsonb_array_elements(outcome -> 'results') x where x ->> 'status' = 'error' limit 1))
  end;
$$;
revoke execute on function app.rows_problem(jsonb) from public, anon;

-- ── Paste (DASH-OPR-024): preview, then apply ───────────────────────────────────────────────────────────────
create or replace function public.preview_inventory_paste(target_org uuid, input jsonb, label text default null)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  outcome jsonb;
  run_id uuid;
begin
  if not app.can_manage_connections(target_org) then
    raise exception 'Only the company’s owners can change inventory connections' using errcode = '42501';
  end if;
  outcome := app.apply_inventory_rows(target_org, 'paste', input, true);
  insert into public.inventory_runs (org_id, source, status, label, rows, results, rows_received, rows_changed,
    rows_unchanged, rows_skipped, rows_failed)
  values (target_org, 'paste', 'previewed', left(label, 200), input, outcome -> 'results', (outcome ->> 'total')::int,
    (outcome ->> 'changed')::int, (outcome ->> 'unchanged')::int, (outcome ->> 'skipped')::int, (outcome ->> 'failed')::int)
  returning id into run_id;
  return run_id;
end $$;

create or replace function public.apply_inventory_paste(run uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  rr public.inventory_runs;
  outcome jsonb;
begin
  select * into rr from public.inventory_runs where id = run for update;
  if rr.id is null or not app.can_manage_connections(rr.org_id) then
    raise exception 'Preview not found' using errcode = 'P0002';
  end if;
  if rr.status <> 'previewed' then
    raise exception 'This preview was already applied or discarded' using errcode = '22023';
  end if;
  if rr.created_at < now() - interval '2 hours' then
    raise exception 'This preview is more than two hours old. Paste the data again to check it against today’s sailings.'
      using errcode = '22023';
  end if;
  -- Checked again now: sailings or newer availability may have changed since the preview.
  outcome := app.apply_inventory_rows(rr.org_id, 'paste', rr.rows, false);
  update public.inventory_runs set status = 'applied', rows = null, results = app.first_rows(app.attention_rows(outcome), 200),
    rows_received = (outcome ->> 'total')::int, rows_changed = (outcome ->> 'changed')::int,
    rows_unchanged = (outcome ->> 'unchanged')::int, rows_skipped = (outcome ->> 'skipped')::int,
    rows_failed = (outcome ->> 'failed')::int, error = app.rows_problem(outcome), finished_at = now()
  where id = run;
  perform app.log_event('inventory.paste_applied', 'inventory_runs', run::text, null,
    outcome - 'results', jsonb_build_object('org_id', rr.org_id));
  return outcome - 'results';
end $$;

create or replace function public.discard_inventory_paste(run uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  owner_org uuid;
begin
  select org_id into owner_org from public.inventory_runs where id = run and status = 'previewed';
  if owner_org is null or not app.can_manage_connections(owner_org) then
    raise exception 'Preview not found' using errcode = 'P0002';
  end if;
  update public.inventory_runs set status = 'discarded', rows = null, finished_at = now() where id = run;
end $$;

-- ── Feeds: the operator proposes, an admin decides (DASH-ADM-047) ───────────────────────────────────────────
create or replace function public.save_inventory_feed(target_org uuid, feed_url text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  cur public.inventory_feeds;
begin
  if not app.can_manage_connections(target_org) then
    raise exception 'Only the company’s owners can change inventory connections' using errcode = '42501';
  end if;
  select * into cur from public.inventory_feeds where org_id = target_org for update;
  if cur.id is null then
    insert into public.inventory_feeds (org_id, url, requested_by) values (target_org, feed_url, auth.uid());
  elsif cur.url is distinct from feed_url then
    -- A new address needs a new approval: an approval is for one address, not for whatever replaces it.
    update public.inventory_feeds set url = feed_url, status = 'pending', status_reason = null, decided_by = null,
      decided_at = null, requested_by = auth.uid(), next_pull_at = null, consecutive_failures = 0
    where id = cur.id;
  end if;
end $$;

create or replace function public.remove_inventory_feed(target_org uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not app.can_manage_connections(target_org) then
    raise exception 'Only the company’s owners can change inventory connections' using errcode = '42501';
  end if;
  delete from public.inventory_feeds where org_id = target_org;
end $$;

create or replace function public.decide_inventory_feed(target_org uuid, decision public.feed_status, reason text default null)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not app.is_catalogue_admin() then
    raise exception 'Only catalogue admins approve inventory feeds' using errcode = '42501';
  end if;
  if decision = 'pending' then
    raise exception 'Choose approve, pause or reject' using errcode = '22023';
  end if;
  if decision in ('paused', 'rejected') and coalesce(length(trim(reason)), 0) = 0 then
    raise exception 'Give the operator a reason' using errcode = '22023';
  end if;
  update public.inventory_feeds
  set status = decision, status_reason = nullif(trim(reason), ''), decided_by = auth.uid(), decided_at = now(),
      next_pull_at = case when decision = 'active' then now() end,
      consecutive_failures = case when decision = 'active' then 0 else consecutive_failures end
  where org_id = target_org;
  if not found then raise exception 'This operator has no feed' using errcode = 'P0002'; end if;
end $$;

-- ── API keys (SEC-008): at most two active, so a new one can be rolled out before the old one is revoked ───
create or replace function public.create_api_key(target_org uuid, key_label text, key_public text)
returns table (id uuid, key_id text)
language plpgsql security definer set search_path = '' as $$
declare
  active_count integer;
begin
  if not exists (
    select 1 from public.organisations o where o.id = target_org and o.kind = 'operator' and o.status = 'approved'
  ) or not app.has_org_role(target_org, array['owner']::public.team_role[]) then
    raise exception 'Only the company’s owners can create API keys' using errcode = '42501';
  end if;
  perform 1 from public.organisations where organisations.id = target_org for update;
  select count(*) into active_count from public.api_keys k where k.org_id = target_org and k.revoked_at is null;
  if active_count >= 2 then
    raise exception 'Two keys are already active. Revoke the old one before creating another.' using errcode = '23514';
  end if;
  return query
  insert into public.api_keys as k (org_id, key_id, public_key, label, created_by)
  values (target_org, 'nck_' || encode(extensions.gen_random_bytes(10), 'hex'), key_public, trim(key_label), auth.uid())
  returning k.id, k.key_id;
end $$;

create or replace function public.revoke_api_key(target uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  owner_org uuid;
begin
  select org_id into owner_org from public.api_keys where id = target and revoked_at is null;
  if owner_org is null then raise exception 'Key not found or already revoked' using errcode = 'P0002'; end if;
  if not (app.is_catalogue_admin() or app.has_org_role(owner_org, array['owner']::public.team_role[])) then
    raise exception 'Only the company’s owners or catalogue admins can revoke keys' using errcode = '42501';
  end if;
  update public.api_keys set revoked_at = now(), revoked_by = auth.uid() where id = target;
end $$;

-- A third active key is refused even if written directly (the service role, a future function).
create or replace function app.check_active_keys() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.revoked_at is null and (
    select count(*) from public.api_keys k where k.org_id = new.org_id and k.revoked_at is null and k.id <> new.id
  ) >= 2 then
    raise exception 'At most two API keys can be active' using errcode = '23514';
  end if;
  if tg_op = 'UPDATE' and old.revoked_at is not null and new.revoked_at is null then
    raise exception 'A revoked key stays revoked' using errcode = '23514';
  end if;
  if tg_op = 'UPDATE' and (new.public_key <> old.public_key or new.key_id <> old.key_id or new.org_id <> old.org_id) then
    raise exception 'A key can’t be changed, only revoked' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger api_keys_check before insert or update on public.api_keys for each row execute function app.check_active_keys();

-- ── Service role: feeds and API calls (no signed-in person) ────────────────────────────────────────────────
create or replace function public.service_apply_inventory(target_org uuid, src public.inventory_source, input jsonb,
  feed uuid default null, api_key uuid default null, run_label text default null)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  outcome jsonb;
  run_id uuid;
  problem text;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Service role only' using errcode = '42501';
  end if;
  if src not in ('feed', 'api') then raise exception 'Feed or API only' using errcode = '22023'; end if;
  if not exists (select 1 from public.organisations where id = target_org and kind = 'operator' and status = 'approved') then
    raise exception 'This operator is not approved' using errcode = '42501';
  end if;
  outcome := app.apply_inventory_rows(target_org, src, input, false);
  problem := app.rows_problem(outcome);
  insert into public.inventory_runs (org_id, source, feed_id, api_key_id, status, label, results, rows_received, rows_changed,
    rows_unchanged, rows_skipped, rows_failed, error, created_by, finished_at)
  values (target_org, src, feed, api_key, 'applied', left(run_label, 200), app.first_rows(app.attention_rows(outcome), 200),
    (outcome ->> 'total')::int, (outcome ->> 'changed')::int, (outcome ->> 'unchanged')::int,
    (outcome ->> 'skipped')::int, (outcome ->> 'failed')::int, problem, null, now())
  returning id into run_id;
  if feed is not null then
    update public.inventory_feeds set last_attempt_at = now(), last_success_at = now(), last_error = problem,
      last_rows_changed = (outcome ->> 'changed')::int, consecutive_failures = 0, next_pull_at = now() + interval '1 hour'
    where id = feed and org_id = target_org;
  end if;
  return (outcome - 'results') || jsonb_build_object('run_id', run_id,
    'problems', app.first_rows(app.attention_rows(outcome), 200));
end $$;

-- A pull that failed before any row could be read (address, network, format). Backs off to every 2 hours after
-- three failures in a row (the nile-cruise-marketplace feed spec, §2.2).
create or replace function public.service_record_feed_failure(feed uuid, problem text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  f public.inventory_feeds;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Service role only' using errcode = '42501';
  end if;
  update public.inventory_feeds set last_attempt_at = now(), last_error = left(problem, 1000),
    consecutive_failures = consecutive_failures + 1,
    next_pull_at = now() + case when consecutive_failures + 1 >= 3 then interval '2 hours' else interval '1 hour' end
  where id = feed returning * into f;
  if f.id is null then return; end if;
  insert into public.inventory_runs (org_id, source, feed_id, status, label, error, created_by, finished_at)
  values (f.org_id, 'feed', f.id, 'failed', 'Feed pull', left(problem, 1000), null, now());
end $$;

-- Takes up to `max_feeds` due feeds and holds them for 15 minutes, so overlapping runs never pull a feed twice.
create or replace function public.service_claim_due_feeds(max_feeds integer default 10)
returns table (id uuid, org_id uuid, url text)
language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Service role only' using errcode = '42501';
  end if;
  return query
  with due as (
    select f.id from public.inventory_feeds f
    join public.organisations o on o.id = f.org_id and o.status = 'approved'
    where f.status = 'active' and f.next_pull_at <= now()
    order by f.next_pull_at
    limit greatest(1, least(max_feeds, 50))
    for update of f skip locked
  )
  update public.inventory_feeds f set next_pull_at = now() + interval '15 minutes'
  from due where f.id = due.id
  returning f.id, f.org_id, f.url;
end $$;

-- ── Functions people and the server may call ───────────────────────────────────────────────────────────────
revoke execute on function public.preview_inventory_paste(uuid, jsonb, text), public.apply_inventory_paste(uuid),
  public.discard_inventory_paste(uuid), public.save_inventory_feed(uuid, text), public.remove_inventory_feed(uuid),
  public.decide_inventory_feed(uuid, public.feed_status, text), public.create_api_key(uuid, text, text),
  public.revoke_api_key(uuid), public.service_apply_inventory(uuid, public.inventory_source, jsonb, uuid, uuid, text),
  public.service_record_feed_failure(uuid, text), public.service_claim_due_feeds(integer) from public, anon;
grant execute on function public.preview_inventory_paste(uuid, jsonb, text), public.apply_inventory_paste(uuid),
  public.discard_inventory_paste(uuid), public.save_inventory_feed(uuid, text), public.remove_inventory_feed(uuid),
  public.decide_inventory_feed(uuid, public.feed_status, text), public.create_api_key(uuid, text, text),
  public.revoke_api_key(uuid) to authenticated;
revoke execute on function public.service_apply_inventory(uuid, public.inventory_source, jsonb, uuid, uuid, text),
  public.service_record_feed_failure(uuid, text), public.service_claim_due_feeds(integer) from authenticated;
grant execute on function public.service_apply_inventory(uuid, public.inventory_source, jsonb, uuid, uuid, text),
  public.service_record_feed_failure(uuid, text), public.service_claim_due_feeds(integer) to service_role;

-- ── The hourly pull (ADR-081) ──────────────────────────────────────────────────────────────────────────────
-- Every five minutes the scheduler asks the site to pull the feeds that are due (each feed is due hourly).
-- The call is signed with a shared secret: HMAC-SHA256 of "feed-pull.<unix time>". The site address and the
-- secret live in Supabase Vault ("feed_pull_url", "feed_pull_secret"); until both exist, nothing is sent.
create or replace function app.request_feed_pull() returns text
language plpgsql security definer set search_path = '' as $$
declare
  target text;
  secret text;
  ts text := extract(epoch from now())::bigint::text;
begin
  select decrypted_secret into target from vault.decrypted_secrets where name = 'feed_pull_url';
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'feed_pull_secret';
  if target is null or secret is null then return 'not configured'; end if;
  if not exists (select 1 from public.inventory_feeds where status = 'active' and next_pull_at <= now()) then
    return 'nothing due';
  end if;
  perform net.http_post(
    url := target,
    body := '{}'::jsonb,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Nilecruz-Timestamp', ts,
      'Nilecruz-Signature', encode(extensions.hmac('feed-pull.' || ts, secret, 'sha256'), 'hex')),
    timeout_milliseconds := 55000);
  return 'requested';
end $$;
revoke execute on function app.request_feed_pull() from public, anon, authenticated;

-- Housekeeping: idempotency answers are kept for a day (a retry later than that is a new request);
-- run history for 90 days; unconfirmed previews for a day.
create or replace function app.prune_connections() returns void
language sql security definer set search_path = '' as $$
  delete from public.api_idempotency where created_at < now() - interval '1 day';
  delete from public.inventory_runs where created_at < now() - interval '90 days';
  update public.inventory_runs set status = 'discarded', rows = null, finished_at = now()
  where status = 'previewed' and created_at < now() - interval '1 day';
$$;
revoke execute on function app.prune_connections() from public, anon, authenticated;

select cron.schedule('nilecruz-feed-pull', '*/5 * * * *', 'select app.request_feed_pull()');
select cron.schedule('nilecruz-prune-connections', '17 3 * * *', 'select app.prune_connections()');
