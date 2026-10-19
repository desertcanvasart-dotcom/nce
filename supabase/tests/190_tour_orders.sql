-- Batch 4f-2c tour orders (DASH-PAY-014, DATA-027, DATA-041, ADR-087).
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

-- A bookable tour 40 days out: a shared session of 3 places at US$100 per guest, and a private one at US$500 per party.
insert into public.tour_suppliers (id, name, email) values ('00000000-0000-4000-d800-000000000001', 'Sample Supplier', 'supplier@example.test');
insert into public.tours (id, slug, kind, name, location, duration_minutes, supplier_id, visibility, cancellation_bands) values
  ('00000000-0000-4000-d800-000000000002', 'sample-order-tour', 'excursion', 'Sample Order Tour', 'Aswan', 600,
   '00000000-0000-4000-d800-000000000001', 'published', '[{"from_days": 30, "percent": 0}, {"from_days": 7, "percent": 50}, {"from_days": 0, "percent": 100}]');
insert into public.tour_sessions (id, tour_id, starts_at, ends_at, kind, pricing, capacity, currency, price_minor) values
  ('00000000-0000-4000-d800-000000000003', '00000000-0000-4000-d800-000000000002', now() + interval '40 days', now() + interval '40 days 10 hours',
   'shared', 'per_guest', 3, 'USD', 10000),
  ('00000000-0000-4000-d800-000000000004', '00000000-0000-4000-d800-000000000002', now() + interval '41 days', now() + interval '41 days 10 hours',
   'private', 'per_group', 4, 'USD', 50000);
create temp table t (k text primary key, v text) on commit drop;
grant select, insert on t to authenticated, service_role;

-- Ordering (DASH-PAY-014, ADR-087).
select pg_temp.as_user('00000000-0000-4000-a000-000000000040');
select throws_ok($$select public.order_tour('00000000-0000-4000-d800-000000000003', '{40}', 'Sample Guest', null, false)$$, '22023', null,
  'the terms must be acknowledged');
select lives_ok($$insert into t values ('o1', public.order_tour('00000000-0000-4000-d800-000000000003', '{40, 2}', 'Sample Guest', 'Pickup at the ship', true)::text)$$,
  'a customer orders two places');
select is((select total_minor from public.tour_orders where id = (select v::uuid from t where k = 'o1')), 10000::bigint,
  'per guest: the under-3 travels free');
select is(public.session_places_left('00000000-0000-4000-d800-000000000003'), 1, 'two of three places are held');
select throws_ok($$select public.order_tour('00000000-0000-4000-d800-000000000003', '{30, 31}', 'Another Guest', null, true)$$, '23514', null,
  'no more places than are left');
select lives_ok($$insert into t values ('p1', public.order_tour('00000000-0000-4000-d800-000000000004', '{40, 38, 9}', 'Private Guest', null, true)::text)$$,
  'a private session for a party');
select is((select total_minor from public.tour_orders where id = (select v::uuid from t where k = 'p1')), 50000::bigint, 'per group: one price');
select is(public.session_places_left('00000000-0000-4000-d800-000000000004'), 0, 'a private session is one party''s');
select throws_ok($$select public.order_tour('00000000-0000-4000-d800-000000000004', '{40}', 'Second Party', null, true)$$, '23514', null,
  'a second party can''t join it');
select pg_temp.as_user('00000000-0000-4000-a000-000000000041');
select is((select count(*)::int from public.tour_orders), 0, 'another customer sees no one else''s orders');

-- Holds: once the 60 minutes are over, the places are free again; the job closes the order.
select pg_temp.as_postgres();
update public.tour_orders set hold_until = now() - interval '1 hour' where id = (select v::uuid from t where k = 'p1');
select is(public.session_places_left('00000000-0000-4000-d800-000000000004'), 4, 'an expired hold frees the private session');
select is(app.release_tour_holds(), 1, 'the job releases it');
select is((select status from public.tour_orders where id = (select v::uuid from t where k = 'p1')), 'cancelled'::public.tour_order_status,
  'as cancelled');

-- Payment from the signed webhook only (DATA-027, 028); kept apart from cruise payments, no commission (DATA-041).
select pg_temp.as_user('00000000-0000-4000-a000-000000000040');
select throws_ok($$select public.service_tour_payment((select v::uuid from t where k = 'o1'), 'cs_t', 'pi_tour_1', 10000, 'usd')$$, '42501', null,
  'customers can''t mark it paid');
select pg_temp.as_service();
select is(public.service_tour_payment((select v::uuid from t where k = 'o1'), 'cs_t', 'pi_tour_1', 10000, 'usd'), 'recorded', 'the payment is recorded');
select is(public.service_tour_payment((select v::uuid from t where k = 'o1'), 'cs_t', 'pi_tour_1', 10000, 'usd'), 'duplicate', 'once');
select ok((select status = 'confirmed' and exists (select 1 from public.tour_payments p where p.order_id = o.id and p.receipt_number like 'NCR-%')
  from public.tour_orders o where id = (select v::uuid from t where k = 'o1')), 'confirmed, with a receipt number');
select is(public.service_tour_payment((select v::uuid from t where k = 'p1'), 'cs_p', 'pi_tour_2', 50000, 'usd'), 'refund',
  'a payment for a released order goes back');
select is((select count(*)::int from public.payments where stripe_payment_intent_id like 'pi_tour_%')
  + (select count(*)::int from public.commission_entries ce join public.payments p on p.id = ce.payment_id where p.stripe_payment_intent_id like 'pi_tour_%'),
  0, 'no cruise payment and no commission from a tour');

-- Cancellation by the tour's bands: 40 days out, nothing charged.
select pg_temp.as_user('00000000-0000-4000-a000-000000000040');
select is((select array[days_before, percent]::bigint[] || array[charge_minor, refund_minor]
  from public.tour_cancel_quote((select v::uuid from t where k = 'o1'))), array[40, 0, 0, 10000]::bigint[], 'the quote uses the tour''s bands');
select throws_ok($$select public.request_tour_cancellation((select v::uuid from t where k = 'o1'), null, false)$$, '22023', null,
  'the policy must be acknowledged');
select lives_ok($$select public.request_tour_cancellation((select v::uuid from t where k = 'o1'), 'Plans changed', true)$$, 'the customer asks');
select throws_ok($$select public.decide_tour_cancellation((select v::uuid from t where k = 'o1'), true)$$, '42501', null, 'customers can''t decide');
select pg_temp.as_user('00000000-0000-4000-a000-000000000008');
select throws_ok($$select public.decide_tour_cancellation((select v::uuid from t where k = 'o1'), true)$$, '42501', null,
  'a finance admin needs two-step');
select pg_temp.as_user('00000000-0000-4000-a000-000000000008', 'aal2');
select lives_ok($$select public.decide_tour_cancellation((select v::uuid from t where k = 'o1'), true)$$, 'a finance admin approves');
select is(public.session_places_left('00000000-0000-4000-d800-000000000003'), 3, 'the places are free again');
select throws_ok($$select public.record_tour_manual_refund((select v::uuid from t where k = 'o1'), 10001, 'Bank transfer', 'RF-1')$$, '22023', null,
  'never more than is due');
select pg_temp.as_service();
select lives_ok($$select public.service_record_tour_refund((select v::uuid from t where k = 'o1'),
  (select id from public.tour_payments where stripe_payment_intent_id = 'pi_tour_1'), 10000, 're_tour_1')$$, 'the Stripe refund is recorded');
select throws_ok($$select public.service_record_tour_refund((select v::uuid from t where k = 'o1'),
  (select id from public.tour_payments where stripe_payment_intent_id = 'pi_tour_1'), 1, 're_tour_2')$$, '22023', null,
  'and nothing more after that');
select is((select count(*)::int from public.tour_refunds where order_id = (select v::uuid from t where k = 'o1')), 1, 'one refund row');

select * from finish();
rollback;
