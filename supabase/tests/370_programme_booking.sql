-- Batch 8-3b-2 (ADR-102): the cruise with Nilecruz's sightseeing programme: priced, booked together as two orders,
-- paid on one page as two payments, cancelled together.
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

-- A motor ship (not approved for its own sightseeing), bookable now, and Nilecruz's programme for its itinerary.
insert into public.vessels (id, slug, name, type, visibility, published_at, operator_org_id, is_sample) values
  ('00000000-0000-4000-e900-000000000001', 'sample-prog-ship', 'Sample Programme Ship', 'motor', 'published', now(),
   '00000000-0000-4000-b000-00000000000a', true);
insert into public.cabin_types (id, vessel_id, code, name, deck, max_occupancy, balcony) values
  ('00000000-0000-4000-e900-000000000011', '00000000-0000-4000-e900-000000000001', 'DBL', 'Double', 'Main', 2, false);
insert into public.schedules (id, vessel_id, code, origin, destination, nights, sailing_days) values
  ('00000000-0000-4000-e900-000000000002', '00000000-0000-4000-e900-000000000001', 'LX4', 'Luxor', 'Aswan', 4, '{1,2,3,4,5,6,7}');
insert into public.departures (id, schedule_id, vessel_id, departs_on, returns_on) values
  ('00000000-0000-4000-e900-000000000003', '00000000-0000-4000-e900-000000000002', '00000000-0000-4000-e900-000000000001',
   current_date + 40, current_date + 44);
insert into public.inventory (departure_id, cabin_type_id, vessel_id, available, confirmed_at, source) values
  ('00000000-0000-4000-e900-000000000003', '00000000-0000-4000-e900-000000000011', '00000000-0000-4000-e900-000000000001', 4, now(), 'feed');
insert into public.rates (departure_id, cabin_type_id, vessel_id, occupancy, rate_plan, currency, amount_minor) values
  ('00000000-0000-4000-e900-000000000003', '00000000-0000-4000-e900-000000000011', '00000000-0000-4000-e900-000000000001', 2, 'international', 'USD', 100000),
  ('00000000-0000-4000-e900-000000000003', '00000000-0000-4000-e900-000000000011', '00000000-0000-4000-e900-000000000001', 2, 'international', 'EUR', 92000);
insert into public.cancellation_policies (vessel_id, bands) values ('00000000-0000-4000-e900-000000000001', '[{"from_days": 0, "percent": 100}]');
insert into public.tours (id, slug, kind, name, location, duration_minutes, visibility, is_sample, office_id) values
  ('00000000-0000-4000-e900-000000000020', 'sample-4-night-sightseeing', 'other', 'Sample 4-Night Sightseeing', 'Luxor–Aswan', 5760,
   'published', true, '00000000-0000-4000-b000-0000000000d1');
insert into public.tour_schedules (tour_id, schedule_id) values ('00000000-0000-4000-e900-000000000020', '00000000-0000-4000-e900-000000000002');
insert into public.tour_rates (id, tour_id, mode, prices) values
  ('00000000-0000-4000-e900-000000000021', '00000000-0000-4000-e900-000000000020', 'program',
   '{"tiers": [{"min": 1, "max": 1, "pp": 45400}, {"min": 2, "max": 2, "pp": 28900}, {"min": 3, "max": 14, "pp": 23500}],
     "child_pct": 50, "child35_pct": 25}');

create function pg_temp.cabins(pkg text) returns jsonb language sql immutable as $$
  select jsonb_build_array(jsonb_build_object('cabin_type_id', '00000000-0000-4000-e900-000000000011', 'ages', jsonb_build_array(40, 38), 'package', pkg))
$$;
create function pg_temp.guests() returns jsonb language sql immutable as $$
  select '[{"full_name": "Sample Guest One", "date_of_birth": "1985-01-01"}, {"full_name": "Sample Guest Two", "date_of_birth": "1987-01-01"}]'::jsonb
$$;
grant execute on function pg_temp.cabins(text), pg_temp.guests() to authenticated;

-- The "with sightseeing" price: the cruise plus the programme's price per person for two.
select results_eq($$ select sightseeing_amount_minor, sightseeing_by from public.public_vessel_prices() where vessel_id = '00000000-0000-4000-e900-000000000001' $$,
  $$ values ((100000 + 28900)::bigint, 'nilecruz'::text) $$, 'cruise plus Nilecruz''s programme, per person for two');

select pg_temp.as_user('00000000-0000-4000-a000-000000000040');
select is((select total_minor from public.programme_quote('00000000-0000-4000-e900-000000000003', '{40,38}')), 57800::bigint,
  'the programme''s price for a couple');

-- Booked together: the cruise at its own price, the programme its own order, held until the cruise's deadline.
select throws_ok($$ select public.customer_reserve('00000000-0000-4000-e900-000000000003', 'EUR', pg_temp.cabins('with_programme'), pg_temp.guests(), true) $$,
  '22023', 'The sightseeing programme is priced in USD; book the cruise in USD to add it', 'the programme goes with a cruise in its currency');
select lives_ok($$ select public.customer_reserve('00000000-0000-4000-e900-000000000003', 'USD', pg_temp.cabins('with_programme'), pg_temp.guests(), true) $$,
  'a customer books the cruise with the programme');
select pg_temp.as_postgres();
select results_eq($$ select r.package, r.total_minor, o.total_minor, o.status::text, o.hold_until <= r.payment_due_at
  from public.reservations r join public.tour_orders o on o.reservation_id = r.id
  where r.departure_id = '00000000-0000-4000-e900-000000000003' $$,
  $$ values ('cruise'::text, 200000::bigint, 57800::bigint, 'awaiting_payment'::text, true) $$,
  'two orders: the cruise (operator) and the programme (Nilecruz), the programme held until the cruise''s deadline');

-- One programme per cruise.
select pg_temp.as_user('00000000-0000-4000-a000-000000000040');
select throws_ok($$ select public.customer_add_programme((select id from public.reservations where departure_id = '00000000-0000-4000-e900-000000000003')) $$,
  '23505', 'This booking already has the sightseeing programme', 'a second programme is refused');

-- One card payment, recorded as two payments.
select pg_temp.as_service();
select is(public.service_card_payment((select id from public.reservations where departure_id = '00000000-0000-4000-e900-000000000003'),
  'cs_prog', 'pi_prog', 200000, 'USD'), 'recorded', 'the cruise part is the reservation''s payment');
select is(public.service_tour_payment((select o.id from public.tour_orders o join public.reservations r on r.id = o.reservation_id
  where r.departure_id = '00000000-0000-4000-e900-000000000003'), 'cs_prog', 'pi_prog', 57800, 'USD'), 'recorded',
  '… and the programme part the tour order''s, from the same payment');
select pg_temp.as_postgres();
select is((select o.status::text from public.tour_orders o join public.reservations r on r.id = o.reservation_id
  where r.departure_id = '00000000-0000-4000-e900-000000000003'), 'confirmed', 'the programme is confirmed once paid');

-- The cruise cancelled: the programme cancelled too, approved for a full refund.
update public.reservations set status = 'cancelled', cancelled_at = now() where departure_id = '00000000-0000-4000-e900-000000000003';
select results_eq($$ select o.status::text, o.cancel_state::text, o.cancel_refund_minor from public.tour_orders o
  join public.reservations r on r.id = o.reservation_id where r.departure_id = '00000000-0000-4000-e900-000000000003' $$,
  $$ values ('cancelled'::text, 'approved'::text, 57800::bigint) $$, 'cancelling the cruise cancels the programme, refunded in full');

-- Added later to a cruise booked on its own.
select pg_temp.as_user('00000000-0000-4000-a000-000000000040');
select public.customer_reserve('00000000-0000-4000-e900-000000000003', 'USD', pg_temp.cabins('cruise'), pg_temp.guests(), true);
select lives_ok($$ select public.customer_add_programme((select id from public.reservations
  where departure_id = '00000000-0000-4000-e900-000000000003' and status = 'awaiting_payment')) $$,
  'a programme can be added to a cruise booked on its own');

-- No double selling: an approved vessel's own sightseeing replaces the programme.
select pg_temp.as_postgres();
update public.vessels set sightseeing_approved_at = now() where id = '00000000-0000-4000-e900-000000000001';
select pg_temp.as_user('00000000-0000-4000-a000-000000000040');
select is((select count(*)::int from public.programme_quote('00000000-0000-4000-e900-000000000003', '{40,38}')), 0,
  'no programme for a vessel that sells its own sightseeing');
select pg_temp.as_postgres();
select is((select sightseeing_by from public.public_vessel_prices() where vessel_id = '00000000-0000-4000-e900-000000000001'), null,
  '… and no "with sightseeing" price until it states its own');

select * from finish();
rollback;
