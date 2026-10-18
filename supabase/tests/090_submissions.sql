-- Submissions workflow (DASH-ADM-035–041, DASH-OPR-006/007): states, locks, decisions.
begin;
select plan(15);

create function pg_temp.as_user(uid uuid, aal text default 'aal1') returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated', 'aal', aal)::text, true);
end $$;

-- Operator A owner (approved company) drafts a new vessel.
select pg_temp.as_user('00000000-0000-4000-a000-000000000010');
select lives_ok($$insert into public.vessel_submissions (id, org_id, proposal) values
  ('00000000-0000-4000-f000-000000000001', '00000000-0000-4000-b000-00000000000a',
   '{"name":"Sample Proposed Ship","type":"motor","cabin_count":"30","description_en":"Sample description."}')$$, 'owner drafts a new vessel');
select throws_ok($$insert into public.vessel_submissions (org_id, status, proposal) values
  ('00000000-0000-4000-b000-00000000000a', 'approved', '{}')$$, '42501', null, 'a submission cannot start approved');
select lives_ok($$select public.submit_submission('00000000-0000-4000-f000-000000000001')$$, 'owner submits');
select results_eq($$with u as (update public.vessel_submissions set proposal = '{"name":"Changed"}' where id = '00000000-0000-4000-f000-000000000001' returning 1) select count(*)::int from u$$,
  array[0], 'a submitted proposal cannot be edited');
select throws_ok($$select public.approve_submission('00000000-0000-4000-f000-000000000001', 'x')$$, '42501', null, 'operators cannot approve');

-- Operator B (company only applied) cannot submit anything; a viewer cannot draft.
select pg_temp.as_user('00000000-0000-4000-a000-000000000020');
select throws_ok($$insert into public.vessel_submissions (org_id, proposal) values ('00000000-0000-4000-b000-00000000000b', '{}')$$,
  '42501', null, 'a company awaiting approval cannot submit');
select pg_temp.as_user('00000000-0000-4000-a000-000000000013');
select throws_ok($$insert into public.vessel_submissions (org_id, proposal) values ('00000000-0000-4000-b000-00000000000a', '{}')$$,
  '42501', null, 'a viewer cannot draft');

-- Catalogue admin requests changes (a note is required); the operator edits and resubmits.
select pg_temp.as_user('00000000-0000-4000-a000-000000000002', 'aal2');
select throws_ok($$select public.request_submission_changes('00000000-0000-4000-f000-000000000001', '  ')$$, '22023', null, 'changes need a note');
select lives_ok($$select public.request_submission_changes('00000000-0000-4000-f000-000000000001', 'Add the deck count.')$$, 'admin requests changes');
select pg_temp.as_user('00000000-0000-4000-a000-000000000010');
select lives_ok($$update public.vessel_submissions set proposal = proposal || '{"deck_count":"4"}' where id = '00000000-0000-4000-f000-000000000001'$$, 'operator edits after feedback');
select lives_ok($$select public.submit_submission('00000000-0000-4000-f000-000000000001')$$, 'operator resubmits');

-- Approval creates the vessel as a private draft of the operator, with the history kept.
select pg_temp.as_user('00000000-0000-4000-a000-000000000002', 'aal2');
select lives_ok($$select public.approve_submission('00000000-0000-4000-f000-000000000001', 'sample-proposed-ship')$$, 'admin approves');
reset role;
select results_eq($$select visibility::text || ':' || operator_org_id::text || ':' || deck_count from public.vessels where slug = 'sample-proposed-ship'$$,
  array['private:00000000-0000-4000-b000-00000000000a:4'], 'approved proposal became a private draft of the operator');
select is((select array_agg(event::text order by id) from public.vessel_submission_events where submission_id = '00000000-0000-4000-f000-000000000001'),
  array['created','submitted','changes_requested','edited','submitted','approved'], 'the full history is recorded');

-- A vessel under review is locked against ordinary editing, even for admins.
select pg_temp.as_user('00000000-0000-4000-a000-000000000010');
insert into public.vessel_submissions (id, org_id, vessel_id, proposal) values
  ('00000000-0000-4000-f000-000000000002', '00000000-0000-4000-b000-00000000000a', '00000000-0000-4000-8000-000000000003', '{"cabin_count":"22"}');
select public.submit_submission('00000000-0000-4000-f000-000000000002');
select pg_temp.as_user('00000000-0000-4000-a000-000000000001', 'aal2');
select throws_ok($$update public.vessels set cabin_count = 25 where id = '00000000-0000-4000-8000-000000000003'$$, '42501', null,
  'a vessel under review cannot be edited directly');

select * from finish();
rollback;
