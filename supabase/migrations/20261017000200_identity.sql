-- Accounts, organisations and team roles (DASH-ROLE-*, ARCHITECTURE §4).

create type public.platform_role as enum ('customer', 'admin');
create type public.admin_role as enum ('super', 'catalogue', 'finance', 'content');
create type public.org_kind as enum ('operator', 'partner', 'nilecruz');
create type public.org_status as enum ('applied', 'approved', 'paused', 'rejected');
create type public.team_role as enum ('owner', 'reservations', 'finance', 'viewer');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  locale public.locale_code not null default 'en',
  platform_role public.platform_role not null default 'customer',
  admin_role public.admin_role,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_role_only_for_admins check (admin_role is null or platform_role = 'admin')
);
create trigger profiles_updated_at before update on public.profiles for each row execute function app.set_updated_at();

create table public.organisations (
  id uuid primary key default gen_random_uuid(),
  kind public.org_kind not null,
  status public.org_status not null default 'applied',
  display_name text not null check (length(trim(display_name)) > 0),
  legal_name text,
  registration jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger organisations_updated_at before update on public.organisations for each row execute function app.set_updated_at();

create table public.memberships (
  org_id uuid not null references public.organisations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  team_role public.team_role not null,
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);
create index memberships_user_idx on public.memberships (user_id);

-- Every new sign-up gets a customer profile. Roles are raised only by admins (audited).
create or replace function app.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name, locale)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'locale', ''), 'en')::public.locale_code
  );
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function app.handle_new_user();

-- Access helpers used by every policy. SECURITY DEFINER so they can read memberships without recursion.
create or replace function app.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.platform_role = 'admin');
$$;

create or replace function app.my_org_ids() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select m.org_id from public.memberships m where m.user_id = auth.uid();
$$;

create or replace function app.has_org_role(target_org uuid, roles public.team_role[]) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships m
    where m.user_id = auth.uid() and m.org_id = target_org and m.team_role = any (roles)
  );
$$;

grant execute on function app.is_admin(), app.my_org_ids(), app.has_org_role(uuid, public.team_role[]) to anon, authenticated, service_role;

-- RLS (SEC-001). Writes beyond these go through audited server functions in later batches.
alter table public.profiles enable row level security;
alter table public.organisations enable row level security;
alter table public.memberships enable row level security;

create policy "profiles: read own, or admin" on public.profiles for select to authenticated
  using (id = auth.uid() or app.is_admin());
create policy "profiles: update own" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles: admin manages" on public.profiles for all to authenticated
  using (app.is_admin()) with check (app.is_admin());
-- A person may change their name and language, never their own role.
create or replace function app.guard_profile_roles() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (new.platform_role is distinct from old.platform_role or new.admin_role is distinct from old.admin_role)
     and auth.uid() is not null and not app.is_admin() then
    raise exception 'Only Nilecruz admins can change roles' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger profiles_guard_roles before update on public.profiles
  for each row execute function app.guard_profile_roles();

create policy "organisations: members and admins read" on public.organisations for select to authenticated
  using (app.is_admin() or id in (select app.my_org_ids()));
create policy "organisations: admin manages" on public.organisations for all to authenticated
  using (app.is_admin()) with check (app.is_admin());

create policy "memberships: own, org owners, admins read" on public.memberships for select to authenticated
  using (user_id = auth.uid() or app.is_admin() or app.has_org_role(org_id, array['owner']::public.team_role[]));
create policy "memberships: admin manages" on public.memberships for all to authenticated
  using (app.is_admin()) with check (app.is_admin());
