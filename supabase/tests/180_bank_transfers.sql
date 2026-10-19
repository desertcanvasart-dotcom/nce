-- Batch 4f-2b: bank-transfer details as a finance-admin setting (CONTENT-NEEDED #5); airport transfers private only.
begin;
select plan(9);

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

-- Bank details: finance admins with two-step write; signed-in customers read (they pay with them).
select pg_temp.as_user('00000000-0000-4000-a000-000000000040');
select throws_ok($$select public.save_bank_details('{"holder": "Sample Holder", "bank": "Sample Bank"}')$$, '42501', null,
  'customers can''t change the bank details');
select pg_temp.as_user('00000000-0000-4000-a000-000000000002', 'aal2');
select throws_ok($$select public.save_bank_details('{"holder": "Sample Holder", "bank": "Sample Bank"}')$$, '42501', null,
  'nor can a catalogue admin');
select pg_temp.as_user('00000000-0000-4000-a000-000000000008', 'aal2');
select throws_ok($$select public.save_bank_details('{"holder": "Sample Holder", "bank": "Sample Bank", "password": "x"}')$$, '22023', null,
  'only the known fields');
select throws_ok($$select public.save_bank_details('{"holder": "Sample Holder"}')$$, '22023', null, 'the holder and the bank are required');
select lives_ok($$select public.save_bank_details('{"holder": "Sample Holder", "bank": "Sample Bank", "swift": "SAMPLEXX"}')$$,
  'a finance admin saves them');
select lives_ok($$select public.save_bank_details('{"holder": "Sample Holder", "bank": "Sample Bank", "iban": "SAMPLE-IBAN"}')$$,
  'and changes them later');
select pg_temp.as_user('00000000-0000-4000-a000-000000000040');
select is((select value ->> 'iban' from public.platform_settings where key = 'bank_transfer'), 'SAMPLE-IBAN', 'a customer reads them');

-- Airport transfers: private sessions only (Faris, 19 Oct 2026).
select pg_temp.as_postgres();
insert into public.tours (id, slug, kind, name, location, duration_minutes) values
  ('00000000-0000-4000-d900-000000000001', 'sample-airport-transfer', 'transfer', 'Sample Airport Private Transfer', 'Aswan', 40);
select throws_ok($$insert into public.tour_sessions (tour_id, starts_at, ends_at, kind, pricing, capacity, currency, price_minor) values
  ('00000000-0000-4000-d900-000000000001', now() + interval '3 days', now() + interval '3 days 1 hour', 'shared', 'per_guest', 10, 'USD', 2000)$$,
  '23514', null, 'a transfer can''t have a shared session');
select lives_ok($$insert into public.tour_sessions (tour_id, starts_at, ends_at, kind, pricing, capacity, currency, price_minor) values
  ('00000000-0000-4000-d900-000000000001', now() + interval '3 days', now() + interval '3 days 1 hour', 'private', 'per_group', 3, 'USD', 4000)$$,
  'a private one is fine');

select * from finish();
rollback;
