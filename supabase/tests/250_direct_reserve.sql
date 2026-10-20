-- Batch 5-2: prices after sign-in and reserving at the published rate (DATA-033, DASH-PUB-008, 009, ADR-093).
begin;
select plan(12);

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

-- Operator A's steamer: a double at US$800 pp (two sharing), US$1,200 alone; trade US$500; 2 cabins left.
update public.vessels set visibility = 'published', published_at = now() where id = '00000000-0000-4000-8000-000000000003';
insert into public.cabin_types (id, vessel_id, code, name, deck, max_occupancy) values
  ('00000000-0000-4000-f100-000000000021', '00000000-0000-4000-8000-000000000003', 'DBL', 'Double', 'Main', 2);
insert into public.schedules (id, vessel_id, code, origin, destination, nights, sailing_days) values
  ('00000000-0000-4000-f200-000000000021', '00000000-0000-4000-8000-000000000003', 'DR4', 'Luxor', 'Aswan', 4, '{1,2,3,4,5,6,7}');
insert into public.departures (id, schedule_id, vessel_id, departs_on, returns_on) values
  ('00000000-0000-4000-f300-000000000021', '00000000-0000-4000-f200-000000000021', '00000000-0000-4000-8000-000000000003', current_date + 40, current_date + 44);
-- From a feed: instant confirmation (ADR-099; manual data becomes a booking request, 300_reservable_rule).
insert into public.inventory (departure_id, cabin_type_id, vessel_id, available, source) values
  ('00000000-0000-4000-f300-000000000021', '00000000-0000-4000-f100-000000000021', '00000000-0000-4000-8000-000000000003', 2, 'feed');
insert into public.cancellation_policies (vessel_id, bands) values ('00000000-0000-4000-8000-000000000003', '[{"from_days": 0, "percent": 100}]');
insert into public.rates (departure_id, cabin_type_id, vessel_id, occupancy, rate_plan, currency, amount_minor) values
  ('00000000-0000-4000-f300-000000000021', '00000000-0000-4000-f100-000000000021', '00000000-0000-4000-8000-000000000003', 2, 'international', 'USD', 80000),
  ('00000000-0000-4000-f300-000000000021', '00000000-0000-4000-f100-000000000021', '00000000-0000-4000-8000-000000000003', 1, 'international', 'USD', 120000),
  ('00000000-0000-4000-f300-000000000021', '00000000-0000-4000-f100-000000000021', '00000000-0000-4000-8000-000000000003', 2, 'trade', 'USD', 50000);
create temp table t (k text primary key, v text) on commit drop;
grant select, insert on t to authenticated;

-- Prices after sign-in only.
set local role anon;
select throws_ok($$select * from public.vessel_departure_prices('00000000-0000-4000-8000-000000000003')$$, '42501', null,
  'visitors don''t get departure prices');
select throws_ok($$select public.customer_reserve('00000000-0000-4000-f300-000000000021', 'USD', '[]', '[]', true)$$, '42501', null,
  'nor can they reserve');
reset role;
select pg_temp.as_user('00000000-0000-4000-a000-000000000040');
select is((select array[single_minor, double_minor]::text from public.vessel_departure_prices('00000000-0000-4000-8000-000000000003')),
  '{120000,80000}', 'a signed-in customer sees the published prices, alone and two sharing, never the trade rate');
select is((select places_left from public.vessel_departure_prices('00000000-0000-4000-8000-000000000003')), 2,
  'and the places left from confirmed inventory');

-- Reserving.
select throws_ok($$select public.customer_reserve('00000000-0000-4000-f300-000000000021', 'USD',
  '[{"cabin_type_id": "00000000-0000-4000-f100-000000000021", "ages": [40, 38]}]',
  '[{"full_name": "Sample One", "date_of_birth": "1985-01-01"}]', true)$$, '22023', null, 'every guest must be named');
select throws_ok($$select public.customer_reserve('00000000-0000-4000-f300-000000000021', 'USD',
  (select jsonb_agg('{"cabin_type_id": "00000000-0000-4000-f100-000000000021", "ages": [40, 38]}'::jsonb) from generate_series(1, 6)),
  '[]', true)$$, '22023', null, 'six cabins or more go through a request for offers');
select lives_ok($$insert into t values ('ref', public.customer_reserve('00000000-0000-4000-f300-000000000021', 'USD',
  '[{"cabin_type_id": "00000000-0000-4000-f100-000000000021", "ages": [40, 7]}]',
  ('[{"full_name": "Sample Parent", "date_of_birth": "1985-01-01", "nationality": "gb"}, {"full_name": "Sample Child", "date_of_birth": "'
    || (current_date + 40 - interval '7 years 1 day')::date || '"}]')::jsonb, true))$$,
  'a customer reserves a cabin for a parent and a child');
select is((select array[r.direct::text, r.rate_plan::text, r.total_minor::text, (r.customer_id = auth.uid())::text, (r.offer_id is null)::text]
  from public.reservations r where r.reference = (select v from t where k = 'ref')),
  array['true', 'international', '120000', 'true', 'true'], 'a direct booking at the published rate; the child pays 50 %');
select pg_temp.as_postgres();
select is((select available from public.inventory where departure_id = '00000000-0000-4000-f300-000000000021'), 1, 'the cabin is taken');
select is((select count(*)::int from public.notifications where org_id = '00000000-0000-4000-b000-00000000000a'
  and title like 'New booking % at the published rate'), 1, 'the operator is told');

-- A booking needs confirmed availability.
update public.inventory set confirmed_at = now() - interval '30 days' where departure_id = '00000000-0000-4000-f300-000000000021';
select pg_temp.as_user('00000000-0000-4000-a000-000000000040');
select is((select bookable from public.vessel_departure_prices('00000000-0000-4000-8000-000000000003')), false,
  'stale availability isn''t bookable');
select throws_ok($$select public.customer_reserve('00000000-0000-4000-f300-000000000021', 'USD',
  '[{"cabin_type_id": "00000000-0000-4000-f100-000000000021", "ages": [40, 38]}]',
  '[{"full_name": "Sample One", "date_of_birth": "1985-01-01"}, {"full_name": "Sample Two", "date_of_birth": "1987-01-01"}]', true)$$,
  '22023', null, 'and can''t be reserved');

select * from finish();
rollback;
