-- SEC-015 / ADR-064: admin powers need a two-step session (assurance level aal2).
-- DASH-ROLE-008: admin sub-roles; only super admins change anyone's roles.

create or replace function app.session_aal() returns text
language sql stable as $$
  select coalesce(auth.jwt() ->> 'aal', 'aal1');
$$;

create or replace function app.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select app.session_aal() = 'aal2'
     and exists (select 1 from public.profiles p where p.id = auth.uid() and p.platform_role = 'admin');
$$;

create or replace function app.has_admin_role(roles public.admin_role[]) returns boolean
language sql stable security definer set search_path = '' as $$
  select app.session_aal() = 'aal2'
     and exists (
       select 1 from public.profiles p
       where p.id = auth.uid() and p.platform_role = 'admin' and p.admin_role = any (roles)
     );
$$;

grant execute on function app.session_aal(), app.has_admin_role(public.admin_role[]) to anon, authenticated, service_role;

create or replace function app.guard_profile_roles() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (new.platform_role is distinct from old.platform_role or new.admin_role is distinct from old.admin_role)
     and auth.uid() is not null
     and not app.has_admin_role(array['super']::public.admin_role[]) then
    raise exception 'Only super admins can change roles' using errcode = '42501';
  end if;
  return new;
end $$;
