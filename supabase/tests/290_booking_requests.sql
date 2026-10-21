-- Operator loop, Part A: booking requests answered with one tap (ADR-099).
begin;
select plan(29);

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

-- Operator A's ship with one sailing 30 days out: 4 Standard and 2 Suite cabins from manual data 3 days old.
insert into public.vessels (id, slug, name, type, visibility, published_at, operator_org_id, is_sample) values
  ('00000000-0000-4000-e100-000000000001', 'sample-request-ship', 'Sample Request Ship', 'motor', 'published', now(),
   '00000000-0000-4000-b000-00000000000a', true);
insert into public.cabin_types (id, vessel_id, code, name, deck, max_occupancy) values
  ('00000000-0000-4000-e100-000000000002', '00000000-0000-4000-e100-000000000001', 'STD', 'Standard', 'Main', 2),
  ('00000000-0000-4000-e100-000000000003', '00000000-0000-4000-e100-000000000001', 'STE', 'Suite', 'Upper', 2);
insert into public.schedules (id, vessel_id, code, origin, destination, nights, sailing_days) values
  ('00000000-0000-4000-e100-000000000004', '00000000-0000-4000-e100-000000000001', 'RQ4', 'Luxor', 'Aswan', 4, '{1,2,3,4,5,6,7}');
insert into public.departures (id, schedule_id, vessel_id, departs_on, returns_on) values
  ('00000000-0000-4000-e100-000000000005', '00000000-0000-4000-e100-000000000004', '00000000-0000-4000-e100-000000000001',
   (now() at time zone 'Africa/Cairo')::date + 30, (now() at time zone 'Africa/Cairo')::date + 34),
  ('00000000-0000-4000-e100-000000000006', '00000000-0000-4000-e100-000000000004', '00000000-0000-4000-e100-000000000001',
   (now() at time zone 'Africa/Cairo')::date + 37, (now() at time zone 'Africa/Cairo')::date + 41);
insert into public.inventory (departure_id, cabin_type_id, vessel_id, available, confirmed_at, source) values
  ('00000000-0000-4000-e100-000000000005', '00000000-0000-4000-e100-000000000002', '00000000-0000-4000-e100-000000000001', 4, now() - interval '3 days', 'manual'),
  ('00000000-0000-4000-e100-000000000005', '00000000-0000-4000-e100-000000000003', '00000000-0000-4000-e100-000000000001', 2, now() - interval '3 days', 'manual'),
  ('00000000-0000-4000-e100-000000000006', '00000000-0000-4000-e100-000000000002', '00000000-0000-4000-e100-000000000001', 3, now() - interval '3 days', 'manual');
insert into public.rates (departure_id, cabin_type_id, vessel_id, occupancy, rate_plan, currency, amount_minor)
select d, c, '00000000-0000-4000-e100-000000000001', 2, 'international', 'USD', 100000
from unnest(array['00000000-0000-4000-e100-000000000005', '00000000-0000-4000-e100-000000000006']::uuid[]) d,
     unnest(array['00000000-0000-4000-e100-000000000002', '00000000-0000-4000-e100-000000000003']::uuid[]) c;
insert into public.cancellation_policies (id, vessel_id, bands) values
  ('00000000-0000-4000-e100-000000000007', '00000000-0000-4000-e100-000000000001', '[{"from_days": 0, "percent": 100}]');
insert into public.cancellation_policy_translations (policy_id, locale, terms) values ('00000000-0000-4000-e100-000000000007', 'en', 'Sample policy.');
insert into public.operator_contacts (id, org_id, name, email) values
  ('00000000-0000-4000-e100-000000000008', '00000000-0000-4000-b000-00000000000a', 'Sample Reservations Desk', 'desk@operator-a.test');
create temp table t (k text primary key, v text) on commit drop;
grant select, insert on t to authenticated, service_role;
create function pg_temp.req(k text) returns uuid language sql stable as $$ select v::uuid from t where t.k = $1 $$;
grant execute on function pg_temp.req(text) to authenticated, service_role;
create function pg_temp.avail(cab text) returns text language sql stable security definer as $$
  select available || ' ' || source from public.inventory
  where departure_id = '00000000-0000-4000-e100-000000000005' and cabin_type_id = cab::uuid $$;
grant execute on function pg_temp.avail(text) to authenticated, service_role;

-- The customer asks; the request keeps what our data showed.
select pg_temp.as_user('00000000-0000-4000-a000-000000000040');
insert into t values ('a', public.customer_request_booking('00000000-0000-4000-e100-000000000005', 'USD',
  '[{"cabin_type_id": "00000000-0000-4000-e100-000000000002", "ages": [40, 38]}]',
  '[{"full_name": "Sample Guest One", "date_of_birth": "1985-01-01", "nationality": "gb"}, {"full_name": "Sample Guest Two", "date_of_birth": "1987-01-01"}]',
  true));
select results_eq($$ select status::text, total_minor, guest_count::int, lead_nationality, (shown -> 0 ->> 'available')::int, shown -> 0 ->> 'source'
  from public.booking_requests where id = pg_temp.req('a') $$,
  $$ values ('waiting', 200000::bigint, 2, 'GB', 4, 'manual') $$, 'a request keeps the price, the party and what our data showed');
select is(pg_temp.avail('00000000-0000-4000-e100-000000000002'), '4 manual', 'asking takes no cabins');
select is((select count(*)::int from public.booking_request_guests), 1, 'the customer reads their guests');

-- The operator's team sees the request, never the guests' names.
select pg_temp.as_user('00000000-0000-4000-a000-000000000011');
select is((select count(*)::int from public.booking_requests where id = pg_temp.req('a')), 1, 'the operator''s team sees the request');
select is((select count(*)::int from public.booking_request_guests), 0, 'the operator never reads the guests before confirming');
select pg_temp.as_user('00000000-0000-4000-a000-000000000020');
select is((select count(*)::int from public.booking_requests), 0, 'another operator sees nothing');
select throws_ok($$ select public.operator_answer_booking_request(pg_temp.req('a'), 'confirm') $$, 'P0002', null,
  'another operator can''t answer');
select pg_temp.as_user('00000000-0000-4000-a000-000000000040');
select throws_ok($$ select public.service_answer_booking_request(pg_temp.req('a'), 'confirm', 'email') $$, '42501', null,
  'a signed-in person can''t use the link path');

-- Hold for 72 hours: the cabin is taken (source tap); a second hold changes nothing.
select pg_temp.as_service();
select is(public.service_answer_booking_request(pg_temp.req('a'), 'hold', 'email', '00000000-0000-4000-e100-000000000008', null, repeat('a', 64)) ->> 'status',
  'held', 'Hold 72h holds the request');
select pg_temp.as_postgres();
select is(pg_temp.avail('00000000-0000-4000-e100-000000000002'), '3 tap', 'the hold takes one Standard cabin, as the operator''s word');
select ok((select hold_until between now() + interval '71 hours' and now() + interval '73 hours' from public.booking_requests where id = pg_temp.req('a')),
  'the hold lasts 72 hours');
select pg_temp.as_service();
select is(public.service_answer_booking_request(pg_temp.req('a'), 'hold', 'email', null, null, repeat('a', 64)) ->> 'changed', 'false',
  'a used link changes nothing');
select is(public.service_answer_booking_request(pg_temp.req('a'), 'hold', 'email', null, null, repeat('b', 64)) ->> 'changed', 'false',
  'holding again changes nothing');

-- Confirm after the hold: the reservation is made through the usual path, without taking the cabin twice.
select is(public.service_answer_booking_request(pg_temp.req('a'), 'confirm', 'email', null, null, repeat('c', 64)) ->> 'status',
  'confirmed', 'Confirm confirms it');
select pg_temp.as_postgres();
select results_eq($$ select r.status::text, r.direct, r.total_minor, (select count(*)::int from public.passengers p where p.reservation_id = r.id)
  from public.reservations r join public.booking_requests q on q.reservation_id = r.id where q.id = pg_temp.req('a') $$,
  $$ values ('awaiting_payment', true, 200000::bigint, 2) $$, 'the customer gets a reservation to pay, as for a direct booking');
select is(pg_temp.avail('00000000-0000-4000-e100-000000000002'), '3 tap', 'confirming after a hold doesn''t take the cabin twice');
select results_eq($$ select response, response_channel, responded_contact from public.booking_requests where id = pg_temp.req('a') $$,
  $$ values ('confirm'::text, 'email'::text, '00000000-0000-4000-e100-000000000008'::uuid) $$, 'the answer, its channel and who gave it are kept');
select ok((select responded_at is not null from public.booking_requests where id = pg_temp.req('a')), 'the first answer is timed');

-- Decline: none free on that cabin type, as the operator's word.
select pg_temp.as_user('00000000-0000-4000-a000-000000000040');
insert into t values ('b', public.customer_request_booking('00000000-0000-4000-e100-000000000005', 'USD',
  '[{"cabin_type_id": "00000000-0000-4000-e100-000000000003", "ages": [40, 38]}]',
  '[{"full_name": "Sample Guest One", "date_of_birth": "1985-01-01"}, {"full_name": "Sample Guest Two", "date_of_birth": "1987-01-01"}]', true));
select pg_temp.as_user('00000000-0000-4000-a000-000000000011');
select is(public.operator_answer_booking_request(pg_temp.req('b'), 'decline') ->> 'status', 'declined', 'the team declines in the dashboard');
select is(pg_temp.avail('00000000-0000-4000-e100-000000000003'), '0 tap', 'a decline sets that cabin type to none free');

-- Offer other: another date; the customer takes it and is booked.
select pg_temp.as_user('00000000-0000-4000-a000-000000000040');
insert into t values ('c', public.customer_request_booking('00000000-0000-4000-e100-000000000005', 'USD',
  '[{"cabin_type_id": "00000000-0000-4000-e100-000000000002", "ages": [40, 38]}]',
  '[{"full_name": "Sample Guest One", "date_of_birth": "1985-01-01"}, {"full_name": "Sample Guest Two", "date_of_birth": "1987-01-01"}]', true));
select pg_temp.as_service();
select throws_ok($$ select public.service_answer_booking_request(pg_temp.req('c'), 'other', 'email', null, '{"cabins": 1}') $$,
  '22023', 'Choose another date or another cabin type', 'Offer other needs a date or a cabin type');
select is(public.service_answer_booking_request(pg_temp.req('c'), 'other', 'email', null,
  '{"departure_id": "00000000-0000-4000-e100-000000000006", "cabins": 1, "note": "A week later"}') ->> 'status',
  'alternative_offered', 'Offer other proposes another date');
select pg_temp.as_user('00000000-0000-4000-a000-000000000040');
select isnt(public.customer_accept_alternative(pg_temp.req('c')), null, 'the customer takes it');
select pg_temp.as_postgres();
select results_eq($$ select r.departure_id, i.available, i.source::text from public.booking_requests q join public.reservations r on r.id = q.reservation_id
  join public.inventory i on i.departure_id = r.departure_id and i.cabin_type_id = '00000000-0000-4000-e100-000000000002' where q.id = pg_temp.req('c') $$,
  $$ values ('00000000-0000-4000-e100-000000000006'::uuid, 2, 'tap'::text) $$, 'booked on the other date, its cabin taken');

-- A hold that runs out gives its cabin back.
select pg_temp.as_user('00000000-0000-4000-a000-000000000040');
insert into t values ('d', public.customer_request_booking('00000000-0000-4000-e100-000000000005', 'USD',
  '[{"cabin_type_id": "00000000-0000-4000-e100-000000000002", "ages": [40, 38]}]',
  '[{"full_name": "Sample Guest One", "date_of_birth": "1985-01-01"}, {"full_name": "Sample Guest Two", "date_of_birth": "1987-01-01"}]', true));
select pg_temp.as_service();
select public.service_answer_booking_request(pg_temp.req('d'), 'hold', 'email');
select pg_temp.as_postgres();
update public.booking_requests set hold_until = now() - interval '1 minute' where id = pg_temp.req('d');
select ok(app.expire_booking_requests() >= 1, 'expired holds are released');
select is(pg_temp.avail('00000000-0000-4000-e100-000000000002'), '3 tap', 'the held cabin is given back');

-- Reply times: a reminder at the reply time (6 hours by default), an escalation at twice it.
select pg_temp.as_user('00000000-0000-4000-a000-000000000040');
insert into t values ('e', public.customer_request_booking('00000000-0000-4000-e100-000000000005', 'USD',
  '[{"cabin_type_id": "00000000-0000-4000-e100-000000000002", "ages": [40, 38]}]',
  '[{"full_name": "Sample Guest One", "date_of_birth": "1985-01-01"}, {"full_name": "Sample Guest Two", "date_of_birth": "1987-01-01"}]', true));
select pg_temp.as_postgres();
update public.booking_requests set created_at = now() - interval '7 hours' where id = pg_temp.req('e');
select pg_temp.as_service();
select results_eq($$ select due from public.service_due_booking_requests() where request_id = pg_temp.req('e') $$, $$ values ('remind'::text) $$,
  'after the reply time, a reminder is due');
select public.service_mark_booking_request(pg_temp.req('e'), 'remind');
select pg_temp.as_postgres();
update public.booking_requests set created_at = now() - interval '13 hours' where id = pg_temp.req('e');
select pg_temp.as_service();
select results_eq($$ select due from public.service_due_booking_requests() where request_id = pg_temp.req('e') $$, $$ values ('escalate'::text) $$,
  'at twice the reply time, Nilecruz is alerted');

-- Metrics: answered requests and "confirmed within" hours (24 until 5 answers).
select pg_temp.as_postgres();
select results_eq($$ select answered, decline_rate_pct, confirm_within_hours from app.operator_reply_stats('00000000-0000-4000-b000-00000000000a') $$,
  $$ values (4, 25.0::numeric, 24) $$, 'four answered; one of four declined although our data showed space; 24 hours until five answers');

select * from finish();
rollback;
