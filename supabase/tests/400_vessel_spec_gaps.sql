-- Vessel onboarding spec gaps (ADR-103): cabins per cabin type, freesale, stop-sale, holds, supplements, the accuracy
-- rung, webhooks.
begin;
select plan(33);

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

-- Operator A's ship with a Standard cabin type of 6 cabins. Three sailings, all with manual data from yesterday:
-- in 20 days (2 to 6 Nov style, over the gala night below), in 30 days and in 50 days.
insert into public.vessels (id, slug, name, type, visibility, published_at, operator_org_id, is_sample, cabin_count) values
  ('00000000-0000-4000-e500-000000000001', 'sample-spec-ship', 'Sample Spec Ship', 'motor', 'published', now(), '00000000-0000-4000-b000-00000000000a', true, 20);
insert into public.cabin_types (id, vessel_id, code, name, deck, max_occupancy, cabin_count) values
  ('00000000-0000-4000-e500-000000000002', '00000000-0000-4000-e500-000000000001', 'STD', 'Standard', 'Main', 2, 6);
insert into public.schedules (id, vessel_id, code, origin, destination, nights, sailing_days) values
  ('00000000-0000-4000-e500-000000000003', '00000000-0000-4000-e500-000000000001', 'SP4', 'Luxor', 'Aswan', 4, '{1,2,3,4,5,6,7}');
insert into public.departures (id, schedule_id, vessel_id, departs_on, returns_on) values
  ('00000000-0000-4000-e500-000000000004', '00000000-0000-4000-e500-000000000003', '00000000-0000-4000-e500-000000000001', current_date + 20, current_date + 24),
  ('00000000-0000-4000-e500-000000000005', '00000000-0000-4000-e500-000000000003', '00000000-0000-4000-e500-000000000001', current_date + 30, current_date + 34),
  ('00000000-0000-4000-e500-000000000006', '00000000-0000-4000-e500-000000000003', '00000000-0000-4000-e500-000000000001', current_date + 50, current_date + 54);
insert into public.inventory (departure_id, cabin_type_id, vessel_id, available, confirmed_at, source)
select d, '00000000-0000-4000-e500-000000000002', '00000000-0000-4000-e500-000000000001', 4, now() - interval '1 day', 'manual'
from unnest(array['00000000-0000-4000-e500-000000000004', '00000000-0000-4000-e500-000000000005', '00000000-0000-4000-e500-000000000006']::uuid[]) d;
insert into public.rates (departure_id, cabin_type_id, vessel_id, occupancy, rate_plan, currency, amount_minor)
select d, '00000000-0000-4000-e500-000000000002', '00000000-0000-4000-e500-000000000001', 2, 'international', 'USD', 100000
from unnest(array['00000000-0000-4000-e500-000000000004', '00000000-0000-4000-e500-000000000005', '00000000-0000-4000-e500-000000000006']::uuid[]) d;
insert into public.cancellation_policies (vessel_id, bands) values ('00000000-0000-4000-e500-000000000001', '[{"from_days": 0, "percent": 100}]');
create temp table t (k text primary key, v text) on commit drop;
grant select, insert on t to authenticated;
create function pg_temp.guests() returns jsonb language sql immutable as $$
  select '[{"full_name": "Sample Guest One", "date_of_birth": "1985-01-01", "nationality": "gb"}, {"full_name": "Sample Guest Two", "date_of_birth": "1987-01-01"}]'::jsonb $$;
create function pg_temp.cabin() returns jsonb language sql immutable as $$
  select '[{"cabin_type_id": "00000000-0000-4000-e500-000000000002", "ages": [40, 38]}]'::jsonb $$;
grant execute on function pg_temp.guests(), pg_temp.cabin() to authenticated;
create function pg_temp.mode(dep text) returns text language sql as $$
  select booking_mode from public.vessel_departure_prices('00000000-0000-4000-e500-000000000001') where right(departure_id::text, 1) = dep $$;
grant execute on function pg_temp.mode(text) to authenticated;

-- ── Cabins per cabin type ────────────────────────────────────────────────────────────────────────────────────
select pg_temp.as_user('00000000-0000-4000-a000-000000000011');
select throws_ok($$ update public.inventory set available = 7 where departure_id = '00000000-0000-4000-e500-000000000004' $$,
  '23514', '7 cabins free is more than this cabin type''s 6 cabins', 'typed-in availability stops at the cabin type''s count');
select pg_temp.as_postgres();
select is(app.apply_inventory_rows('00000000-0000-4000-b000-00000000000a', 'sheet',
  jsonb_build_array(jsonb_build_object('vessel', 'sample-spec-ship', 'date', current_date + 20, 'cabin', 'STD', 'available', 9)), true)
  -> 'results' -> 0 -> 'messages' ->> 0, '9 free is more than the 6 cabins of type “STD”.', 'a sheet row above the count is that row''s error');

-- ── Freesale ─────────────────────────────────────────────────────────────────────────────────────────────────
select pg_temp.as_user('00000000-0000-4000-a000-000000000040');
select is(pg_temp.mode('4'), 'request', 'manual data from yesterday: a booking request, as before');
select pg_temp.as_user('00000000-0000-4000-a000-000000000011');
select throws_ok($$ insert into public.freesales (org_id, vessel_id, starts_on, ends_on)
  values ('00000000-0000-4000-b000-00000000000a', '00000000-0000-4000-e500-000000000001', current_date, current_date + 40) $$,
  '42501', null, 'an operator can''t enter a freesale agreement');
select pg_temp.as_user('00000000-0000-4000-a000-000000000002', 'aal2');
insert into public.freesales (org_id, vessel_id, starts_on, ends_on, contract_ref)
values ('00000000-0000-4000-b000-00000000000a', '00000000-0000-4000-e500-000000000001', current_date, current_date + 40, 'SAMPLE-FS');
select pg_temp.as_user('00000000-0000-4000-a000-000000000040');
select results_eq($$ select booking_mode, places_left from public.vessel_departure_prices('00000000-0000-4000-e500-000000000001')
  where right(departure_id::text, 1) = '4' $$, $$ values ('instant'::text, null::int) $$,
  'under a freesale, manual data within 72 hours books instantly, still without a count from manual data');
select is(pg_temp.mode('6'), 'request', 'a sailing outside the agreement stays a request');
select pg_temp.as_postgres();
update public.inventory set confirmed_at = now() - interval '4 days' where departure_id = '00000000-0000-4000-e500-000000000005';
select pg_temp.as_user('00000000-0000-4000-a000-000000000040');
select is(pg_temp.mode('5'), 'request', 'manual data older than 72 hours is a request even under a freesale');

-- ── Stop-sale ────────────────────────────────────────────────────────────────────────────────────────────────
select pg_temp.as_user('00000000-0000-4000-a000-000000000013');
select throws_ok($$ insert into public.stop_sales (org_id, vessel_id, starts_on, ends_on)
  values ('00000000-0000-4000-b000-00000000000a', '00000000-0000-4000-e500-000000000001', current_date + 45, current_date + 55) $$,
  '42501', null, 'a viewer can''t stop sales');
select pg_temp.as_user('00000000-0000-4000-a000-000000000011');
insert into public.stop_sales (id, org_id, vessel_id, starts_on, ends_on, reason)
values ('00000000-0000-4000-e500-000000000010', '00000000-0000-4000-b000-00000000000a', '00000000-0000-4000-e500-000000000001',
  current_date + 45, current_date + 55, 'Sample: charter');
select pass('reservations staff stop sales on the ship for a range of departures');
select pg_temp.as_user('00000000-0000-4000-a000-000000000040');
select is(public.departure_bookable('00000000-0000-4000-e500-000000000006'), false, 'a stopped sailing can''t be booked or requested');
select throws_ok($$ select public.customer_request_booking('00000000-0000-4000-e500-000000000006', 'USD', pg_temp.cabin(), pg_temp.guests(), true) $$,
  '22023', null, 'and a booking request is refused');
select pg_temp.as_postgres();
select is(app.apply_inventory_rows('00000000-0000-4000-b000-00000000000a', 'sheet',
  jsonb_build_array(jsonb_build_object('vessel', 'sample-spec-ship', 'date', current_date + 50, 'cabin', 'STD', 'available', 3)), false) ->> 'changed',
  '1', 'a sheet still updates the figure');
select is(app.cabin_mode('00000000-0000-4000-e500-000000000006', '00000000-0000-4000-e500-000000000002'), 'sold_out', 'but doesn''t lift the stop-sale');
insert into public.allotments (org_id, vessel_id, cabin_type_id, starts_on, ends_on, cabins, release_days, created_by)
values ('00000000-0000-4000-b000-00000000000a', '00000000-0000-4000-e500-000000000001', '00000000-0000-4000-e500-000000000002',
  current_date + 45, current_date + 55, 1, 14, null);
select is(app.cabin_mode('00000000-0000-4000-e500-000000000006', '00000000-0000-4000-e500-000000000002'), 'instant',
  'allotment cabins stay open under a stop-sale');
select pg_temp.as_user('00000000-0000-4000-a000-000000000011');
update public.stop_sales set lifted_at = now(), lifted_by = auth.uid() where id = '00000000-0000-4000-e500-000000000010';
select pg_temp.as_postgres();
delete from public.allotments where vessel_id = '00000000-0000-4000-e500-000000000001';
select is(app.cabin_mode('00000000-0000-4000-e500-000000000006', '00000000-0000-4000-e500-000000000002'), 'request', 'lifted, the sailing sells again');

-- ── Holds, and webhooks ──────────────────────────────────────────────────────────────────────────────────────
select pg_temp.as_user('00000000-0000-4000-a000-000000000010');
insert into public.webhook_endpoints (org_id, url) values ('00000000-0000-4000-b000-00000000000a', 'https://operator-a.test/nilecruz');
select pass('the operator''s owner sets a webhook address');
select pg_temp.as_user('00000000-0000-4000-a000-000000000011');
select throws_ok($$ select public.admin_place_hold('00000000-0000-4000-e500-000000000006', '00000000-0000-4000-e500-000000000002', 1, 24) $$,
  '42501', null, 'only catalogue admins place holds');
select pg_temp.as_user('00000000-0000-4000-a000-000000000002', 'aal2');
insert into t values ('h', public.admin_place_hold('00000000-0000-4000-e500-000000000006', '00000000-0000-4000-e500-000000000002', 2, 24, 'Sample group'));
select results_eq($$ select free, held, booked from public.sailing_inventory('00000000-0000-4000-e500-000000000006') $$,
  $$ values (1, 2, 0) $$, 'free / held / booked: the hold takes 2 of the 3 free');
select pg_temp.as_postgres();
select is((select count(*)::int from public.webhook_deliveries where event = 'inventory.changed'
  and payload ->> 'date' = (current_date + 50)::text and (payload ->> 'available')::int = 1 and (payload ->> 'held')::int = 2), 1,
  'the operator''s system is told, in one delivery with the latest figures');
update public.holds set expires_at = now() - interval '1 minute' where id = (select v from t where k = 'h')::uuid;
select is(app.expire_holds(), 1, 'an expired hold is ended by the scheduler');
select results_eq($$ select h.status::text, i.available from public.holds h join public.inventory i on i.departure_id = h.departure_id
  and i.cabin_type_id = h.cabin_type_id where h.id = (select v from t where k = 'h')::uuid $$,
  $$ values ('expired'::text, 3) $$, 'and its cabins go back');
select is((select count(*)::int from public.webhook_deliveries where event = 'hold.expired'
  and (payload ->> 'hold_id')::uuid = (select v from t where k = 'h')::uuid), 1, 'hold.expired is queued');

-- An operator's "Hold 72h" answer is a hold too; confirming it confirms the hold.
select pg_temp.as_user('00000000-0000-4000-a000-000000000040');
insert into t values ('r', public.customer_request_booking('00000000-0000-4000-e500-000000000006', 'USD', pg_temp.cabin(), pg_temp.guests(), true));
select pg_temp.as_user('00000000-0000-4000-a000-000000000011');
select is(public.operator_answer_booking_request((select v from t where k = 'r')::uuid, 'hold') ->> 'status', 'held', 'the operator holds');
select results_eq($$ select status::text, cabins::int from public.holds where booking_request_id = (select v from t where k = 'r')::uuid $$,
  $$ values ('active'::text, 1) $$, 'the hold is recorded, and the operator''s team reads it');
select pg_temp.as_user('00000000-0000-4000-a000-000000000002', 'aal2');
select throws_ok($$ select public.admin_release_hold((select id from public.holds where booking_request_id = (select v from t where k = 'r')::uuid)) $$,
  '22023', null, 'an admin can''t release the operator''s answer');
select lives_ok($$ select public.admin_extend_hold((select id from public.holds where booking_request_id = (select v from t where k = 'r')::uuid), 24) $$,
  'but can extend it');
select pg_temp.as_postgres();
select ok((select hold_until > now() + interval '95 hours' from public.booking_requests where id = (select v from t where k = 'r')::uuid),
  'the request holds as long');
select pg_temp.as_user('00000000-0000-4000-a000-000000000011');
select public.operator_answer_booking_request((select v from t where k = 'r')::uuid, 'confirm');
select is((select status::text from public.holds where booking_request_id = (select v from t where k = 'r')::uuid), 'confirmed',
  'the operator confirms: the hold is confirmed');

-- ── Supplements, and booking.confirmed ───────────────────────────────────────────────────────────────────────
-- A gala dinner on the 21st night from now: the sailing in 20 days is on board, the one in 30 days isn't.
select pg_temp.as_user('00000000-0000-4000-a000-000000000011');
insert into public.supplements (vessel_id, kind, name, starts_on, ends_on, currency, amount_minor)
values ('00000000-0000-4000-e500-000000000001', 'gala_dinner', 'Sample gala dinner', current_date + 21, current_date + 21, 'USD', 15000);
select pg_temp.as_user('00000000-0000-4000-a000-000000000040');
select results_eq($$ select right(departure_id::text, 1), supplement_minor from public.vessel_departure_prices('00000000-0000-4000-e500-000000000001')
  where right(departure_id::text, 1) in ('4', '5') order by departs_on $$,
  $$ values ('4', 15000::bigint), ('5', 0::bigint) $$, 'each sailing shows its supplement per adult');
insert into t values ('c', public.customer_reserve('00000000-0000-4000-e500-000000000004', 'USD', pg_temp.cabin(), pg_temp.guests(), true));
select pg_temp.as_postgres();
select results_eq($$ select r.total_minor, rc.price_minor, rc.supplement_minor from public.reservations r
  join public.reservation_cabins rc on rc.reservation_id = r.id where r.reference = (select v from t where k = 'c') $$,
  $$ values (230000::bigint, 230000::bigint, 30000::bigint) $$, 'the supplement is in the total, and kept apart on the line');
update public.reservations set status = 'confirmed' where reference = (select v from t where k = 'c');
select results_eq($$ select payload ->> 'vessel', payload -> 'cabins' -> 0 ->> 'cabin', payload ? 'passengers' from public.webhook_deliveries
  where event = 'booking.confirmed' and payload ->> 'reference' = (select v from t where k = 'c') $$,
  $$ values ('sample-spec-ship'::text, 'STD'::text, false) $$, 'booking.confirmed is queued, without guests'' names');

-- ── The accuracy rung ────────────────────────────────────────────────────────────────────────────────────────
-- Five answered requests where our data showed the cabin free; two declined: 40 % wrong.
insert into public.booking_requests (reference, customer_id, org_id, vessel_id, departure_id, currency, total_minor, cabins, guest_count,
  shown, responded_at, created_at)
select 'NQ-SAMPL' || x, '00000000-0000-4000-a000-000000000040', '00000000-0000-4000-b000-00000000000a', '00000000-0000-4000-e500-000000000001',
  '00000000-0000-4000-e500-000000000005', 'USD', 200000, pg_temp.cabin(), 2,
  '[{"cabin_type_id": "00000000-0000-4000-e500-000000000002", "available": 3}]', now(), now() - interval '1 hour'
from unnest(array['A', 'B', 'C', 'D', 'E']) x;
update public.booking_requests set response = case when right(reference, 1) in ('A', 'B') then 'decline' else 'confirm' end,
  status = 'declined' where reference like 'NQ-SAMPL%';
select is((select data_accuracy_low from public.operator_settings where org_id = '00000000-0000-4000-b000-00000000000a'), true,
  'more than 20 % declined when our data showed space: accuracy is low');
select pg_temp.as_user('00000000-0000-4000-a000-000000000040');
select is(pg_temp.mode('5'), 'unconfirmed', 'the operator''s manual data drops to "to be confirmed"');

select * from finish();
rollback;
