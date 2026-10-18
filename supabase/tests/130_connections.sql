-- Batch 4c-2 connections (DASH-ADM-047, DASH-OPR-016, 024–027, SEC-007–009).
begin;
select plan(37);

create function pg_temp.as_user(uid uuid, aal text default 'aal1') returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated', 'aal', aal)::text, true);
end $$;
create function pg_temp.as_service() returns void language plpgsql as $$
begin
  perform set_config('role', 'service_role', true);
  perform set_config('request.jwt.claims', '{"role": "service_role"}', true);
end $$;
create function pg_temp.reset() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '', true);
  perform set_config('role', 'postgres', true);
end $$;

-- Fixtures on operator A's steamer (vessel 3, slug sample-steam-one): one cabin type, daily sailings.
insert into public.cabin_types (id, vessel_id, code, name, deck, max_occupancy) values
  ('00000000-0000-4000-c500-000000000001', '00000000-0000-4000-8000-000000000003', 'STD', 'Standard', 'Main', 2);
insert into public.schedules (id, vessel_id, code, origin, destination, nights, sailing_days) values
  ('00000000-0000-4000-c600-000000000001', '00000000-0000-4000-8000-000000000003', 'LXR-ASW', 'Luxor', 'Aswan', 4, '{1,2,3,4,5,6,7}');
insert into public.schedule_periods (schedule_id, starts_on, ends_on) values
  ('00000000-0000-4000-c600-000000000001', current_date + 1, current_date + 10);
do $$ begin perform public.generate_departures('00000000-0000-4000-c600-000000000001'); end $$;
create temp table rows_in on commit drop as select jsonb_build_array(
  jsonb_build_object('label', 'ok', 'vessel', 'sample-steam-one', 'date', (current_date + 3)::text, 'cabin', 'STD', 'available', 4,
    'confirmed_at', now() - interval '10 minutes',
    'rates', jsonb_build_array(jsonb_build_object('occupancy', 2, 'plan', 'international', 'currency', 'USD', 'amount_minor', 90000))),
  jsonb_build_object('label', 'other company', 'vessel', 'sample-motor-two', 'date', (current_date + 3)::text, 'cabin', 'STD', 'available', 1, 'rates', '[]'::jsonb),
  jsonb_build_object('label', 'unknown cabin', 'vessel', 'sample-steam-one', 'date', (current_date + 3)::text, 'cabin', 'NOPE', 'available', 1, 'rates', '[]'::jsonb),
  jsonb_build_object('label', 'egp', 'vessel', 'sample-steam-one', 'date', (current_date + 4)::text, 'cabin', 'STD', 'available', 1,
    'rates', jsonb_build_array(jsonb_build_object('occupancy', 2, 'plan', 'international', 'currency', 'EGP', 'amount_minor', 900000))),
  jsonb_build_object('label', 'no sailing', 'vessel', 'sample-steam-one', 'date', (current_date + 60)::text, 'cabin', 'STD', 'available', 1, 'rates', '[]'::jsonb)
) as r;
grant select on rows_in to authenticated, service_role;
create temp table ids (name text primary key, id uuid) on commit drop;
grant select, insert on ids to authenticated, service_role;

-- Feeds: the owner proposes, only catalogue admins with two-step approve (DASH-ADM-047).
select pg_temp.as_user('00000000-0000-4000-a000-000000000010');
select lives_ok($$select public.save_inventory_feed('00000000-0000-4000-b000-00000000000a', 'https://feeds.example.com/a.xml')$$, 'owner adds a feed address');
select is((select status::text from public.inventory_feeds), 'pending', 'a new feed waits for approval');
select throws_ok($$update public.inventory_feeds set status = 'active'$$, '42501', null, 'the owner cannot switch the feed on directly');
select throws_ok($$select public.decide_inventory_feed('00000000-0000-4000-b000-00000000000a', 'active')$$, '42501', null, 'nor approve it');
select throws_ok($$select public.save_inventory_feed('00000000-0000-4000-b000-00000000000a', 'http://feeds.example.com/a.xml')$$, '23514', null,
  'plain http is refused (SEC-007)');
select pg_temp.as_user('00000000-0000-4000-a000-000000000011');
select throws_ok($$select public.save_inventory_feed('00000000-0000-4000-b000-00000000000a', 'https://evil.example.com/')$$, '42501', null,
  'reservations staff cannot change connections');
select pg_temp.as_user('00000000-0000-4000-a000-000000000002');
select throws_ok($$select public.decide_inventory_feed('00000000-0000-4000-b000-00000000000a', 'active')$$, '42501', null,
  'an admin without two-step cannot approve');
select pg_temp.as_user('00000000-0000-4000-a000-000000000002', 'aal2');
select throws_ok($$select public.decide_inventory_feed('00000000-0000-4000-b000-00000000000a', 'rejected')$$, '22023', null, 'rejecting needs a reason');
select lives_ok($$select public.decide_inventory_feed('00000000-0000-4000-b000-00000000000a', 'active')$$, 'a catalogue admin approves');
select ok((select status = 'active' and next_pull_at <= now() and decided_by is not null from public.inventory_feeds), 'approved feeds are due at once');
select pg_temp.as_user('00000000-0000-4000-a000-000000000010');
do $$ begin perform public.save_inventory_feed('00000000-0000-4000-b000-00000000000a', 'https://feeds.example.com/b.xml'); end $$;
select is((select status::text from public.inventory_feeds), 'pending', 'a changed address needs a new approval');
select pg_temp.as_user('00000000-0000-4000-a000-000000000002', 'aal2');
do $$ begin perform public.decide_inventory_feed('00000000-0000-4000-b000-00000000000a', 'active'); end $$;

-- API keys: public keys only, two active at most (SEC-008).
select pg_temp.as_user('00000000-0000-4000-a000-000000000010');
insert into ids select 'key1', id from public.create_api_key('00000000-0000-4000-b000-00000000000a', 'Reservation system', repeat('A', 43) || '=');
select ok((select key_id ~ '^nck_[0-9a-f]{20}$' from public.api_keys where id = (select id from ids where name = 'key1')), 'keys get a public identifier');
select lives_ok($$select public.create_api_key('00000000-0000-4000-b000-00000000000a', 'New system', repeat('B', 43) || '=')$$, 'a second key for rotation');
select throws_ok($$select public.create_api_key('00000000-0000-4000-b000-00000000000a', 'Third', repeat('C', 43) || '=')$$, '23514', null,
  'a third active key is refused');
select throws_ok($$select public.create_api_key('00000000-0000-4000-b000-00000000000a', 'Bad', 'not-a-key')$$, '23514', null, 'only a 32-byte public key is accepted');
select lives_ok($$select public.revoke_api_key((select id from ids where name = 'key1'))$$, 'the owner revokes the old key');
select lives_ok($$select public.create_api_key('00000000-0000-4000-b000-00000000000a', 'Third', repeat('C', 43) || '=')$$, 'then a new one can be made');
select pg_temp.as_user('00000000-0000-4000-a000-000000000011');
select throws_ok($$select public.create_api_key('00000000-0000-4000-b000-00000000000a', 'Mine', repeat('D', 43) || '=')$$, '42501', null,
  'reservations staff cannot create keys');
select pg_temp.reset();
select set_eq($$select column_name::text from information_schema.columns where table_schema = 'public' and table_name = 'api_keys'$$,
  array['id', 'org_id', 'key_id', 'public_key', 'label', 'created_by', 'created_at', 'last_used_at', 'revoked_at', 'revoked_by'],
  'no column can hold a secret: only the public key is stored');
select throws_ok($$update public.api_keys set revoked_at = null where id = (select id from ids where name = 'key1')$$, '23514', null, 'a revoked key stays revoked');

-- Paste: preview changes nothing; apply writes with source "paste"; rows are checked one by one (DASH-OPR-024).
select pg_temp.as_user('00000000-0000-4000-a000-000000000010');
insert into ids select 'run', public.preview_inventory_paste('00000000-0000-4000-b000-00000000000a', (select r from rows_in), 'test');
select is((select array[rows_received, rows_changed, rows_failed] from public.inventory_runs where id = (select id from ids where name = 'run')),
  array[5, 1, 4], 'the preview checks each row');
select is((select array_agg(x ->> 'status' order by (x ->> 'i')::int) from public.inventory_runs, jsonb_array_elements(results) x
  where id = (select id from ids where name = 'run')), array['new', 'error', 'error', 'error', 'error'], 'another company''s vessel, unknown cabins, E£ on international and missing sailings are refused');
select is_empty('select 1 from public.inventory where cabin_type_id = ''00000000-0000-4000-c500-000000000001''', 'a preview writes nothing');
select is((public.apply_inventory_paste((select id from ids where name = 'run')) ->> 'changed')::int, 1, 'applying writes the valid row');
select is((select source::text || ':' || available from public.inventory where cabin_type_id = '00000000-0000-4000-c500-000000000001'), 'paste:4',
  'availability records where it came from');
select throws_ok($$select public.apply_inventory_paste((select id from ids where name = 'run'))$$, '22023', null, 'a preview applies once');
select pg_temp.as_user('00000000-0000-4000-a000-000000000020');
select throws_ok($$select public.preview_inventory_paste('00000000-0000-4000-b000-00000000000a', '[]')$$, '42501', null, 'another company cannot paste');

-- Service role: feeds and the API (SEC-007, SEC-009). Signed-in people can't call these.
select pg_temp.as_user('00000000-0000-4000-a000-000000000010');
select throws_ok($$select public.service_apply_inventory('00000000-0000-4000-b000-00000000000a', 'api', '[]')$$, '42501', null,
  'operators cannot call the service functions');
select throws_ok('select 1 from public.api_idempotency', '42501', null, 'nor read idempotency records');
select pg_temp.as_service();
select is((public.service_apply_inventory('00000000-0000-4000-b000-00000000000a', 'feed',
  jsonb_build_array((select r -> 0 from rows_in) || jsonb_build_object('confirmed_at', now() - interval '1 hour')),
  (select id from public.inventory_feeds)) ->> 'skipped')::int, 1, 'data older than what Nilecruz has is skipped, not applied');
select is((public.service_apply_inventory('00000000-0000-4000-b000-00000000000a', 'feed',
  jsonb_build_array((select r -> 0 from rows_in) || jsonb_build_object('confirmed_at', now(), 'available', 3)),
  (select id from public.inventory_feeds)) ->> 'changed')::int, 1, 'a newer feed row changes availability');
select ok((select source = 'feed' and available = 3 from public.inventory where cabin_type_id = '00000000-0000-4000-c500-000000000001')
  and (select last_success_at is not null and last_rows_changed = 1 and next_pull_at > now() + interval '50 minutes' from public.inventory_feeds),
  'the feed''s health is recorded and the next pull is in an hour');
do $$ begin for i in 1..3 loop perform public.service_record_feed_failure((select id from public.inventory_feeds), 'The feed took too long.'); end loop; end $$;
select ok((select consecutive_failures = 3 and next_pull_at > now() + interval '110 minutes' and last_error = 'The feed took too long.'
  from public.inventory_feeds), 'after three failures in a row the feed is pulled every two hours');
update public.inventory_feeds set next_pull_at = now() - interval '1 minute';
select is((select count(*)::int from public.service_claim_due_feeds()), 1, 'a due feed is claimed');
select is((select count(*)::int from public.service_claim_due_feeds()), 0, 'and not claimed twice while it is being pulled');

-- Reading: the operator's team sees its connections; nobody else does.
select pg_temp.as_user('00000000-0000-4000-a000-000000000013');
select ok((select count(*) from public.inventory_runs) >= 3, 'a viewer sees the company''s connection activity');
select pg_temp.as_user('00000000-0000-4000-a000-000000000040');
select is_empty('select 1 from public.inventory_feeds union all select 1 from public.api_keys union all select 1 from public.inventory_runs',
  'customers see no connections');

select * from finish();
rollback;
