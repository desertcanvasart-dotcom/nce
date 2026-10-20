-- Batch 4c-1 product rules (DASH-ADM-048–056, 074–085, DASH-OPR-001, 008–012, DATA-015, 019, 022, 023, ADR-079, 082).
begin;
select plan(25);

create function pg_temp.as_user(uid uuid, aal text default 'aal1') returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated', 'aal', aal)::text, true);
end $$;
create function pg_temp.as_owner() returns void language plpgsql as $$
begin perform set_config('request.jwt.claims', '', true); end $$;

-- Operator A owner builds a cabin type and a schedule on their steamer (vessel 3).
select pg_temp.as_user('00000000-0000-4000-a000-000000000010');
select lives_ok($$insert into public.cabin_types (id, vessel_id, code, name, deck, max_occupancy) values
  ('00000000-0000-4000-c200-000000000001', '00000000-0000-4000-8000-000000000003', 'STD-M', 'Standard', 'Middle', 2),
  ('00000000-0000-4000-c200-000000000002', '00000000-0000-4000-8000-000000000003', 'STE-U', 'Suite', 'Upper', 3)$$, 'owner adds cabin types on decks');
select throws_ok($$insert into public.cabin_types (vessel_id, code, name, deck, max_occupancy) values
  ('00000000-0000-4000-8000-000000000003', 'BIG', 'Too big', 'Lower', 4)$$, '23514', null, 'occupancy above 3 is refused');
select throws_ok($$insert into public.cabin_types (vessel_id, code, name, deck) values
  ('00000000-0000-4000-8000-000000000004', 'X', 'Other operator', 'Lower')$$, '42501', null, 'operator A cannot build operator B''s vessel');
select lives_ok($$insert into public.schedules (id, vessel_id, code, origin, destination, nights, sailing_days) values
  ('00000000-0000-4000-c300-000000000001', '00000000-0000-4000-8000-000000000003', 'LXR-ASW-4', 'Luxor', 'Aswan', 4, '{1,5}')$$, 'owner adds a directional schedule');
select lives_ok($$insert into public.schedule_periods (schedule_id, starts_on, ends_on) values
  ('00000000-0000-4000-c300-000000000001', current_date, current_date + 27)$$, 'with an operating period');
select is((select public.generate_departures('00000000-0000-4000-c300-000000000001')), 8, 'four weeks of Monday and Friday sailings');
select is((select public.generate_departures('00000000-0000-4000-c300-000000000001')), 0, 'running it again adds nothing');
select is((select count(*)::int from public.departures where schedule_id = '00000000-0000-4000-c300-000000000001' and returns_on <> departs_on + 4), 0,
  'every departure returns after its nights');

-- Rates and shared inventory.
create temp table d on commit drop as select id from public.departures where schedule_id = '00000000-0000-4000-c300-000000000001' order by departs_on limit 1;
grant select on d to authenticated;
select lives_ok($$insert into public.inventory (departure_id, cabin_type_id, available) select id, '00000000-0000-4000-c200-000000000001', 5 from d$$, 'inventory for a departure and cabin type');
select lives_ok($$insert into public.rates (departure_id, cabin_type_id, occupancy, rate_plan, currency, amount_minor)
  select id, '00000000-0000-4000-c200-000000000001'::uuid, 2, 'international'::public.rate_plan, 'USD', 60000 from d
  union all select id, '00000000-0000-4000-c200-000000000001'::uuid, 2, 'international'::public.rate_plan, 'EUR', 55000 from d$$, 'two currencies for the same cabins');
select is((select available from public.inventory i join d on d.id = i.departure_id where cabin_type_id = '00000000-0000-4000-c200-000000000001'), 5,
  'two prices share one quantity (no extra cabins)');
select throws_ok($$insert into public.inventory (departure_id, cabin_type_id, available) select id, '00000000-0000-4000-c200-000000000001', 3 from d$$,
  '23505', null, 'one inventory row per departure and cabin type');
select throws_ok($$insert into public.rates (departure_id, cabin_type_id, occupancy, rate_plan, currency, amount_minor)
  select id, '00000000-0000-4000-c200-000000000001', 3, 'international', 'USD', 50000 from d$$, '23514', null, 'occupancy above the cabin''s limit refused');
select throws_ok($$insert into public.rates (departure_id, cabin_type_id, occupancy, rate_plan, currency, amount_minor)
  select id, '00000000-0000-4000-c200-000000000001', 2, 'international', 'EGP', 500000 from d$$, '23514', null, 'E£ refused for the international plan');
select lives_ok($$insert into public.rates (departure_id, cabin_type_id, occupancy, rate_plan, currency, amount_minor)
  select id, '00000000-0000-4000-c200-000000000001', 2, 'egyptian_citizen', 'EGP', 1500000 from d$$, 'E£ allowed for Egyptian citizens');
select is((select child_bands -> 1 ->> 'percent' from public.rates where currency = 'USD' limit 1), '25', 'new rates carry the default child bands');

-- Gratuity: at least US$5 per person per night (DATA-015).
select throws_ok($$update public.vessels set gratuity_usd_minor = 400 where id = '00000000-0000-4000-8000-000000000003'$$, '23514', null, 'gratuity below US$5 refused');
select lives_ok($$update public.vessels set gratuity_usd_minor = 800 where id = '00000000-0000-4000-8000-000000000003'$$, 'operator sets an US$8 gratuity');

-- Promotions: owner only; no stacking; upgrades need upgraded inventory.
select pg_temp.as_user('00000000-0000-4000-a000-000000000011');
select throws_ok($$insert into public.promotions (vessel_id, kind, percent) values ('00000000-0000-4000-8000-000000000003', 'percent', 10)$$,
  '42501', null, 'reservations staff cannot create promotions');
select pg_temp.as_user('00000000-0000-4000-a000-000000000010');
insert into public.promotions (id, vessel_id, kind, percent) values ('00000000-0000-4000-c400-000000000001', '00000000-0000-4000-8000-000000000003', 'percent', 10);
insert into public.promotions (id, vessel_id, kind, upgrade_to_cabin_type_id) values ('00000000-0000-4000-c400-000000000002', '00000000-0000-4000-8000-000000000003', 'upgrade', '00000000-0000-4000-c200-000000000002');
select lives_ok($$insert into public.promotion_rates (promotion_id, rate_id) select '00000000-0000-4000-c400-000000000001', id from public.rates where currency = 'USD'$$, 'a promotion on a rate');
select throws_ok($$insert into public.promotion_rates (promotion_id, rate_id) select '00000000-0000-4000-c400-000000000002', id from public.rates where currency = 'EUR'$$,
  '23514', null, 'an upgrade without inventory in the better cabin is refused');
insert into public.inventory (departure_id, cabin_type_id, available) select id, '00000000-0000-4000-c200-000000000002', 2 from d;
select lives_ok($$insert into public.promotion_rates (promotion_id, rate_id) select '00000000-0000-4000-c400-000000000002', id from public.rates where currency = 'EUR'$$,
  'an upgrade is accepted once the better cabin has inventory');
select throws_ok($$insert into public.promotion_rates (promotion_id, rate_id) select '00000000-0000-4000-c400-000000000002', id from public.rates where currency = 'USD'$$,
  '23505', null, 'a promotion never stacks on another promotional rate');

-- Visibility: nobody outside sees rates or inventory; freshness by source.
select pg_temp.as_user('00000000-0000-4000-a000-000000000040');
select is_empty('select 1 from public.rates', 'customers see no rates in 4c');
select pg_temp.as_owner();
reset role;
select ok(not app.inventory_is_fresh(now() - interval '3 hours', 'feed') and app.inventory_is_fresh(now() - interval '6 days', 'manual')
  and not app.inventory_is_fresh(now() - interval '8 days', 'manual'),
  'feed data is stale after 2 hours, manual after 7 days (ADR-079, ADR-095)');

select * from finish();
rollback;
