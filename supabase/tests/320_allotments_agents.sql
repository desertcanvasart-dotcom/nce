-- Allotments, and the reservable rule for travel partners (ADR-100).
begin;
select plan(20);

create function pg_temp.as_user(uid uuid, aal text default 'aal1') returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated', 'aal', aal)::text, true);
end $$;
create function pg_temp.as_postgres() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '', true);
  perform set_config('role', 'postgres', true);
end $$;

-- Operator A's ship: a sailing in 30 days whose availability is old manual data (not bookable on its own), one in 10
-- days (inside the allotment's release period), and one in 40 days with fresh manual data.
insert into public.vessels (id, slug, name, type, visibility, published_at, operator_org_id, is_sample, cabin_count) values
  ('00000000-0000-4000-e400-000000000001', 'sample-allotment-ship', 'Sample Allotment Ship', 'motor', 'published', now(), '00000000-0000-4000-b000-00000000000a', true, 20),
  ('00000000-0000-4000-e400-000000000009', 'sample-other-ship', 'Sample Other Ship', 'motor', 'published', now(), '00000000-0000-4000-b000-00000000000b', true, 20);
insert into public.cabin_types (id, vessel_id, code, name, deck, max_occupancy) values
  ('00000000-0000-4000-e400-000000000002', '00000000-0000-4000-e400-000000000001', 'STD', 'Standard', 'Main', 2);
insert into public.schedules (id, vessel_id, code, origin, destination, nights, sailing_days) values
  ('00000000-0000-4000-e400-000000000003', '00000000-0000-4000-e400-000000000001', 'AL4', 'Luxor', 'Aswan', 4, '{1,2,3,4,5,6,7}');
insert into public.departures (id, schedule_id, vessel_id, departs_on, returns_on) values
  ('00000000-0000-4000-e400-000000000004', '00000000-0000-4000-e400-000000000003', '00000000-0000-4000-e400-000000000001', current_date + 30, current_date + 34),
  ('00000000-0000-4000-e400-000000000005', '00000000-0000-4000-e400-000000000003', '00000000-0000-4000-e400-000000000001', current_date + 10, current_date + 14),
  ('00000000-0000-4000-e400-000000000006', '00000000-0000-4000-e400-000000000003', '00000000-0000-4000-e400-000000000001', current_date + 40, current_date + 44);
insert into public.inventory (departure_id, cabin_type_id, vessel_id, available, confirmed_at, source) values
  ('00000000-0000-4000-e400-000000000004', '00000000-0000-4000-e400-000000000002', '00000000-0000-4000-e400-000000000001', 5, now() - interval '10 days', 'manual'),
  ('00000000-0000-4000-e400-000000000005', '00000000-0000-4000-e400-000000000002', '00000000-0000-4000-e400-000000000001', 5, now() - interval '10 days', 'manual'),
  ('00000000-0000-4000-e400-000000000006', '00000000-0000-4000-e400-000000000002', '00000000-0000-4000-e400-000000000001', 5, now() - interval '1 day', 'manual');
insert into public.rates (departure_id, cabin_type_id, vessel_id, occupancy, rate_plan, currency, amount_minor)
select d, '00000000-0000-4000-e400-000000000002', '00000000-0000-4000-e400-000000000001', 2, 'international', 'USD', 100000
from unnest(array['00000000-0000-4000-e400-000000000004', '00000000-0000-4000-e400-000000000005', '00000000-0000-4000-e400-000000000006']::uuid[]) d;
insert into public.cancellation_policies (vessel_id, bands) values ('00000000-0000-4000-e400-000000000001', '[{"from_days": 0, "percent": 100}]');
create temp table t (k text primary key, v text) on commit drop;
grant select, insert on t to authenticated;
create function pg_temp.guests() returns jsonb language sql immutable as $$
  select '[{"full_name": "Sample Guest One", "date_of_birth": "1985-01-01", "nationality": "gb"}, {"full_name": "Sample Guest Two", "date_of_birth": "1987-01-01"}]'::jsonb $$;
create function pg_temp.cabin() returns jsonb language sql immutable as $$
  select '[{"cabin_type_id": "00000000-0000-4000-e400-000000000002", "ages": [40, 38]}]'::jsonb $$;
grant execute on function pg_temp.guests(), pg_temp.cabin() to authenticated;

-- Who enters allotments: Nilecruz's catalogue admins; the operator reads them.
select pg_temp.as_user('00000000-0000-4000-a000-000000000010');
select throws_ok($$ insert into public.allotments (org_id, vessel_id, cabin_type_id, starts_on, ends_on, cabins)
  values ('00000000-0000-4000-b000-00000000000a', '00000000-0000-4000-e400-000000000001', '00000000-0000-4000-e400-000000000002', current_date, current_date + 60, 2) $$,
  '42501', null, 'an operator can''t enter an allotment');
select pg_temp.as_user('00000000-0000-4000-a000-000000000002', 'aal2');
select throws_ok($$ insert into public.allotments (org_id, vessel_id, cabin_type_id, starts_on, ends_on, cabins)
  values ('00000000-0000-4000-b000-00000000000a', '00000000-0000-4000-e400-000000000009', '00000000-0000-4000-e400-000000000002', current_date, current_date + 60, 2) $$,
  '23514', 'The ship isn''t this operator''s', 'an allotment is on one of the operator''s own ships');
insert into public.allotments (id, org_id, vessel_id, cabin_type_id, starts_on, ends_on, cabins, release_days, contract_ref) values
  ('00000000-0000-4000-e400-000000000007', '00000000-0000-4000-b000-00000000000a', '00000000-0000-4000-e400-000000000001',
   '00000000-0000-4000-e400-000000000002', current_date, current_date + 35, 2, 14, 'SAMPLE-2026');
select pass('a catalogue admin enters 2 Standard cabins a sailing for the next 35 days, released 14 days before');
select pg_temp.as_user('00000000-0000-4000-a000-000000000013');
select is((select count(*)::int from public.allotments), 1, 'the operator''s team reads its allotments');

-- Customers: allotment cabins book instantly, whatever the age of the operator's own data, until the release.
select pg_temp.as_user('00000000-0000-4000-a000-000000000040');
select results_eq($$ select right(departure_id::text, 1), booking_mode, places_left from public.vessel_departure_prices('00000000-0000-4000-e400-000000000001') order by departs_on $$,
  $$ values ('5', 'unconfirmed', null::int), ('4', 'instant', 2), ('6', 'request', null::int) $$,
  'instant with 2 places from the allotment; released inside 14 days; a request from fresh manual data');
insert into t values ('c', public.customer_reserve('00000000-0000-4000-e400-000000000004', 'USD', pg_temp.cabin(), pg_temp.guests(), true));
select pg_temp.as_postgres();
select is((select count(*)::int from public.reservation_cabins rc join public.reservations r on r.id = rc.reservation_id
  where r.reference = (select v from t where k = 'c') and rc.allotment_id = '00000000-0000-4000-e400-000000000007'), 1,
  'the booked cabin is counted against the allotment');
select is((select available from public.inventory where departure_id = '00000000-0000-4000-e400-000000000004'), 5,
  'the operator''s own availability figure is untouched');
select is(app.allotment_left('00000000-0000-4000-e400-000000000004', '00000000-0000-4000-e400-000000000002'), 1, 'one allotment cabin left');

-- Travel partners book from the allotment the same way.
select pg_temp.as_user('00000000-0000-4000-a000-000000000031');
select lives_ok($$ select public.partner_reserve('00000000-0000-4000-b000-0000000000c1', '00000000-0000-4000-e400-000000000004', 'USD',
  pg_temp.cabin(), pg_temp.guests(), 'CLIENT-A1', 0, true) $$, 'a travel partner books the last allotment cabin instantly');
select throws_ok($$ select public.partner_reserve('00000000-0000-4000-b000-0000000000c1', '00000000-0000-4000-e400-000000000004', 'USD',
  pg_temp.cabin(), pg_temp.guests(), 'CLIENT-A2', 0, true) $$, '22023',
  'This sailing has no cabins left or can''t be booked right now. Nothing was booked.',
  'with the allotment used up and only old manual data, the sailing can''t be booked (or requested)');

-- A cancelled booking gives its cabin back to the allotment.
select pg_temp.as_postgres();
update public.reservations set status = 'cancelled' where reference = (select v from t where k = 'c');
select is(app.allotment_left('00000000-0000-4000-e400-000000000004', '00000000-0000-4000-e400-000000000002'), 1, 'a cancellation frees an allotment cabin');
select pg_temp.as_user('00000000-0000-4000-a000-000000000010');
select results_eq($$ select cabins, booked, released from public.allotment_usage('00000000-0000-4000-e400-000000000007') where departure_id = '00000000-0000-4000-e400-000000000004' $$,
  $$ values (2, 1, false) $$, 'the operator sees what was booked from the allotment on each sailing');
select results_eq($$ select released from public.allotment_usage('00000000-0000-4000-e400-000000000007') where departure_id = '00000000-0000-4000-e400-000000000005' $$,
  $$ values (true) $$, 'a sailing inside the release period is shown as released');
select pg_temp.as_user('00000000-0000-4000-a000-000000000020');
select is((select count(*)::int from public.allotment_usage('00000000-0000-4000-e400-000000000007')), 0, 'another operator sees nothing');

-- Travel partners and manual data: no instant booking; a booking request in the agency's name.
select pg_temp.as_user('00000000-0000-4000-a000-000000000031');
select throws_ok($$ select public.partner_reserve('00000000-0000-4000-b000-0000000000c1', '00000000-0000-4000-e400-000000000006', 'USD',
  pg_temp.cabin(), pg_temp.guests(), 'CLIENT-B', 0, true) $$, '22023', null, 'a travel partner can''t pay instantly for manual data');
insert into t values ('p', public.partner_request_booking('00000000-0000-4000-b000-0000000000c1', '00000000-0000-4000-e400-000000000006', 'USD',
  pg_temp.cabin(), pg_temp.guests(), 'CLIENT-B', 250000, true));
select pg_temp.as_user('00000000-0000-4000-a000-000000000032');
select results_eq($$ select buyer_name, client_reference, selling_total_minor, status::text from public.booking_requests where id = (select v from t where k = 'p')::uuid $$,
  $$ values ('Sample Partner'::text, 'CLIENT-B'::text, 250000::bigint, 'waiting'::text) $$, 'the request is the agency''s; its finance user sees it');
select is((select count(*)::int from public.booking_request_guests where request_id = (select v from t where k = 'p')::uuid), 1, 'the agency reads its guests');

-- The operator confirms: a trade booking for the agency, with its client reference.
select pg_temp.as_user('00000000-0000-4000-a000-000000000011');
select is(public.operator_answer_booking_request((select v from t where k = 'p')::uuid, 'confirm') ->> 'status', 'confirmed', 'the operator confirms');
select pg_temp.as_postgres();
select results_eq($$ select r.buyer_org_id, d.client_reference, d.selling_total_minor from public.booking_requests q
  join public.reservations r on r.id = q.reservation_id join public.partner_booking_details d on d.reservation_id = r.id
  where q.id = (select v from t where k = 'p')::uuid $$,
  $$ values ('00000000-0000-4000-b000-0000000000c1'::uuid, 'CLIENT-B'::text, 250000::bigint) $$, 'it becomes the agency''s booking, with its client reference');
select is((select count(*)::int from public.notifications where org_id = '00000000-0000-4000-b000-0000000000c1' and title like 'The operator confirmed the cabins%'), 1,
  'the agency is told it can pay');

select * from finish();
rollback;
