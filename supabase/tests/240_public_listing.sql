-- Batch 5-1: the public "from" price (DATA-032, DASH-PUB-005, 010, ADR-025, ADR-093).
begin;
select plan(10);

-- Operator A's steamer, published, with one bookable departure 40 days out and three cabin types:
--   DBL: international US$900 pp and €600; SUI: international US$700 pp, trade US$500, local E£3,000; SOL: US$400, sold out.
-- A second departure 400 days out (beyond twelve months) has a US$100 rate.
update public.vessels set visibility = 'published', published_at = now() where id = '00000000-0000-4000-8000-000000000003';
insert into public.cabin_types (id, vessel_id, code, name, deck, max_occupancy) values
  ('00000000-0000-4000-f100-000000000011', '00000000-0000-4000-8000-000000000003', 'DBL', 'Double', 'Main', 2),
  ('00000000-0000-4000-f100-000000000012', '00000000-0000-4000-8000-000000000003', 'SUI', 'Suite', 'Upper', 2),
  ('00000000-0000-4000-f100-000000000013', '00000000-0000-4000-8000-000000000003', 'SOL', 'Sold out', 'Lower', 2);
insert into public.schedules (id, vessel_id, code, origin, destination, nights, sailing_days) values
  ('00000000-0000-4000-f200-000000000011', '00000000-0000-4000-8000-000000000003', 'PL4', 'Luxor', 'Aswan', 4, '{1,2,3,4,5,6,7}');
insert into public.departures (id, schedule_id, vessel_id, departs_on, returns_on) values
  ('00000000-0000-4000-f300-000000000011', '00000000-0000-4000-f200-000000000011', '00000000-0000-4000-8000-000000000003', current_date + 40, current_date + 44),
  ('00000000-0000-4000-f300-000000000012', '00000000-0000-4000-f200-000000000011', '00000000-0000-4000-8000-000000000003', current_date + 400, current_date + 404);
insert into public.inventory (departure_id, cabin_type_id, vessel_id, available) values
  ('00000000-0000-4000-f300-000000000011', '00000000-0000-4000-f100-000000000011', '00000000-0000-4000-8000-000000000003', 3),
  ('00000000-0000-4000-f300-000000000011', '00000000-0000-4000-f100-000000000012', '00000000-0000-4000-8000-000000000003', 1),
  ('00000000-0000-4000-f300-000000000011', '00000000-0000-4000-f100-000000000013', '00000000-0000-4000-8000-000000000003', 0),
  ('00000000-0000-4000-f300-000000000012', '00000000-0000-4000-f100-000000000011', '00000000-0000-4000-8000-000000000003', 3);
insert into public.cancellation_policies (vessel_id, bands) values ('00000000-0000-4000-8000-000000000003', '[{"from_days": 0, "percent": 100}]');
insert into public.rates (departure_id, cabin_type_id, vessel_id, occupancy, rate_plan, currency, amount_minor) values
  ('00000000-0000-4000-f300-000000000011', '00000000-0000-4000-f100-000000000011', '00000000-0000-4000-8000-000000000003', 2, 'international', 'USD', 90000),
  ('00000000-0000-4000-f300-000000000011', '00000000-0000-4000-f100-000000000011', '00000000-0000-4000-8000-000000000003', 2, 'international', 'EUR', 60000),
  ('00000000-0000-4000-f300-000000000011', '00000000-0000-4000-f100-000000000012', '00000000-0000-4000-8000-000000000003', 2, 'international', 'USD', 70000),
  ('00000000-0000-4000-f300-000000000011', '00000000-0000-4000-f100-000000000012', '00000000-0000-4000-8000-000000000003', 2, 'trade', 'USD', 50000),
  ('00000000-0000-4000-f300-000000000011', '00000000-0000-4000-f100-000000000012', '00000000-0000-4000-8000-000000000003', 2, 'egyptian_citizen', 'EGP', 300000),
  ('00000000-0000-4000-f300-000000000011', '00000000-0000-4000-f100-000000000012', '00000000-0000-4000-8000-000000000003', 1, 'international', 'USD', 20000),
  ('00000000-0000-4000-f300-000000000011', '00000000-0000-4000-f100-000000000013', '00000000-0000-4000-8000-000000000003', 2, 'international', 'USD', 40000),
  ('00000000-0000-4000-f300-000000000012', '00000000-0000-4000-f100-000000000011', '00000000-0000-4000-8000-000000000003', 2, 'international', 'USD', 10000);

create function pg_temp.price(v uuid) returns text language sql as $$
  select coalesce(p.amount_minor::text, '-') || ' ' || coalesce(p.currency, '-') || ' ' || p.bookable::text
  from public.public_vessel_prices() p where p.vessel_id = v;
$$;
grant execute on function pg_temp.price(uuid) to anon;

set local role anon;
select is(pg_temp.price('00000000-0000-4000-8000-000000000003'), '70000 USD true',
  'a visitor sees the lowest international price per person for two, in US$ before €');
select is(pg_temp.price('00000000-0000-4000-8000-000000000002'), '- - false', 'a showcase vessel is information only: no price');
select is((select count(*)::int from public.public_vessel_prices() where vessel_id = '00000000-0000-4000-8000-000000000004'), 0,
  'a private vessel isn''t listed');
select throws_ok('select count(*) from public.rates', '42501', null, 'visitors still can''t read rates');
select throws_ok('select count(*) from public.inventory', '42501', null, 'nor inventory');
reset role;

-- When the suite's availability goes stale, it no longer counts; the double's US$900 is the "from" price.
update public.inventory set confirmed_at = now() - interval '30 days'
where departure_id = '00000000-0000-4000-f300-000000000011' and cabin_type_id = '00000000-0000-4000-f100-000000000012';
set local role anon;
select is(pg_temp.price('00000000-0000-4000-8000-000000000003'), '90000 USD true', 'only cabins with confirmed places count');
reset role;

-- Without a US$ rate, the € rate is shown, in its own currency (Q23).
delete from public.rates where departure_id = '00000000-0000-4000-f300-000000000011' and currency = 'USD';
set local role anon;
select is(pg_temp.price('00000000-0000-4000-8000-000000000003'), '60000 EUR true', 'a € price stays in €');
reset role;

-- Nothing bookable: no cancellation policy means no booking, so no price.
delete from public.cancellation_policies where vessel_id = '00000000-0000-4000-8000-000000000003';
set local role anon;
select is(pg_temp.price('00000000-0000-4000-8000-000000000003'), '- - false', 'a vessel that can''t be booked shows no price');
reset role;

-- A paused operator's vessel can't be booked either.
insert into public.cancellation_policies (vessel_id, bands) values ('00000000-0000-4000-8000-000000000003', '[{"from_days": 0, "percent": 100}]');
update public.organisations set status = 'paused' where id = '00000000-0000-4000-b000-00000000000a';
set local role anon;
select is(pg_temp.price('00000000-0000-4000-8000-000000000003'), '- - false', 'nor one whose operator is paused');
reset role;
update public.organisations set status = 'approved' where id = '00000000-0000-4000-b000-00000000000a';
set local role anon;
select is(pg_temp.price('00000000-0000-4000-8000-000000000003'), '60000 EUR true', 'and it comes back when the operator is approved');
reset role;

select * from finish();
rollback;
