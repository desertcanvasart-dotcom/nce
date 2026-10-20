-- Batch 4h-2b: company requests and offers (DASH-B2B-004, ADR-092).
begin;
select plan(17);

create function pg_temp.as_user(uid uuid, aal text default 'aal1') returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated', 'aal', aal)::text, true);
end $$;
create function pg_temp.as_postgres() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '', true);
  perform set_config('role', 'postgres', true);
end $$;

-- Operator A's bookable sailing (Request Port → Request Harbour, 4 nights), 3 double cabins.
update public.vessels set visibility = 'published', published_at = now() where id = '00000000-0000-4000-8000-000000000003';
insert into public.cabin_types (id, vessel_id, code, name, deck, max_occupancy) values
  ('00000000-0000-4000-f100-000000000002', '00000000-0000-4000-8000-000000000003', 'DBL', 'Double', 'Main', 2);
insert into public.schedules (id, vessel_id, code, origin, destination, nights, sailing_days) values
  ('00000000-0000-4000-f200-000000000002', '00000000-0000-4000-8000-000000000003', 'RQ4', 'Request Port', 'Request Harbour', 4, '{1,2,3,4,5,6,7}');
insert into public.departures (id, schedule_id, vessel_id, departs_on, returns_on) values
  ('00000000-0000-4000-f300-000000000002', '00000000-0000-4000-f200-000000000002', '00000000-0000-4000-8000-000000000003', current_date + 40, current_date + 44);
insert into public.inventory (departure_id, cabin_type_id, vessel_id, available) values
  ('00000000-0000-4000-f300-000000000002', '00000000-0000-4000-f100-000000000002', '00000000-0000-4000-8000-000000000003', 3);
insert into public.cancellation_policies (vessel_id, bands) values ('00000000-0000-4000-8000-000000000003', '[{"from_days": 0, "percent": 100}]');
insert into public.rates (departure_id, cabin_type_id, vessel_id, occupancy, rate_plan, currency, amount_minor) values
  ('00000000-0000-4000-f300-000000000002', '00000000-0000-4000-f100-000000000002', '00000000-0000-4000-8000-000000000003', 2, 'international', 'USD', 100000),
  ('00000000-0000-4000-f300-000000000002', '00000000-0000-4000-f100-000000000002', '00000000-0000-4000-8000-000000000003', 2, 'trade', 'USD', 80000);
create temp table t (k text primary key, v text) on commit drop;
grant select, insert on t to authenticated;

create function pg_temp.company_request(org uuid, buyer_name text default null) returns uuid language sql as $$
  insert into public.cruise_requests (origin, destination, earliest_departure, latest_departure, nights_min, nights_max, adults, cabins, buyer_org_id, buyer_name)
  values ('Request Port', 'Request Harbour', current_date + 30, current_date + 50, 4, 4, 2, 1, org, buyer_name) returning id;
$$;
create function pg_temp.trade_offer(req uuid, plan public.rate_plan default 'trade') returns uuid language sql as $$
  select public.send_offer(req, '00000000-0000-4000-f300-000000000002', plan, 'USD',
    '[{"cabin_type_id": "00000000-0000-4000-f100-000000000002", "adults": 2, "child_ages": [], "price_minor": 160000}]',
    160000, 200000, '', '', 'Trade terms.', 'Two adults.', 72);
$$;
grant execute on function pg_temp.company_request(uuid, text), pg_temp.trade_offer(uuid, public.rate_plan) to authenticated;

-- Sending a request for the company: owners and reservations users of an approved agency.
select pg_temp.as_user('00000000-0000-4000-a000-000000000032');
select throws_ok($$select pg_temp.company_request('00000000-0000-4000-b000-0000000000c1')$$, '42501', null,
  'a finance user doesn''t send company requests');
select pg_temp.as_user('00000000-0000-4000-a000-000000000040');
select throws_ok($$select pg_temp.company_request('00000000-0000-4000-b000-0000000000c1')$$, '42501', null,
  'a customer can''t send a request in an agency''s name');
select pg_temp.as_user('00000000-0000-4000-a000-000000000031');
select lives_ok($$insert into t values ('req', pg_temp.company_request('00000000-0000-4000-b000-0000000000c1', 'Someone Else')::text)$$,
  'a reservations user sends a request for the company');
select is((select buyer_name from public.cruise_requests where id = (select v::uuid from t where k = 'req')), 'Sample Partner',
  'the company''s name comes from the database');

-- Who sees it.
select pg_temp.as_user('00000000-0000-4000-a000-000000000030');
select is((select count(*)::int from public.cruise_requests where buyer_org_id = '00000000-0000-4000-b000-0000000000c1'), 1,
  'the owner sees the company''s request');
select pg_temp.as_user('00000000-0000-4000-a000-000000000032');
select is((select count(*)::int from public.cruise_requests where id = (select v::uuid from t where k = 'req')), 0,
  'a finance user doesn''t');
select pg_temp.as_user('00000000-0000-4000-a000-000000000040');
select is((select count(*)::int from public.cruise_requests where id = (select v::uuid from t where k = 'req')), 0,
  'nor does a customer');
select pg_temp.as_user('00000000-0000-4000-a000-000000000010');
select is((select buyer_org_id::text from public.cruise_requests where id = (select v::uuid from t where k = 'req')),
  '00000000-0000-4000-b000-0000000000c1', 'the operator sees it, marked as from a travel partner');

-- Offers at the trade rate, for companies only.
select lives_ok($$insert into t values ('offer', pg_temp.trade_offer((select v::uuid from t where k = 'req'))::text)$$,
  'the operator offers at the trade rate');
select pg_temp.as_user('00000000-0000-4000-a000-000000000040');
insert into t values ('creq', pg_temp.company_request(null)::text);
select pg_temp.as_user('00000000-0000-4000-a000-000000000010');
select throws_ok($$select pg_temp.trade_offer((select v::uuid from t where k = 'creq'))$$, '22023', null,
  'a customer''s request gets no trade offer');
select pg_temp.as_user('00000000-0000-4000-a000-000000000031');
select is((select count(*)::int from public.offers where request_id = (select v::uuid from t where k = 'req')), 1,
  'the company''s reservations users see the offer');
select pg_temp.as_postgres();
select is((select count(*)::int from public.notifications where org_id = '00000000-0000-4000-b000-0000000000c1' and kind = 'offer.new'), 1,
  'and the company is told');

-- Accepting: by anyone in the company with the reservations role (or the owner), not finance.
select pg_temp.as_user('00000000-0000-4000-a000-000000000032');
select throws_ok($$select public.accept_offer((select v::uuid from t where k = 'offer'),
  '[{"full_name": "Sample One", "date_of_birth": "1985-01-01"}, {"full_name": "Sample Two", "date_of_birth": "1987-01-01"}]', true)$$,
  'P0002', null, 'a finance user can''t accept');
select pg_temp.as_user('00000000-0000-4000-a000-000000000030');
select lives_ok($$insert into t values ('ref', public.accept_offer((select v::uuid from t where k = 'offer'),
  '[{"full_name": "Sample One", "date_of_birth": "1985-01-01"}, {"full_name": "Sample Two", "date_of_birth": "1987-01-01"}]', true))$$,
  'the owner accepts the offer a colleague asked for');
select pg_temp.as_postgres();
select is((select array[r.buyer_org_id::text, r.booked_by::text, r.rate_plan::text, r.total_minor::text, (d.reservation_id is not null)::text]
  from public.reservations r left join public.partner_booking_details d on d.reservation_id = r.id
  where r.reference = (select v from t where k = 'ref')),
  array['00000000-0000-4000-b000-0000000000c1', '00000000-0000-4000-a000-000000000030', 'trade', '160000', 'true'],
  'a company booking at the offered trade price, with room for the client''s details');

-- A request never changes hands; a paused agency can't ask.
select pg_temp.as_user('00000000-0000-4000-a000-000000000040');
select throws_ok($$update public.cruise_requests set buyer_org_id = '00000000-0000-4000-b000-0000000000c1' where id = (select v::uuid from t where k = 'creq')$$,
  '23514', null, 'a customer''s request can''t be moved to a company');
select pg_temp.as_postgres();
update public.organisations set status = 'paused' where id = '00000000-0000-4000-b000-0000000000c1';
select pg_temp.as_user('00000000-0000-4000-a000-000000000031');
select throws_ok($$select pg_temp.company_request('00000000-0000-4000-b000-0000000000c1')$$, '42501', null,
  'a paused agency can''t send requests');

select * from finish();
rollback;
