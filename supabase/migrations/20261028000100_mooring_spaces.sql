-- Batch 9-2a (EXP-005, EXP-002): how a vessel moors, and the shared spaces its guests share. Set by Nilecruz in the
-- catalogue, or proposed by the operator in a vessel submission and applied when Nilecruz approves it.
create type public.mooring_practice as enum ('private_bank', 'rafted', 'varies');

alter table public.vessels
  add column mooring public.mooring_practice,
  add column shared_spaces text[] not null default '{}'
    check (shared_spaces <@ array['sun_deck', 'pool', 'jacuzzi', 'dining_room', 'lounge', 'bar', 'spa', 'gym', 'library']);

-- Approval applies the proposal: a new vessel becomes a private draft of the operator; changes update their vessel.
-- Now also the mooring practice and the shared spaces (a comma-separated list in the proposal).
create or replace function public.approve_submission(target uuid, new_slug text default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  s public.vessel_submissions;
  p jsonb;
  vid uuid;
  spaces text[];
begin
  s := app.submission_transition(target, 'approved', null);
  p := s.proposal;
  spaces := case when nullif(p ->> 'shared_spaces', '') is null then null else string_to_array(p ->> 'shared_spaces', ',') end;
  perform set_config('app.applying_submission', 'on', true);
  if s.vessel_id is null then
    insert into public.vessels (slug, name, type, visibility, operator_org_id, cabin_count, max_guests, deck_count, year_built, route_text,
      mooring, shared_spaces)
    values (
      new_slug, p ->> 'name', (p ->> 'type')::public.vessel_type, 'private', s.org_id,
      nullif(p ->> 'cabin_count', '')::int, nullif(p ->> 'max_guests', '')::int, nullif(p ->> 'deck_count', '')::smallint,
      nullif(p ->> 'year_built', '')::smallint, nullif(p ->> 'route_text', ''),
      nullif(p ->> 'mooring', '')::public.mooring_practice, coalesce(spaces, '{}')
    ) returning id into vid;
    perform set_config('app.submission_transition', 'on', true);
    update public.vessel_submissions set vessel_id = vid where id = target;
    perform set_config('app.submission_transition', 'off', true);
  else
    vid := s.vessel_id;
    update public.vessels set
      name = coalesce(p ->> 'name', name),
      type = coalesce((p ->> 'type')::public.vessel_type, type),
      cabin_count = coalesce(nullif(p ->> 'cabin_count', '')::int, cabin_count),
      max_guests = coalesce(nullif(p ->> 'max_guests', '')::int, max_guests),
      deck_count = coalesce(nullif(p ->> 'deck_count', '')::smallint, deck_count),
      year_built = coalesce(nullif(p ->> 'year_built', '')::smallint, year_built),
      route_text = coalesce(nullif(p ->> 'route_text', ''), route_text),
      mooring = coalesce(nullif(p ->> 'mooring', '')::public.mooring_practice, mooring),
      shared_spaces = coalesce(spaces, shared_spaces)
    where id = vid;
  end if;
  if p ? 'description_en' then
    insert into public.vessel_translations (vessel_id, locale, description) values (vid, 'en', p ->> 'description_en')
    on conflict (vessel_id, locale) do update set description = excluded.description;
  end if;
  perform set_config('app.applying_submission', 'off', true);
  return vid;
end $$;
