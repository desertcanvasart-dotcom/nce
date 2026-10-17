-- ADR-070 scoring in the database, and who can read evaluations, ratings and safety notes (DASH-ADM-026–034).
begin;
select plan(14);

create function pg_temp.as_user(uid uuid, aal text default 'aal1') returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated', 'aal', aal)::text, true);
end $$;
create function pg_temp.scores(v numeric) returns jsonb language sql as $$
  select jsonb_build_object('hygiene', jsonb_build_array(v,v,v,v), 'service', jsonb_build_array(v,v,v,v),
    'food', jsonb_build_array(v,v,v,v), 'amenities', jsonb_build_array(v,v,v,v), 'management', jsonb_build_array(v,v,v,v),
    'cabin_vessel', jsonb_build_array(v,v,v,v), 'cruise_experience', jsonb_build_array(v,v,v,v));
$$;

-- Scoring: all fives = 100, all zeros = 0, a mixed vector matches the TypeScript test vector.
select is((select round(sum(value::numeric), 2) from jsonb_each_text(app.evaluation_results(1::smallint, pg_temp.scores(5)))), 100.00, 'all 5s score 100');
select is((select round(sum(value::numeric), 2) from jsonb_each_text(app.evaluation_results(1::smallint, pg_temp.scores(0)))), 0.00, 'all 0s score 0');
select is(
  app.evaluation_results(1::smallint, '{"hygiene":[5,4,4,3],"service":[4,4,3,3],"food":[5,5,4,4],"amenities":[3,3,2,2],"management":[4,3,3,4],"cabin_vessel":[4,4,4,3],"cruise_experience":[3,4,4,5]}'::jsonb),
  '{"hygiene":12.00,"service":14.00,"food":13.50,"amenities":5.00,"management":7.00,"cabin_vessel":15.00,"cruise_experience":8.00}'::jsonb,
  'dimension results: (sum ÷ 20) × weight');
select throws_ok($$select app.evaluation_results(1::smallint, '{"hygiene":[5,5,5]}'::jsonb)$$, '22023', null, 'missing criteria rejected');
select throws_ok($$select app.evaluation_results(1::smallint, (select jsonb_set(pg_temp.scores(3), '{food,0}', '6')))$$, '22023', null, 'a score above 5 is rejected');

-- As the super admin (two-step): write an unpublished and a published evaluation of the published sample vessel.
select pg_temp.as_user('00000000-0000-4000-a000-000000000001', 'aal2');
insert into public.evaluations (id, vessel_id, assessed_on, evaluator, verdict, scores) values
  ('00000000-0000-4000-e000-000000000001', '00000000-0000-4000-8000-000000000001', '2026-10-01', 'Sample team', 'recommended', pg_temp.scores(4)),
  ('00000000-0000-4000-e000-000000000002', '00000000-0000-4000-8000-000000000001', '2026-09-01', 'Sample team', 'recommended', pg_temp.scores(3));
update public.evaluations set published = true, published_at = now() where id = '00000000-0000-4000-e000-000000000001';
select is((select overall_score from public.evaluations where id = '00000000-0000-4000-e000-000000000001'), 80.00, 'the database stores the overall score');
insert into public.safety_observations (vessel_id, observed_on, notes) values ('00000000-0000-4000-8000-000000000001', '2026-10-01', 'Sample observation');
insert into public.external_ratings (vessel_id, source_name, rating, scale, retrieved_on) values ('00000000-0000-4000-8000-000000000001', 'Sample source', 4.5, 5, '2026-10-01');

-- Anonymous visitors: only the published evaluation; safety notes refused.
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select results_eq('select id::text from public.evaluations', array['00000000-0000-4000-e000-000000000001'], 'anon reads only the published evaluation');
select throws_ok('select 1 from public.safety_observations', '42501', null, 'anon cannot read safety observations');
select isnt_empty('select 1 from public.external_ratings', 'external ratings of a visible vessel are public');

-- The operator of that vessel: the published evaluation only, no safety notes.
reset role;
select pg_temp.as_user('00000000-0000-4000-a000-000000000010');
select results_eq('select count(*)::int from public.evaluations', array[1], 'operator reads only published evaluations');
select is_empty('select 1 from public.safety_observations', 'operator reads no safety observations');

-- A finance admin can read but not write; a catalogue admin can write.
reset role;
select set_config('request.jwt.claims', '', true); -- setup as the database owner, not as the last user
update public.profiles set platform_role = 'admin', admin_role = 'finance' where id = '00000000-0000-4000-a000-000000000040';
select pg_temp.as_user('00000000-0000-4000-a000-000000000040', 'aal2');
select results_eq('select count(*)::int from public.evaluations', array[2], 'finance admin reads all evaluations');
select throws_ok($$insert into public.evaluations (vessel_id, assessed_on, evaluator, verdict, scores)
  values ('00000000-0000-4000-8000-000000000001', '2026-10-01', 'X', 'recommended', pg_temp.scores(4))$$, '42501', null, 'finance admin cannot write evaluations');
reset role;
select pg_temp.as_user('00000000-0000-4000-a000-000000000002', 'aal2');
select lives_ok($$update public.evaluations set evaluator = 'Sample team B' where id = '00000000-0000-4000-e000-000000000002'$$, 'catalogue admin edits evaluations');

select * from finish();
rollback;
