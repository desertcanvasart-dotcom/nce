-- Batch 11-1 (SEC-011): the database fixes from the pre-launch security review.
begin;
select plan(11);

create function pg_temp.as_user(uid uuid, aal text default 'aal1') returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated', 'aal', aal)::text, true);
end $$;

-- An operator A vessel with one cabin type and a sailing.
insert into public.vessels (id, slug, name, type, visibility, published_at, operator_org_id, is_sample) values
  ('00000000-0000-4000-e990-000000000001', 'sample-sec-ship', 'Sample Security Ship', 'motor', 'published', now(),
   '00000000-0000-4000-b000-00000000000a', true);
insert into public.cabin_types (id, vessel_id, code, name, deck, max_occupancy) values
  ('00000000-0000-4000-e990-000000000011', '00000000-0000-4000-e990-000000000001', 'DBL', 'Double', 'Main', 2);
insert into public.schedules (id, vessel_id, code, origin, destination, nights, sailing_days) values
  ('00000000-0000-4000-e990-000000000002', '00000000-0000-4000-e990-000000000001', 'SX4', 'Luxor', 'Aswan', 4, '{1,2,3,4,5,6,7}');
insert into public.departures (id, schedule_id, vessel_id, departs_on, returns_on) values
  ('00000000-0000-4000-e990-000000000003', '00000000-0000-4000-e990-000000000002', '00000000-0000-4000-e990-000000000001',
   current_date + 30, current_date + 34);

-- Availability an operator writes directly is manual and never "confirmed" in the future.
select pg_temp.as_user('00000000-0000-4000-a000-000000000010');
insert into public.inventory (departure_id, cabin_type_id, vessel_id, available, confirmed_at, source) values
  ('00000000-0000-4000-e990-000000000003', '00000000-0000-4000-e990-000000000011', '00000000-0000-4000-e990-000000000001',
   4, '2099-01-01', 'api');
reset role;
select results_eq($$ select source::text, confirmed_at <= now() from public.inventory where departure_id = '00000000-0000-4000-e990-000000000003' $$,
  $$ values ('manual'::text, true) $$, 'a direct write is stored as manual, confirmed no later than now');

-- Notifications: members mark them read, nothing else.
insert into public.notifications (id, org_id, kind, title) values
  ('00000000-0000-4000-e990-000000000020', '00000000-0000-4000-b000-00000000000a', 'test', 'Sample notice');
select pg_temp.as_user('00000000-0000-4000-a000-000000000013');
select throws_ok($$ update public.notifications set title = 'Pay here' where id = '00000000-0000-4000-e990-000000000020' $$,
  '42501', null, 'a member cannot rewrite a notification');
select lives_ok($$ update public.notifications set read_at = now() where id = '00000000-0000-4000-e990-000000000020' $$,
  '... but can mark it read');

-- Admin roles kept apart: a content or finance admin can't make themselves an operator's owner.
select pg_temp.as_user('00000000-0000-4000-a000-000000000007', 'aal2');
select throws_ok($$ insert into public.memberships (org_id, user_id, team_role)
  values ('00000000-0000-4000-b000-00000000000a', '00000000-0000-4000-a000-000000000007', 'owner') $$,
  '42501', null, 'a content admin cannot join an operator');
select pg_temp.as_user('00000000-0000-4000-a000-000000000008', 'aal2');
select results_eq($$ with u as (update public.organisations set status = 'approved' where id = '00000000-0000-4000-b000-00000000000b' returning 1)
  select count(*)::int from u $$, array[0], 'a finance admin cannot approve a company');
select pg_temp.as_user('00000000-0000-4000-a000-000000000002', 'aal2');
select is((select count(*)::int from public.organisations where id = '00000000-0000-4000-b000-00000000000b'), 1,
  'a catalogue admin still reads and manages companies');

-- The commission rate isn't readable outside Nilecruz.
select pg_temp.as_user('00000000-0000-4000-a000-000000000040');
select is((select count(*)::int from public.platform_settings where key = 'commission_bp'), 0, 'a customer cannot read the commission');
select pg_temp.as_user('00000000-0000-4000-a000-000000000010');
select is((select count(*)::int from public.platform_settings where key = 'commission_bp'), 0, '... nor an operator');
select is((select count(*)::int from public.platform_settings where key = 'bank_transfer'), 1, 'the bank details stay readable');

-- One operator per sheet address.
reset role;
insert into public.operator_contacts (org_id, name, email) values ('00000000-0000-4000-b000-00000000000a', 'Sample Desk', 'Desk@Sample-Sec.test');
select throws_ok($$ insert into public.operator_contacts (org_id, name, email)
  values ('00000000-0000-4000-b000-00000000000b', 'Copy', 'desk@sample-sec.test') $$,
  '23505', null, 'another operator cannot claim the same email, whatever its case');

-- Membership rows can't be moved to another person.
select pg_temp.as_user('00000000-0000-4000-a000-000000000010');
select throws_ok($$ update public.memberships set user_id = '00000000-0000-4000-a000-000000000040'
  where org_id = '00000000-0000-4000-b000-00000000000a' and user_id = '00000000-0000-4000-a000-000000000013' $$,
  '42501', null, 'an owner changes roles, never who a membership belongs to');

select * from finish();
rollback;
