-- Operator loop, Part C: what can be booked instantly and what becomes a booking request (ADR-099).
begin;
select plan(12);

create function pg_temp.as_user(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated', 'aal', 'aal1')::text, true);
end $$;

-- One sailing, six cabin types, each with a different kind of availability.
insert into public.vessels (id, slug, name, type, visibility, published_at, operator_org_id, is_sample) values
  ('00000000-0000-4000-e200-000000000001', 'sample-rule-ship', 'Sample Rule Ship', 'motor', 'published', now(), '00000000-0000-4000-b000-00000000000a', true);
insert into public.cabin_types (id, vessel_id, code, name, deck, max_occupancy)
select ('00000000-0000-4000-e200-00000000001' || n)::uuid, '00000000-0000-4000-e200-000000000001', 'C' || n, 'Cabin ' || n, 'Main', 2
from generate_series(1, 6) n;
insert into public.schedules (id, vessel_id, code, origin, destination, nights, sailing_days) values
  ('00000000-0000-4000-e200-000000000002', '00000000-0000-4000-e200-000000000001', 'RR4', 'Luxor', 'Aswan', 4, '{1,2,3,4,5,6,7}');
insert into public.departures (id, schedule_id, vessel_id, departs_on, returns_on) values
  ('00000000-0000-4000-e200-000000000003', '00000000-0000-4000-e200-000000000002', '00000000-0000-4000-e200-000000000001', current_date + 30, current_date + 34);
insert into public.inventory (departure_id, cabin_type_id, vessel_id, available, confirmed_at, source) values
  ('00000000-0000-4000-e200-000000000003', '00000000-0000-4000-e200-000000000011', '00000000-0000-4000-e200-000000000001', 3, now() - interval '30 minutes', 'feed'),
  ('00000000-0000-4000-e200-000000000003', '00000000-0000-4000-e200-000000000012', '00000000-0000-4000-e200-000000000001', 3, now() - interval '3 days', 'manual'),
  ('00000000-0000-4000-e200-000000000003', '00000000-0000-4000-e200-000000000013', '00000000-0000-4000-e200-000000000001', 3, now() - interval '10 days', 'manual'),
  ('00000000-0000-4000-e200-000000000003', '00000000-0000-4000-e200-000000000014', '00000000-0000-4000-e200-000000000001', 0, now() - interval '30 minutes', 'feed'),
  ('00000000-0000-4000-e200-000000000003', '00000000-0000-4000-e200-000000000015', '00000000-0000-4000-e200-000000000001', 2, now() - interval '1 hour', 'tap'),
  ('00000000-0000-4000-e200-000000000003', '00000000-0000-4000-e200-000000000016', '00000000-0000-4000-e200-000000000001', 3, now() - interval '3 hours', 'feed');
insert into public.rates (departure_id, cabin_type_id, vessel_id, occupancy, rate_plan, currency, amount_minor)
select '00000000-0000-4000-e200-000000000003', ('00000000-0000-4000-e200-00000000001' || n)::uuid, '00000000-0000-4000-e200-000000000001', 2, 'international', 'USD', 100000
from generate_series(1, 6) n;
insert into public.cancellation_policies (vessel_id, bands) values ('00000000-0000-4000-e200-000000000001', '[{"from_days": 0, "percent": 100}]');

create function pg_temp.cabins(n integer) returns jsonb language sql immutable as $$
  select jsonb_build_array(jsonb_build_object('cabin_type_id', '00000000-0000-4000-e200-00000000001' || n, 'ages', jsonb_build_array(40, 38)))
$$;
create function pg_temp.guests() returns jsonb language sql immutable as $$
  select '[{"full_name": "Sample Guest One", "date_of_birth": "1985-01-01"}, {"full_name": "Sample Guest Two", "date_of_birth": "1987-01-01"}]'::jsonb
$$;
grant execute on function pg_temp.cabins(integer), pg_temp.guests() to authenticated;

select pg_temp.as_user('00000000-0000-4000-a000-000000000040');
select results_eq($$ select right(cabin_type_id::text, 1), booking_mode, places_left from public.vessel_departure_prices('00000000-0000-4000-e200-000000000001') order by 1 $$,
  $$ values ('1', 'instant', 3), ('2', 'request', null::int), ('3', 'unconfirmed', null::int), ('4', 'sold_out', 0), ('5', 'instant', 2), ('6', 'unconfirmed', null::int) $$,
  'each cabin''s booking mode, with places left only from instant data');

-- Instant: feed or API, or an operator's answer, within 2 hours.
select lives_ok($$ select public.customer_reserve('00000000-0000-4000-e200-000000000003', 'USD', pg_temp.cabins(1), pg_temp.guests(), true) $$,
  'feed data within 2 hours books instantly');
select lives_ok($$ select public.customer_reserve('00000000-0000-4000-e200-000000000003', 'USD', pg_temp.cabins(5), pg_temp.guests(), true) $$,
  'an operator''s answer within 2 hours books instantly');

-- Manual within 7 days: a booking request, never an instant booking.
select throws_ok($$ select public.customer_reserve('00000000-0000-4000-e200-000000000003', 'USD', pg_temp.cabins(2), pg_temp.guests(), true) $$,
  '22023', 'The operator confirms these cabins before you pay: send a booking request instead. Nothing was booked.',
  'manual data can''t be paid for instantly');
select lives_ok($$ select public.customer_request_booking('00000000-0000-4000-e200-000000000003', 'USD', pg_temp.cabins(2), pg_temp.guests(), true) $$,
  'manual data within 7 days becomes a booking request');
select is((select count(*)::int from public.reservations r where r.departure_id = '00000000-0000-4000-e200-000000000003'), 2,
  'the request made no reservation (only the two instant bookings exist)');

-- Too old, or none free: neither.
select throws_ok($$ select public.customer_reserve('00000000-0000-4000-e200-000000000003', 'USD', pg_temp.cabins(3), pg_temp.guests(), true) $$,
  '22023', null, 'manual data older than 7 days can''t be booked');
select throws_ok($$ select public.customer_request_booking('00000000-0000-4000-e200-000000000003', 'USD', pg_temp.cabins(3), pg_temp.guests(), true) $$,
  '22023', null, '… or requested');
select throws_ok($$ select public.customer_reserve('00000000-0000-4000-e200-000000000003', 'USD', pg_temp.cabins(6), pg_temp.guests(), true) $$,
  '22023', null, 'feed data older than 2 hours can''t be booked instantly');
select throws_ok($$ select public.customer_request_booking('00000000-0000-4000-e200-000000000003', 'USD', pg_temp.cabins(6), pg_temp.guests(), true) $$,
  '22023', null, '… and, older than its 2 hours, is not requestable either');
select throws_ok($$ select public.customer_request_booking('00000000-0000-4000-e200-000000000003', 'USD', pg_temp.cabins(4), pg_temp.guests(), true) $$,
  '22023', null, 'sold out can''t be requested');

-- "Confirmed within X hours": 24 until the operator has answered five requests.
select is(public.operator_confirm_hours('00000000-0000-4000-b000-00000000000a'), 24, 'customers are told 24 hours until there is a record');

select * from finish();
rollback;
