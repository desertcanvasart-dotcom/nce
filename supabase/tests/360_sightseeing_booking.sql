-- Batch 8-3b-1 (ADR-102): an approved vessel's own price with sightseeing, from the "from" price to the reservation.
begin;
select plan(11);

create function pg_temp.as_user(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated', 'aal', 'aal1')::text, true);
end $$;
create function pg_temp.as_postgres() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '', true);
  perform set_config('role', 'postgres', true);
end $$;

-- An approved dahabiya: one cabin type, one sailing bookable now (fresh feed data), both prices, what's included.
insert into public.vessels (id, slug, name, type, visibility, published_at, operator_org_id, is_sample, sightseeing_approved_at) values
  ('00000000-0000-4000-e800-000000000001', 'sample-pkg-dahab', 'Sample Package Dahabiya', 'sail', 'published', now(),
   '00000000-0000-4000-b000-00000000000a', true, now());
insert into public.cabin_types (id, vessel_id, code, name, deck, max_occupancy, balcony) values
  ('00000000-0000-4000-e800-000000000011', '00000000-0000-4000-e800-000000000001', 'DBL', 'Double', 'Main', 2, false);
insert into public.schedules (id, vessel_id, code, origin, destination, nights, sailing_days) values
  ('00000000-0000-4000-e800-000000000002', '00000000-0000-4000-e800-000000000001', 'ES4', 'Esna', 'Aswan', 4, '{1,2,3,4,5,6,7}');
insert into public.departures (id, schedule_id, vessel_id, departs_on, returns_on) values
  ('00000000-0000-4000-e800-000000000003', '00000000-0000-4000-e800-000000000002', '00000000-0000-4000-e800-000000000001',
   current_date + 40, current_date + 44);
insert into public.inventory (departure_id, cabin_type_id, vessel_id, available, confirmed_at, source) values
  ('00000000-0000-4000-e800-000000000003', '00000000-0000-4000-e800-000000000011', '00000000-0000-4000-e800-000000000001', 4, now(), 'feed');
insert into public.rates (departure_id, cabin_type_id, vessel_id, occupancy, rate_plan, currency, amount_minor) values
  ('00000000-0000-4000-e800-000000000003', '00000000-0000-4000-e800-000000000011', '00000000-0000-4000-e800-000000000001', 2, 'international', 'USD', 100000);
insert into public.sightseeing_rates (departure_id, cabin_type_id, occupancy, currency, amount_minor) values
  ('00000000-0000-4000-e800-000000000003', '00000000-0000-4000-e800-000000000011', 2, 'USD', 130000);
insert into public.schedule_sightseeing (schedule_id, guide, tickets_included, sites) values
  ('00000000-0000-4000-e800-000000000002', true, true, '{Esna Temple, Edfu Temple}');
insert into public.cancellation_policies (vessel_id, bands) values ('00000000-0000-4000-e800-000000000001', '[{"from_days": 0, "percent": 100}]');

create function pg_temp.cabins(pkg text) returns jsonb language sql immutable as $$
  select jsonb_build_array(jsonb_build_object('cabin_type_id', '00000000-0000-4000-e800-000000000011', 'ages', jsonb_build_array(40, 38), 'package', pkg))
$$;
create function pg_temp.guests() returns jsonb language sql immutable as $$
  select '[{"full_name": "Sample Guest One", "date_of_birth": "1985-01-01"}, {"full_name": "Sample Guest Two", "date_of_birth": "1987-01-01"}]'::jsonb
$$;
grant execute on function pg_temp.cabins(text), pg_temp.guests() to authenticated;

-- The two "from" prices, for everyone.
select results_eq($$ select amount_minor, sightseeing_amount_minor from public.public_vessel_prices() where vessel_id = '00000000-0000-4000-e800-000000000001' $$,
  $$ values (100000::bigint, 130000::bigint) $$, 'the public sees the cruise-only and the with-sightseeing "from" prices');

-- Signed in: each package's prices, and the party's price.
select pg_temp.as_user('00000000-0000-4000-a000-000000000040');
select is((select double_minor from public.vessel_departure_prices('00000000-0000-4000-e800-000000000001', 'with_sightseeing')), 130000::bigint,
  'the departure''s price with sightseeing');
select is((select double_minor from public.vessel_departure_prices('00000000-0000-4000-e800-000000000001')), 100000::bigint,
  'cruise only by default, as before');
select is(public.public_party_price('00000000-0000-4000-e800-000000000003', '00000000-0000-4000-e800-000000000011', 'USD', '{40,38}', 'with_sightseeing'),
  260000::bigint, 'a couple''s price with sightseeing');

-- Booking with sightseeing: priced at that rate, and what's included kept on the reservation.
select lives_ok($$ select public.customer_reserve('00000000-0000-4000-e800-000000000003', 'USD', pg_temp.cabins('with_sightseeing'), pg_temp.guests(), true) $$,
  'a customer books with the vessel''s sightseeing');
select pg_temp.as_postgres();
select results_eq($$ select package, total_minor, sightseeing -> 'sites' from public.reservations where departure_id = '00000000-0000-4000-e800-000000000003' $$,
  $$ values ('with_sightseeing'::text, 260000::bigint, '["Esna Temple", "Edfu Temple"]'::jsonb) $$,
  'the reservation keeps its package, the price with sightseeing, and what was included');

-- Cruise only is unchanged; mixing packages is refused.
select pg_temp.as_user('00000000-0000-4000-a000-000000000040');
select lives_ok($$ select public.customer_reserve('00000000-0000-4000-e800-000000000003', 'USD', pg_temp.cabins('cruise'), pg_temp.guests(), true) $$,
  'cruise only still books');
select throws_ok($$ select public.customer_reserve('00000000-0000-4000-e800-000000000003', 'USD',
  pg_temp.cabins('cruise') || pg_temp.cabins('with_sightseeing'), pg_temp.guests() || pg_temp.guests(), true) $$,
  '22023', 'Book every cabin with the same package', 'every cabin has the same package');

-- Without what's included, or without approval, there is no price with sightseeing.
select pg_temp.as_postgres();
delete from public.schedule_sightseeing where schedule_id = '00000000-0000-4000-e800-000000000002';
select is((select sightseeing_amount_minor from public.public_vessel_prices() where vessel_id = '00000000-0000-4000-e800-000000000001'), null,
  'no "with sightseeing" price until the operator says what it includes');
select pg_temp.as_user('00000000-0000-4000-a000-000000000040');
select throws_ok($$ select public.customer_reserve('00000000-0000-4000-e800-000000000003', 'USD', pg_temp.cabins('with_sightseeing'), pg_temp.guests(), true) $$,
  '22023', 'This sailing isn''t sold with sightseeing by its vessel', '… and no booking with it');
select is((select count(*)::int from public.vessel_departure_prices('00000000-0000-4000-e800-000000000001', 'with_sightseeing')), 0,
  '… nor prices');

select * from finish();
rollback;
