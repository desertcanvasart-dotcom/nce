-- Operator loop, Part B: vacancy sheets through the existing preview (ADR-099).
begin;
select plan(14);

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

-- Operator A's ship: two sailings. Standard on the first from manual data 10 days old; on the second, an operator's
-- answer from an hour ago (newer than any sheet).
insert into public.vessels (id, slug, name, type, visibility, published_at, operator_org_id, is_sample, cabin_count) values
  ('00000000-0000-4000-e300-000000000001', 'sample-sheet-ship', 'Sample Sheet Ship', 'motor', 'published', now(), '00000000-0000-4000-b000-00000000000a', true, 20);
insert into public.cabin_types (id, vessel_id, code, name, deck, max_occupancy) values
  ('00000000-0000-4000-e300-000000000002', '00000000-0000-4000-e300-000000000001', 'STD', 'Standard', 'Main', 2);
insert into public.schedules (id, vessel_id, code, origin, destination, nights, sailing_days) values
  ('00000000-0000-4000-e300-000000000003', '00000000-0000-4000-e300-000000000001', 'SH4', 'Luxor', 'Aswan', 4, '{1,2,3,4,5,6,7}');
insert into public.departures (id, schedule_id, vessel_id, departs_on, returns_on) values
  ('00000000-0000-4000-e300-000000000004', '00000000-0000-4000-e300-000000000003', '00000000-0000-4000-e300-000000000001', current_date + 20, current_date + 24),
  ('00000000-0000-4000-e300-000000000005', '00000000-0000-4000-e300-000000000003', '00000000-0000-4000-e300-000000000001', current_date + 27, current_date + 31);
insert into public.inventory (departure_id, cabin_type_id, vessel_id, available, confirmed_at, source) values
  ('00000000-0000-4000-e300-000000000004', '00000000-0000-4000-e300-000000000002', '00000000-0000-4000-e300-000000000001', 6, now() - interval '10 days', 'manual'),
  ('00000000-0000-4000-e300-000000000005', '00000000-0000-4000-e300-000000000002', '00000000-0000-4000-e300-000000000001', 1, now() - interval '1 hour', 'tap');

-- A sheet dated yesterday, read and mapped (one row still waiting for a name).
insert into public.sheet_ingests (id, org_id, channel, sender, status, sheet_date, rows, unmatched) values
  ('00000000-0000-4000-e300-000000000010', '00000000-0000-4000-b000-00000000000a', 'email', 'desk@operator-a.test', 'received', current_date - 1,
   jsonb_build_array(
     jsonb_build_object('vessel', 'sample-sheet-ship', 'date', current_date + 20, 'cabin', 'STD', 'available', 3, 'label', 'Sheet Ship · Standard'),
     jsonb_build_object('vessel', 'sample-sheet-ship', 'date', current_date + 27, 'cabin', 'STD', 'available', 4, 'label', 'Sheet Ship · Standard'),
     jsonb_build_object('unmapped', true, 'date', current_date + 20, 'available', 2, 'label', 'Sheet Ship · Deluxe', 'sheet_ship', 'Sheet Ship', 'sheet_cabin', 'Deluxe')),
   '[{"kind": "cabin", "name": "Deluxe", "vessel_slug": "sample-sheet-ship"}]');

-- Who may review.
select pg_temp.as_user('00000000-0000-4000-a000-000000000011');
select throws_ok($$ select public.preview_sheet('00000000-0000-4000-e300-000000000010') $$, '42501', null, 'an operator can''t review sheets');
select is((select count(*)::int from public.sheet_ingests), 1, 'the operator''s team sees its own sheets (for connection health)');
select pg_temp.as_user('00000000-0000-4000-a000-000000000020');
select is((select count(*)::int from public.sheet_ingests), 0, 'another operator sees none');

-- A catalogue admin previews: the existing checks, dry run; unmapped rows aren't sent.
select pg_temp.as_user('00000000-0000-4000-a000-000000000002', 'aal2');
select isnt(public.preview_sheet('00000000-0000-4000-e300-000000000010'), null, 'a catalogue admin previews the sheet');
select results_eq($$ select r.source::text, r.status::text, r.rows_received, r.rows_changed, r.rows_skipped from public.inventory_runs r
  join public.sheet_ingests s on s.run_id = r.id where s.id = '00000000-0000-4000-e300-000000000010' $$,
  $$ values ('sheet', 'previewed', 2, 1, 1) $$, 'two mapped rows: one changes, one is older than the operator''s latest answer');
select is((select available from public.inventory where departure_id = '00000000-0000-4000-e300-000000000004'), 6, 'previewing changes nothing');

-- Confirm: the sheet's row applies as source sheet, as of the sheet's date; the newer answer stays.
select is(public.confirm_sheet('00000000-0000-4000-e300-000000000010') ->> 'changed', '1', 'confirming applies the changed row');
select results_eq($$ select available, source::text, (confirmed_at at time zone 'Africa/Cairo')::date from public.inventory
  where departure_id = '00000000-0000-4000-e300-000000000004' $$,
  $$ values (3, 'sheet', current_date - 1) $$, 'sheet data, confirmed as of the sheet''s date');
select is((select available || ' ' || source from public.inventory where departure_id = '00000000-0000-4000-e300-000000000005'), '1 tap',
  'newer data is never overwritten by a sheet');
select is((select status::text from public.sheet_ingests where id = '00000000-0000-4000-e300-000000000010'), 'confirmed', 'the sheet is confirmed');
select is((select clean_imports from public.operator_settings where org_id = '00000000-0000-4000-b000-00000000000a'), 0::smallint,
  'a sheet with a name to map isn''t a clean import');

-- Auto-confirm needs 4 clean imports in a row, and only the service role confirms automatically.
select throws_ok($$ update public.operator_settings set sheet_auto_confirm = true where org_id = '00000000-0000-4000-b000-00000000000a' $$,
  '23514', null, 'auto-confirm can''t be switched on before 4 clean imports');
select pg_temp.as_postgres();
insert into public.sheet_ingests (id, org_id, channel, status, rows) values
  ('00000000-0000-4000-e300-000000000011', '00000000-0000-4000-b000-00000000000a', 'upload', 'received', '[]');
select pg_temp.as_user('00000000-0000-4000-a000-000000000002', 'aal2');
select public.preview_sheet('00000000-0000-4000-e300-000000000011');
select throws_ok($$ select public.confirm_sheet('00000000-0000-4000-e300-000000000011', true) $$, '42501', null,
  'a person can''t mark a confirmation automatic');
select lives_ok($$ select public.reject_sheet('00000000-0000-4000-e300-000000000011', 'Sample: wrong week') $$, 'a sheet can be rejected');

select * from finish();
rollback;
