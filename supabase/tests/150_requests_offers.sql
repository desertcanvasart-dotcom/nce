-- Batch 4e requests, offers and reservations (DASH-CUS-004–007, 014, DASH-OPR-011, 017–023, DASH-ADM-057,
-- DASH-BND-001, DATA-020, SEC-013, ADR-088).
begin;
select plan(31);

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

-- A bookable sailing on operator A's steamer: published, policy, a cabin type sleeping 3 with a rate and 3 cabins.
update public.vessels set visibility = 'published', published_at = now(), gratuity_usd_minor = 600 where id = '00000000-0000-4000-8000-000000000003';
insert into public.cabin_types (id, vessel_id, code, name, deck, max_occupancy) values
  ('00000000-0000-4000-e100-000000000001', '00000000-0000-4000-8000-000000000003', 'TRI', 'Triple', 'Upper', 3);
insert into public.schedules (id, vessel_id, code, origin, destination, nights, sailing_days) values
  ('00000000-0000-4000-e200-000000000001', '00000000-0000-4000-8000-000000000003', 'LA4', 'Luxor', 'Aswan', 4, '{1,2,3,4,5,6,7}');
insert into public.departures (id, schedule_id, vessel_id, departs_on, returns_on) values
  ('00000000-0000-4000-e300-000000000001', '00000000-0000-4000-e200-000000000001', '00000000-0000-4000-8000-000000000003', current_date + 20, current_date + 24);
insert into public.inventory (departure_id, cabin_type_id, vessel_id, available) values
  ('00000000-0000-4000-e300-000000000001', '00000000-0000-4000-e100-000000000001', '00000000-0000-4000-8000-000000000003', 3);
insert into public.rates (departure_id, cabin_type_id, vessel_id, occupancy, rate_plan, currency, amount_minor) values
  ('00000000-0000-4000-e300-000000000001', '00000000-0000-4000-e100-000000000001', '00000000-0000-4000-8000-000000000003', 3, 'international', 'USD', 90000);
select ok(not public.departure_bookable('00000000-0000-4000-e300-000000000001'), 'without a cancellation policy a sailing is not bookable');
insert into public.cancellation_policies (id, vessel_id, bands) values
  ('00000000-0000-4000-e400-000000000001', '00000000-0000-4000-8000-000000000003', '[{"from_days": 60, "percent": 10}, {"from_days": 0, "percent": 100}]');
insert into public.cancellation_policy_translations (policy_id, locale, terms) values
  ('00000000-0000-4000-e400-000000000001', 'en', 'Sample policy wording.');
select ok(public.departure_bookable('00000000-0000-4000-e300-000000000001'), 'with a policy, a rate and fresh availability it is bookable');
create temp table t (k text primary key, v text) on commit drop;
grant select, insert on t to authenticated;

-- The customer asks (DASH-CUS-014, DATA-020).
select pg_temp.as_user('00000000-0000-4000-a000-000000000040');
select lives_ok($$insert into public.cruise_requests (id, origin, destination, earliest_departure, latest_departure,
  nights_min, nights_max, adults, child_ages, cabins) values ('00000000-0000-4000-e500-000000000001', 'Luxor', 'Aswan', current_date + 10, current_date + 30, 3, 5, 2, '{7}', 1)$$,
  'a customer sends a request with a child''s age');
select throws_ok($$insert into public.cruise_requests (customer_id, earliest_departure, latest_departure, nights_min, nights_max, adults, cabins)
  values ('00000000-0000-4000-a000-000000000010', current_date + 10, current_date + 30, 3, 5, 2, 1)$$, '42501', null, 'nobody can ask in someone else''s name');

-- Matching operators see it, without the customer's details (ADR-088).
select pg_temp.as_user('00000000-0000-4000-a000-000000000011');
select is((select count(*)::int from public.cruise_requests where id = '00000000-0000-4000-e500-000000000001'), 1, 'operator A''s reservations team sees the matching request');
select is_empty($$select 1 from public.profiles where id = '00000000-0000-4000-a000-000000000040'$$, 'but not the customer''s profile');
select is((select count(*)::int from public.notifications where org_id = '00000000-0000-4000-b000-00000000000a' and kind = 'request.new'
  and link like '%00000000-0000-4000-e500-000000000001%'), 1,
  'and gets a new-request notice (DASH-OPR-002)');
select pg_temp.as_user('00000000-0000-4000-a000-000000000020');
select is_empty($$select 1 from public.cruise_requests$$, 'an operator without matching sailings sees nothing');

-- Offers (DASH-OPR-011, 017–023).
select pg_temp.as_user('00000000-0000-4000-a000-000000000011');
select throws_ok($$select public.send_offer('00000000-0000-4000-e500-000000000001', '00000000-0000-4000-e300-000000000001', 'international', 'USD',
  '[{"cabin_type_id": "00000000-0000-4000-e100-000000000001", "adults": 2, "child_ages": [], "price_minor": 180000}]', 180000, null, null, null, 'Terms', 'Two adults, one child', 72)$$,
  '22023', null, 'the cabins must hold everyone in the request');
select throws_ok($$select public.send_offer('00000000-0000-4000-e500-000000000001', '00000000-0000-4000-e300-000000000001', 'international', 'USD',
  '[{"cabin_type_id": "00000000-0000-4000-e100-000000000001", "adults": 2, "child_ages": [7], "price_minor": 225000}]', 225000, null, null, null, 'Terms', 'Family', 2)$$,
  '22023', null, 'an offer is valid for at least 24 hours');
select throws_ok($$select public.send_offer('00000000-0000-4000-e500-000000000001', '00000000-0000-4000-e300-000000000001', 'international', 'EGP',
  '[{"cabin_type_id": "00000000-0000-4000-e100-000000000001", "adults": 2, "child_ages": [7], "price_minor": 225000}]', 225000, null, null, null, 'Terms', 'Family', 72)$$,
  '23514', null, 'E£ only for local plans');
select lives_ok($$insert into t values ('v1', public.send_offer('00000000-0000-4000-e500-000000000001', '00000000-0000-4000-e300-000000000001', 'international', 'USD',
  '[{"cabin_type_id": "00000000-0000-4000-e100-000000000001", "adults": 2, "child_ages": [7], "price_minor": 225000}]', 225000, 225000, null, 'Breakfast', 'Terms v1', 'Two adults and a child of 7', 72)::text)$$,
  'reservations staff send an offer');
select is((select deck from public.offer_cabins where offer_id = (select v::uuid from t where k = 'v1')), 'Upper', 'the offer records the deck (DASH-OPR-022)');
select is((select available from public.inventory where departure_id = '00000000-0000-4000-e300-000000000001'), 3, 'sending holds no cabins (DASH-OPR-020)');
select throws_ok($$update public.offers set total_minor = 1 where id = (select v::uuid from t where k = 'v1')$$, '42501', null, 'offers can''t be edited by people');
select pg_temp.as_postgres();
select throws_ok($$update public.offers set total_minor = 1 where id = (select v::uuid from t where k = 'v1')$$, '23514', null, 'nor by anyone: a change is a new version');
select pg_temp.as_user('00000000-0000-4000-a000-000000000011');
insert into t values ('v2', public.send_offer('00000000-0000-4000-e500-000000000001', '00000000-0000-4000-e300-000000000001', 'international', 'USD',
  '[{"cabin_type_id": "00000000-0000-4000-e100-000000000001", "adults": 2, "child_ages": [7], "price_minor": 220000}]', 220000, 225000, 'Loyalty', 'Breakfast', 'Terms v2', 'Two adults and a child of 7', 72,
  (select v::uuid from t where k = 'v1'))::text);
select is((select array_agg(status::text || version order by version) from public.offers where request_id = '00000000-0000-4000-e500-000000000001'),
  array['superseded1', 'sent2'], 'a revision supersedes the previous version (DASH-OPR-023)');

-- Accepting (DASH-CUS-007, DASH-OPR-021).
select pg_temp.as_user('00000000-0000-4000-a000-000000000040');
create temp table g on commit drop as select jsonb_build_array(
  jsonb_build_object('full_name', 'Sample Lead', 'date_of_birth', '1980-05-01', 'nationality', 'gb'),
  jsonb_build_object('full_name', 'Sample Partner', 'date_of_birth', '1982-06-01'),
  jsonb_build_object('full_name', 'Sample Child', 'date_of_birth', (current_date + 20 - interval '7 years 30 days')::date::text)) as j;
grant select on g to authenticated;
select is((select count(*)::int from public.offers where request_id = '00000000-0000-4000-e500-000000000001'), 2, 'the customer sees both versions');
select throws_ok($$select public.accept_offer((select v::uuid from t where k = 'v1'), (select j from g), true)$$, '22023', null, 'a superseded version can''t be accepted');
select throws_ok($$select public.accept_offer((select v::uuid from t where k = 'v2'), (select j from g), false)$$, '22023', null, 'the terms must be read');
select throws_ok($$select public.accept_offer((select v::uuid from t where k = 'v2'),
  (select jsonb_set(j, '{2,date_of_birth}', to_jsonb((current_date + 20 - interval '9 years')::date::text)) from g), true)$$, '22023', null,
  'children''s ages on the departure date must match the offer');
select lives_ok($$insert into t values ('ref', public.accept_offer((select v::uuid from t where k = 'v2'), (select j from g), true))$$, 'the current version is accepted');
select ok((select v ~ '^NC-[A-HJ-NP-Z2-9]{6}$' from t where k = 'ref'), 'the reservation has a reference');
select is((select status::text from public.cruise_requests where id = '00000000-0000-4000-e500-000000000001'), 'accepted', 'and closes the request');
select is((select count(*)::int from public.passengers), 3, 'the customer sees the passengers');
select pg_temp.as_postgres();
select is((select available from public.inventory where departure_id = '00000000-0000-4000-e300-000000000001'), 2, 'acceptance takes the cabin');
select pg_temp.as_user('00000000-0000-4000-a000-000000000013');
select is((select count(*)::int from public.passengers), 3, 'so does the operator''s team (SEC-013)');
select pg_temp.as_user('00000000-0000-4000-a000-000000000020');
select is_empty('select 1 from public.passengers union all select 1 from public.reservations', 'another operator sees none of it');
select pg_temp.as_user('00000000-0000-4000-a000-000000000030');
select is_empty('select 1 from public.passengers', 'nor does a travel partner');

-- Never more cabins than there are (DASH-ADM-057): a request for 3 cabins when 2 are left.
select pg_temp.as_postgres();
insert into public.cruise_requests (id, customer_id, origin, destination, earliest_departure, latest_departure, nights_min, nights_max, adults, cabins)
values ('00000000-0000-4000-e500-000000000002', '00000000-0000-4000-a000-000000000040', 'Luxor', 'Aswan', current_date + 10, current_date + 30, 3, 5, 6, 3);
select pg_temp.as_user('00000000-0000-4000-a000-000000000011');
insert into t values ('big', public.send_offer('00000000-0000-4000-e500-000000000002', '00000000-0000-4000-e300-000000000001', 'international', 'USD',
  '[{"cabin_type_id": "00000000-0000-4000-e100-000000000001", "adults": 2, "price_minor": 180000}, {"cabin_type_id": "00000000-0000-4000-e100-000000000001", "adults": 2, "price_minor": 180000}, {"cabin_type_id": "00000000-0000-4000-e100-000000000001", "adults": 2, "price_minor": 180000}]',
  540000, null, null, null, 'Terms', 'Six adults', 72)::text);
select pg_temp.as_user('00000000-0000-4000-a000-000000000040');
select throws_ok($$select public.accept_offer((select v::uuid from t where k = 'big'),
  (select jsonb_agg(jsonb_build_object('full_name', 'Guest ' || i, 'date_of_birth', '1975-01-01')) from generate_series(1, 6) i), true)$$,
  '23514', null, 'three cabins can''t be taken when two are left');
select is((select count(*)::int from public.reservations), 1, 'and nothing was booked');

select * from finish();
rollback;
