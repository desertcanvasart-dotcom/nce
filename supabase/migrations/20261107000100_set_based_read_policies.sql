-- ADR-113: the catalogue's read rules work out who may read what once per query, not once per row.
--
-- The rules called security-definer functions per row (app.can_read_product -> app.can_read_vessel -> app.is_admin, and
-- app.can_read_media on top for photos). Postgres can't inline security-definer functions, so every row ran its own
-- nested queries. On production (7 Nov 2026) that made a visitor's read of 252 departures take 80 ms instead of 0.07 ms,
-- and 226 photo captions 135 ms instead of 0.05 ms. One read of the listing spent ~0.3 s on these checks, so a dozen at
-- once passed the visitor statement timeout (the failed Railway builds), and the cost grows with every sailing date.
--
-- Same rules, computed as sets: each function below returns the rows the current user may read, and each policy tests
-- membership with `in (select ...)`. That subquery doesn't depend on the row, so Postgres runs it once per query and
-- hashes it. Who may read what doesn't change; supabase/tests/420_set_based_reads.sql compares old and new for
-- visitors, an operator and an admin on every row.

-- ── The sets ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- What app.can_read_vessel(id) allows: admins read every vessel; anyone else a visible one or their own organisation's.
create or replace function app.readable_vessel_ids() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select v.id from public.vessels v
  where (select app.is_admin()) or app.vessel_visible(v) or v.operator_org_id in (select app.my_org_ids());
$$;

-- What app.vessel_is_public(id) allows: visible vessels, whoever is asking.
create or replace function app.public_vessel_ids() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select v.id from public.vessels v where app.vessel_visible(v);
$$;

-- What app.evaluation_is_public(id) allows: published evaluations of visible vessels.
create or replace function app.public_evaluation_ids() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select e.id from public.evaluations e
  where e.published and e.vessel_id in (select app.public_vessel_ids());
$$;

-- What app.can_read_media(id) allows: a vessel's or cabin's photo when that vessel is readable; a destination's or
-- tour's when it is public, or for admins.
create or replace function app.readable_media_ids() returns setof uuid
language sql stable security definer set search_path = '' as $$
  with vessels as (select app.readable_vessel_ids() as id), admin as (select app.is_admin() as yes)
  select m.id from public.media m
  left join public.cabin_types c on c.id = m.cabin_type_id
  left join public.destinations d on d.id = m.destination_id
  left join public.tours t on t.id = m.tour_id
  where (m.vessel_id is not null and m.vessel_id in (select id from vessels))
     or (m.cabin_type_id is not null and c.vessel_id in (select id from vessels))
     or (m.destination_id is not null and (d.visibility <> 'private' or (select yes from admin)))
     or (m.tour_id is not null and (t.visibility = 'published' or (select yes from admin)));
$$;

revoke all on function app.readable_vessel_ids(), app.public_vessel_ids(), app.public_evaluation_ids(),
  app.readable_media_ids() from public;
grant execute on function app.readable_vessel_ids(), app.public_vessel_ids(), app.public_evaluation_ids(),
  app.readable_media_ids() to anon, authenticated;

-- ── The rules ────────────────────────────────────────────────────────────────────────────────────────────────────
-- app.can_read_product(x) and app.can_read_vessel(x) are the same test (x in readable vessels).
alter policy "vessel_translations: readable with vessel" on public.vessel_translations
  using (vessel_id in (select app.readable_vessel_ids()));
alter policy "deck_plans: readable with vessel" on public.deck_plans
  using (vessel_id in (select app.readable_vessel_ids()));
alter policy "cabin_types: read with vessel" on public.cabin_types
  using (vessel_id in (select app.readable_vessel_ids()));
alter policy "cancellation_policies: with vessel" on public.cancellation_policies
  using (vessel_id in (select app.readable_vessel_ids()));
alter policy "schedules: read with vessel" on public.schedules
  using (vessel_id in (select app.readable_vessel_ids()));
alter policy "departures: read with vessel" on public.departures
  using (vessel_id in (select app.readable_vessel_ids()));

alter policy "cabin_type_translations: read" on public.cabin_type_translations
  using (exists (select 1 from public.cabin_types c
                 where c.id = cabin_type_translations.cabin_type_id and c.vessel_id in (select app.readable_vessel_ids())));
alter policy "cancellation_policy_translations: with policy" on public.cancellation_policy_translations
  using (exists (select 1 from public.cancellation_policies p
                 where p.id = cancellation_policy_translations.policy_id and p.vessel_id in (select app.readable_vessel_ids())));
alter policy "schedule_days: read" on public.schedule_days
  using (exists (select 1 from public.schedules s
                 where s.id = schedule_days.schedule_id and s.vessel_id in (select app.readable_vessel_ids())));
alter policy "schedule_periods: read" on public.schedule_periods
  using (exists (select 1 from public.schedules s
                 where s.id = schedule_periods.schedule_id and s.vessel_id in (select app.readable_vessel_ids())));
alter policy "schedule_translations: read" on public.schedule_translations
  using (exists (select 1 from public.schedules s
                 where s.id = schedule_translations.schedule_id and s.vessel_id in (select app.readable_vessel_ids())));

alter policy "evaluations: published and public" on public.evaluations
  using (published and vessel_id in (select app.public_vessel_ids()));
alter policy "evaluation_translations: with evaluation" on public.evaluation_translations
  using (evaluation_id in (select app.public_evaluation_ids()) or (select app.is_admin()));
alter policy "external_ratings: public with vessel" on public.external_ratings
  using (vessel_id in (select app.public_vessel_ids()) or (select app.is_admin()));

alter policy "media: readable with parent" on public.media
  using (id in (select app.readable_media_ids()));
alter policy "media_translations: readable with media" on public.media_translations
  using (media_id in (select app.readable_media_ids()));
