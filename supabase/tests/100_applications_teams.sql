-- Operator applications and team invitations (DASH-ADM-042/043, ADR-073, DASH-ROLE-007).
begin;
select plan(9);

create function pg_temp.as_user(uid uuid, email text, aal text default 'aal1') returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated', 'aal', aal, 'email', email)::text, true);
end $$;

-- The customer applies as an operator: an "applied" company with them as owner.
select pg_temp.as_user('00000000-0000-4000-a000-000000000040', 'customer@example.test');
select lives_ok($$select public.apply_as_operator('Sample Applicant Cruises', 'Sample Applicant LLC', '{"country":"EG"}')$$, 'a customer applies');
select results_eq($$select o.status::text || ':' || m.team_role::text from public.organisations o join public.memberships m on m.org_id = o.id
  where o.display_name = 'Sample Applicant Cruises'$$, array['applied:owner'], 'company is applied, applicant is owner');
select throws_ok($$select public.apply_as_operator('Second Try', null, null)$$, '23505', null, 'only one waiting application');

-- Operator A owner invites a reservations user; only that email can accept.
select pg_temp.as_user('00000000-0000-4000-a000-000000000010', 'owner@operator-a.test');
insert into public.org_invitations (id, org_id, email, team_role) values
  ('00000000-0000-4000-c100-000000000001', '00000000-0000-4000-b000-00000000000a', 'customer@example.test', 'reservations');
select throws_ok($$insert into public.org_invitations (org_id, email, team_role) values ('00000000-0000-4000-b000-00000000000a', 'x@example.test', 'owner')$$,
  '23514', null, 'nobody is invited as owner');
select pg_temp.as_user('00000000-0000-4000-a000-000000000031', 'reservations@partner.test');
select throws_ok($$select public.accept_invitation('00000000-0000-4000-c100-000000000001')$$, '42501', null, 'another person cannot accept');
select pg_temp.as_user('00000000-0000-4000-a000-000000000040', 'customer@example.test');
select lives_ok($$select public.accept_invitation('00000000-0000-4000-c100-000000000001')$$, 'the invited person accepts');
reset role;
select results_eq($$select team_role::text from public.memberships where org_id = '00000000-0000-4000-b000-00000000000a' and user_id = '00000000-0000-4000-a000-000000000040'$$,
  array['reservations'], 'membership created with the invited role');

-- The owner changes a staff role but never their own; staff cannot change roles.
select pg_temp.as_user('00000000-0000-4000-a000-000000000010', 'owner@operator-a.test');
select lives_ok($$update public.memberships set team_role = 'finance' where org_id = '00000000-0000-4000-b000-00000000000a' and user_id = '00000000-0000-4000-a000-000000000040'$$,
  'owner changes a staff role');
select pg_temp.as_user('00000000-0000-4000-a000-000000000011', 'reservations@operator-a.test');
select results_eq($$with u as (update public.memberships set team_role = 'owner' where user_id = '00000000-0000-4000-a000-000000000011' returning 1) select count(*)::int from u$$,
  array[0], 'staff cannot raise their own role');

select * from finish();
rollback;
