-- SEC-010: the audit log is append-only, even for admins and the service role.
begin;
select plan(7);

select isnt_empty($$select 1 from public.audit_log where action = 'profiles.role_change'$$, 'role changes are logged');
select isnt_empty($$select 1 from public.audit_log where action = 'vessels.insert'$$, 'vessel inserts are logged');

set local role postgres;
select throws_ok('update public.audit_log set action = ''x.y''', '42501', 'audit_log is append-only', 'owner cannot update');
select throws_ok('delete from public.audit_log', '42501', 'audit_log is append-only', 'owner cannot delete');
select throws_ok('truncate public.audit_log', '42501', 'audit_log is append-only', 'owner cannot truncate');

set local role service_role;
select throws_ok('delete from public.audit_log', '42501', null, 'service role cannot delete');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-000000000001","role":"authenticated"}', true);
select throws_ok($$insert into public.audit_log (action) values ('fake.entry')$$, '42501', null, 'admins cannot insert directly');

select * from finish();
rollback;
