-- Batch 7-1 (PAGE-106, ADR-097): anyone sends a Contact message; only admins read and file them.
begin;
select plan(6);

set local role anon;
select lives_ok($$insert into public.contact_messages (name, email, topic, message)
  values ('Sample Visitor', 'visitor@example.test', 'cruise', 'A sample question about March sailings.')$$, 'a visitor sends a message');
select throws_ok($$insert into public.contact_messages (name, email, message, handled_at)
  values ('Sample', 'v@example.test', 'A sample question about sailings.', now())$$, '42501', null, 'but can''t send it already handled');
select throws_ok($$insert into public.contact_messages (name, email, message) values ('Sample', 'not-an-email', 'A sample question.')$$,
  '23514', null, 'an email address is required');
select throws_ok($$select count(*) from public.contact_messages$$, '42501', null, 'visitors can''t read messages');
reset role;

-- A customer can't read them either; an admin with two-step can.
select set_config('role', 'authenticated', true),
       set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-4000-a000-000000000040', 'role', 'authenticated')::text, true);
select is((select count(*)::int from public.contact_messages), 0, 'a customer sees none');
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-4000-a000-00000000000c', 'role', 'authenticated', 'aal', 'aal2')::text, true);
select is((select count(*)::int from public.contact_messages where email = 'visitor@example.test'), 1, 'an admin reads it');

select * from finish();
rollback;
