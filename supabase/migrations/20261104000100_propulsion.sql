-- What drives each vessel, and the vessel data the Nour El Nil fleet import needs (Islam's brief, 4 Nov 2026).
-- Every addition is optional for existing rows, so vessels without it render as before and their sections hide.
-- Idempotent ("if not exists"), so it can run again on a database that already has it.

-- Propulsion: an engine (motor), sails only (wind) or a steam paddle wheel (steam). Separate from the vessel's type,
-- because a dahabiya may also have an engine. Set from each vessel's own data, never inferred from its name or a
-- prefix such as "MS" or "SS"; vessels without a confirmed value stay null and show no badge until one is set.
do $$ begin
  create type public.propulsion as enum ('motor', 'wind', 'steam');
exception when duplicate_object then null;
end $$;

alter table public.vessels
  add column if not exists propulsion public.propulsion,
  -- The page's heading when it differs from the name ("Dendera, by Nour El Nil"); the name stays the short form.
  add column if not exists display_name text check (length(trim(display_name)) between 1 and 120),
  add column if not exists length_m numeric(5, 1) check (length_m > 0 and length_m < 300),
  add column if not exists beam_m numeric(4, 1) check (beam_m > 0 and beam_m < 50),
  -- An indicative price for a whole cruise (per person, sharing a double room), for operators that price per trip.
  add column if not exists indicative_per_trip_minor bigint check (indicative_per_trip_minor > 0),
  add column if not exists indicative_trip_nights smallint check (indicative_trip_nights between 1 and 21);

-- The guide price is either per night or per trip, never both; its currency, basis and status always come with it.
alter table public.vessels drop constraint if exists vessels_indicative_basis_check;
alter table public.vessels add constraint vessels_indicative_basis_check
  check (indicative_basis in ('per_person_per_night', 'per_person_per_trip'));
alter table public.vessels drop constraint if exists indicative_price_complete;
alter table public.vessels add constraint indicative_price_complete check (
  num_nulls(indicative_per_night_minor, indicative_per_trip_minor, indicative_trip_nights, indicative_currency,
    indicative_basis, indicative_status) = 6
  or (indicative_basis = 'per_person_per_night' and indicative_per_night_minor is not null
    and num_nulls(indicative_per_trip_minor, indicative_trip_nights) = 2
    and indicative_currency is not null and indicative_status is not null)
  or (indicative_basis = 'per_person_per_trip' and indicative_per_trip_minor is not null and indicative_trip_nights is not null
    and indicative_per_night_minor is null and indicative_currency is not null and indicative_status is not null));

-- In each language: how a wind-driven vessel sails, notes on life on board, "good to know" points, and a title and
-- description for search results when the page's usual pattern doesn't fit. Empty lists and nulls aren't shown.
alter table public.vessel_translations
  add column if not exists propulsion_note text check (length(propulsion_note) <= 400),
  add column if not exists on_board text[] not null default '{}',
  add column if not exists good_to_know text[] not null default '{}',
  add column if not exists seo_title text check (length(seo_title) <= 120),
  add column if not exists seo_description text check (length(seo_description) <= 320);

-- A family unit such as a two-room Deluxe Suite sleeps four. Booking still prices one to three guests per cabin.
alter table public.cabin_types drop constraint if exists cabin_types_max_occupancy_check;
alter table public.cabin_types add constraint cabin_types_max_occupancy_check check (max_occupancy between 1 and 4);
-- Areas to the hundredth of a square metre, as operators publish them (17.35 m², not 17.4).
alter table public.cabin_types alter column size_m2 type numeric(6, 2);
-- The area includes the bathroom: the card says so ("Area, including bathroom").
alter table public.cabin_types add column if not exists size_includes_bathroom boolean not null default false;
-- The bed set-up and view in each language (the cabin type's own columns are the English).
alter table public.cabin_type_translations
  add column if not exists bed_configuration text check (length(bed_configuration) <= 200),
  add column if not exists view text check (length(view) <= 200);

-- An itinerary's words in each language: for now, how guests get on board.
create table if not exists public.schedule_translations (
  schedule_id uuid not null references public.schedules (id) on delete cascade,
  locale public.locale_code not null,
  boarding_note text check (length(boarding_note) <= 600),
  primary key (schedule_id, locale)
);
alter table public.schedule_translations enable row level security;
drop policy if exists "schedule_translations: read" on public.schedule_translations;
create policy "schedule_translations: read" on public.schedule_translations for select to anon, authenticated
  using (exists (select 1 from public.schedules s where s.id = schedule_id and app.can_read_product(s.vessel_id)));
drop policy if exists "schedule_translations: editors write" on public.schedule_translations;
create policy "schedule_translations: editors write" on public.schedule_translations for all to authenticated
  using (exists (select 1 from public.schedules s where s.id = schedule_id and app.can_edit_product(s.vessel_id)))
  with check (exists (select 1 from public.schedules s where s.id = schedule_id and app.can_edit_product(s.vessel_id)));
grant select on public.schedule_translations to anon;
grant select, insert, update, delete on public.schedule_translations to authenticated, service_role;

-- The values the brief confirms, by each vessel's address (nothing happens where a vessel isn't there):
-- Mövenpick MS Royal Lily is a motor ship; SS Misr, SS Sudan and SS Karim are paddle steamers.
update public.vessels set propulsion = 'motor' where slug = 'movenpick-royal-lily' and propulsion is null;
update public.vessels set propulsion = 'steam'
  where slug in ('movenpick-ss-misr', 'historic-steamer-sudan-ss-sudan', 'karim-nile-steamer-cruise') and propulsion is null;

-- Only Nilecruz catalogue admins set what drives a vessel, as they do its category and labels.
create or replace function app.guard_vessel_admin_fields() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if app.is_catalogue_admin() or auth.uid() is null or current_setting('app.applying_submission', true) = 'on' then
    return new;
  end if;
  if new.visibility is distinct from old.visibility
     or new.operator_org_id is distinct from old.operator_org_id
     or new.slug is distinct from old.slug
     or new.source_ref is distinct from old.source_ref
     or new.is_sample is distinct from old.is_sample
     or new.published_at is distinct from old.published_at
     or new.category is distinct from old.category
     or new.best_for is distinct from old.best_for
     or new.showcase_until is distinct from old.showcase_until
     or new.showcase_reason is distinct from old.showcase_reason
     or new.propulsion is distinct from old.propulsion then
    raise exception 'Only Nilecruz catalogue admins can change visibility, operator, slug, source, category, labels, propulsion or sample flag'
      using errcode = '42501';
  end if;
  return new;
end $$;
