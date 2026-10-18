-- Batch 4d tours and sightseeing (DASH-ADM-058–071, 073, DATA-042, ADR-087).
begin;
select plan(27);

create function pg_temp.as_user(uid uuid, aal text default 'aal2') returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated', 'aal', aal)::text, true);
end $$;
create function pg_temp.as_anon() returns void language plpgsql as $$
begin
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claims', '{"role": "anon"}', true);
end $$;

-- Catalogue admin (two-step) builds a supplier and a tour.
select pg_temp.as_user('00000000-0000-4000-a000-000000000002');
select lives_ok($$insert into public.tour_suppliers (id, name, email) values
  ('00000000-0000-4000-d100-000000000001', 'Sample Supplier', 'ops@supplier.test')$$, 'a catalogue admin adds a supplier');
select lives_ok($$insert into public.tours (id, slug, kind, name, location, duration_minutes, supplier_id) values
  ('00000000-0000-4000-d200-000000000001', 'sample-tour-one', 'excursion', 'Sample Tour', 'Aswan', 240, '00000000-0000-4000-d100-000000000001')$$,
  'and a tour');
select throws_ok($$update public.tours set cancellation_bands = '[{"from_days": 7, "percent": 50}]' where id = '00000000-0000-4000-d200-000000000001'$$,
  '23514', null, 'bands must cover the last days (a band from 0 days)');
select throws_ok($$update public.tours set cancellation_bands = '[{"from_days": 7, "percent": 50}, {"from_days": 0, "percent": 20}]' where id = '00000000-0000-4000-d200-000000000001'$$,
  '23514', null, 'the charge never goes down closer to the start');
select throws_ok($$update public.tours set cancellation_bands = '[{"from_days": 0, "percent": 120}]' where id = '00000000-0000-4000-d200-000000000001'$$,
  '23514', null, 'percentages stay within 0–100');
select lives_ok($$update public.tours set cancellation_bands = '[{"from_days": 7, "percent": 0}, {"from_days": 2, "percent": 50}, {"from_days": 0, "percent": 100}]',
  visibility = 'published' where id = '00000000-0000-4000-d200-000000000001'$$, 'valid bands, published');
select ok(not public.tour_is_bookable('00000000-0000-4000-d200-000000000001'), 'published without sessions it is information-only');
select throws_ok($$insert into public.tour_sessions (tour_id, starts_at, ends_at, kind, pricing, capacity, currency, price_minor) values
  ('00000000-0000-4000-d200-000000000001', now() + interval '3 days', now() + interval '3 days 4 hours', 'shared', 'per_group', 20, 'USD', 5000)$$,
  '23514', null, 'a shared session is always priced per guest');
select throws_ok($$insert into public.tour_sessions (tour_id, starts_at, ends_at, kind, pricing, capacity, currency, price_minor) values
  ('00000000-0000-4000-d200-000000000001', now() + interval '3 days', now() + interval '3 days 4 hours', 'shared', 'per_guest', 20, 'EGP', 5000)$$,
  '23514', null, 'tours are priced in US$ or € (ADR-087)');
select lives_ok($$insert into public.tour_sessions (tour_id, starts_at, ends_at, kind, pricing, capacity, currency, price_minor) values
  ('00000000-0000-4000-d200-000000000001', date_trunc('hour', now()) + interval '3 days', date_trunc('hour', now()) + interval '3 days 4 hours', 'shared', 'per_guest', 20, 'USD', 5000),
  ('00000000-0000-4000-d200-000000000001', date_trunc('hour', now()) + interval '3 days', date_trunc('hour', now()) + interval '3 days 4 hours', 'private', 'per_group', 6, 'USD', 40000)$$,
  'shared and private options for the same start');
select throws_ok($$insert into public.tour_sessions (tour_id, starts_at, ends_at, kind, pricing, capacity, currency, price_minor) values
  ('00000000-0000-4000-d200-000000000001', date_trunc('hour', now()) + interval '3 days', date_trunc('hour', now()) + interval '3 days 4 hours', 'shared', 'per_guest', 20, 'USD', 5000)$$,
  '23505', null, 'no duplicate sessions');
select throws_ok($$insert into public.tour_sessions (tour_id, starts_at, ends_at, kind, pricing, capacity, currency, price_minor) values
  ('00000000-0000-4000-d200-000000000001', now() + interval '5 days', now() + interval '5 days 1 hour', 'private', 'per_guest', 0, 'USD', 5000)$$,
  '23514', null, 'capacity is at least one');
select ok(public.tour_is_bookable('00000000-0000-4000-d200-000000000001'), 'with a supplier, bands and a future session it becomes bookable');

-- Programs: days within the program; linked to schedules.
select lives_ok($$insert into public.programs (id, name, days) values ('00000000-0000-4000-d300-000000000001', 'Sample Program', 4)$$, 'a program');
select throws_ok($$insert into public.program_items (program_id, day_number, tour_id) values
  ('00000000-0000-4000-d300-000000000001', 5, '00000000-0000-4000-d200-000000000001')$$, '23514', null, 'a day after the last day is refused');
select lives_ok($$insert into public.program_items (program_id, day_number, tour_id) values
  ('00000000-0000-4000-d300-000000000001', 2, '00000000-0000-4000-d200-000000000001')$$, 'a tour on day 2');

-- Content admins: texts and photos only (ADR-087).
select pg_temp.as_user('00000000-0000-4000-a000-000000000001');
do $$ begin update public.profiles set admin_role = 'content' where id = '00000000-0000-4000-a000-000000000003'; end $$;
select pg_temp.as_user('00000000-0000-4000-a000-000000000003');
select lives_ok($$insert into public.tour_translations (tour_id, locale, description) values ('00000000-0000-4000-d200-000000000001', 'en', 'A sample description.')$$,
  'a content admin writes the description');
update public.tour_sessions set price_minor = 1;
update public.tours set cancellation_bands = '[]';
select is((select min(price_minor)::int from public.tour_sessions), 5000, 'but changes no prices');
select ok((select jsonb_array_length(cancellation_bands) = 3 from public.tours where id = '00000000-0000-4000-d200-000000000001'), 'and no cancellation bands');
select throws_ok($$insert into public.tour_suppliers (name) values ('Content supplier')$$, '42501', null, 'nor adds suppliers');

-- Admin without two-step: nothing beyond the public.
select pg_temp.as_user('00000000-0000-4000-a000-000000000002', 'aal1');
select throws_ok($$insert into public.tours (slug, kind, name, location, duration_minutes) values ('x-tour', 'other', 'X', 'Y', 60)$$, '42501', null,
  'an admin without two-step cannot create tours');

-- Operators and partners: no access (DATA-042).
select pg_temp.as_user('00000000-0000-4000-a000-000000000010', 'aal1');
select throws_ok($$insert into public.tours (slug, kind, name, location, duration_minutes) values ('op-tour', 'other', 'X', 'Y', 60)$$, '42501', null,
  'operators cannot create tours');
update public.tours set name = 'Hijacked';
select is_empty('select 1 from public.tour_suppliers', 'operators never see suppliers');
select pg_temp.as_user('00000000-0000-4000-a000-000000000030', 'aal1');
delete from public.tour_sessions;

-- The public reads published tours and their prices, never suppliers or drafts.
select pg_temp.as_anon();
select is((select count(*)::int from public.tour_sessions), 2, 'partners removed nothing, and the public sees the published tour''s sessions and prices (ADR-087)');
select is((select name from public.tours), 'Sample Tour', 'operators changed nothing');
select throws_ok('select 1 from public.tour_suppliers', '42501', null, 'and has no access to suppliers');
select is_empty('select 1 from public.programs', 'and does not see an unpublished program');

select * from finish();
rollback;
