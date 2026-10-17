-- Vessels, destinations and media (DATA-005, DATA-006, DATA-013, BRAND-008, BRAND-009, BRAND-014, SEO-030, I18N-011).

-- BRAND-008: the three vessel types. Labels live in the message files ("Sailing dahabiya", "Motor cruise ship", "Paddle steamer").
create type public.vessel_type as enum ('sail', 'motor', 'steam');
-- private: drafts (default); showcase: shown although incomplete (ADR on complete-vessel rule); published: complete.
create type public.visibility as enum ('private', 'showcase', 'published');
-- Matches the silo facets /cruises/luxury/ and /cruises/value/. Null until an admin sets it.
create type public.vessel_category as enum ('luxury', 'value');

-- SEO-030: a vessel slug may never equal a facet slug of the cruise silo.
create or replace function app.is_reserved_slug(slug text) returns boolean
language sql immutable as $$
  select slug = any (array[
    'dahabiyas', 'motor-ships', 'paddle-steamers', 'luxury', 'value', 'luxor-to-aswan', 'aswan-to-luxor',
    '7-nights', 'lake-nasser', 'private-charter', 'last-minute', 'compare'
  ]);
$$;

create domain public.slug as text
  check (value ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(value) <= 80);

create table public.vessels (
  id uuid primary key default gen_random_uuid(),
  slug public.slug not null unique check (not app.is_reserved_slug(slug)),
  source_ref text unique,
  name text not null check (length(trim(name)) > 0),
  type public.vessel_type not null,
  visibility public.visibility not null default 'private',
  operator_org_id uuid references public.organisations (id) on delete set null,
  category public.vessel_category,
  cabin_count integer check (cabin_count > 0 and cabin_count <= 400),
  max_guests integer check (max_guests > 0 and max_guests <= 800),
  deck_count smallint check (deck_count > 0 and deck_count <= 10),
  year_built smallint check (year_built between 1850 and 2100),
  route_text text,
  is_sample boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint published_has_date check (visibility <> 'published' or published_at is not null)
);
create index vessels_operator_idx on public.vessels (operator_org_id);
create index vessels_public_idx on public.vessels (visibility) where visibility <> 'private';
create trigger vessels_updated_at before update on public.vessels for each row execute function app.set_updated_at();

-- Facts only Nilecruz staff see: where a record came from and how far it is verified.
create table public.vessel_private (
  vessel_id uuid primary key references public.vessels (id) on delete cascade,
  aliases text[] not null default '{}',
  claimed_operator_name text,
  raw_type text,
  raw_class_rating text,
  verification_note text,
  source_urls text[] not null default '{}',
  import_flags text,
  updated_at timestamptz not null default now()
);
create trigger vessel_private_updated_at before update on public.vessel_private for each row execute function app.set_updated_at();

create table public.vessel_translations (
  vessel_id uuid not null references public.vessels (id) on delete cascade,
  locale public.locale_code not null,
  summary text,
  description text,
  updated_at timestamptz not null default now(),
  primary key (vessel_id, locale)
);
create trigger vessel_translations_updated_at before update on public.vessel_translations for each row execute function app.set_updated_at();

-- BRAND-009: common English names (Luxor, Aswan, Edfu, Kom Ombo, Esna, Abu Simbel), never transliteration variants.
create table public.destinations (
  id uuid primary key default gen_random_uuid(),
  slug public.slug not null unique,
  name text not null check (length(trim(name)) > 0),
  visibility public.visibility not null default 'private',
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger destinations_updated_at before update on public.destinations for each row execute function app.set_updated_at();

create table public.destination_translations (
  destination_id uuid not null references public.destinations (id) on delete cascade,
  locale public.locale_code not null,
  name text,
  summary text,
  updated_at timestamptz not null default now(),
  primary key (destination_id, locale)
);
create trigger destination_translations_updated_at before update on public.destination_translations for each row execute function app.set_updated_at();

-- BRAND-014: every photograph belongs to exactly one vessel or destination.
create table public.media (
  id uuid primary key default gen_random_uuid(),
  vessel_id uuid references public.vessels (id) on delete cascade,
  destination_id uuid references public.destinations (id) on delete cascade,
  storage_path text not null unique check (storage_path ~ '^(vessels|destinations)/[0-9a-f-]{36}/[A-Za-z0-9._-]+$'),
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  credit text,
  sort_order integer not null default 0,
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint media_one_parent check (num_nonnulls(vessel_id, destination_id) = 1),
  constraint media_path_matches_parent check (
    storage_path like 'vessels/' || coalesce(vessel_id::text, '-') || '/%'
    or storage_path like 'destinations/' || coalesce(destination_id::text, '-') || '/%'
  )
);
create index media_vessel_idx on public.media (vessel_id);
create index media_destination_idx on public.media (destination_id);
create trigger media_updated_at before update on public.media for each row execute function app.set_updated_at();

create table public.media_translations (
  media_id uuid not null references public.media (id) on delete cascade,
  locale public.locale_code not null,
  alt text not null check (length(trim(alt)) > 0),
  primary key (media_id, locale)
);

-- Visibility helpers (SECURITY DEFINER: policies on child tables must not depend on the caller's vessel policies).
create or replace function app.vessel_is_public(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.vessels v where v.id = target and v.visibility <> 'private');
$$;

create or replace function app.can_read_vessel(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select app.is_admin() or exists (
    select 1 from public.vessels v
    where v.id = target and (v.visibility <> 'private' or v.operator_org_id in (select app.my_org_ids()))
  );
$$;

create or replace function app.can_edit_vessel(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select app.is_admin() or exists (
    select 1 from public.vessels v
    where v.id = target and app.has_org_role(v.operator_org_id, array['owner', 'reservations']::public.team_role[])
  );
$$;

create or replace function app.destination_is_public(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.destinations d where d.id = target and d.visibility <> 'private');
$$;

create or replace function app.can_read_media(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.media m
    where m.id = target and (
      (m.vessel_id is not null and app.can_read_vessel(m.vessel_id))
      or (m.destination_id is not null and (app.destination_is_public(m.destination_id) or app.is_admin()))
    )
  );
$$;

grant execute on function app.is_reserved_slug(text), app.vessel_is_public(uuid), app.can_read_vessel(uuid),
  app.can_edit_vessel(uuid), app.destination_is_public(uuid), app.can_read_media(uuid)
  to anon, authenticated, service_role;

-- Operators edit their vessel's facts; only admins publish, re-assign, re-slug or flag sample data.
create or replace function app.guard_vessel_admin_fields() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if app.is_admin() or auth.uid() is null then
    return new; -- admins, and server jobs running as service_role / postgres
  end if;
  if new.visibility is distinct from old.visibility
     or new.operator_org_id is distinct from old.operator_org_id
     or new.slug is distinct from old.slug
     or new.source_ref is distinct from old.source_ref
     or new.is_sample is distinct from old.is_sample
     or new.published_at is distinct from old.published_at then
    raise exception 'Only Nilecruz admins can change visibility, operator, slug, source or sample flag'
      using errcode = '42501';
  end if;
  return new;
end $$;
create trigger vessels_guard_admin_fields before update on public.vessels
  for each row execute function app.guard_vessel_admin_fields();

-- RLS (SEC-001): public reads only showcase/published rows; admins everything; operators their own organisation.
alter table public.vessels enable row level security;
alter table public.vessel_private enable row level security;
alter table public.vessel_translations enable row level security;
alter table public.destinations enable row level security;
alter table public.destination_translations enable row level security;
alter table public.media enable row level security;
alter table public.media_translations enable row level security;

create policy "vessels: public reads visible" on public.vessels for select to anon, authenticated
  using (visibility <> 'private');
create policy "vessels: operators read own" on public.vessels for select to authenticated
  using (operator_org_id in (select app.my_org_ids()));
create policy "vessels: operators edit own" on public.vessels for update to authenticated
  using (app.can_edit_vessel(id)) with check (app.can_edit_vessel(id));
create policy "vessels: admin manages" on public.vessels for all to authenticated
  using (app.is_admin()) with check (app.is_admin());

create policy "vessel_private: admin only" on public.vessel_private for all to authenticated
  using (app.is_admin()) with check (app.is_admin());

create policy "vessel_translations: readable with vessel" on public.vessel_translations for select to anon, authenticated
  using (app.can_read_vessel(vessel_id));
create policy "vessel_translations: editors write" on public.vessel_translations for all to authenticated
  using (app.can_edit_vessel(vessel_id)) with check (app.can_edit_vessel(vessel_id));

create policy "destinations: public reads visible" on public.destinations for select to anon, authenticated
  using (visibility <> 'private');
create policy "destinations: admin manages" on public.destinations for all to authenticated
  using (app.is_admin()) with check (app.is_admin());

create policy "destination_translations: readable with destination" on public.destination_translations
  for select to anon, authenticated using (app.destination_is_public(destination_id) or app.is_admin());
create policy "destination_translations: admin manages" on public.destination_translations for all to authenticated
  using (app.is_admin()) with check (app.is_admin());

create policy "media: readable with parent" on public.media for select to anon, authenticated
  using (app.can_read_media(id));
create policy "media: vessel editors write" on public.media for all to authenticated
  using (app.is_admin() or (vessel_id is not null and app.can_edit_vessel(vessel_id)))
  with check (app.is_admin() or (vessel_id is not null and app.can_edit_vessel(vessel_id)));

create policy "media_translations: readable with media" on public.media_translations for select to anon, authenticated
  using (app.can_read_media(media_id));
create policy "media_translations: editors write" on public.media_translations for all to authenticated
  using (exists (select 1 from public.media m where m.id = media_id
                 and (app.is_admin() or (m.vessel_id is not null and app.can_edit_vessel(m.vessel_id)))))
  with check (exists (select 1 from public.media m where m.id = media_id
                 and (app.is_admin() or (m.vessel_id is not null and app.can_edit_vessel(m.vessel_id)))));

-- Storage: one private bucket. Files are served only when their media row is readable (BRAND-014).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', false, 15728640, array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do nothing;

create or replace function app.storage_vessel_id(object_name text) returns uuid
language sql immutable as $$
  select case when object_name ~ '^vessels/[0-9a-f-]{36}/' then split_part(object_name, '/', 2)::uuid end;
$$;
grant execute on function app.storage_vessel_id(text) to anon, authenticated, service_role;

create policy "media bucket: read with media row" on storage.objects for select to anon, authenticated
  using (bucket_id = 'media' and exists (
    select 1 from public.media m where m.storage_path = storage.objects.name and app.can_read_media(m.id)));
create policy "media bucket: admins and vessel editors upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (app.is_admin()
    or (app.storage_vessel_id(name) is not null and app.can_edit_vessel(app.storage_vessel_id(name)))));
create policy "media bucket: admins and vessel editors change" on storage.objects for update to authenticated
  using (bucket_id = 'media' and (app.is_admin()
    or (app.storage_vessel_id(name) is not null and app.can_edit_vessel(app.storage_vessel_id(name)))));
create policy "media bucket: admins and vessel editors remove" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (app.is_admin()
    or (app.storage_vessel_id(name) is not null and app.can_edit_vessel(app.storage_vessel_id(name)))));
