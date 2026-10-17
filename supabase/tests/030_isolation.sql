-- SEC-001: who can see and change what. Users are the seed fixtures.
begin;
select plan(23);

create function pg_temp.as_user(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
end $$;
create function pg_temp.as_anon() returns void language plpgsql as $$
begin
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
end $$;

-- Anonymous visitors: published and showcase vessels only; nothing private.
select pg_temp.as_anon();
select results_eq('select slug::text from public.vessels order by slug',
  array['sample-motor-one', 'sample-sail-one'], 'anon sees only published and showcase vessels');
select throws_ok('select 1 from public.vessel_private', '42501', null, 'anon cannot read private vessel facts');
select throws_ok('select 1 from public.organisations', '42501', null, 'anon cannot read organisations');
select throws_ok('select 1 from public.profiles', '42501', null, 'anon cannot read profiles');
select results_eq('select count(*)::int from public.vessel_translations', array[1], 'anon reads translations of visible vessels only');
select results_eq('select slug::text from public.destinations order by slug', array['aswan', 'luxor'], 'anon sees published destinations only');
select throws_ok($$insert into public.vessels (slug, name, type) values ('x-anon', 'X', 'motor')$$, '42501', null, 'anon cannot insert vessels');

-- Customer: same public view; cannot read organisations or the audit log.
select pg_temp.as_user('00000000-0000-4000-a000-000000000040');
select is_empty('select 1 from public.organisations', 'customer cannot read organisations');
select is_empty('select 1 from public.audit_log', 'customer cannot read the audit log');
select results_eq('select count(*)::int from public.profiles', array[1], 'customer reads only their own profile');
select throws_ok($$update public.profiles set platform_role = 'admin' where id = auth.uid()$$, '42501', null,
  'customer cannot make themself admin');

-- Operator A owner: own vessels including drafts; never operator B's.
select pg_temp.as_user('00000000-0000-4000-a000-000000000010');
select results_eq('select slug::text from public.vessels order by slug',
  array['sample-motor-one', 'sample-sail-one', 'sample-steam-one'], 'operator A sees its drafts, not operator B''s');
select results_eq($$select count(*)::int from public.organisations$$, array[1], 'operator A reads only its own organisation');
select lives_ok($$update public.vessels set cabin_count = 21 where slug = 'sample-steam-one'$$, 'operator owner edits own vessel facts');
select throws_ok($$update public.vessels set visibility = 'published', published_at = now() where slug = 'sample-steam-one'$$,
  '42501', null, 'operator cannot publish');
select results_eq($$with u as (update public.vessels set cabin_count = 1 where slug = 'sample-motor-two' returning 1) select count(*)::int from u$$,
  array[0], 'operator A cannot change operator B''s vessel');

select throws_ok($$insert into public.media (vessel_id, storage_path, width, height) values
  ('00000000-0000-4000-c000-000000000004', 'vessels/00000000-0000-4000-c000-000000000004/x.jpg', 10, 10)$$,
  '42501', null, 'operator A cannot add photos to operator B''s vessel');
select lives_ok($$insert into public.media (vessel_id, storage_path, width, height) values
  ('00000000-0000-4000-c000-000000000003', 'vessels/00000000-0000-4000-c000-000000000003/x.jpg', 10, 10)$$,
  'operator A adds a photo to its own draft');
reset role;
select pg_temp.as_anon();
select is_empty('select 1 from public.media', 'anon cannot see photos of a private draft');
select pg_temp.as_user('00000000-0000-4000-a000-000000000013');

-- Operator A viewer: read-only.
select pg_temp.as_user('00000000-0000-4000-a000-000000000013');
select results_eq($$with u as (update public.vessels set cabin_count = 2 where slug = 'sample-steam-one' returning 1) select count(*)::int from u$$,
  array[0], 'viewer cannot edit vessels');

-- Admin: everything, including drafts, private facts and the audit log.
select pg_temp.as_user('00000000-0000-4000-a000-000000000001');
select results_eq('select count(*)::int from public.vessels', array[4], 'admin sees every vessel');
select results_eq('select count(*)::int from public.vessel_private', array[2], 'admin reads private vessel facts');
select isnt_empty('select 1 from public.audit_log', 'admin reads the audit log');

select * from finish();
rollback;
