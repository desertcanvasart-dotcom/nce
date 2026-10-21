-- Batch 8-2b (ADR-101): what assistants may read (DASH-PUB-011, 012), and what a booking's total holds (DATA-011, 016, 017).
begin;
select plan(7);

create function pg_temp.as_anon() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"role": "anon"}', true);
  perform set_config('role', 'anon', true);
end $$;
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

-- One ship, two cabin types, four sailings: instant, by request, sold out, and data too old to say.
insert into public.vessels (id, slug, name, type, visibility, published_at, operator_org_id, is_sample, gratuity_usd_minor) values
  ('00000000-0000-4000-e600-000000000001', 'sample-mcp-ship', 'Sample MCP Ship', 'motor', 'published', now(), '00000000-0000-4000-b000-00000000000a', true, 800);
insert into public.cabin_types (id, vessel_id, code, name, deck, max_occupancy) values
  ('00000000-0000-4000-e600-000000000011', '00000000-0000-4000-e600-000000000001', 'C1', 'Cabin 1', 'Main', 2),
  ('00000000-0000-4000-e600-000000000012', '00000000-0000-4000-e600-000000000001', 'C2', 'Cabin 2', 'Main', 2);
insert into public.schedules (id, vessel_id, code, origin, destination, nights, sailing_days) values
  ('00000000-0000-4000-e600-000000000002', '00000000-0000-4000-e600-000000000001', 'MC4', 'Luxor', 'Aswan', 4, '{1,2,3,4,5,6,7}');
insert into public.departures (id, schedule_id, vessel_id, departs_on, returns_on)
select ('00000000-0000-4000-e600-00000000002' || n)::uuid, '00000000-0000-4000-e600-000000000002', '00000000-0000-4000-e600-000000000001',
  current_date + 30 + n, current_date + 34 + n
from generate_series(1, 4) n;
insert into public.rates (departure_id, cabin_type_id, vessel_id, occupancy, rate_plan, currency, amount_minor)
select ('00000000-0000-4000-e600-00000000002' || n)::uuid, ('00000000-0000-4000-e600-00000000001' || c)::uuid, '00000000-0000-4000-e600-000000000001',
  2, 'international', 'USD', 100000
from generate_series(1, 4) n, generate_series(1, 2) c;
insert into public.inventory (departure_id, cabin_type_id, vessel_id, available, confirmed_at, source) values
  ('00000000-0000-4000-e600-000000000021', '00000000-0000-4000-e600-000000000011', '00000000-0000-4000-e600-000000000001', 4, now() - interval '30 minutes', 'feed'),
  ('00000000-0000-4000-e600-000000000022', '00000000-0000-4000-e600-000000000011', '00000000-0000-4000-e600-000000000001', 4, now() - interval '2 days', 'manual'),
  ('00000000-0000-4000-e600-000000000023', '00000000-0000-4000-e600-000000000011', '00000000-0000-4000-e600-000000000001', 0, now() - interval '30 minutes', 'feed'),
  ('00000000-0000-4000-e600-000000000023', '00000000-0000-4000-e600-000000000012', '00000000-0000-4000-e600-000000000001', 0, now() - interval '30 minutes', 'feed'),
  ('00000000-0000-4000-e600-000000000024', '00000000-0000-4000-e600-000000000011', '00000000-0000-4000-e600-000000000001', 4, now() - interval '20 days', 'manual');
insert into public.cancellation_policies (vessel_id, bands) values ('00000000-0000-4000-e600-000000000001', '[{"from_days": 0, "percent": 100}]');

-- A visitor (and so an assistant) sees how each sailing books, with no prices or counts.
select pg_temp.as_anon();
select results_eq($$ select right(departure_id::text, 1), booking_mode from public.public_sailing_modes('00000000-0000-4000-e600-000000000001') $$,
  $$ values ('1', 'instant'), ('2', 'request'), ('3', 'sold_out'), ('4', 'unconfirmed') $$,
  'each sailing''s booking mode, for anyone');
select throws_ok($$ select * from public.vessel_departure_prices('00000000-0000-4000-e600-000000000001') $$, '42501', null,
  'per-sailing prices and counts stay for signed-in people');
select pg_temp.as_postgres();
select unalike(pg_get_function_result('public.public_sailing_modes(uuid)'::regprocedure), '%(minor|places|left|available)%',
  'the public answer has no price or count columns');
update public.vessels set visibility = 'private' where id = '00000000-0000-4000-e600-000000000001';
select pg_temp.as_anon();
select is((select count(*)::int from public.public_sailing_modes('00000000-0000-4000-e600-000000000001')), 0, 'an unpublished vessel shows nothing');
select pg_temp.as_postgres();
update public.vessels set visibility = 'published' where id = '00000000-0000-4000-e600-000000000001';

-- A booking's total is its cabins' fares from the rates: no gratuity, tours, transfers or flights.
select pg_temp.as_user('00000000-0000-4000-a000-000000000040');
select lives_ok($$ select public.customer_reserve('00000000-0000-4000-e600-000000000021', 'USD',
  '[{"cabin_type_id": "00000000-0000-4000-e600-000000000011", "ages": [40, 38]}]'::jsonb,
  '[{"full_name": "Sample Guest One", "date_of_birth": "1985-01-01"}, {"full_name": "Sample Guest Two", "date_of_birth": "1987-01-01"}]'::jsonb, true) $$,
  'a sample couple reserves');
select pg_temp.as_postgres();
select is((select r.total_minor - (select sum(c.price_minor) from public.reservation_cabins c where c.reservation_id = r.id)
  from public.reservations r where r.departure_id = '00000000-0000-4000-e600-000000000021')::int, 0,
  'the total is the sum of the cabin lines (DATA-011, DATA-017)');
select is((select (r.gratuity_usd_minor, r.total_minor = 2 * 100000) from public.reservations r
  where r.departure_id = '00000000-0000-4000-e600-000000000021')::text, '(800,t)',
  'the gratuity is kept apart, and the total is the fare at the rate (DATA-016)');

select * from finish();
rollback;
