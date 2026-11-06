-- Public starting prices in euros, rates for your dates, saved quotes and price alerts (ADR-109).
begin;
select plan(14);

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

insert into public.vessels (id, slug, name, type, visibility, published_at, operator_org_id, is_sample) values
  ('00000000-0000-4000-e600-000000000001', 'sample-euro-ship', 'Sample Euro Ship', 'motor', 'published', now(), '00000000-0000-4000-b000-00000000000a', true);

-- ── Safe defaults ────────────────────────────────────────────────────────────────────────────────────────────
select is((select public_price_mode::text from public.vessels where id = '00000000-0000-4000-e600-000000000001'), 'on_request',
  'a new vessel shows "Price on request"');
select is((select operator_price_approved from public.vessels where id = '00000000-0000-4000-e600-000000000001'), false,
  'and has no operator approval');
select is((select rate_display_after_request::text from public.vessels where id = '00000000-0000-4000-e600-000000000001'),
  'offer_by_adviser', 'and a rate for given dates comes as an adviser''s offer');
select is((select count(*)::int from public.vessels where indicative_currency = 'USD'), 0, 'no US-dollar guide price is left');

-- ── Complete or nothing; euros only ──────────────────────────────────────────────────────────────────────────
select throws_ok($$ update public.vessels set public_price_mode = 'from_price' where id = '00000000-0000-4000-e600-000000000001' $$,
  '23514', null, 'a "from" price needs its amount, basis and the date it was last checked');
select throws_ok($$ update public.vessels set price_currency = 'USD' where id = '00000000-0000-4000-e600-000000000001' $$,
  '23514', null, 'the public selling currency is the euro');
select throws_ok($$ update public.vessels set public_price_mode = 'price_band', price_band_min_minor = 200000, price_band_max_minor = 100000,
  price_basis = 'per_person_per_trip', price_last_checked = current_date where id = '00000000-0000-4000-e600-000000000001' $$,
  '23514', null, 'a band runs from low to high');
select lives_ok($$ update public.vessels set public_price_mode = 'from_price', from_price_minor = 112000, price_basis = 'per_person_per_trip',
  price_last_checked = current_date, operator_price_approved = true where id = '00000000-0000-4000-e600-000000000001' $$,
  'an admin (or the service) sets an approved euro starting price');

-- ── Only catalogue admins set it ─────────────────────────────────────────────────────────────────────────────
select pg_temp.as_user('00000000-0000-4000-a000-000000000010');
select throws_ok($$ update public.vessels set from_price_minor = 90000 where id = '00000000-0000-4000-e600-000000000001' $$,
  '42501', null, 'an operator can''t change the public price');

-- ── Saved quotes: the traveller's own, an alert on a price change ────────────────────────────────────────────
select pg_temp.as_user('00000000-0000-4000-a000-000000000040');
select lives_ok($$ insert into public.saved_quotes (vessel_id, nights, departs_on, guests, price_alert)
  values ('00000000-0000-4000-e600-000000000001', 4, current_date + 60, 2, true) $$, 'a traveller saves a quote with an alert');
select throws_ok($$ insert into public.saved_quotes (user_id, vessel_id) values
  ('00000000-0000-4000-a000-000000000011', '00000000-0000-4000-e600-000000000001') $$, '42501', null,
  'and never in someone else''s name');
select pg_temp.as_user('00000000-0000-4000-a000-000000000011');
select is((select count(*)::int from public.saved_quotes), 0, 'others can''t read it');

select pg_temp.as_postgres();
update public.vessels set from_price_minor = 118000 where id = '00000000-0000-4000-e600-000000000001';
select is((select count(*)::int from public.notifications where user_id = '00000000-0000-4000-a000-000000000040' and kind = 'price.changed'),
  1, 'a change to the public price alerts the traveller');
update public.vessels set name = 'Sample Euro Ship, renamed' where id = '00000000-0000-4000-e600-000000000001';
select is((select count(*)::int from public.notifications where user_id = '00000000-0000-4000-a000-000000000040' and kind = 'price.changed'),
  1, 'other changes don''t');

select * from finish();
rollback;
