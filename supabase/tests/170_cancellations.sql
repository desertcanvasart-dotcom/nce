-- Batch 4f-2a cancellations and refunds (DASH-PAY-011, 012, DASH-CUS-010, DASH-OPR-015, DASH-ADM-095, 104, 105,
-- DATA-029, 036, 037, ADR-089).
begin;
select plan(31);

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

-- A sailing 75 days out with the standard (non-luxury) bands: 90–60 days costs 35 %. Three reservations.
update public.vessels set visibility = 'published', published_at = now() where id = '00000000-0000-4000-8000-000000000003';
insert into public.cabin_types (id, vessel_id, code, name, deck, max_occupancy) values
  ('00000000-0000-4000-f100-000000000001', '00000000-0000-4000-8000-000000000003', 'DBL', 'Double', 'Main', 2);
insert into public.schedules (id, vessel_id, code, origin, destination, nights, sailing_days) values
  ('00000000-0000-4000-f200-000000000001', '00000000-0000-4000-8000-000000000003', 'C4', 'Cancel Port', 'Cancel Harbour', 4, '{1,2,3,4,5,6,7}');
insert into public.departures (id, schedule_id, vessel_id, departs_on, returns_on) values
  ('00000000-0000-4000-f300-000000000001', '00000000-0000-4000-f200-000000000001', '00000000-0000-4000-8000-000000000003',
   (now() at time zone 'Africa/Cairo')::date + 75, (now() at time zone 'Africa/Cairo')::date + 79);
insert into public.inventory (departure_id, cabin_type_id, vessel_id, available) values
  ('00000000-0000-4000-f300-000000000001', '00000000-0000-4000-f100-000000000001', '00000000-0000-4000-8000-000000000003', 5);
insert into public.rates (departure_id, cabin_type_id, vessel_id, occupancy, rate_plan, currency, amount_minor) values
  ('00000000-0000-4000-f300-000000000001', '00000000-0000-4000-f100-000000000001', '00000000-0000-4000-8000-000000000003', 2, 'international', 'USD', 100000);
insert into public.cancellation_policies (vessel_id, bands) values ('00000000-0000-4000-8000-000000000003',
  '[{"from_days": 121, "percent": 0}, {"from_days": 91, "percent": 25}, {"from_days": 60, "percent": 35}, {"from_days": 30, "percent": 50}, {"from_days": 0, "percent": 100}]');
insert into public.cruise_requests (id, customer_id, origin, destination, earliest_departure, latest_departure, nights_min, nights_max, adults, cabins)
select ('00000000-0000-4000-f400-00000000000' || i)::uuid, '00000000-0000-4000-a000-000000000040', 'Cancel Port', 'Cancel Harbour',
  current_date + 60, current_date + 90, 4, 4, 2, 1 from generate_series(1, 3) i;
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
-- res1 paid in full by a transfer a finance admin recorded; res2 paid by card through Stripe; res3 unpaid.
select pg_temp.as_user('00000000-0000-4000-a000-000000000008', 'aal2');
select public.record_manual_payment((select v::uuid from t where k = 'res1'), 200000, 'USD', 'Bank transfer', 'TRF-1', current_date);
select pg_temp.as_service();
select public.service_card_payment((select v::uuid from t where k = 'res2'), 'cs_test_c2', 'pi_test_c2', 200000, 'usd');

-- The quote (DASH-PAY-011, 012).
select pg_temp.as_user('00000000-0000-4000-a000-000000000040');
select is((select array[days_before, percent]::bigint[] || array[charge_minor, refund_minor, unpaid_charge_minor]
  from public.cancellation_quote((select v::uuid from t where k = 'res1'))), array[75, 35, 70000, 130000, 0]::bigint[],
  '75 days before: 35 % charged, the rest of what was paid refunded');
select is((select unpaid_charge_minor from public.cancellation_quote((select v::uuid from t where k = 'res3'))), 70000::bigint,
  'unpaid: the charge is still owed');
select pg_temp.as_user('00000000-0000-4000-a000-000000000041');
select is((select count(*)::int from public.cancellation_quote((select v::uuid from t where k = 'res1'))), 0, 'another customer gets no quote');

-- Asking (DASH-CUS-010, DASH-PAY-013).
select throws_ok($$select public.request_cancellation((select v::uuid from t where k = 'res1'), 'x', true)$$, 'P0002', null,
  'only the reservation''s customer can ask');
select pg_temp.as_user('00000000-0000-4000-a000-000000000040');
select throws_ok($$select public.request_cancellation((select v::uuid from t where k = 'res1'), 'x', false)$$, '22023', null,
  'the policy must be acknowledged');
select lives_ok($$insert into t values ('c1', public.request_cancellation((select v::uuid from t where k = 'res1'), 'Change of plans', true)::text)$$,
  'the customer asks to cancel');
select throws_ok($$select public.request_cancellation((select v::uuid from t where k = 'res1'), 'again', true)$$, '22023', null,
  'one open request per reservation');
select is((select array[charge_minor, refund_minor] from public.cancellation_requests where id = (select v::uuid from t where k = 'c1')),
  array[70000, 130000]::bigint[], 'the figures are fixed on the request');
select lives_ok($$insert into t values ('c3', public.request_cancellation((select v::uuid from t where k = 'res3'), null, true)::text)$$,
  'an unpaid reservation can be cancelled too');
select lives_ok($$select public.withdraw_cancellation((select v::uuid from t where k = 'c3'))$$, 'and the request withdrawn');

-- The operator checks (DASH-OPR-015) but never decides (ADR-089).
select pg_temp.as_user('00000000-0000-4000-a000-000000000010');
select throws_ok($$select public.review_cancellation((select v::uuid from t where k = 'c1'), false, '')$$, '22023', null,
  'contesting needs a note');
select lives_ok($$select public.review_cancellation((select v::uuid from t where k = 'c1'), true)$$, 'the operator confirms the figures');
select throws_ok($$select public.decide_cancellation((select v::uuid from t where k = 'c1'), true)$$, '42501', null, 'operators can''t decide');
select pg_temp.as_user('00000000-0000-4000-a000-000000000040');
select throws_ok($$select public.decide_cancellation((select v::uuid from t where k = 'c1'), true)$$, '42501', null, 'customers can''t decide');
select pg_temp.as_user('00000000-0000-4000-a000-000000000008');
select throws_ok($$select public.decide_cancellation((select v::uuid from t where k = 'c1'), true)$$, '42501', null,
  'a finance admin needs two-step');

-- The finance admin approves (DASH-ADM-095, 104): cancelled, cabins back, refund due.
select pg_temp.as_user('00000000-0000-4000-a000-000000000008', 'aal2');
select is(public.decide_cancellation((select v::uuid from t where k = 'c1'), true), 'refund_due'::public.cancellation_status,
  'approved with a refund due');
select is((select status from public.reservations where id = (select v::uuid from t where k = 'res1')), 'cancelled'::public.reservation_status,
  'the reservation is cancelled');
select is((select available from public.inventory where departure_id = '00000000-0000-4000-f300-000000000001'), 3, 'its cabin is returned');
select is((select count(*)::int from public.stripe_refund_plan((select v::uuid from t where k = 'c1'))), 0,
  'paid by transfer: nothing goes back through Stripe');
select throws_ok($$select public.record_manual_refund((select v::uuid from t where k = 'c1'), 130001, 'Bank transfer', 'RF-1')$$, '22023', null,
  'no more than is due');
select lives_ok($$select public.record_manual_refund((select v::uuid from t where k = 'c1'), 130000, 'Bank transfer', 'RF-1')$$,
  'the refund made outside the system is recorded');
select is((select status from public.cancellation_requests where id = (select v::uuid from t where k = 'c1')), 'closed'::public.cancellation_status,
  'all given back: closed');
select is((select array[sum(commission_minor), sum(payable_minor)]::bigint[] from public.commission_entries
  where reservation_id = (select v::uuid from t where k = 'res1')), array[7000, 63000]::bigint[],
  'commission and payable are reversed in proportion: 10 % of the charge kept');
select is((select refunded_minor from public.reservation_balance((select v::uuid from t where k = 'res1'))), 130000::bigint,
  'the balance shows the refund');

-- Card: the refund goes back through Stripe only for what is due (DATA-029).
select pg_temp.as_user('00000000-0000-4000-a000-000000000040');
insert into t values ('c2', public.request_cancellation((select v::uuid from t where k = 'res2'), null, true)::text);
select pg_temp.as_user('00000000-0000-4000-a000-000000000008', 'aal2');
select throws_ok($$select public.decide_cancellation((select v::uuid from t where k = 'c2'), false, '')$$, '22023', null,
  'refusing needs a reason');
select public.decide_cancellation((select v::uuid from t where k = 'c2'), true);
select is((select array_agg(amount_minor)::bigint[] from public.stripe_refund_plan((select v::uuid from t where k = 'c2'))),
  array[130000]::bigint[], 'the card refund plan is what is due');
select throws_ok($$select public.service_record_stripe_refund((select v::uuid from t where k = 'c2'),
  (select id from public.payments where stripe_payment_intent_id = 'pi_test_c2'), 130000, 're_test_1')$$, '42501', null,
  'only the server records a Stripe refund');
select pg_temp.as_service();
select throws_ok($$select public.service_record_stripe_refund((select v::uuid from t where k = 'c2'),
  (select id from public.payments where stripe_payment_intent_id = 'pi_test_c2'), 130001, 're_test_1')$$, '22023', null,
  'never more than is due');
select lives_ok($$select public.service_record_stripe_refund((select v::uuid from t where k = 'c2'),
  (select id from public.payments where stripe_payment_intent_id = 'pi_test_c2'), 130000, 're_test_1')$$, 'the Stripe refund is recorded');
select lives_ok($$select public.service_record_stripe_refund((select v::uuid from t where k = 'c2'),
  (select id from public.payments where stripe_payment_intent_id = 'pi_test_c2'), 130000, 're_test_1')$$, 'a repeat changes nothing');
select is((select count(*)::int from public.refunds where cancellation_id = (select v::uuid from t where k = 'c2')), 1, 'one refund row');

select * from finish();
rollback;
