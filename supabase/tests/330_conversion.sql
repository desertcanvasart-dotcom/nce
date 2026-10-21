-- Batch 8-2a (ADR-101): rate limits, emails from notices, payment deadline reminders, the Contact notice.
begin;
select plan(13);

create function pg_temp.as_user(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated', 'aal', 'aal1')::text, true);
end $$;
create function pg_temp.as_service() returns void language plpgsql as $$
begin
  perform set_config('role', 'service_role', true);
  perform set_config('request.jwt.claims', '{"role": "service_role"}', true);
end $$;
create function pg_temp.as_postgres() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '', true);
  perform set_config('role', 'postgres', true);
end $$;

-- Rate limits: counted per bucket; a look doesn't count; only the server counts.
select pg_temp.as_user('00000000-0000-4000-a000-000000000040');
select throws_ok($$ select public.service_rate_limit('sign-in:x', 3, 60) $$, '42501', null, 'only the server counts tries');
select pg_temp.as_service();
select results_eq($$ select public.service_rate_limit('sample:a', 2, 600) union all select public.service_rate_limit('sample:a', 2, 600) $$,
  $$ values (0), (0) $$, 'two tries within the limit are allowed');
select ok(public.service_rate_limit('sample:a', 2, 600) > 0, 'the third is refused, with the seconds to wait');
select is(public.service_rate_limit('sample:b', 1, 600, false), 0, 'looking doesn''t count');
select is(public.service_rate_limit('sample:b', 1, 600, false), 0, '… however often');
select is(public.service_rate_limit('sample:a', 50, 600) , 0, 'another limit on the same bucket is its own question');

-- Emails from notices: new notices wait to be emailed; the server marks them.
select pg_temp.as_postgres();
insert into public.notifications (id, user_id, kind, title, link) values
  ('00000000-0000-4000-e500-000000000001', '00000000-0000-4000-a000-000000000040', 'offer.new', 'Sample offer', '/dashboard/journey/offers/');
select is((select email_status from public.notifications where id = '00000000-0000-4000-e500-000000000001'), 'pending', 'a new notice waits to be emailed');
select pg_temp.as_service();
select public.service_mark_notice_email('00000000-0000-4000-e500-000000000001', 'failed');
select results_eq($$ select email_status, email_attempts::int from public.notifications where id = '00000000-0000-4000-e500-000000000001' $$,
  $$ values ('failed'::text, 1) $$, 'a failed send is counted, to be tried again');

-- Optional emails: each person switches them for themselves only.
select pg_temp.as_user('00000000-0000-4000-a000-000000000040');
update public.profiles set optional_emails = false where id = '00000000-0000-4000-a000-000000000040';
select is((select optional_emails from public.profiles where id = '00000000-0000-4000-a000-000000000040'), false, 'a customer turns optional emails off');
update public.profiles set optional_emails = false where id = '00000000-0000-4000-a000-000000000030';
select pg_temp.as_postgres();
select is((select optional_emails from public.profiles where id = '00000000-0000-4000-a000-000000000030'), true, 'but not someone else''s');

-- A Contact message tells Nilecruz.
insert into public.contact_messages (name, email, topic, message) values ('Sample Visitor', 'visitor@example.test', 'cruise', 'A sample question about cruises.');
select is((select count(*)::int from public.notifications n join public.organisations o on o.id = n.org_id
  where o.kind = 'nilecruz' and n.kind = 'contact.new' and n.title = 'New Contact message: Sample Visitor'), 1, 'admins get a notice (and so an email)');

-- Payment deadline reminders: 3 days before, once.
insert into public.vessels (id, slug, name, type, visibility, published_at, operator_org_id, is_sample) values
  ('00000000-0000-4000-e500-000000000010', 'sample-remind-ship', 'Sample Remind Ship', 'motor', 'published', now(), '00000000-0000-4000-b000-00000000000a', true);
insert into public.schedules (id, vessel_id, code, origin, destination, nights, sailing_days) values
  ('00000000-0000-4000-e500-000000000011', '00000000-0000-4000-e500-000000000010', 'RM4', 'Luxor', 'Aswan', 4, '{1,2,3,4,5,6,7}');
insert into public.departures (id, schedule_id, vessel_id, departs_on, returns_on) values
  ('00000000-0000-4000-e500-000000000012', '00000000-0000-4000-e500-000000000011', '00000000-0000-4000-e500-000000000010', current_date + 40, current_date + 44);
insert into public.reservations (id, reference, customer_id, org_id, vessel_id, departure_id, rate_plan, currency, total_minor, terms, policy, direct, payment_due_at)
values ('00000000-0000-4000-e500-000000000013', 'NC-REMNDX', '00000000-0000-4000-a000-000000000040', '00000000-0000-4000-b000-00000000000a',
  '00000000-0000-4000-e500-000000000010', '00000000-0000-4000-e500-000000000012', 'international', 'USD', 100000, 'Sample terms.',
  '{"bands": [{"from_days": 0, "percent": 100}]}', true,
  (((now() at time zone 'Africa/Cairo')::date + 3) + time '23:59') at time zone 'Africa/Cairo');
-- The deadline is set from the departure on insert and can't change; for this test only it is put 3 Cairo days ahead.
alter table public.reservations disable trigger reservations_keep_deadline;
update public.reservations set payment_due_at = (((now() at time zone 'Africa/Cairo')::date + 3) + time '23:59') at time zone 'Africa/Cairo'
where id = '00000000-0000-4000-e500-000000000013';
alter table public.reservations enable trigger reservations_keep_deadline;
select ok(app.payment_deadline_reminders() >= 1, 'a reminder goes 3 days before the deadline');
select is(app.payment_deadline_reminders(), 0, 'and only once');

select * from finish();
rollback;
