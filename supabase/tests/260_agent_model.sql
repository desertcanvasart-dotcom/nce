-- ADR-094: Nilecruz books as the operators' agent; an unpaid booking owes no cancellation charge.
begin;
select plan(4);

create function pg_temp.as_user(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated', 'aal', 'aal1')::text, true);
end $$;

-- Operator A's steamer with one bookable double at US$800 pp.
update public.vessels set visibility = 'published', published_at = now() where id = '00000000-0000-4000-8000-000000000003';
update public.organisations set legal_name = 'Sample Operator A S.A.E.' where id = '00000000-0000-4000-b000-00000000000a';
insert into public.cabin_types (id, vessel_id, code, name, deck, max_occupancy) values
  ('00000000-0000-4000-f100-000000000031', '00000000-0000-4000-8000-000000000003', 'DBL', 'Double', 'Main', 2);
insert into public.schedules (id, vessel_id, code, origin, destination, nights, sailing_days) values
  ('00000000-0000-4000-f200-000000000031', '00000000-0000-4000-8000-000000000003', 'AG4', 'Luxor', 'Aswan', 4, '{1,2,3,4,5,6,7}');
insert into public.departures (id, schedule_id, vessel_id, departs_on, returns_on) values
  ('00000000-0000-4000-f300-000000000031', '00000000-0000-4000-f200-000000000031', '00000000-0000-4000-8000-000000000003', current_date + 40, current_date + 44);
insert into public.inventory (departure_id, cabin_type_id, vessel_id, available) values
  ('00000000-0000-4000-f300-000000000031', '00000000-0000-4000-f100-000000000031', '00000000-0000-4000-8000-000000000003', 2);
insert into public.cancellation_policies (vessel_id, bands) values ('00000000-0000-4000-8000-000000000003', '[{"from_days": 0, "percent": 100}]');
insert into public.rates (departure_id, cabin_type_id, vessel_id, occupancy, rate_plan, currency, amount_minor) values
  ('00000000-0000-4000-f300-000000000031', '00000000-0000-4000-f100-000000000031', '00000000-0000-4000-8000-000000000003', 2, 'international', 'USD', 80000);
create temp table t (k text primary key, v text) on commit drop;
grant select, insert on t to authenticated;

select pg_temp.as_user('00000000-0000-4000-a000-000000000040');
insert into t values ('ref', public.customer_reserve('00000000-0000-4000-f300-000000000031', 'USD',
  '[{"cabin_type_id": "00000000-0000-4000-f100-000000000031", "ages": [40, 38]}]',
  '[{"full_name": "Sample One", "date_of_birth": "1985-01-01"}, {"full_name": "Sample Two", "date_of_birth": "1987-01-01"}]', true));
select is((select seller_name from public.reservations where reference = (select v from t where k = 'ref')), 'Sample Operator A S.A.E.',
  'the reservation names the operator as the seller, by its legal name');
select ok((select terms like 'Booked through Nilecruz, acting as booking agent for the operator of %' from public.reservations
  where reference = (select v from t where k = 'ref')), 'the booking terms name Nilecruz as the operator''s agent');
select is((select array[charge_minor, refund_minor, unpaid_charge_minor] from public.cancellation_quote(
  (select id from public.reservations where reference = (select v from t where k = 'ref')))), array[160000, 0, 0]::bigint[],
  'cancelling the unpaid booking: 100 % charged on paper, nothing refunded and nothing owed');
reset role;
select throws_ok($$insert into public.cancellation_requests (reservation_id, requested_on, days_before, percent, currency, total_minor,
  charge_minor, paid_minor, refund_minor, unpaid_charge_minor)
  select id, current_date, 40, 100, 'USD', 160000, 160000, 0, 0, 160000 from public.reservations where reference = (select v from t where k = 'ref')$$,
  '23514', null, 'an unpaid charge can''t be recorded');

select * from finish();
rollback;
