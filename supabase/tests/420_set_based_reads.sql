-- ADR-113: the set-based read rules allow exactly what the per-row functions allowed, for every row and every kind of
-- reader. The functions read the caller from the JWT, so each check sets the claims and compares old with new on every
-- row of the table (read as the owner, so nothing is filtered first).
begin;
select plan(13);

create function pg_temp.claims(uid uuid, aal text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    case when uid is null then '{"role":"anon"}'
         else json_build_object('sub', uid, 'role', 'authenticated', 'aal', aal)::text end, true);
end $$;

-- A private vessel of Operator A, so "their own organisation's" and "admins read everything" both matter.
update public.vessels set visibility = 'private'
where id = (select id from public.vessels where operator_org_id = '00000000-0000-4000-b000-00000000000a' order by slug limit 1);

-- Each row where the old function and the new set disagree; empty means they agree.
create function pg_temp.disagreements() returns table (what text, id uuid) language sql as $$
  select 'vessel', v.id from public.vessels v
  where app.can_read_vessel(v.id) is distinct from (v.id in (select app.readable_vessel_ids()))
  union all
  select 'public vessel', v.id from public.vessels v
  where app.vessel_is_public(v.id) is distinct from (v.id in (select app.public_vessel_ids()))
  union all
  select 'evaluation', e.id from public.evaluations e
  where app.evaluation_is_public(e.id) is distinct from (e.id in (select app.public_evaluation_ids()))
  union all
  select 'media', m.id from public.media m
  where app.can_read_media(m.id) is distinct from (m.id in (select app.readable_media_ids()))
$$;

select pg_temp.claims(null, null);
select is_empty('select * from pg_temp.disagreements()', 'visitors: the sets match the old checks on every row');
select pg_temp.claims('00000000-0000-4000-a000-000000000010', 'aal1');
select is_empty('select * from pg_temp.disagreements()', 'an operator: the sets match, including their private vessel');
select pg_temp.claims('00000000-0000-4000-a000-000000000020', 'aal1');
select is_empty('select * from pg_temp.disagreements()', 'another operator: the sets match');
select pg_temp.claims('00000000-0000-4000-a000-000000000001', 'aal2');
select is_empty('select * from pg_temp.disagreements()', 'an admin with two-step sign-in: the sets match');
select pg_temp.claims('00000000-0000-4000-a000-000000000001', 'aal1');
select is_empty('select * from pg_temp.disagreements()', 'an admin without two-step sign-in reads as a visitor would');

-- The test means something: the readers differ.
select pg_temp.claims('00000000-0000-4000-a000-000000000010', 'aal1');
select ok((select count(*) from app.readable_vessel_ids()) > (select count(*) from app.public_vessel_ids()),
  'an operator reads more vessels than the public (their private one)');
select pg_temp.claims('00000000-0000-4000-a000-000000000001', 'aal2');
select is((select count(*) from app.readable_vessel_ids()), (select count(*) from public.vessels),
  'an admin reads every vessel');

-- Through the policies themselves: a visitor sees exactly the rows the old functions allowed.
set local role anon;
select pg_temp.claims(null, null);
select is((select count(*) from public.departures),
  (select count(*) from public.departures d where d.vessel_id in (select app.public_vessel_ids())),
  'visitors: departures of visible vessels only');
select is((select count(*) from public.schedule_days),
  (select count(*)::bigint from public.schedule_days sd join public.schedules s on s.id = sd.schedule_id),
  'visitors: itinerary days follow their schedule');
select is_empty($$select 1 from public.vessels where visibility = 'private'$$, 'visitors: no private vessel');
select is_empty($$select 1 from public.departures d where d.vessel_id not in (select app.public_vessel_ids())$$,
  'visitors: no departure of a private vessel');

-- The rules run their check once per query, not once per row: no per-row call to the old functions is left.
reset role;
select is_empty($$select tablename, policyname from pg_policies
  where schemaname = 'public' and tablename in ('departures', 'schedules', 'cabin_types', 'media', 'media_translations',
    'vessel_translations', 'deck_plans', 'cancellation_policies', 'evaluations', 'external_ratings',
    'evaluation_translations', 'schedule_days', 'schedule_periods', 'schedule_translations', 'cabin_type_translations',
    'cancellation_policy_translations')
  and cmd = 'SELECT' and qual ~ '(can_read_product|can_read_vessel|can_read_media|vessel_is_public|evaluation_is_public)\('$$,
  'no catalogue read rule calls a per-row check');
select is(
  (select count(*)::int from pg_policies where schemaname = 'public' and cmd = 'SELECT'
     and qual ~ '(readable_vessel_ids|public_vessel_ids|public_evaluation_ids|readable_media_ids)\(\)'),
  16, 'all sixteen catalogue read rules use the sets');

select * from finish();
rollback;
