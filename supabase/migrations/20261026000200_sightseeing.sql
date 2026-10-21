-- ADR-102 (Batch 8-3a): two prices on every sailing. Approved vessels may sell their own rate with sightseeing; every
-- other sailing's "with sightseeing" price is the cruise plus Nilecruz's programme (booked in 8-3b).

-- ── Approval: only Nilecruz admins (super or catalogue) say a vessel already sells with sightseeing ──────────────
alter table public.vessels add column sightseeing_approved_at timestamptz;
alter table public.vessels add column sightseeing_approved_by uuid references auth.users (id) on delete set null;

create or replace function app.guard_vessel_sightseeing() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or app.has_admin_role(array['super', 'catalogue']::public.admin_role[]) then return new; end if;
  if new.sightseeing_approved_at is distinct from old.sightseeing_approved_at
     or new.sightseeing_approved_by is distinct from old.sightseeing_approved_by then
    raise exception 'Only Nilecruz admins approve a vessel to sell with sightseeing' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger vessels_guard_sightseeing before update on public.vessels for each row execute function app.guard_vessel_sightseeing();

-- The switch (recorded in the activity history through the vessels audit trigger).
create or replace function public.set_sightseeing_approval(target uuid, approved boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not app.has_admin_role(array['super', 'catalogue']::public.admin_role[]) then
    raise exception 'Only super and catalogue admins approve sightseeing' using errcode = '42501';
  end if;
  update public.vessels
  set sightseeing_approved_at = case when approved then coalesce(sightseeing_approved_at, now()) end,
      sightseeing_approved_by = case when approved then coalesce(sightseeing_approved_by, auth.uid()) end
  where id = target;
  if not found then raise exception 'No such vessel' using errcode = 'P0002'; end if;
end $$;

create or replace function app.sightseeing_approved(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.vessels v where v.id = target and v.sightseeing_approved_at is not null);
$$;

-- ── What an approved vessel includes, per itinerary ─────────────────────────────────────────────────────────
create table public.schedule_sightseeing (
  schedule_id uuid primary key references public.schedules (id) on delete cascade,
  vessel_id uuid not null references public.vessels (id) on delete cascade,
  guide boolean not null,
  tickets_included boolean not null,
  sites text[] not null check (cardinality(sites) between 1 and 40),
  note text check (length(note) <= 1000),
  updated_at timestamptz not null default now()
);
create trigger schedule_sightseeing_updated_at before update on public.schedule_sightseeing for each row execute function app.set_updated_at();

-- ── Approved vessels' own with-sightseeing rates (cruise-only rates stay in public.rates, unchanged) ─────────
create table public.sightseeing_rates (
  id uuid primary key default gen_random_uuid(),
  departure_id uuid not null references public.departures (id) on delete cascade,
  cabin_type_id uuid not null references public.cabin_types (id) on delete cascade,
  vessel_id uuid not null references public.vessels (id) on delete cascade,
  occupancy smallint not null check (occupancy between 1 and 3),
  rate_plan public.rate_plan not null default 'international',
  currency public.currency_code not null check (currency in ('USD', 'EUR', 'EGP')),
  amount_minor bigint not null check (amount_minor > 0),
  child_bands jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (departure_id, cabin_type_id, occupancy, rate_plan, currency),
  constraint egp_only_for_local_plans check (currency <> 'EGP' or rate_plan in ('egyptian_citizen', 'foreign_resident'))
);
create index sightseeing_rates_departure_idx on public.sightseeing_rates (departure_id);
create trigger sightseeing_rates_updated_at before update on public.sightseeing_rates for each row execute function app.set_updated_at();

-- Same vessel throughout, occupancy within the cabin, the vessel approved; schedule inclusions likewise.
create or replace function app.check_sightseeing_row() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  dep_vessel uuid;
  cab public.cabin_types;
begin
  if tg_table_name = 'sightseeing_rates' then
    select vessel_id into dep_vessel from public.departures where id = new.departure_id;
    select * into cab from public.cabin_types where id = new.cabin_type_id;
    if dep_vessel is null or cab.id is null or dep_vessel <> cab.vessel_id then
      raise exception 'Departure and cabin type must belong to the same vessel' using errcode = '23514';
    end if;
    if new.occupancy > cab.max_occupancy then
      raise exception 'Occupancy % is more than this cabin allows (%)', new.occupancy, cab.max_occupancy using errcode = '23514';
    end if;
    new.vessel_id := dep_vessel;
    if tg_op = 'INSERT' then new.child_bands := coalesce(new.child_bands, app.child_bands_for_vessel(dep_vessel)); end if;
  else
    select vessel_id into dep_vessel from public.schedules where id = new.schedule_id;
    if dep_vessel is null then raise exception 'No such itinerary' using errcode = '23503'; end if;
    new.vessel_id := dep_vessel;
  end if;
  if not app.sightseeing_approved(new.vessel_id) then
    raise exception 'This vessel isn''t approved to sell with sightseeing included: Nilecruz sells sightseeing for it'
      using errcode = '42501';
  end if;
  return new;
end $$;
create trigger sightseeing_rates_check before insert or update on public.sightseeing_rates
  for each row execute function app.check_sightseeing_row();
create trigger schedule_sightseeing_check before insert or update on public.schedule_sightseeing
  for each row execute function app.check_sightseeing_row();

alter table public.sightseeing_rates enable row level security;
alter table public.schedule_sightseeing enable row level security;
-- Rates: the operator's team and admins, like public.rates; the public reads them through functions (8-3b).
create policy "sightseeing_rates: team and admins read" on public.sightseeing_rates for select to authenticated
  using (app.is_admin() or exists (select 1 from public.vessels v where v.id = vessel_id and v.operator_org_id in (select app.my_org_ids())));
create policy "sightseeing_rates: editors write" on public.sightseeing_rates for all to authenticated
  using (app.can_edit_product(vessel_id)) with check (app.can_edit_product(vessel_id));
-- What's included is public for approved, visible vessels (it's shown beside the price).
create policy "schedule_sightseeing: public reads approved" on public.schedule_sightseeing for select to anon, authenticated
  using (app.sightseeing_approved(vessel_id) and exists (select 1 from public.vessels v where v.id = vessel_id and v.visibility <> 'private'));
create policy "schedule_sightseeing: team and admins read" on public.schedule_sightseeing for select to authenticated
  using (app.is_admin() or exists (select 1 from public.vessels v where v.id = vessel_id and v.operator_org_id in (select app.my_org_ids())));
create policy "schedule_sightseeing: editors write" on public.schedule_sightseeing for all to authenticated
  using (app.can_edit_product(vessel_id)) with check (app.can_edit_product(vessel_id));
grant select, insert, update, delete on public.sightseeing_rates, public.schedule_sightseeing to authenticated, service_role;
grant select on public.schedule_sightseeing to anon;
create trigger audit_sightseeing_rates after insert or update or delete on public.sightseeing_rates for each row execute function app.audit_row();
create trigger audit_schedule_sightseeing after insert or update or delete on public.schedule_sightseeing for each row execute function app.audit_row();

-- ── Feeds, the API and paste: a rate's optional "package" (cruise by default) ───────────────────────────────
-- Same as 20261018000800's app.apply_inventory_rows, plus: a rate with "package": "with_sightseeing" is checked against
-- the vessel's approval and written to sightseeing_rates; duplicates are found per package.
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

-- ── Nilecruz's programmes: priced like private tours, booked only with their cruise (8-3b) ──────────────────
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
    when 'private', 'program' then
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

-- A tour bookable on its own needs a rate other than a programme's; programme starts can't be ordered alone.
create or replace function public.tour_is_bookable(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.tours t
    where t.id = target and t.visibility = 'published' and (
      (t.supplier_id is not null and jsonb_array_length(t.cancellation_bands) > 0
        and exists (select 1 from public.tour_sessions s where s.tour_id = t.id and s.status = 'scheduled' and s.starts_at > now()))
      or (t.office_id is not null and exists (select 1 from public.tour_rates r where r.tour_id = t.id and r.active and r.mode <> 'program'))
    )
  );
$$;

create or replace function app.slot_problem(r public.tour_rates, starts timestamptz) returns text
language plpgsql stable security definer set search_path = '' as $$
declare
  local timestamp := starts at time zone 'Africa/Cairo';
begin
  if r.mode = 'program' then return 'A sightseeing programme is booked together with its cruise'; end if;
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

revoke execute on function app.guard_vessel_sightseeing(), app.check_sightseeing_row(), app.sightseeing_approved(uuid) from public, anon, authenticated;
grant execute on function app.sightseeing_approved(uuid) to anon, authenticated, service_role;
revoke execute on function public.set_sightseeing_approval(uuid, boolean) from public, anon;
grant execute on function public.set_sightseeing_approval(uuid, boolean) to authenticated;
