-- Batch 4h-2a: travel partners book for their clients (DASH-B2B-003, 005–008, 013, ADR-092).
begin;
select plan(18);

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

-- A bookable sailing with a company rate for Sample Partner (…c1): US$700 pp for two; 3 double cabins.
update public.vessels set visibility = 'published', published_at = now() where id = '00000000-0000-4000-8000-000000000003';
insert into public.cabin_types (id, vessel_id, code, name, deck, max_occupancy) values
  ('00000000-0000-4000-f100-000000000001', '00000000-0000-4000-8000-000000000003', 'DBL', 'Double', 'Main', 2);
insert into public.schedules (id, vessel_id, code, origin, destination, nights, sailing_days) values
  ('00000000-0000-4000-f200-000000000001', '00000000-0000-4000-8000-000000000003', 'TB4', 'Book Port', 'Book Harbour', 4, '{1,2,3,4,5,6,7}');
insert into public.departures (id, schedule_id, vessel_id, departs_on, returns_on) values
  ('00000000-0000-4000-f300-000000000001', '00000000-0000-4000-f200-000000000001', '00000000-0000-4000-8000-000000000003', current_date + 40, current_date + 44);
-- From a feed: instant (ADR-100; manual data becomes a booking request for travel partners too, 320_allotments_agents).
insert into public.inventory (departure_id, cabin_type_id, vessel_id, available, source) values
  ('00000000-0000-4000-f300-000000000001', '00000000-0000-4000-f100-000000000001', '00000000-0000-4000-8000-000000000003', 3, 'feed');
insert into public.cancellation_policies (vessel_id, bands) values ('00000000-0000-4000-8000-000000000003', '[{"from_days": 0, "percent": 100}]');
insert into public.rates (departure_id, cabin_type_id, vessel_id, occupancy, rate_plan, currency, amount_minor) values
  ('00000000-0000-4000-f300-000000000001', '00000000-0000-4000-f100-000000000001', '00000000-0000-4000-8000-000000000003', 2, 'international', 'USD', 100000);
insert into public.partner_rates (partner_org_id, departure_id, cabin_type_id, vessel_id, occupancy, currency, amount_minor) values
  ('00000000-0000-4000-b000-0000000000c1', '00000000-0000-4000-f300-000000000001', '00000000-0000-4000-f100-000000000001',
   '00000000-0000-4000-8000-000000000003', 2, 'USD', 70000);
insert into public.organisations (id, kind, status, display_name) values ('00000000-0000-4000-b000-0000000000c2', 'partner', 'approved', 'Second Agency');
insert into public.memberships (org_id, user_id, team_role) values ('00000000-0000-4000-b000-0000000000c2', '00000000-0000-4000-a000-000000000020', 'owner');
create temp table t (k text primary key, v text) on commit drop;
grant select, insert on t to authenticated;

-- Reserving (DASH-B2B-003, 006): reservations users, at the agency's rate.
select pg_temp.as_user('00000000-0000-4000-a000-000000000032');
select throws_ok($$select public.partner_reserve('00000000-0000-4000-b000-0000000000c1', '00000000-0000-4000-f300-000000000001', 'USD',
  '[{"cabin_type_id": "00000000-0000-4000-f100-000000000001", "ages": [40, 38]}]',
  '[{"full_name": "Sample One", "date_of_birth": "1985-01-01"}, {"full_name": "Sample Two", "date_of_birth": "1987-01-01"}]', 'C-1', 0, true)$$,
  '42501', null, 'a finance user doesn''t reserve');
select pg_temp.as_user('00000000-0000-4000-a000-000000000031');
select throws_ok($$select public.partner_reserve('00000000-0000-4000-b000-0000000000c1', '00000000-0000-4000-f300-000000000001', 'USD',
  '[{"cabin_type_id": "00000000-0000-4000-f100-000000000001", "ages": [40, 38]}]',
  '[{"full_name": "Sample One", "date_of_birth": "1985-01-01"}, {"full_name": "Sample Child", "date_of_birth": "2020-01-01"}]', 'C-1', 0, true)$$,
  '22023', null, 'guests'' ages must match the cabins');
select lives_ok($$insert into t values ('r1', public.partner_reserve('00000000-0000-4000-b000-0000000000c1', '00000000-0000-4000-f300-000000000001', 'USD',
  '[{"cabin_type_id": "00000000-0000-4000-f100-000000000001", "ages": [40, 38]}]',
  '[{"full_name": "Sample One", "date_of_birth": "1985-01-01", "nationality": "es"}, {"full_name": "Sample Two", "date_of_birth": "1987-01-01"}]',
  'CLIENT-17', 180000, true))$$, 'a reservations user reserves for a client');
select pg_temp.as_postgres();
insert into t select 'id1', id::text from public.reservations where reference = (select v from t where k = 'r1');
select is((select array[total_minor::text, rate_plan::text, buyer_name, currency::text] from public.reservations where id = (select v::uuid from t where k = 'id1')),
  array['140000', 'trade', 'Sample Partner', 'USD'], 'at the company rate, as a trade booking for the agency');
select is((select available from public.inventory where departure_id = '00000000-0000-4000-f300-000000000001'), 2, 'the cabin is taken');
select pg_temp.as_user('00000000-0000-4000-a000-000000000031');
insert into t values ('r2', public.partner_reserve('00000000-0000-4000-b000-0000000000c1', '00000000-0000-4000-f300-000000000001', 'USD',
  '[{"cabin_type_id": "00000000-0000-4000-f100-000000000001", "ages": [40, 7]}]',
  ('[{"full_name": "Sample Parent", "date_of_birth": "1985-01-01"}, {"full_name": "Sample Child", "date_of_birth": "' || (current_date + 40 - interval '7 years 1 day')::date || '"}]')::jsonb,
  null, 0, true));
select pg_temp.as_postgres();
select is((select total_minor from public.reservations where reference = (select v from t where k = 'r2')), 105000::bigint,
  'a child aged 7 pays 50 % of the company rate');

-- Who sees what (DASH-B2B-005, 007, DASH-ADM-089).
select pg_temp.as_user('00000000-0000-4000-a000-000000000032');
select is((select count(*)::int from public.reservations where buyer_org_id = '00000000-0000-4000-b000-0000000000c1'
  and departure_id = '00000000-0000-4000-f300-000000000001'), 2,
  'the agency''s finance user sees its bookings');
select is((select selling_total_minor from public.partner_booking_details where reservation_id = (select v::uuid from t where k = 'id1')), 180000::bigint,
  'and the selling total');
select pg_temp.as_user('00000000-0000-4000-a000-000000000010');
select is((select count(*)::int from public.reservations where id = (select v::uuid from t where k = 'id1')), 1, 'the operator sees the booking');
select is((select count(*)::int from public.partner_booking_details), 0, 'but never the client reference or selling total');
select pg_temp.as_user('00000000-0000-4000-a000-000000000020');
select is((select count(*)::int from public.reservations where buyer_org_id = '00000000-0000-4000-b000-0000000000c1'), 0,
  'another agency sees none of it');
select pg_temp.as_user('00000000-0000-4000-a000-000000000031');
select lives_ok($$update public.partner_booking_details set client_reference = 'CLIENT-17B' where reservation_id = (select v::uuid from t where k = 'id1')$$,
  'a reservations user edits the client reference');
select pg_temp.as_user('00000000-0000-4000-a000-000000000032');
update public.partner_booking_details set selling_total_minor = 1 where reservation_id = (select v::uuid from t where k = 'id1');
select is((select selling_total_minor from public.partner_booking_details where reservation_id = (select v::uuid from t where k = 'id1')), 180000::bigint,
  'a finance user can''t (the update touches nothing)');

-- Paying and cancelling by role (DASH-B2B-005, ADR-092).
select pg_temp.as_user('00000000-0000-4000-a000-000000000031');
select throws_ok($$select public.report_payment((select v::uuid from t where k = 'id1'), 140000, 'USD', current_date, 'TRF')$$, 'P0002', null,
  'a reservations user doesn''t pay');
select pg_temp.as_user('00000000-0000-4000-a000-000000000032');
select lives_ok($$select public.report_payment((select v::uuid from t where k = 'id1'), 140000, 'USD', current_date, 'TRF')$$,
  'a finance user reports the transfer');
select pg_temp.as_user('00000000-0000-4000-a000-000000000031');
select lives_ok($$select public.request_cancellation((select id from public.reservations where reference = (select v from t where k = 'r2')),
  'Client changed plans', true)$$,
  'a reservations user asks to cancel');
select pg_temp.as_user('00000000-0000-4000-a000-000000000020');
select throws_ok($$select public.request_cancellation((select v::uuid from t where k = 'id1'), null, true)$$, 'P0002', null,
  'another agency can''t');

-- A paused agency keeps its records but can't book (DASH-ADM-088).
select pg_temp.as_postgres();
update public.organisations set status = 'paused' where id = '00000000-0000-4000-b000-0000000000c1';
select pg_temp.as_user('00000000-0000-4000-a000-000000000031');
select throws_ok($$select public.partner_reserve('00000000-0000-4000-b000-0000000000c1', '00000000-0000-4000-f300-000000000001', 'USD',
  '[{"cabin_type_id": "00000000-0000-4000-f100-000000000001", "ages": [40, 38]}]',
  '[{"full_name": "Sample One", "date_of_birth": "1985-01-01"}, {"full_name": "Sample Two", "date_of_birth": "1987-01-01"}]', null, 0, true)$$,
  '42501', null, 'a paused agency can''t reserve');

select * from finish();
rollback;
