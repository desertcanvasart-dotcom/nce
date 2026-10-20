-- Batch 4h-1 travel partners (DASH-ADM-086–089, DASH-B2B-001, 002, 009–012, ADR-092).
begin;
select plan(24);

create function pg_temp.as_user(uid uuid, aal text default 'aal1') returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated', 'aal', aal)::text, true);
end $$;
create function pg_temp.as_anon() returns void language plpgsql as $$
begin
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claims', '{"role": "anon"}', true);
end $$;
create function pg_temp.as_postgres() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '', true);
  perform set_config('role', 'postgres', true);
end $$;

-- A bookable sailing on Operator A's vessel with a public, a trade and a company rate (Sample Partner: …c1).
update public.vessels set visibility = 'published', published_at = now() where id = '00000000-0000-4000-8000-000000000003';
insert into public.cabin_types (id, vessel_id, code, name, deck, max_occupancy) values
  ('00000000-0000-4000-f100-000000000001', '00000000-0000-4000-8000-000000000003', 'DBL', 'Double', 'Main', 2);
insert into public.schedules (id, vessel_id, code, origin, destination, nights, sailing_days) values
  ('00000000-0000-4000-f200-000000000001', '00000000-0000-4000-8000-000000000003', 'TP4', 'Trade Port', 'Trade Harbour', 4, '{1,2,3,4,5,6,7}');
insert into public.departures (id, schedule_id, vessel_id, departs_on, returns_on) values
  ('00000000-0000-4000-f300-000000000001', '00000000-0000-4000-f200-000000000001', '00000000-0000-4000-8000-000000000003', current_date + 40, current_date + 44);
insert into public.inventory (departure_id, cabin_type_id, vessel_id, available) values
  ('00000000-0000-4000-f300-000000000001', '00000000-0000-4000-f100-000000000001', '00000000-0000-4000-8000-000000000003', 3);
insert into public.cancellation_policies (vessel_id, bands) values ('00000000-0000-4000-8000-000000000003', '[{"from_days": 0, "percent": 100}]');
insert into public.rates (departure_id, cabin_type_id, vessel_id, occupancy, rate_plan, currency, amount_minor) values
  ('00000000-0000-4000-f300-000000000001', '00000000-0000-4000-f100-000000000001', '00000000-0000-4000-8000-000000000003', 2, 'international', 'USD', 100000),
  ('00000000-0000-4000-f300-000000000001', '00000000-0000-4000-f100-000000000001', '00000000-0000-4000-8000-000000000003', 2, 'trade', 'USD', 80000),
  ('00000000-0000-4000-f300-000000000001', '00000000-0000-4000-f100-000000000001', '00000000-0000-4000-8000-000000000003', 1, 'international', 'USD', 150000);
-- A second approved agency, owned by the seeded Operator B owner (people can belong to several companies).
insert into public.organisations (id, kind, status, display_name) values ('00000000-0000-4000-b000-0000000000c2', 'partner', 'approved', 'Second Agency');
insert into public.memberships (org_id, user_id, team_role) values ('00000000-0000-4000-b000-0000000000c2', '00000000-0000-4000-a000-000000000020', 'owner');
create temp table t (k text primary key, v text) on commit drop;
grant select, insert on t to authenticated;

-- Company rates: only for partner companies; written by the operator's product editors (DASH-B2B-012).
select pg_temp.as_user('00000000-0000-4000-a000-000000000010');
select throws_ok($$insert into public.partner_rates (partner_org_id, departure_id, cabin_type_id, vessel_id, occupancy, currency, amount_minor)
  values ('00000000-0000-4000-b000-00000000000a', '00000000-0000-4000-f300-000000000001', '00000000-0000-4000-f100-000000000001',
  '00000000-0000-4000-8000-000000000003', 2, 'USD', 70000)$$, '23514', null, 'a company rate is for a travel partner, not an operator');
select lives_ok($$insert into public.partner_rates (partner_org_id, departure_id, cabin_type_id, vessel_id, occupancy, currency, amount_minor)
  values ('00000000-0000-4000-b000-0000000000c1', '00000000-0000-4000-f300-000000000001', '00000000-0000-4000-f100-000000000001',
  '00000000-0000-4000-8000-000000000003', 2, 'USD', 70000)$$, 'the operator sets a rate for one agency');
select ok((select child_bands <> '[]'::jsonb from public.partner_rates where partner_org_id = '00000000-0000-4000-b000-0000000000c1'),
  'it takes the operator''s child bands');
select is((select count(*)::int from public.approved_partners()), 2, 'operators see approved agencies by name');

-- Nobody else reads trade or company rates.
select pg_temp.as_anon();
select throws_ok($$select count(*) from public.rates where rate_plan = 'trade'$$, '42501', null, 'the public can''t read rates at all');
select pg_temp.as_user('00000000-0000-4000-a000-000000000040');
select is((select count(*)::int from public.rates where rate_plan = 'trade') + (select count(*)::int from public.partner_rates), 0,
  'a customer sees no trade or company rate');
select is((select count(*)::int from public.approved_partners()), 0, 'nor the list of agencies');
select pg_temp.as_user('00000000-0000-4000-a000-000000000030');
select is((select count(*)::int from public.partner_rates) + (select count(*)::int from public.rates), 0,
  'a partner never reads the rate tables directly');

-- Search: company rate first, then trade, then public (ADR-092).
select is((select array_agg(tier || ':' || amount_minor order by occupancy) from public.partner_search('00000000-0000-4000-b000-0000000000c1',
  current_date, current_date + 60)), array['public:150000', 'company:70000'], 'Sample Partner gets its company rate, and the public rate for a single');
select pg_temp.as_user('00000000-0000-4000-a000-000000000020');
select is((select array_agg(tier || ':' || amount_minor order by occupancy) from public.partner_search('00000000-0000-4000-b000-0000000000c2',
  current_date, current_date + 60)), array['public:150000', 'trade:80000'], 'another agency gets the trade rate, never the first one''s');
select throws_ok($$select * from public.partner_search('00000000-0000-4000-b000-0000000000c1', current_date, current_date + 60)$$, '42501', null,
  'nor can it search as the first agency');
select pg_temp.as_user('00000000-0000-4000-a000-000000000031');
select lives_ok($$select * from public.partner_search('00000000-0000-4000-b000-0000000000c1', current_date, current_date + 60)$$,
  'a reservations user searches');
select pg_temp.as_user('00000000-0000-4000-a000-000000000032');
select throws_ok($$select * from public.partner_search('00000000-0000-4000-b000-0000000000c1', current_date, current_date + 60)$$, '42501', null,
  'a finance user doesn''t (DASH-B2B-010)');
select pg_temp.as_user('00000000-0000-4000-a000-000000000010');
select throws_ok($$select * from public.partner_search('00000000-0000-4000-b000-0000000000c1', current_date, current_date + 60)$$, '42501', null,
  'an operator can''t search as a partner (DASH-ADM-089)');

-- Applying, approval and pausing (DASH-ADM-086–088, DASH-B2B-011).
select pg_temp.as_user('00000000-0000-4000-a000-000000000040');
select throws_ok($$select public.apply_as_partner('New Agency', null, '{"country": "Spain", "registration_number": "", "contact_name": "Ana", "contact_phone": "+34 600"}')$$,
  '22023', null, 'the registration number is required');
select lives_ok($$insert into t values ('new', public.apply_as_partner('New Agency', 'New Agency SL',
  '{"country": "Spain", "registration_number": "CIAN-1234", "contact_name": "Ana", "contact_phone": "+34 600 000 000"}')::text)$$,
  'a customer applies as a travel partner');
select throws_ok($$select public.apply_as_partner('Again', null, '{"country": "Spain", "registration_number": "X", "contact_name": "A", "contact_phone": "+34 6"}')$$,
  '23505', null, 'one application at a time');
select throws_ok($$select * from public.partner_search((select v::uuid from t where k = 'new'), current_date, current_date + 60)$$, '42501', null,
  'an agency awaiting approval can''t search');
select pg_temp.as_postgres();
select is((select status::text || '/' || (registration ->> 'registration_number') from public.organisations where id = (select v::uuid from t where k = 'new')),
  'applied/CIAN-1234', 'it waits for approval with its registration details');
update public.organisations set status = 'approved' where id = (select v::uuid from t where k = 'new');
select pg_temp.as_user('00000000-0000-4000-a000-000000000040');
select is((select count(*)::int from public.partner_search((select v::uuid from t where k = 'new'), current_date, current_date + 60)), 2,
  'once approved, its owner searches');
select pg_temp.as_postgres();
update public.organisations set status = 'paused' where id = '00000000-0000-4000-b000-0000000000c1';
select pg_temp.as_user('00000000-0000-4000-a000-000000000031');
select throws_ok($$select * from public.partner_search('00000000-0000-4000-b000-0000000000c1', current_date, current_date + 60)$$, '42501', null,
  'a paused agency can''t search');
select pg_temp.as_postgres();
select is((select count(*)::int from public.memberships where org_id = '00000000-0000-4000-b000-0000000000c1'), 3, 'and keeps its team and records');

-- Partner teams: owner, reservations and finance only (DASH-B2B-010).
select throws_ok($$insert into public.memberships (org_id, user_id, team_role) values ('00000000-0000-4000-b000-0000000000c2', '00000000-0000-4000-a000-000000000040', 'viewer')$$,
  '23514', null, 'no viewers in a partner team');
select throws_ok($$insert into public.org_invitations (org_id, email, team_role) values ('00000000-0000-4000-b000-0000000000c2', 'someone@example.test', 'viewer')$$,
  '23514', null, 'nor viewer invitations');

select * from finish();
rollback;
