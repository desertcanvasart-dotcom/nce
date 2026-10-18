-- Batch 4c-1: the bookable product (DASH-ADM-048–056, DASH-OPR-008–010, DATA-015, 019, 022, 023, ADR-079, ADR-082).
-- Operators edit their own vessels' product (owner, reservations); catalogue admins edit any; RLS on every table.

-- ── Crew gratuity per vessel (DATA-015, ADR-010): US$ minor units per person per night, at least US$5 ───────
alter table public.vessels
  add column gratuity_usd_minor bigint check (gratuity_usd_minor is null or gratuity_usd_minor >= 500);
comment on column public.vessels.gratuity_usd_minor is
  'Obligatory crew gratuity in US cents per person per night, ages 3+, paid on board, never in the total (ADR-010).';

-- Operators may set their vessel's gratuity (it is not an admin-only field).

-- ── Cabin types, on decks (DASH-ADM-048–050, DATA-023) ───────────────────────────────────────────────────
create table public.cabin_types (
  id uuid primary key default gen_random_uuid(),
  vessel_id uuid not null references public.vessels (id) on delete cascade,
  -- Stable code used by feeds and the API (ADR-080), unique per vessel.
  code text not null check (code ~ '^[A-Za-z0-9][A-Za-z0-9_.-]{0,39}$'),
  name text not null check (length(trim(name)) between 1 and 120),
  -- Lower, Middle, Upper, or a vessel-specific deck name.
  deck text not null check (length(trim(deck)) between 1 and 60),
  size_m2 numeric(5, 1) check (size_m2 > 0 and size_m2 < 1000),
  bed_configuration text check (length(bed_configuration) <= 120),
  max_occupancy smallint not null default 2 check (max_occupancy between 1 and 3),
  view text check (length(view) <= 80),
  balcony boolean not null default false,
  amenities text[] not null default '{}',
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (vessel_id, code)
);
create index cabin_types_vessel_idx on public.cabin_types (vessel_id);
create trigger cabin_types_updated_at before update on public.cabin_types for each row execute function app.set_updated_at();

create table public.cabin_type_translations (
  cabin_type_id uuid not null references public.cabin_types (id) on delete cascade,
  locale public.locale_code not null,
  name text check (length(name) <= 120),
  description text check (length(description) <= 4000),
  primary key (cabin_type_id, locale)
);

-- Photos can belong to a cabin type too (BRAND-014: still exactly one parent).
alter table public.media add column cabin_type_id uuid references public.cabin_types (id) on delete cascade;
create index media_cabin_type_idx on public.media (cabin_type_id);
alter table public.media drop constraint media_one_parent;
alter table public.media add constraint media_one_parent check (num_nonnulls(vessel_id, destination_id, cabin_type_id) = 1);
alter table public.media drop constraint media_path_matches_parent;
alter table public.media drop constraint media_storage_path_check;
alter table public.media add constraint media_storage_path_check
  check (storage_path ~ '^(vessels|destinations|cabin-types)/[0-9a-f-]{36}/[A-Za-z0-9._-]+$');
alter table public.media add constraint media_path_matches_parent check (
  storage_path like 'vessels/' || coalesce(vessel_id::text, '-') || '/%'
  or storage_path like 'destinations/' || coalesce(destination_id::text, '-') || '/%'
  or storage_path like 'cabin-types/' || coalesce(cabin_type_id::text, '-') || '/%'
);

-- ── Schedules: directional routes, nights, sailing days, date ranges, itinerary (DASH-ADM-051, 052) ──────────
create table public.schedules (
  id uuid primary key default gen_random_uuid(),
  vessel_id uuid not null references public.vessels (id) on delete cascade,
  code text not null check (code ~ '^[A-Za-z0-9][A-Za-z0-9_.-]{0,39}$'),
  -- Directional: Luxor → Aswan is a different schedule from Aswan → Luxor.
  origin text not null check (length(trim(origin)) between 1 and 80),
  destination text not null check (length(trim(destination)) between 1 and 80),
  nights smallint not null check (nights between 1 and 21),
  -- ISO weekdays: 1 = Monday … 7 = Sunday.
  sailing_days smallint[] not null check (cardinality(sailing_days) between 1 and 7 and sailing_days <@ array[1,2,3,4,5,6,7]::smallint[]),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (vessel_id, code)
);
create index schedules_vessel_idx on public.schedules (vessel_id);
create trigger schedules_updated_at before update on public.schedules for each row execute function app.set_updated_at();

create table public.schedule_periods (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.schedules (id) on delete cascade,
  starts_on date not null,
  ends_on date not null,
  check (ends_on >= starts_on and ends_on <= starts_on + 731)
);
create index schedule_periods_schedule_idx on public.schedule_periods (schedule_id);

create table public.schedule_days (
  schedule_id uuid not null references public.schedules (id) on delete cascade,
  day_number smallint not null check (day_number between 1 and 22),
  locale public.locale_code not null,
  title text not null check (length(trim(title)) between 1 and 160),
  description text check (length(description) <= 4000),
  primary key (schedule_id, day_number, locale)
);

-- ── Departures (sailings) ─────────────────────────────────────────────────────────────────────────────────
create type public.departure_status as enum ('scheduled', 'cancelled');
create table public.departures (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.schedules (id) on delete cascade,
  vessel_id uuid not null references public.vessels (id) on delete cascade,
  departs_on date not null,
  returns_on date not null,
  status public.departure_status not null default 'scheduled',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (schedule_id, departs_on),
  check (returns_on > departs_on)
);
create index departures_vessel_date_idx on public.departures (vessel_id, departs_on);
create trigger departures_updated_at before update on public.departures for each row execute function app.set_updated_at();

-- Creates the missing departures of a schedule up to a horizon: every sailing day inside its periods.
create or replace function public.generate_departures(target uuid, horizon date default (current_date + 400))
returns integer
language plpgsql security invoker set search_path = '' as $$
declare
  s public.schedules;
  created integer;
begin
  select * into s from public.schedules where id = target;
  if not found then raise exception 'Schedule not found' using errcode = 'P0002'; end if;
  with dates as (
    select d::date as day
    from public.schedule_periods p,
         generate_series(greatest(p.starts_on, current_date), least(p.ends_on, horizon), interval '1 day') d
    where p.schedule_id = target and extract(isodow from d)::smallint = any (s.sailing_days)
  ), ins as (
    insert into public.departures (schedule_id, vessel_id, departs_on, returns_on)
    select target, s.vessel_id, day, day + s.nights from (select distinct day from dates) x
    on conflict (schedule_id, departs_on) do nothing
    returning 1
  )
  select count(*) into created from ins;
  return created;
end $$;
revoke execute on function public.generate_departures(uuid, date) from public, anon;
grant execute on function public.generate_departures(uuid, date) to authenticated;

-- ── Shared inventory per departure and cabin type (DASH-ADM-055, 056, ADR-079) ───────────────────────────
create type public.inventory_source as enum ('manual', 'paste', 'feed', 'api');
create table public.inventory (
  departure_id uuid not null references public.departures (id) on delete cascade,
  cabin_type_id uuid not null references public.cabin_types (id) on delete cascade,
  vessel_id uuid not null references public.vessels (id) on delete cascade,
  -- Physical cabins left. Prices and currencies never add to this number.
  available integer not null check (available >= 0 and available <= 400),
  confirmed_at timestamptz not null default now(),
  source public.inventory_source not null default 'manual',
  primary key (departure_id, cabin_type_id)
);
create index inventory_vessel_idx on public.inventory (vessel_id);

-- ADR-079: freshness thresholds, adjustable by admins.
create table public.platform_settings (
  key text primary key check (key ~ '^[a-z_]+$'),
  value jsonb not null,
  updated_at timestamptz not null default now()
);
insert into public.platform_settings (key, value) values
  ('freshness_hours', '{"manual": 24, "paste": 24, "feed": 2, "api": 2}'),
  ('child_bands', '[{"from": 0, "to": 3, "percent": 0}, {"from": 3, "to": 6, "percent": 25}, {"from": 6, "to": 12, "percent": 50}, {"from": 12, "to": null, "percent": 100}]');
create trigger platform_settings_updated_at before update on public.platform_settings for each row execute function app.set_updated_at();

create or replace function app.inventory_is_fresh(confirmed_at timestamptz, source public.inventory_source) returns boolean
language sql stable security definer set search_path = '' as $$
  select confirmed_at > now() - make_interval(hours => coalesce(
    (select (value ->> source::text)::int from public.platform_settings where key = 'freshness_hours'), 2));
$$;
grant execute on function app.inventory_is_fresh(timestamptz, public.inventory_source) to anon, authenticated, service_role;

-- ── Rates (DASH-ADM-053, 054, DASH-OPR-010, ADR-082) ────────────────────────────────────────────────────
create type public.rate_plan as enum ('international', 'egyptian_citizen', 'foreign_resident', 'trade');
create table public.rates (
  id uuid primary key default gen_random_uuid(),
  departure_id uuid not null references public.departures (id) on delete cascade,
  cabin_type_id uuid not null references public.cabin_types (id) on delete cascade,
  vessel_id uuid not null references public.vessels (id) on delete cascade,
  occupancy smallint not null check (occupancy between 1 and 3),
  rate_plan public.rate_plan not null default 'international',
  currency public.currency_code not null check (currency in ('USD', 'EUR', 'EGP')),
  -- Per person, in minor units of the currency.
  amount_minor bigint not null check (amount_minor > 0),
  -- DATA-022: the child bands in force when the rate was created; later overrides apply to new rates only.
  child_bands jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (departure_id, cabin_type_id, occupancy, rate_plan, currency),
  -- ADR-082: E£ only for the Egyptian-citizen and foreign-resident plans.
  constraint egp_only_for_local_plans check (currency <> 'EGP' or rate_plan in ('egyptian_citizen', 'foreign_resident'))
);
create index rates_departure_idx on public.rates (departure_id);
create index rates_vessel_idx on public.rates (vessel_id);
create trigger rates_updated_at before update on public.rates for each row execute function app.set_updated_at();

-- Child pricing bands (DATA-019) with per-operator overrides (DATA-022).
alter table public.organisations add column child_bands jsonb;

create or replace function app.child_bands_for_vessel(target uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select o.child_bands from public.vessels v join public.organisations o on o.id = v.operator_org_id where v.id = target),
    (select value from public.platform_settings where key = 'child_bands'));
$$;

-- Consistency for rates, inventory and departures: the same vessel throughout, occupancy within the cabin's limit.
create or replace function app.product_consistency() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  dep_vessel uuid;
  cab public.cabin_types;
begin
  select vessel_id into dep_vessel from public.departures where id = new.departure_id;
  select * into cab from public.cabin_types where id = new.cabin_type_id;
  if dep_vessel is null or cab.id is null or dep_vessel <> cab.vessel_id then
    raise exception 'Departure and cabin type must belong to the same vessel' using errcode = '23514';
  end if;
  new.vessel_id := dep_vessel;
  if tg_table_name = 'rates' then
    if new.occupancy > cab.max_occupancy then
      raise exception 'Occupancy % is more than this cabin allows (%)', new.occupancy, cab.max_occupancy using errcode = '23514';
    end if;
    if tg_op = 'INSERT' then new.child_bands := coalesce(new.child_bands, app.child_bands_for_vessel(dep_vessel)); end if;
  end if;
  return new;
end $$;
create trigger rates_consistency before insert or update on public.rates for each row execute function app.product_consistency();
create trigger inventory_consistency before insert or update on public.inventory for each row execute function app.product_consistency();

create or replace function app.departure_vessel() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  select vessel_id into new.vessel_id from public.schedules where id = new.schedule_id;
  return new;
end $$;
create trigger departures_vessel before insert or update of schedule_id on public.departures for each row execute function app.departure_vessel();

-- ── Promotions (DASH-ADM-074–085, DASH-OPR-012) ─────────────────────────────────────────────────────────
create type public.promotion_kind as enum ('percent', 'fixed', 'extra', 'upgrade');
create table public.promotions (
  id uuid primary key default gen_random_uuid(),
  vessel_id uuid not null references public.vessels (id) on delete cascade,
  kind public.promotion_kind not null,
  percent numeric(5, 2) check (percent > 0 and percent < 100),
  fixed_amount_minor bigint check (fixed_amount_minor > 0),
  fixed_currency public.currency_code check (fixed_currency in ('USD', 'EUR', 'EGP')),
  upgrade_to_cabin_type_id uuid references public.cabin_types (id) on delete cascade,
  booking_from date,
  booking_to date,
  departure_from date,
  departure_to date,
  paused boolean not null default false,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (booking_to is null or booking_from is null or booking_to >= booking_from),
  check (departure_to is null or departure_from is null or departure_to >= departure_from),
  constraint promotion_shape check (
    (kind = 'percent' and percent is not null and fixed_amount_minor is null and upgrade_to_cabin_type_id is null)
    or (kind = 'fixed' and fixed_amount_minor is not null and fixed_currency is not null and percent is null and upgrade_to_cabin_type_id is null)
    or (kind = 'extra' and percent is null and fixed_amount_minor is null and upgrade_to_cabin_type_id is null)
    or (kind = 'upgrade' and upgrade_to_cabin_type_id is not null and percent is null and fixed_amount_minor is null)
  )
);
create index promotions_vessel_idx on public.promotions (vessel_id);
create trigger promotions_updated_at before update on public.promotions for each row execute function app.set_updated_at();

create table public.promotion_translations (
  promotion_id uuid not null references public.promotions (id) on delete cascade,
  locale public.locale_code not null,
  benefit text not null check (length(trim(benefit)) between 1 and 300),
  terms text check (length(terms) <= 4000),
  primary key (promotion_id, locale)
);

-- A promotion applies to selected rates. DASH-ADM-085: a rate carries at most one promotion (no stacking).
create table public.promotion_rates (
  promotion_id uuid not null references public.promotions (id) on delete cascade,
  rate_id uuid not null unique references public.rates (id) on delete cascade,
  primary key (promotion_id, rate_id)
);

-- DASH-ADM-084: an upgrade points to a different, active cabin type of the same vessel, and only to rates whose
-- departure has upgraded inventory; it never creates stock (availability is checked again at reservation, 4e).
create or replace function app.check_promotion_rate() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  p public.promotions;
  r public.rates;
begin
  select * into p from public.promotions where id = new.promotion_id;
  select * into r from public.rates where id = new.rate_id;
  if r.vessel_id <> p.vessel_id then raise exception 'The rate belongs to another vessel' using errcode = '23514'; end if;
  if p.kind = 'fixed' and r.currency <> p.fixed_currency then
    raise exception 'A fixed discount in % can only apply to % rates', p.fixed_currency, p.fixed_currency using errcode = '23514';
  end if;
  if p.kind = 'upgrade' then
    if p.upgrade_to_cabin_type_id = r.cabin_type_id then raise exception 'An upgrade must be to a different cabin type' using errcode = '23514'; end if;
    if not exists (
      select 1 from public.inventory i
      where i.departure_id = r.departure_id and i.cabin_type_id = p.upgrade_to_cabin_type_id and i.available > 0
    ) then
      raise exception 'No inventory in the upgraded cabin type for this departure' using errcode = '23514';
    end if;
  end if;
  return new;
end $$;
create trigger promotion_rates_check before insert or update on public.promotion_rates for each row execute function app.check_promotion_rate();

create or replace function app.check_promotion_upgrade() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.upgrade_to_cabin_type_id is not null and not exists (
    select 1 from public.cabin_types c where c.id = new.upgrade_to_cabin_type_id and c.vessel_id = new.vessel_id and c.active
  ) then
    raise exception 'The upgrade must be to an active cabin type of the same vessel' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger promotions_upgrade_check before insert or update on public.promotions for each row execute function app.check_promotion_upgrade();

-- ── Access rules ────────────────────────────────────────────────────────────────────────────────────────
-- Editing the product: vessel editors (owner, reservations of the vessel's approved operator; catalogue admins).
create or replace function app.can_edit_product(target_vessel uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select app.is_catalogue_admin() or exists (
    select 1 from public.vessels v join public.organisations o on o.id = v.operator_org_id
    where v.id = target_vessel and o.status = 'approved'
      and app.has_org_role(v.operator_org_id, array['owner', 'reservations']::public.team_role[])
  );
$$;
-- Promotions: owners only, or catalogue admins (DASH-OPR-012).
create or replace function app.can_manage_promotions(target_vessel uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select app.is_catalogue_admin() or exists (
    select 1 from public.vessels v join public.organisations o on o.id = v.operator_org_id
    where v.id = target_vessel and o.status = 'approved' and app.has_org_role(v.operator_org_id, array['owner']::public.team_role[])
  );
$$;
-- Reading the product: anyone for visible vessels' active parts, team members of the operator, admins.
create or replace function app.can_read_product(target_vessel uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select app.can_read_vessel(target_vessel);
$$;
grant execute on function app.can_edit_product(uuid), app.can_manage_promotions(uuid), app.can_read_product(uuid),
  app.child_bands_for_vessel(uuid) to authenticated, service_role;
grant execute on function app.can_read_product(uuid) to anon;

alter table public.cabin_types enable row level security;
alter table public.cabin_type_translations enable row level security;
alter table public.schedules enable row level security;
alter table public.schedule_periods enable row level security;
alter table public.schedule_days enable row level security;
alter table public.departures enable row level security;
alter table public.inventory enable row level security;
alter table public.rates enable row level security;
alter table public.platform_settings enable row level security;
alter table public.promotions enable row level security;
alter table public.promotion_translations enable row level security;
alter table public.promotion_rates enable row level security;

-- Cabin types, schedules, itinerary, departures: readable with the vessel; written by product editors.
create policy "cabin_types: read with vessel" on public.cabin_types for select to anon, authenticated using (app.can_read_product(vessel_id));
create policy "cabin_types: editors write" on public.cabin_types for all to authenticated using (app.can_edit_product(vessel_id)) with check (app.can_edit_product(vessel_id));
create policy "cabin_type_translations: read" on public.cabin_type_translations for select to anon, authenticated
  using (exists (select 1 from public.cabin_types c where c.id = cabin_type_id and app.can_read_product(c.vessel_id)));
create policy "cabin_type_translations: editors write" on public.cabin_type_translations for all to authenticated
  using (exists (select 1 from public.cabin_types c where c.id = cabin_type_id and app.can_edit_product(c.vessel_id)))
  with check (exists (select 1 from public.cabin_types c where c.id = cabin_type_id and app.can_edit_product(c.vessel_id)));

create policy "schedules: read with vessel" on public.schedules for select to anon, authenticated using (app.can_read_product(vessel_id));
create policy "schedules: editors write" on public.schedules for all to authenticated using (app.can_edit_product(vessel_id)) with check (app.can_edit_product(vessel_id));
create policy "schedule_periods: read" on public.schedule_periods for select to anon, authenticated
  using (exists (select 1 from public.schedules s where s.id = schedule_id and app.can_read_product(s.vessel_id)));
create policy "schedule_periods: editors write" on public.schedule_periods for all to authenticated
  using (exists (select 1 from public.schedules s where s.id = schedule_id and app.can_edit_product(s.vessel_id)))
  with check (exists (select 1 from public.schedules s where s.id = schedule_id and app.can_edit_product(s.vessel_id)));
create policy "schedule_days: read" on public.schedule_days for select to anon, authenticated
  using (exists (select 1 from public.schedules s where s.id = schedule_id and app.can_read_product(s.vessel_id)));
create policy "schedule_days: editors write" on public.schedule_days for all to authenticated
  using (exists (select 1 from public.schedules s where s.id = schedule_id and app.can_edit_product(s.vessel_id)))
  with check (exists (select 1 from public.schedules s where s.id = schedule_id and app.can_edit_product(s.vessel_id)));

create policy "departures: read with vessel" on public.departures for select to anon, authenticated using (app.can_read_product(vessel_id));
create policy "departures: editors write" on public.departures for all to authenticated using (app.can_edit_product(vessel_id)) with check (app.can_edit_product(vessel_id));

-- Inventory and rates: never public in 4c (prices after sign-in, ADR-025, come with the marketplace in Batch 5);
-- team members of the operator and admins read; editors write.
create policy "inventory: team and admins read" on public.inventory for select to authenticated
  using (app.is_admin() or exists (select 1 from public.vessels v where v.id = vessel_id and v.operator_org_id in (select app.my_org_ids())));
create policy "inventory: editors write" on public.inventory for all to authenticated using (app.can_edit_product(vessel_id)) with check (app.can_edit_product(vessel_id));
create policy "rates: team and admins read" on public.rates for select to authenticated
  using (app.is_admin() or exists (select 1 from public.vessels v where v.id = vessel_id and v.operator_org_id in (select app.my_org_ids())));
create policy "rates: editors write" on public.rates for all to authenticated using (app.can_edit_product(vessel_id)) with check (app.can_edit_product(vessel_id));

create policy "platform_settings: signed-in read" on public.platform_settings for select to authenticated using (true);
create policy "platform_settings: super admins write" on public.platform_settings for all to authenticated
  using (app.has_admin_role(array['super']::public.admin_role[])) with check (app.has_admin_role(array['super']::public.admin_role[]));

create policy "promotions: team and admins read" on public.promotions for select to authenticated
  using (app.is_admin() or exists (select 1 from public.vessels v where v.id = vessel_id and v.operator_org_id in (select app.my_org_ids())));
create policy "promotions: owners and admins write" on public.promotions for all to authenticated
  using (app.can_manage_promotions(vessel_id)) with check (app.can_manage_promotions(vessel_id));
create policy "promotion_translations: read" on public.promotion_translations for select to authenticated
  using (exists (select 1 from public.promotions p where p.id = promotion_id and (app.is_admin() or exists (
    select 1 from public.vessels v where v.id = p.vessel_id and v.operator_org_id in (select app.my_org_ids())))));
create policy "promotion_translations: owners and admins write" on public.promotion_translations for all to authenticated
  using (exists (select 1 from public.promotions p where p.id = promotion_id and app.can_manage_promotions(p.vessel_id)))
  with check (exists (select 1 from public.promotions p where p.id = promotion_id and app.can_manage_promotions(p.vessel_id)));
create policy "promotion_rates: read" on public.promotion_rates for select to authenticated
  using (exists (select 1 from public.promotions p where p.id = promotion_id and (app.is_admin() or exists (
    select 1 from public.vessels v where v.id = p.vessel_id and v.operator_org_id in (select app.my_org_ids())))));
create policy "promotion_rates: owners and admins write" on public.promotion_rates for all to authenticated
  using (exists (select 1 from public.promotions p where p.id = promotion_id and app.can_manage_promotions(p.vessel_id)))
  with check (exists (select 1 from public.promotions p where p.id = promotion_id and app.can_manage_promotions(p.vessel_id)));

-- Operators may now edit their vessel's gratuity; the guard keeps everything else admin-only.
-- (gratuity_usd_minor is not in the admin-only list of app.guard_vessel_admin_fields.)

-- DATA-022: only catalogue admins change an operator's child bands (organisations are admin-managed already).

grant select on public.cabin_types, public.cabin_type_translations, public.schedules, public.schedule_periods,
  public.schedule_days, public.departures to anon;
grant select, insert, update, delete on public.cabin_types, public.cabin_type_translations, public.schedules,
  public.schedule_periods, public.schedule_days, public.departures, public.inventory, public.rates, public.platform_settings,
  public.promotions, public.promotion_translations, public.promotion_rates to authenticated, service_role;

create trigger audit_cabin_types after insert or update or delete on public.cabin_types for each row execute function app.audit_row();
create trigger audit_schedules after insert or update or delete on public.schedules for each row execute function app.audit_row();
create trigger audit_rates after insert or update or delete on public.rates for each row execute function app.audit_row();
create trigger audit_promotions after insert or update or delete on public.promotions for each row execute function app.audit_row();
create trigger audit_platform_settings after insert or update or delete on public.platform_settings for each row execute function app.audit_row();
create trigger audit_inventory after insert or update or delete on public.inventory for each row execute function app.audit_row();

-- Media for cabin types: readable with the vessel, written by product editors.
create or replace function app.can_read_media(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.media m left join public.cabin_types c on c.id = m.cabin_type_id
    where m.id = target and (
      (m.vessel_id is not null and app.can_read_vessel(m.vessel_id))
      or (m.cabin_type_id is not null and app.can_read_vessel(c.vessel_id))
      or (m.destination_id is not null and (app.destination_is_public(m.destination_id) or app.is_admin()))
    )
  );
$$;
drop policy "media: vessel editors write" on public.media;
create policy "media: editors write" on public.media for all to authenticated
  using (app.is_catalogue_admin()
    or (vessel_id is not null and app.can_edit_vessel(vessel_id))
    or (cabin_type_id is not null and exists (select 1 from public.cabin_types c where c.id = cabin_type_id and app.can_edit_product(c.vessel_id))))
  with check (app.is_catalogue_admin()
    or (vessel_id is not null and app.can_edit_vessel(vessel_id))
    or (cabin_type_id is not null and exists (select 1 from public.cabin_types c where c.id = cabin_type_id and app.can_edit_product(c.vessel_id))));

create or replace function app.storage_cabin_type_vessel(object_name text) returns uuid
language sql stable security definer set search_path = '' as $$
  select c.vessel_id from public.cabin_types c
  where object_name ~ '^cabin-types/[0-9a-f-]{36}/' and c.id = split_part(object_name, '/', 2)::uuid;
$$;
grant execute on function app.storage_cabin_type_vessel(text) to authenticated, service_role;
create policy "media bucket: cabin photos upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and app.storage_cabin_type_vessel(name) is not null and app.can_edit_product(app.storage_cabin_type_vessel(name)));
create policy "media bucket: cabin photos remove" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and app.storage_cabin_type_vessel(name) is not null and app.can_edit_product(app.storage_cabin_type_vessel(name)));
