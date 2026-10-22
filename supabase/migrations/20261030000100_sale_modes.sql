-- Vessel onboarding spec, gaps 1, 2 and 6 (ADR-103; docs/briefs/VESSEL-SPEC-GAPS.md):
--   cabins per cabin type, so availability is checked against the cabin type and not only the ship;
--   freesale: an agreement under which recent manual, paste or sheet data books instantly;
--   stop-sale: the operator closes a ship or a cabin type for a range of departures (allotment cabins stay open);
--   the accuracy rung: an operator whose data was often wrong drops from "confirmed within X h" to "to be confirmed".

-- ── Cabins per cabin type ────────────────────────────────────────────────────────────────────────────────────
-- Optional: without it, checks fall back to the ship's total cabins, as before.
alter table public.cabin_types add column cabin_count smallint check (cabin_count between 1 and 400);

-- Availability typed in directly (the operator's own dashboard) never exceeds the cabin type's count. Feeds, the API
-- and sheets go through app.apply_inventory_rows, which reports the same thing per row instead of failing the batch.
-- Not security definer, so current_user is the caller (as in app.guard_inventory_source).
create or replace function app.check_inventory_count() returns trigger
language plpgsql set search_path = '' as $$
declare
  n smallint;
begin
  if current_user = 'authenticated' then
    select c.cabin_count into n from public.cabin_types c where c.id = new.cabin_type_id;
    if n is not null and new.available > n then
      raise exception '% cabins free is more than this cabin type''s % cabins', new.available, n using errcode = '23514';
    end if;
  end if;
  return new;
end $$;
create trigger inventory_check_count before insert or update of available on public.inventory
  for each row execute function app.check_inventory_count();

-- ── Freesale and stop-sale ───────────────────────────────────────────────────────────────────────────────────
-- Both cover one ship, and either one cabin type or all of them (cabin_type_id null), for departures between two dates.
create or replace function app.check_sale_rule() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.vessels v where v.id = new.vessel_id and v.operator_org_id = new.org_id) then
    raise exception 'The ship isn''t this operator''s' using errcode = '23514';
  end if;
  if new.cabin_type_id is not null
     and not exists (select 1 from public.cabin_types c where c.id = new.cabin_type_id and c.vessel_id = new.vessel_id) then
    raise exception 'The cabin type isn''t on this ship' using errcode = '23514';
  end if;
  return new;
end $$;

-- Freesale: the operator lets Nilecruz sell down to zero without asking. Nilecruz admins enter the agreement.
create table public.freesales (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations (id) on delete cascade,
  vessel_id uuid not null references public.vessels (id) on delete cascade,
  cabin_type_id uuid references public.cabin_types (id) on delete cascade,
  starts_on date not null,
  ends_on date not null,
  contract_ref text check (length(contract_ref) <= 120),
  notes text check (length(notes) <= 1000),
  active boolean not null default true,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on >= starts_on and ends_on <= starts_on + 731)
);
create index freesales_cover_idx on public.freesales (vessel_id, starts_on, ends_on) where active;
create index freesales_org_idx on public.freesales (org_id);
create trigger freesales_updated_at before update on public.freesales for each row execute function app.set_updated_at();
create trigger freesales_check before insert or update on public.freesales for each row execute function app.check_sale_rule();

-- How recent manual, paste or sheet data must be to book instantly under a freesale (the spec's 72 hours).
insert into public.platform_settings (key, value) values ('freesale_hours', '72') on conflict (key) do nothing;

-- Stop-sale: the operator closes departures. Lifting it keeps the row, so the history stays.
create table public.stop_sales (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations (id) on delete cascade,
  vessel_id uuid not null references public.vessels (id) on delete cascade,
  cabin_type_id uuid references public.cabin_types (id) on delete cascade,
  starts_on date not null,
  ends_on date not null,
  reason text check (length(reason) <= 500),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  lifted_at timestamptz,
  lifted_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  check (ends_on >= starts_on and ends_on <= starts_on + 731)
);
create index stop_sales_cover_idx on public.stop_sales (vessel_id, starts_on, ends_on) where lifted_at is null;
create index stop_sales_org_idx on public.stop_sales (org_id);
create trigger stop_sales_updated_at before update on public.stop_sales for each row execute function app.set_updated_at();
create trigger stop_sales_check before insert or update on public.stop_sales for each row execute function app.check_sale_rule();

create or replace function app.stop_sale_on(dep uuid, cab uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.stop_sales s join public.departures d on d.id = dep
    where s.lifted_at is null and s.vessel_id = d.vessel_id and (s.cabin_type_id is null or s.cabin_type_id = cab)
      and d.departs_on between s.starts_on and s.ends_on);
$$;

create or replace function app.freesale_on(dep uuid, cab uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.freesales f join public.departures d on d.id = dep
    where f.active and f.vessel_id = d.vessel_id and (f.cabin_type_id is null or f.cabin_type_id = cab)
      and d.departs_on between f.starts_on and f.ends_on);
$$;

-- ── The accuracy rung ────────────────────────────────────────────────────────────────────────────────────────
-- Kept on the operator's settings so the booking mode, read for every cabin of every sailing, stays a lookup.
alter table public.operator_settings add column data_accuracy_low boolean not null default false;

-- Low: in the last 90 days, at least 5 answered requests where our data showed the cabins free, and more than 20 % of
-- those declined (accuracy under 80 %).
create or replace function app.refresh_data_accuracy(target_org uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  s record;
  low boolean;
begin
  select * into s from app.operator_reply_stats(target_org);
  low := coalesce(s.shown_free >= 5 and s.decline_rate_pct > 20, false);
  if low or exists (select 1 from public.operator_settings where org_id = target_org) then
    insert into public.operator_settings (org_id, data_accuracy_low) values (target_org, low)
    on conflict (org_id) do update set data_accuracy_low = excluded.data_accuracy_low
      where public.operator_settings.data_accuracy_low is distinct from excluded.data_accuracy_low;
  end if;
  return low;
end $$;

create or replace function app.after_request_answer() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform app.refresh_data_accuracy(new.org_id);
  return null;
end $$;
create trigger booking_requests_accuracy after update of response on public.booking_requests
  for each row when (new.response is distinct from old.response) execute function app.after_request_answer();

-- Nightly, as answers leave the 90-day window.
create or replace function app.refresh_all_data_accuracy() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  o uuid;
  n integer := 0;
begin
  for o in select distinct org_id from public.booking_requests where responded_at > now() - interval '91 days'
           union select org_id from public.operator_settings where data_accuracy_low loop
    perform app.refresh_data_accuracy(o);
    n := n + 1;
  end loop;
  return n;
end $$;
select cron.schedule('nilecruz-data-accuracy', '41 2 * * *', 'select app.refresh_all_data_accuracy()');

create or replace function app.data_accuracy_low(target_vessel uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select s.data_accuracy_low from public.vessels v join public.operator_settings s on s.org_id = v.operator_org_id
                   where v.id = target_vessel), false);
$$;

-- ── The booking mode, with all of the above ──────────────────────────────────────────────────────────────────
--   stop-sale or none free                                     sold out
--   older than its freshness                                   to be confirmed
--   feed, API or an operator's answer within 2 hours           instant
--   under a freesale: manual, paste or sheet within 72 hours   instant
--   operator's data accuracy under 80 %                        to be confirmed
--   otherwise (manual, paste or sheet within 7 days)           request
create or replace function app.booking_mode(i public.inventory) returns text
language sql stable security definer set search_path = '' as $$
  select case
    when i.departure_id is null then 'unconfirmed'
    when app.stop_sale_on(i.departure_id, i.cabin_type_id) then 'sold_out'
    when i.available = 0 then 'sold_out'
    when not app.inventory_is_fresh(i.confirmed_at, i.source) then 'unconfirmed'
    when app.inventory_instant(i.confirmed_at, i.source) then 'instant'
    when i.source in ('manual', 'paste', 'sheet') and app.freesale_on(i.departure_id, i.cabin_type_id)
      and i.confirmed_at > now() - make_interval(hours =>
        coalesce((select (value #>> '{}')::int from public.platform_settings where key = 'freesale_hours'), 72)) then 'instant'
    when app.data_accuracy_low(i.vessel_id) then 'unconfirmed'
    else 'request' end;
$$;

-- Allotment cabins stay open under a stop-sale (ADR-103); everything else follows the booking mode.
create or replace function app.cabin_mode(dep uuid, cab uuid) returns text
language sql stable security definer set search_path = '' as $$
  select case when app.allotment_left(dep, cab) > 0 then 'instant'
    when app.stop_sale_on(dep, cab) then 'sold_out'
    else coalesce((select app.booking_mode(i) from public.inventory i where i.departure_id = dep and i.cabin_type_id = cab), 'unconfirmed') end;
$$;

-- Cabins bookable instantly: allotment, plus availability whose mode is instant.
create or replace function app.instant_left(dep uuid, cab uuid) returns integer
language sql stable security definer set search_path = '' as $$
  select app.allotment_left(dep, cab) + coalesce((
    select i.available from public.inventory i
    where i.departure_id = dep and i.cabin_type_id = cab and app.booking_mode(i) = 'instant'), 0);
$$;

-- Bookable or requestable: a cabin type with an instant or requestable mode, or an allotment cabin left.
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
          and (app.booking_mode(i) in ('instant', 'request') or app.allotment_left(d.id, c.id) > 0)
          and exists (select 1 from public.rates r where r.departure_id = d.id and r.cabin_type_id = c.id)
      )
  );
$$;

-- Same as 20261023000500, plus: a stop-sale closes everything but the allotment, even for a booking whose cabins were
-- checked a moment before.
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
      if app.stop_sale_on(d.id, need.cab) then
        raise exception 'The operator has stopped sales for these cabins on this sailing. Nothing was booked.' using errcode = '22023';
      end if;
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

-- ── Access ───────────────────────────────────────────────────────────────────────────────────────────────────
alter table public.freesales enable row level security;
alter table public.stop_sales enable row level security;
create policy "freesales: admins and the operator's team read" on public.freesales for select to authenticated
  using (app.is_admin() or app.can_read_connections(org_id));
create policy "freesales: catalogue admins write" on public.freesales for all to authenticated
  using (app.is_catalogue_admin()) with check (app.is_catalogue_admin());
create policy "stop_sales: admins and the operator's team read" on public.stop_sales for select to authenticated
  using (app.is_admin() or app.can_read_connections(org_id));
-- Owners and reservations staff (of an approved operator) and catalogue admins; no deletes, lifting keeps the row.
create policy "stop_sales: editors add" on public.stop_sales for insert to authenticated
  with check (app.can_edit_product(vessel_id) and lifted_at is null);
create policy "stop_sales: editors lift" on public.stop_sales for update to authenticated
  using (app.can_edit_product(vessel_id)) with check (app.can_edit_product(vessel_id));
grant select, insert, update, delete on public.freesales to authenticated, service_role;
grant select, insert, update on public.stop_sales to authenticated, service_role;

revoke execute on function app.check_inventory_count(), app.check_sale_rule(), app.stop_sale_on(uuid, uuid), app.freesale_on(uuid, uuid),
  app.refresh_data_accuracy(uuid), app.after_request_answer(), app.refresh_all_data_accuracy(), app.data_accuracy_low(uuid)
  from public, anon, authenticated;

create trigger audit_freesales after insert or update or delete on public.freesales for each row execute function app.audit_row();
create trigger audit_stop_sales after insert or update or delete on public.stop_sales for each row execute function app.audit_row();

-- ── Imports: a row above the cabin type's count is an error for that row (same as 20261026000200 otherwise) ───
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
  v_approved boolean;
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
  pkg text;
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
    st := null; v_id := null; v_name := null; v_approved := false; dep_id := null; cab := null; inv := null; changed := false; avail := null;

    if cardinality(msgs) = 0 then
      select v.id, v.name, v.sightseeing_approved_at is not null into v_id, v_name, v_approved from public.vessels v
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
      if cab.cabin_count is not null and avail > cab.cabin_count then
        msgs := msgs || format('%s free is more than the %s cabins of type “%s”.', avail, cab.cabin_count, cab.code);
      end if;
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
        pkg := coalesce(rt ->> 'package', 'cruise');
        k := pkg || '/' || occ || '/' || plan_txt || '/' || cur;
        if k = any (rate_seen) then
          msgs := msgs || format('The %s rate for %s guest(s) in %s is given twice.', plan_txt, occ, cur);
        end if;
        rate_seen := rate_seen || k;
        if pkg not in ('cruise', 'with_sightseeing') then
          msgs := msgs || format('“package” must be cruise or with_sightseeing, not “%s”.', pkg);
        elsif pkg = 'with_sightseeing' and not v_approved then
          msgs := msgs || format('%s isn’t approved to sell with sightseeing included: Nilecruz sells sightseeing for it. Send cruise-only rates.', v_name);
        end if;
        if occ > cab.max_occupancy then
          msgs := msgs || format('Cabin type “%s” sleeps at most %s; a rate for %s guests can’t be used.', cab.code, cab.max_occupancy, occ);
        end if;
        if cur = 'EGP' and plan_txt not in ('egyptian_citizen', 'foreign_resident') then
          msgs := msgs || 'E£ prices are only for the Egyptian-citizen and foreign-resident plans.'::text;
        end if;
        if cardinality(msgs) = 0 then
          if pkg = 'cruise' then
            select x.amount_minor into old_amt from public.rates x
            where x.departure_id = dep_id and x.cabin_type_id = cab.id and x.occupancy = occ
              and x.rate_plan = plan_txt::public.rate_plan and x.currency = cur::public.currency_code;
          else
            select x.amount_minor into old_amt from public.sightseeing_rates x
            where x.departure_id = dep_id and x.cabin_type_id = cab.id and x.occupancy = occ
              and x.rate_plan = plan_txt::public.rate_plan and x.currency = cur::public.currency_code;
          end if;
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
        where coalesce(j.rt ->> 'package', 'cruise') = 'cruise'
        on conflict (departure_id, cabin_type_id, occupancy, rate_plan, currency) do update
          set amount_minor = excluded.amount_minor
          where x.amount_minor is distinct from excluded.amount_minor;
        insert into public.sightseeing_rates as x (departure_id, cabin_type_id, vessel_id, occupancy, rate_plan, currency, amount_minor)
        select dep_id, cab.id, v_id, (j.rt ->> 'occupancy')::smallint, (j.rt ->> 'plan')::public.rate_plan,
               (j.rt ->> 'currency')::public.currency_code, (j.rt ->> 'amount_minor')::bigint
        from jsonb_array_elements(coalesce(r -> 'rates', '[]'::jsonb)) j(rt)
        where j.rt ->> 'package' = 'with_sightseeing'
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
