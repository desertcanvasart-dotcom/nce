-- Batch 8-3a (ADR-102): only approved vessels sell with sightseeing; Nilecruz's programmes are priced and booked with
-- their cruise.
begin;
select plan(18);

create function pg_temp.as_user(uid uuid, aal text default 'aal1') returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated', 'aal', aal)::text, true);
end $$;
create function pg_temp.as_anon() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"role": "anon"}', true);
  perform set_config('role', 'anon', true);
end $$;
create function pg_temp.as_postgres() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '', true);
  perform set_config('role', 'postgres', true);
end $$;

-- A sample dahabiya of operator A, with one itinerary, one sailing and one cabin type.
insert into public.vessels (id, slug, name, type, visibility, published_at, operator_org_id, is_sample) values
  ('00000000-0000-4000-e700-000000000001', 'sample-sight-dahab', 'Sample Sight Dahabiya', 'sail', 'published', now(), '00000000-0000-4000-b000-00000000000a', true);
insert into public.cabin_types (id, vessel_id, code, name, deck, max_occupancy) values
  ('00000000-0000-4000-e700-000000000011', '00000000-0000-4000-e700-000000000001', 'DBL', 'Double', 'Main', 2);
insert into public.schedules (id, vessel_id, code, origin, destination, nights, sailing_days) values
  ('00000000-0000-4000-e700-000000000002', '00000000-0000-4000-e700-000000000001', 'ES4', 'Esna', 'Aswan', 4, '{1,2,3,4,5,6,7}');
insert into public.departures (id, schedule_id, vessel_id, departs_on, returns_on) values
  ('00000000-0000-4000-e700-000000000003', '00000000-0000-4000-e700-000000000002', '00000000-0000-4000-e700-000000000001',
   current_date + 30, current_date + 34);

create function pg_temp.sight_rate() returns void language sql as $$
  insert into public.sightseeing_rates (departure_id, cabin_type_id, occupancy, currency, amount_minor)
  values ('00000000-0000-4000-e700-000000000003', '00000000-0000-4000-e700-000000000011', 2, 'USD', 150000)
$$;
create function pg_temp.api(pkg text) returns jsonb language sql as $$
  select app.apply_inventory_rows('00000000-0000-4000-b000-00000000000a', 'api', jsonb_build_array(jsonb_build_object(
    'vessel', 'sample-sight-dahab', 'date', current_date + 30, 'cabin', 'DBL', 'available', 3,
    'rates', jsonb_build_array(
      jsonb_build_object('occupancy', 2, 'plan', 'international', 'currency', 'USD', 'amount_minor', 100000),
      jsonb_build_object('occupancy', 2, 'plan', 'international', 'currency', 'USD', 'amount_minor', 140000, 'package', pkg)))), false)
$$;
grant execute on function pg_temp.sight_rate() to authenticated;

-- Not approved: the operator can't add a price with sightseeing by any path, nor approve itself.
select pg_temp.as_user('00000000-0000-4000-a000-000000000010');
select throws_ok($$ select pg_temp.sight_rate() $$, '42501', null, 'an operator can''t add a price with sightseeing to a vessel that isn''t approved');
select throws_ok($$ insert into public.schedule_sightseeing (schedule_id, guide, entrance_fees, sites)
  values ('00000000-0000-4000-e700-000000000002', true, true, '{Edfu}') $$, '42501', null, '… nor say what it includes');
select throws_ok($$ update public.vessels set sightseeing_approved_at = now() where id = '00000000-0000-4000-e700-000000000001' $$,
  '42501', null, '… nor approve its own vessel');
select throws_ok($$ select public.set_sightseeing_approval('00000000-0000-4000-e700-000000000001', true) $$, '42501', null,
  '… nor through the switch');
select pg_temp.as_postgres();
select is((pg_temp.api('with_sightseeing') -> 'results' -> 0 ->> 'status'), 'error', 'the API refuses a with-sightseeing price for it');
select is((select count(*)::int from public.rates where departure_id = '00000000-0000-4000-e700-000000000003'), 0,
  '… and applies nothing from that row');
select is((pg_temp.api('cruise') -> 'results' -> 0 ->> 'status'), 'new', 'cruise-only prices are as before');

-- Only super and catalogue admins approve, in a two-step session.
select pg_temp.as_user('00000000-0000-4000-a000-000000000008', 'aal2');
select throws_ok($$ select public.set_sightseeing_approval('00000000-0000-4000-e700-000000000001', true) $$, '42501', null,
  'a finance admin can''t approve');
select pg_temp.as_user('00000000-0000-4000-a000-000000000002', 'aal2');
select lives_ok($$ select public.set_sightseeing_approval('00000000-0000-4000-e700-000000000001', true) $$, 'a catalogue admin approves');
select pg_temp.as_postgres();
select isnt((select sightseeing_approved_by from public.vessels where id = '00000000-0000-4000-e700-000000000001'), null,
  'the approval records who');

-- Approved: the operator's price with sightseeing and what it includes; the API writes both prices.
select pg_temp.as_user('00000000-0000-4000-a000-000000000010');
select lives_ok($$ select pg_temp.sight_rate() $$, 'the operator adds a price with sightseeing');
select lives_ok($$ insert into public.schedule_sightseeing (schedule_id, guide, entrance_fees, sites)
  values ('00000000-0000-4000-e700-000000000002', true, true, '{Esna Temple, Edfu Temple, Kom Ombo Temple}') $$, '… and says what it includes');
select pg_temp.as_postgres();
select is((pg_temp.api('with_sightseeing') -> 'results' -> 0 ->> 'status'), 'changed', 'the API now takes a with-sightseeing price');
select results_eq($$ select (select amount_minor from public.rates where departure_id = '00000000-0000-4000-e700-000000000003'),
  (select amount_minor from public.sightseeing_rates where departure_id = '00000000-0000-4000-e700-000000000003') $$,
  $$ values (100000::bigint, 140000::bigint) $$, 'each price lands in its own place');
select pg_temp.as_anon();
select is((select count(*)::int from public.schedule_sightseeing where schedule_id = '00000000-0000-4000-e700-000000000002'), 1,
  'visitors can read what it includes');

-- Withdrawn: what it includes is hidden, and no new prices with sightseeing can be added.
select pg_temp.as_user('00000000-0000-4000-a000-000000000002', 'aal2');
select public.set_sightseeing_approval('00000000-0000-4000-e700-000000000001', false);
select pg_temp.as_anon();
select is((select count(*)::int from public.schedule_sightseeing where schedule_id = '00000000-0000-4000-e700-000000000002'), 0,
  'withdrawn: visitors no longer see it');

-- Nilecruz's programmes: priced like private tours, never booked on their own.
select pg_temp.as_postgres();
insert into public.tours (id, slug, kind, name, location, duration_minutes, visibility, is_sample, office_id) values
  ('00000000-0000-4000-e700-000000000020', 'sample-sight-programme', 'other', 'Sample 4-Night Sightseeing: Esna to Aswan', 'Esna–Aswan', 5760,
   'published', true, '00000000-0000-4000-b000-0000000000d2');
insert into public.tour_rates (id, tour_id, mode, prices) values
  ('00000000-0000-4000-e700-000000000021', '00000000-0000-4000-e700-000000000020', 'program',
   '{"tiers": [{"min": 1, "max": 1, "pp": 45400}, {"min": 2, "max": 14, "pp": 28900}], "child_pct": 50, "child35_pct": 25}');
select is(public.tour_is_bookable('00000000-0000-4000-e700-000000000020'), false, 'a programme isn''t a tour to book on its own');
select is(app.slot_problem((select r from public.tour_rates r where r.id = '00000000-0000-4000-e700-000000000021'), now() + interval '30 days'),
  'A sightseeing programme is booked together with its cruise', 'and its starts can''t be ordered alone');

select * from finish();
rollback;
