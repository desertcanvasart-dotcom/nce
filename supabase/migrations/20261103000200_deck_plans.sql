-- A vessel's deck plan (EXP-002, 9-2b): Nilecruz's own drawing of its decks, and the operator's original to download.
-- `layout` is the drawing: decks from top to bottom, each a set of areas along the hull (cabin types by code, or shared
-- spaces); the app checks its shape. The original file sits in the private "deck-plans" bucket and is served only while
-- the vessel is readable. Cabin numbers are never drawn: the operator assigns them (DASH-BND-003).
create table public.deck_plans (
  vessel_id uuid primary key references public.vessels (id) on delete cascade,
  layout jsonb check (layout is null or jsonb_typeof(layout -> 'decks') = 'array'),
  source_path text,
  source_name text check (length(source_name) <= 200),
  source_bytes integer check (source_bytes > 0),
  credit text check (length(trim(credit)) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((source_path is null) = (source_name is null))
);
create trigger deck_plans_updated_at before update on public.deck_plans for each row execute function app.set_updated_at();
alter table public.deck_plans enable row level security;
grant select on public.deck_plans to anon;
grant select, insert, update, delete on public.deck_plans to authenticated, service_role;

create policy "deck_plans: readable with vessel" on public.deck_plans for select to anon, authenticated
  using (app.can_read_vessel(vessel_id));
create policy "deck_plans: editors write" on public.deck_plans for all to authenticated
  using (app.is_admin() or app.can_edit_vessel(vessel_id))
  with check (app.is_admin() or app.can_edit_vessel(vessel_id));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('deck-plans', 'deck-plans', false, 15728640, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Paths are vessels/<vessel id>/<file>, as in the media bucket.
create policy "deck-plans bucket: read with the plan" on storage.objects for select to anon, authenticated
  using (bucket_id = 'deck-plans' and exists (
    select 1 from public.deck_plans d where d.source_path = storage.objects.name and app.can_read_vessel(d.vessel_id)));
-- Editors also read their vessel's files: storage only deletes what the caller can read, and a replaced file is no
-- longer the plan's.
create policy "deck-plans bucket: editors read" on storage.objects for select to authenticated
  using (bucket_id = 'deck-plans' and (app.is_admin()
    or (app.storage_vessel_id(name) is not null and app.can_edit_vessel(app.storage_vessel_id(name)))));
create policy "deck-plans bucket: editors upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'deck-plans' and (app.is_admin()
    or (app.storage_vessel_id(name) is not null and app.can_edit_vessel(app.storage_vessel_id(name)))));
create policy "deck-plans bucket: editors remove" on storage.objects for delete to authenticated
  using (bucket_id = 'deck-plans' and (app.is_admin()
    or (app.storage_vessel_id(name) is not null and app.can_edit_vessel(app.storage_vessel_id(name)))));
