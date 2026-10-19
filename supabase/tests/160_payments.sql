-- Batch 4f-1 payments (DASH-PAY-001–010, DASH-ADM-097, 100–103, 106, DASH-OPR-013, 014, DASH-CUS-008, 009,
-- DATA-028, 036–040, 043, ADR-089).
begin;
select plan(30);

create function pg_temp.as_user(uid uuid, aal text default 'aal1') returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated', 'aal', aal)::text, true);
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

-- A bookable sailing with 3 cabins and two accepted offers (two reservations) for the sample customer.
update public.vessels set visibility = 'published', published_at = now() where id = '00000000-0000-4000-8000-000000000003';
insert into public.cabin_types (id, vessel_id, code, name, deck, max_occupancy) values
  ('00000000-0000-4000-f100-000000000001', '00000000-0000-4000-8000-000000000003', 'DBL', 'Double', 'Main', 2);
insert into public.schedules (id, vessel_id, code, origin, destination, nights, sailing_days) values
  ('00000000-0000-4000-f200-000000000001', '00000000-0000-4000-8000-000000000003', 'P4', 'Pay Port', 'Pay Harbour', 4, '{1,2,3,4,5,6,7}');
insert into public.departures (id, schedule_id, vessel_id, departs_on, returns_on) values
  ('00000000-0000-4000-f300-000000000001', '00000000-0000-4000-f200-000000000001', '00000000-0000-4000-8000-000000000003', current_date + 40, current_date + 44);
insert into public.inventory (departure_id, cabin_type_id, vessel_id, available) values
  ('00000000-0000-4000-f300-000000000001', '00000000-0000-4000-f100-000000000001', '00000000-0000-4000-8000-000000000003', 3);
insert into public.rates (departure_id, cabin_type_id, vessel_id, occupancy, rate_plan, currency, amount_minor) values
  ('00000000-0000-4000-f300-000000000001', '00000000-0000-4000-f100-000000000001', '00000000-0000-4000-8000-000000000003', 2, 'international', 'USD', 100000);
insert into public.cancellation_policies (vessel_id, bands) values ('00000000-0000-4000-8000-000000000003', '[{"from_days": 0, "percent": 100}]');
insert into public.cruise_requests (id, customer_id, origin, destination, earliest_departure, latest_departure, nights_min, nights_max, adults, cabins)
select ('00000000-0000-4000-f400-00000000000' || i)::uuid, '00000000-0000-4000-a000-000000000040', 'Pay Port', 'Pay Harbour',
  current_date + 30, current_date + 50, 4, 4, 2, 1 from generate_series(1, 3) i;
create temp table t (k text primary key, v text) on commit drop;
grant select, insert on t to authenticated, service_role;
select pg_temp.as_user('00000000-0000-4000-a000-000000000011');
insert into t select 'o' || i, public.send_offer(('00000000-0000-4000-f400-00000000000' || i)::uuid, '00000000-0000-4000-f300-000000000001',
  'international', 'USD', '[{"cabin_type_id": "00000000-0000-4000-f100-000000000001", "adults": 2, "price_minor": 200000}]', 200000, 200000,
  null, null, 'Terms', 'Two adults', 72)::text from generate_series(1, 3) i;
select pg_temp.as_user('00000000-0000-4000-a000-000000000040');
insert into t select 'ref' || i, public.accept_offer((select v::uuid from t where k = 'o' || i),
  '[{"full_name": "Sample One", "date_of_birth": "1980-01-01"}, {"full_name": "Sample Two", "date_of_birth": "1981-01-01"}]', true)
  from generate_series(1, 3) i;
select pg_temp.as_postgres();
insert into t select 'res' || i, (select id::text from public.reservations where reference = (select v from t where k = 'ref' || i)) from generate_series(1, 3) i;

-- Deadlines (DASH-PAY-002–005, 010).
select ok((select payment_due_at = (select due_at from app.payment_deadline(booked_on, current_date + 40))
  and deadline_rule in ('festive', 'premium', 'winter', 'summer') from public.reservations where id = (select v::uuid from t where k = 'res1')),
  'a reservation gets its deadline when it is made');
select throws_ok($$update public.reservations set payment_due_at = now() + interval '1 year' where id = (select v::uuid from t where k = 'res1')$$,
  '23514', null, 'the agreed deadline can''t be rewritten');
insert into public.premium_periods (name, starts_on, ends_on) values ('Test period', current_date + 35, current_date + 45);
select ok((select payment_due_at = (select due_at from app.payment_deadline(booked_on, current_date + 40)) is false or deadline_rule <> 'premium'
  from public.reservations where id = (select v::uuid from t where k = 'res1')), 'a new premium period doesn''t change an existing reservation');
select is((select rule from app.payment_deadline(current_date, current_date + 40)), 'premium', 'but applies to new bookings');
select is((select rule from app.payment_deadline('2026-10-18', '2027-03-25')), 'premium', 'Western Easter 2027 is a premium period');
select is((select due_on from app.payment_deadline('2027-06-01', '2027-06-05')), '2027-06-04'::date, 'never later than the day before departure');

-- Reported transfers (DASH-CUS-009) and verification (DASH-ADM-097).
select pg_temp.as_user('00000000-0000-4000-a000-000000000040');
select is((select outstanding_minor from public.reservation_balance((select v::uuid from t where k = 'res1'))), 200000::bigint, 'the customer sees the balance');
select lives_ok($$insert into t values ('rep', public.report_payment((select v::uuid from t where k = 'res1'), 150000, 'USD', current_date, 'TRF-1')::text)$$,
  'the customer reports a transfer');
select throws_ok($$select public.report_payment((select v::uuid from t where k = 'res1'), 1000, 'EUR', current_date, 'x')$$, '22023', null,
  'in the reservation''s currency only');
select throws_ok($$select public.verify_payment((select v::uuid from t where k = 'rep'), 'verified')$$, '42501', null, 'customers can''t verify');
select pg_temp.as_user('00000000-0000-4000-a000-000000000010');
select throws_ok($$select public.verify_payment((select v::uuid from t where k = 'rep'), 'verified')$$, '42501', null,
  'operators can''t verify (ADR-089)');
select throws_ok($$select public.record_manual_payment((select v::uuid from t where k = 'res1'), 1000, 'USD', 'Cash', 'x', current_date)$$, '42501', null,
  'nor record money received');
select pg_temp.as_user('00000000-0000-4000-a000-000000000008');
select throws_ok($$select public.verify_payment((select v::uuid from t where k = 'rep'), 'verified')$$, '42501', null, 'a finance admin needs two-step');
select pg_temp.as_user('00000000-0000-4000-a000-000000000008', 'aal2');
select lives_ok($$select public.verify_payment((select v::uuid from t where k = 'rep'), 'verified')$$, 'a finance admin verifies');
select ok((select receipt_number ~ '^NCR-[0-9]{4}-[0-9]{6}$' from public.payments where id = (select v::uuid from t where k = 'rep')), 'with a receipt number');
select is((select array[commission_minor, payable_minor] from public.commission_entries where payment_id = (select v::uuid from t where k = 'rep')),
  array[15000, 135000]::bigint[], '10 % commission, the rest payable to the operator (DATA-036, 037)');
select is((select status::text from public.reservations where id = (select v::uuid from t where k = 'res1')), 'awaiting_payment', 'part-paid stays awaiting payment');
select lives_ok($$select public.record_manual_payment((select v::uuid from t where k = 'res1'), 50000, 'USD', 'Bank transfer', 'STMT-22', current_date)$$,
  'a finance admin records a manual payment (DATA-043)');
select is((select status::text from public.reservations where id = (select v::uuid from t where k = 'res1')), 'confirmed', 'paid in full: confirmed');
select lives_ok($$select public.record_payout('00000000-0000-4000-b000-00000000000a', 100000, 'USD', 'Bank transfer', 'PO-1', current_date)$$,
  'payouts are recorded by finance admins');

-- Operators read their own finance, read-only (DATA-038, DASH-OPR-013).
select pg_temp.as_user('00000000-0000-4000-a000-000000000012');
select is((select count(*)::int from public.commission_entries), 2, 'the operator''s finance team sees its payables');
select is((select count(*)::int from public.payouts), 1, 'and its payouts');
select pg_temp.as_user('00000000-0000-4000-a000-000000000013');
select is_empty('select 1 from public.commission_entries', 'a viewer doesn''t see payables');
select pg_temp.as_user('00000000-0000-4000-a000-000000000020');
select is_empty('select 1 from public.payments union all select 1 from public.payouts', 'another operator sees nothing');

-- Card payments come only from the service role (DATA-028), once per payment intent.
select pg_temp.as_user('00000000-0000-4000-a000-000000000040');
select throws_ok($$select public.service_card_payment((select v::uuid from t where k = 'res2'), 'cs_1', 'pi_1', 200000, 'usd')$$, '42501', null,
  'the browser can''t mark a payment as made');
select pg_temp.as_service();
select is(public.service_card_payment((select v::uuid from t where k = 'res2'), 'cs_1', 'pi_1', 200000, 'usd'), 'recorded', 'a webhook records the card payment');
select is(public.service_card_payment((select v::uuid from t where k = 'res2'), 'cs_1', 'pi_1', 200000, 'usd'), 'duplicate', 'a repeated webhook changes nothing');
select is(public.service_card_payment((select v::uuid from t where k = 'res2'), 'cs_2', 'pi_2', 200000, 'usd'), 'refund',
  'a payment for a reservation no longer waiting is sent back');

-- Release at the deadline (DATA-040): reservation 3 is overdue and unpaid.
select pg_temp.as_postgres();
alter table public.reservations disable trigger reservations_keep_deadline;
update public.reservations set payment_due_at = now() - interval '1 hour' where id = (select v::uuid from t where k = 'res3');
alter table public.reservations enable trigger reservations_keep_deadline;
select is(app.release_unpaid(), 1, 'the hourly job releases the overdue reservation');
select is((select available from public.inventory where departure_id = '00000000-0000-4000-f300-000000000001'), 1,
  'and its cabin goes back (3 − 3 taken + 1 released)');

select * from finish();
rollback;
