-- Batch 4d: tours and sightseeing (DASH-ADM-058–071, 073, DATA-042, ADR-030, ADR-087).
-- Tours are Nilecruz's own products: only admins manage them. Catalogue (and super) admins manage everything;
-- content admins edit texts and photos. The public reads published tours, their sessions and prices; never suppliers.

create or replace function app.is_tour_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select app.has_admin_role(array['super', 'catalogue']::public.admin_role[]);
$$;
create or replace function app.can_edit_tour_text() returns boolean
language sql stable security definer set search_path = '' as $$
  select app.has_admin_role(array['super', 'catalogue', 'content']::public.admin_role[]);
$$;
revoke execute on function app.is_tour_admin(), app.can_edit_tour_text() from public;
grant execute on function app.is_tour_admin(), app.can_edit_tour_text() to anon, authenticated, service_role;

-- ── Suppliers (DASH-ADM-064): private to admins ─────────────────────────────────────────────────────────────
create table public.tour_suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 160),
  contact_name text check (length(contact_name) <= 120),
  email text check (email is null or email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone text check (length(phone) <= 40),
  registration text check (length(registration) <= 120),
  notes text check (length(notes) <= 2000),
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger tour_suppliers_updated_at before update on public.tour_suppliers for each row execute function app.set_updated_at();

-- ── Cancellation bands (DASH-ADM-065): "cancelled N or more days before the start: X % charged" ─────────────
-- At least one band; one starts at 0 days (so every date is covered); thresholds unique; 0–100 %; the charge never
-- goes down as the start gets closer. The calculation itself runs with tour orders (4f).
create or replace function app.valid_cancellation_bands(bands jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare
  b jsonb;
  d integer;
  p integer;
  prev_d integer := null;
  prev_p integer := null;
  has_zero boolean := false;
begin
  if jsonb_typeof(bands) is distinct from 'array' then return false; end if;
  if jsonb_array_length(bands) = 0 then return true; end if; -- no bands yet: the tour stays information-only
  -- Read from the furthest threshold to the closest one.
  for b in select x from jsonb_array_elements(bands) x
           order by case when jsonb_typeof(x -> 'from_days') = 'number' then (x ->> 'from_days')::numeric end desc nulls first loop
    if jsonb_typeof(b -> 'from_days') <> 'number' or jsonb_typeof(b -> 'percent') <> 'number' then return false; end if;
    if (b ->> 'from_days')::numeric <> trunc((b ->> 'from_days')::numeric)
       or (b ->> 'percent')::numeric <> trunc((b ->> 'percent')::numeric) then return false; end if;
    d := (b ->> 'from_days')::int;
    p := (b ->> 'percent')::int;
    if d not between 0 and 365 or p not between 0 and 100 then return false; end if;
    if prev_d is not null and (d = prev_d or p < prev_p) then return false; end if; -- unique; never cheaper when closer
    if d = 0 then has_zero := true; end if;
    prev_d := d;
    prev_p := p;
  end loop;
  return has_zero;
end $$;

-- ── Tours (DASH-ADM-058–063, 065, 066, 073) ─────────────────────────────────────────────────────────────────
create type public.tour_kind as enum ('museum_visit', 'excursion', 'evening_tour', 'transfer', 'other');
create table public.tours (
  id uuid primary key default gen_random_uuid(),
  slug public.slug not null unique,
  kind public.tour_kind not null,
  name text not null check (length(trim(name)) between 1 and 160),
  location text not null check (length(trim(location)) between 1 and 120),
  destination_id uuid references public.destinations (id) on delete set null,
  duration_minutes integer not null check (duration_minutes between 15 and 20160),
  supplier_id uuid references public.tour_suppliers (id) on delete set null,
  -- DASH-ADM-066: sold on its own, and/or with the cruise schedules in tour_schedules.
  standalone boolean not null default true,
  -- ADR-087: every guest must be 18 or over.
  adults_only boolean not null default false,
  cancellation_bands jsonb not null default '[]'::jsonb check (app.valid_cancellation_bands(cancellation_bands)),
  visibility public.visibility not null default 'private' check (visibility in ('private', 'published')),
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger tours_updated_at before update on public.tours for each row execute function app.set_updated_at();

create table public.tour_translations (
  tour_id uuid not null references public.tours (id) on delete cascade,
  locale public.locale_code not null,
  description text check (length(description) <= 6000),
  -- Step by step, in order.
  itinerary text[] not null default '{}' check (cardinality(itinerary) <= 30),
  inclusions text[] not null default '{}' check (cardinality(inclusions) <= 30),
  exclusions text[] not null default '{}' check (cardinality(exclusions) <= 30),
  meeting_point text check (length(meeting_point) <= 1500),
  cancellation_terms text check (length(cancellation_terms) <= 3000),
  updated_at timestamptz not null default now(),
  primary key (tour_id, locale)
);
create trigger tour_translations_updated_at before update on public.tour_translations for each row execute function app.set_updated_at();

create table public.tour_schedules (
  tour_id uuid not null references public.tours (id) on delete cascade,
  schedule_id uuid not null references public.schedules (id) on delete cascade,
  primary key (tour_id, schedule_id)
);
create index tour_schedules_schedule_idx on public.tour_schedules (schedule_id);

-- Photos (DASH-ADM-061): media gains a tour parent.
alter table public.media add column tour_id uuid references public.tours (id) on delete cascade;
create index media_tour_idx on public.media (tour_id);
alter table public.media drop constraint media_one_parent;
alter table public.media add constraint media_one_parent check (num_nonnulls(vessel_id, destination_id, cabin_type_id, tour_id) = 1);
alter table public.media drop constraint media_storage_path_check;
alter table public.media add constraint media_storage_path_check
  check (storage_path ~ '^(vessels|destinations|cabin-types|tours)/[0-9a-f-]{36}/[A-Za-z0-9._-]+$');
alter table public.media drop constraint media_path_matches_parent;
alter table public.media add constraint media_path_matches_parent check (
  storage_path like 'vessels/' || coalesce(vessel_id::text, '-') || '/%'
  or storage_path like 'destinations/' || coalesce(destination_id::text, '-') || '/%'
  or storage_path like 'cabin-types/' || coalesce(cabin_type_id::text, '-') || '/%'
  or storage_path like 'tours/' || coalesce(tour_id::text, '-') || '/%'
);

-- ── Sessions (DASH-ADM-067–069) ──────────────────────────────────────────────────────────────────────────────
create type public.session_kind as enum ('shared', 'private');
create type public.price_basis as enum ('per_guest', 'per_group');
create table public.tour_sessions (
  id uuid primary key default gen_random_uuid(),
  tour_id uuid not null references public.tours (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  kind public.session_kind not null,
  pricing public.price_basis not null,
  -- Shared: seats. Private: the largest party.
  capacity smallint not null check (capacity between 1 and 500),
  currency public.currency_code not null check (currency in ('USD', 'EUR')),
  price_minor bigint not null check (price_minor > 0),
  status public.departure_status not null default 'scheduled',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at and ends_at <= starts_at + interval '14 days'),
  -- Guests from different bookings share a session only at a per-guest price.
  constraint shared_is_per_guest check (kind = 'private' or pricing = 'per_guest'),
  unique (tour_id, starts_at, kind, pricing, currency)
);
create index tour_sessions_tour_idx on public.tour_sessions (tour_id, starts_at);
create trigger tour_sessions_updated_at before update on public.tour_sessions for each row execute function app.set_updated_at();

-- DASH-ADM-073: published tours are information-only until they can be sold.
create or replace function public.tour_is_bookable(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.tours t
    where t.id = target and t.visibility = 'published' and t.supplier_id is not null
      and jsonb_array_length(t.cancellation_bands) > 0
      and exists (select 1 from public.tour_sessions s where s.tour_id = t.id and s.status = 'scheduled' and s.starts_at > now())
  );
$$;
revoke execute on function public.tour_is_bookable(uuid) from public;
grant execute on function public.tour_is_bookable(uuid) to anon, authenticated, service_role;

-- ── Programs (DASH-ADM-070, 071) ────────────────────────────────────────────────────────────────────────────
create table public.programs (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 160),
  -- Day N of a program falls on the departure date + N − 1.
  days smallint not null check (days between 1 and 22),
  visibility public.visibility not null default 'private' check (visibility in ('private', 'published')),
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger programs_updated_at before update on public.programs for each row execute function app.set_updated_at();

create table public.program_translations (
  program_id uuid not null references public.programs (id) on delete cascade,
  locale public.locale_code not null,
  description text check (length(description) <= 6000),
  updated_at timestamptz not null default now(),
  primary key (program_id, locale)
);
create trigger program_translations_updated_at before update on public.program_translations for each row execute function app.set_updated_at();

create table public.program_items (
  program_id uuid not null references public.programs (id) on delete cascade,
  day_number smallint not null check (day_number between 1 and 22),
  tour_id uuid not null references public.tours (id) on delete cascade,
  primary key (program_id, day_number, tour_id)
);
create or replace function app.check_program_day() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.day_number > (select days from public.programs where id = new.program_id) then
    raise exception 'Day % is after the program''s last day', new.day_number using errcode = '23514';
  end if;
  return new;
end $$;
create trigger program_items_day before insert or update on public.program_items for each row execute function app.check_program_day();

create table public.program_schedules (
  program_id uuid not null references public.programs (id) on delete cascade,
  schedule_id uuid not null references public.schedules (id) on delete cascade,
  primary key (program_id, schedule_id)
);
create index program_schedules_schedule_idx on public.program_schedules (schedule_id);

-- ── Who reads and writes ────────────────────────────────────────────────────────────────────────────────────
create or replace function app.tour_is_public(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.tours t where t.id = target and t.visibility = 'published');
$$;
create or replace function app.program_is_public(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.programs p where p.id = target and p.visibility = 'published');
$$;
grant execute on function app.tour_is_public(uuid), app.program_is_public(uuid) to anon, authenticated, service_role;

alter table public.tour_suppliers enable row level security;
alter table public.tours enable row level security;
alter table public.tour_translations enable row level security;
alter table public.tour_schedules enable row level security;
alter table public.tour_sessions enable row level security;
alter table public.programs enable row level security;
alter table public.program_translations enable row level security;
alter table public.program_items enable row level security;
alter table public.program_schedules enable row level security;

create policy "tour_suppliers: admins read" on public.tour_suppliers for select to authenticated using (app.is_admin());
create policy "tour_suppliers: tour admins write" on public.tour_suppliers for all to authenticated
  using (app.is_tour_admin()) with check (app.is_tour_admin());

create policy "tours: published or admins" on public.tours for select to anon, authenticated
  using (visibility = 'published' or app.is_admin());
create policy "tours: tour admins write" on public.tours for all to authenticated
  using (app.is_tour_admin()) with check (app.is_tour_admin());

create policy "tour_translations: with tour" on public.tour_translations for select to anon, authenticated
  using (app.tour_is_public(tour_id) or app.is_admin());
create policy "tour_translations: text editors write" on public.tour_translations for all to authenticated
  using (app.can_edit_tour_text()) with check (app.can_edit_tour_text());

create policy "tour_schedules: with tour" on public.tour_schedules for select to anon, authenticated
  using (app.tour_is_public(tour_id) or app.is_admin());
create policy "tour_schedules: tour admins write" on public.tour_schedules for all to authenticated
  using (app.is_tour_admin()) with check (app.is_tour_admin());

-- ADR-087: tour prices are public.
create policy "tour_sessions: with tour" on public.tour_sessions for select to anon, authenticated
  using (app.tour_is_public(tour_id) or app.is_admin());
create policy "tour_sessions: tour admins write" on public.tour_sessions for all to authenticated
  using (app.is_tour_admin()) with check (app.is_tour_admin());

create policy "programs: published or admins" on public.programs for select to anon, authenticated
  using (visibility = 'published' or app.is_admin());
create policy "programs: tour admins write" on public.programs for all to authenticated
  using (app.is_tour_admin()) with check (app.is_tour_admin());
create policy "program_translations: with program" on public.program_translations for select to anon, authenticated
  using (app.program_is_public(program_id) or app.is_admin());
create policy "program_translations: text editors write" on public.program_translations for all to authenticated
  using (app.can_edit_tour_text()) with check (app.can_edit_tour_text());
create policy "program_items: with program" on public.program_items for select to anon, authenticated
  using (app.program_is_public(program_id) or app.is_admin());
create policy "program_items: tour admins write" on public.program_items for all to authenticated
  using (app.is_tour_admin()) with check (app.is_tour_admin());
create policy "program_schedules: with program" on public.program_schedules for select to anon, authenticated
  using (app.program_is_public(program_id) or app.is_admin());
create policy "program_schedules: tour admins write" on public.program_schedules for all to authenticated
  using (app.is_tour_admin()) with check (app.is_tour_admin());

-- Tour photos: readable with a published tour; texts and photos are content work too (ADR-087).
create or replace function app.can_read_media(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.media m left join public.cabin_types c on c.id = m.cabin_type_id
    where m.id = target and (
      (m.vessel_id is not null and app.can_read_vessel(m.vessel_id))
      or (m.cabin_type_id is not null and app.can_read_vessel(c.vessel_id))
      or (m.destination_id is not null and (app.destination_is_public(m.destination_id) or app.is_admin()))
      or (m.tour_id is not null and (app.tour_is_public(m.tour_id) or app.is_admin()))
    )
  );
$$;
drop policy "media: editors write" on public.media;
create policy "media: editors write" on public.media for all to authenticated
  using (app.is_catalogue_admin()
    or (vessel_id is not null and app.can_edit_vessel(vessel_id))
    or (cabin_type_id is not null and exists (select 1 from public.cabin_types c where c.id = cabin_type_id and app.can_edit_product(c.vessel_id)))
    or (tour_id is not null and app.can_edit_tour_text()))
  with check (app.is_catalogue_admin()
    or (vessel_id is not null and app.can_edit_vessel(vessel_id))
    or (cabin_type_id is not null and exists (select 1 from public.cabin_types c where c.id = cabin_type_id and app.can_edit_product(c.vessel_id)))
    or (tour_id is not null and app.can_edit_tour_text()));

grant select on public.tours, public.tour_translations, public.tour_schedules, public.tour_sessions, public.programs,
  public.program_translations, public.program_items, public.program_schedules to anon;
grant select, insert, update, delete on public.tour_suppliers, public.tours, public.tour_translations, public.tour_schedules,
  public.tour_sessions, public.programs, public.program_translations, public.program_items, public.program_schedules
  to authenticated, service_role;

create trigger audit_tour_suppliers after insert or update or delete on public.tour_suppliers for each row execute function app.audit_row();
create trigger audit_tours after insert or update or delete on public.tours for each row execute function app.audit_row();
create trigger audit_tour_sessions after insert or update or delete on public.tour_sessions for each row execute function app.audit_row();
create trigger audit_programs after insert or update or delete on public.programs for each row execute function app.audit_row();
