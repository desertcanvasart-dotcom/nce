-- DASH-ROLE-008 / SEC-015: only a super admin in a two-step session changes roles.
begin;
select plan(4);

create function pg_temp.as_user(uid uuid, aal text) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated', 'aal', aal)::text, true);
end $$;

-- Catalogue admin (two-step) cannot raise a customer to admin.
select pg_temp.as_user('00000000-0000-4000-a000-000000000002', 'aal2');
-- Since Batch 11 (SEC-011) only super admins write other people's profiles, so the row is out of reach.
update public.profiles set platform_role = 'admin', admin_role = 'finance' where id = '00000000-0000-4000-a000-000000000040';
select is((select platform_role::text from public.profiles where id = '00000000-0000-4000-a000-000000000040'), 'customer',
  'catalogue admin cannot change roles');

-- Super admin without two-step: the row is not even visible to change.
select pg_temp.as_user('00000000-0000-4000-a000-000000000001', 'aal1');
select results_eq($$with u as (update public.profiles set admin_role = 'finance'
  where id = '00000000-0000-4000-a000-000000000002' returning 1) select count(*)::int from u$$,
  array[0], 'super admin without two-step changes nothing');

-- Super admin with two-step can, and the change is audited.
select pg_temp.as_user('00000000-0000-4000-a000-000000000001', 'aal2');
select lives_ok($$update public.profiles set admin_role = 'finance' where id = '00000000-0000-4000-a000-000000000002'$$,
  'super admin with two-step changes a sub-role');
reset role;
select isnt_empty($$select 1 from public.audit_log where action = 'profiles.role_change'
  and row_id = '00000000-0000-4000-a000-000000000002' and new_data ->> 'admin_role' = 'finance'$$, 'the change is in the audit log');

select * from finish();
rollback;
