-- Batch 9-2a (EXP-005, EXP-002): a vessel's mooring practice and shared spaces, proposed by its operator and applied
-- when Nilecruz approves; only known spaces are stored; travellers can read them on published vessels.
begin;
select plan(6);

create function pg_temp.as_user(uid uuid, aal text default 'aal1') returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated', 'aal', aal)::text, true);
end $$;

-- Operator A proposes how its existing vessel moors and what its guests share.
select pg_temp.as_user('00000000-0000-4000-a000-000000000010');
insert into public.vessel_submissions (id, org_id, vessel_id, proposal) values
  ('00000000-0000-4000-f900-000000000001', '00000000-0000-4000-b000-00000000000a', '00000000-0000-4000-8000-000000000003',
   '{"mooring":"rafted","shared_spaces":"sun_deck,pool,dining_room"}');
select public.submit_submission('00000000-0000-4000-f900-000000000001');
select pg_temp.as_user('00000000-0000-4000-a000-000000000002', 'aal2');
select lives_ok($$ select public.approve_submission('00000000-0000-4000-f900-000000000001') $$, 'admin approves the proposal');
reset role;
select results_eq($$ select mooring::text, shared_spaces from public.vessels where id = '00000000-0000-4000-8000-000000000003' $$,
  $$ values ('rafted'::text, '{sun_deck,pool,dining_room}'::text[]) $$, 'the mooring and the shared spaces are applied');

-- A later proposal that leaves them out keeps them.
select pg_temp.as_user('00000000-0000-4000-a000-000000000010');
insert into public.vessel_submissions (id, org_id, vessel_id, proposal) values
  ('00000000-0000-4000-f900-000000000002', '00000000-0000-4000-b000-00000000000a', '00000000-0000-4000-8000-000000000003',
   '{"cabin_count":"22","mooring":"","shared_spaces":""}');
select public.submit_submission('00000000-0000-4000-f900-000000000002');
select pg_temp.as_user('00000000-0000-4000-a000-000000000002', 'aal2');
select public.approve_submission('00000000-0000-4000-f900-000000000002');
reset role;
select results_eq($$ select mooring::text, cardinality(shared_spaces) from public.vessels where id = '00000000-0000-4000-8000-000000000003' $$,
  $$ values ('rafted'::text, 3) $$, 'a proposal without them keeps what the vessel had');

-- Only known spaces and practices are stored.
select throws_ok($$ update public.vessels set shared_spaces = '{sun_deck,casino}' where id = '00000000-0000-4000-8000-000000000003' $$,
  '23514', null, 'an unknown shared space is refused');
select throws_ok($$ update public.vessels set mooring = 'anchored' where id = '00000000-0000-4000-8000-000000000003' $$,
  '22P02', null, 'an unknown mooring practice is refused');

-- Travellers read them on a published vessel.
update public.vessels set visibility = 'published', published_at = now() where id = '00000000-0000-4000-8000-000000000003';
set local role anon;
select is((select mooring::text from public.vessels where id = '00000000-0000-4000-8000-000000000003'), 'rafted',
  'a visitor sees how a published vessel moors');

select * from finish();
rollback;
