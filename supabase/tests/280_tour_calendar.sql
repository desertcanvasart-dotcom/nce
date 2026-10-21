-- Batch 7-2: tours booked by calendar (ADR-097).
begin;
select plan(29);

create function pg_temp.as_user(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated', 'aal', 'aal1')::text, true);
end $$;
create function pg_temp.as_anon() returns void language plpgsql as $$
begin
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claims', '{"role": "anon"}', true);
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
-- A start N days ahead at a Cairo time.
create function pg_temp.at(days integer, hhmm time) returns timestamptz language sql stable as $$
  select ((now() at time zone 'Africa/Cairo')::date + days + hhmm) at time zone 'Africa/Cairo';
$$;
grant execute on function pg_temp.at(integer, time) to anon, authenticated, service_role;

-- A Luxor day trip run by the Luxor office, shared (8:00) and private (flexible); an airport transfer; a private tour.
insert into public.tours (id, slug, kind, name, location, duration_minutes, office_id, visibility) values
  ('00000000-0000-4000-d900-000000000001', 'sample-calendar-tour', 'excursion', 'Sample Calendar Tour', 'Luxor', 300,
   '00000000-0000-4000-b000-0000000000d1', 'published'),
  ('00000000-0000-4000-d900-000000000002', 'sample-calendar-transfer', 'transfer', 'Sample Calendar Transfer', 'Luxor', 60,
   '00000000-0000-4000-b000-0000000000d1', 'published'),
  ('00000000-0000-4000-d900-000000000003', 'sample-calendar-draft', 'excursion', 'Sample Calendar Draft', 'Aswan', 300,
   '00000000-0000-4000-b000-0000000000d2', 'private');
insert into public.tour_rates (id, tour_id, mode, label, start_times, lead_hours, prices) values
  ('00000000-0000-4000-d901-000000000001', '00000000-0000-4000-d900-000000000001', 'shared', '', '{08:00}', 24,
   '{"adult": 6000, "child611": 3000, "child35": 1500}'),
  ('00000000-0000-4000-d901-000000000002', '00000000-0000-4000-d900-000000000001', 'private', '', '{}', 24,
   '{"tiers": [{"min": 1, "max": 1, "pp": 20000}, {"min": 2, "max": 2, "pp": 12000}, {"min": 3, "max": 4, "pp": 9000},
     {"min": 5, "max": 8, "pp": 7000}, {"min": 9, "max": 14, "pp": 6000}, {"min": 15, "max": null, "pp": 5000}], "child_pct": 50}'),
  ('00000000-0000-4000-d901-000000000003', '00000000-0000-4000-d900-000000000002', 'transfer', 'Airport → hotel', '{}', 12,
   '{"vehicles": [{"name": "Car", "max": 3, "price": 2500}, {"name": "Van", "max": 8, "price": 4000},
     {"name": "Minibus", "max": 14, "price": 6000}], "night_extra": 1000}'),
  ('00000000-0000-4000-d901-000000000004', '00000000-0000-4000-d900-000000000003', 'shared', '', '{08:00}', 24,
   '{"adult": 5000, "child611": 2500, "child35": 0}');
insert into public.tour_seasons (name, starts_on, ends_on, pct, applies) values
  ('Sample high season', (now() at time zone 'Africa/Cairo')::date + 20, (now() at time zone 'Africa/Cairo')::date + 21, 10, 'all');
create temp table t (k text primary key, v text) on commit drop;
grant select, insert on t to authenticated, service_role;

-- Shapes and offices.
select throws_ok($$ insert into public.tour_rates (tour_id, mode, prices) values ('00000000-0000-4000-d900-000000000002', 'shared', '{"adult": 0}') $$,
  '23514', null, 'a rate''s prices must have its mode''s shape');
select throws_ok($$ update public.tours set office_id = '00000000-0000-4000-b000-00000000000a' where id = '00000000-0000-4000-d900-000000000001' $$,
  '23514', 'A tour is run by a tour office', 'only a tour office runs a tour');
select ok(public.tour_is_bookable('00000000-0000-4000-d900-000000000001'), 'a published tour with an office and a rate is bookable');

-- Visitors: published rates and prices, nothing private (ADR-087).
select pg_temp.as_anon();
select is((select count(*)::int from public.tour_rates), 3, 'visitors read the published tours'' rates only');
select is((select total_minor from public.tour_slot_quote('00000000-0000-4000-d901-000000000001', pg_temp.at(10, '08:00'), '{40,38,8,4,1}')),
  6000::bigint * 2 + 3000 + 1500, 'shared: per person, children by age, under 3 free (as on the page)');
select is((select total_minor from public.tour_slot_quote('00000000-0000-4000-d901-000000000001', pg_temp.at(20, '08:00'), '{40}')),
  6600::bigint, 'a season adds its percentage');
select is((select total_minor from public.tour_slot_quote('00000000-0000-4000-d901-000000000002', pg_temp.at(10, '09:30'), '{40,38,5,1}')),
  9000::bigint * 2 + 2250, 'private: the party tier, a child of 5 at 25 %, infants free and not counted');
select results_eq($$ select total_minor, vehicle from public.tour_slot_quote('00000000-0000-4000-d901-000000000003', pg_temp.at(10, '23:15'), '{30,30,30,30,30}') $$,
  $$ values (5000::bigint, 'Van'::text) $$, 'transfer: the smallest vehicle that seats everyone, with the night extra');
select throws_ok($$ select * from public.tour_slot_quote('00000000-0000-4000-d901-000000000001', pg_temp.at(10, '08:00'), '{30,30,30,30,30,30,30,30,30}') $$,
  '22023', 'Parties of 9 or more book the private tour.', 'a party of 9 can''t book shared');
select throws_ok($$ select * from public.tour_slot_quote('00000000-0000-4000-d901-000000000001', pg_temp.at(10, '09:00'), '{30}') $$,
  '22023', 'The tour doesn''t start at that time', 'shared tours start at their set times');
select throws_ok($$ select * from public.tour_slot_quote('00000000-0000-4000-d901-000000000001', now() + interval '2 hours', '{30}') $$,
  '22023', null, 'not within the lead time');
select throws_ok($$ select * from public.tour_slot_quote('00000000-0000-4000-d901-000000000001', pg_temp.at(400, '08:00'), '{30}') $$,
  '22023', 'Book up to 12 months ahead', 'not more than 12 months ahead');
select throws_ok($$ select * from public.tour_slot_quote('00000000-0000-4000-d901-000000000004', pg_temp.at(10, '08:00'), '{30}') $$,
  '22023', 'This tour can''t be booked', 'a private tour isn''t on sale');

-- A shared slot never takes more than 8 (ADR-097).
select pg_temp.as_user('00000000-0000-4000-a000-000000000040');
insert into t values ('six', public.order_tour_slot('00000000-0000-4000-d901-000000000001', pg_temp.at(10, '08:00'),
  '{40,40,40,40,40,40}', 'Sample Lead', 'Pickup: Sample Hotel', true));
select is((select total_minor from public.tour_orders where id = (select v::uuid from t where k = 'six')), 36000::bigint,
  'the order is priced in the database as on the page');
select is((select policy -> 'bands' from public.tour_orders where id = (select v::uuid from t where k = 'six')),
  '[{"from_days": 2, "percent": 0}, {"from_days": 0, "percent": 100}]'::jsonb, 'with no bands of its own, the standard 48-hour rule applies');
select pg_temp.as_user('00000000-0000-4000-a000-000000000030');
insert into t values ('two', public.order_tour_slot('00000000-0000-4000-d901-000000000001', pg_temp.at(10, '08:00'),
  '{40,40}', 'Sample Second', null, true));
select throws_ok($$ select public.order_tour_slot('00000000-0000-4000-d901-000000000001', pg_temp.at(10, '08:00'), '{40}', 'Sample Third', null, true) $$,
  '23514', 'Only 0 places left', 'the 9th guest is refused on a full shared slot');
select is((select places_left from public.tour_slot_quote('00000000-0000-4000-d901-000000000001', pg_temp.at(10, '08:00'), '{40}')), 0,
  'places left reach 0 at 8 guests');

-- Private bookings are separate: a party of 9 on the same morning doesn't touch the shared slot.
insert into t values ('private', public.order_tour_slot('00000000-0000-4000-d901-000000000002', pg_temp.at(10, '08:00'),
  '{30,30,30,30,30,30,30,30,30}', 'Sample Family', null, true));
select is((select total_minor from public.tour_orders where id = (select v::uuid from t where k = 'private')), 54000::bigint,
  'a party of 9 books private at the 9–14 price');
select is((select sum(taken)::int from public.tour_slots('00000000-0000-4000-d901-000000000001',
  (now() at time zone 'Africa/Cairo')::date + 10, (now() at time zone 'Africa/Cairo')::date + 10)), 8, 'the shared slot still holds 8');

-- One order is paid by card.
select pg_temp.as_service();
select is(public.service_tour_payment((select v::uuid from t where k = 'six'), 'cs_cal_1', 'pi_cal_1', 36000, 'usd'), 'recorded',
  'the card payment confirms the order');

-- Who sees what: the customer their own; the office its own tours' bookings, never payments; another office nothing.
select pg_temp.as_user('00000000-0000-4000-a000-000000000030');
select is((select count(*)::int from public.tour_orders), 2, 'a customer sees only their own orders');
select pg_temp.as_user('00000000-0000-4000-a000-000000000050');
select is((select count(*)::int from public.tour_orders), 3, 'the Luxor office sees its tours'' bookings');
select is((select count(*)::int from public.tour_payments), 0, 'the office never reads payments');
select pg_temp.as_user('00000000-0000-4000-a000-000000000051');
select is((select count(*)::int from public.tour_orders), 0, 'the Aswan office doesn''t see Luxor''s bookings');
select is((select count(*)::int from public.tour_rates where tour_id = '00000000-0000-4000-d900-000000000003'), 1,
  'an office reads its own unpublished tour''s rates');
select throws_ok($$ select public.office_cancel_slot('00000000-0000-4000-d901-000000000001', pg_temp.at(10, '08:00'), 'Not ours') $$,
  '42501', null, 'another office can''t cancel the slot');

-- The Luxor office cancels the start: everyone is cancelled, the paid order refunded in full.
select pg_temp.as_user('00000000-0000-4000-a000-000000000050');
select is(public.office_cancel_slot('00000000-0000-4000-d901-000000000001', pg_temp.at(10, '08:00'), 'Guide unwell'), 2,
  'the office cancels the start and its two orders');
select pg_temp.as_postgres();
select results_eq($$ select status::text, cancel_state::text, cancel_refund_minor from public.tour_orders
  where id = (select v::uuid from t where k = 'six') $$, $$ values ('cancelled', 'approved', 36000::bigint) $$,
  'the paid order is approved for a full refund through the usual refund flow');
select throws_ok($$ select * from public.tour_slot_quote('00000000-0000-4000-d901-000000000001', pg_temp.at(10, '08:00'), '{40}') $$,
  '22023', 'This start has been cancelled by the office', 'a cancelled start takes no new bookings');

select * from finish();
rollback;
