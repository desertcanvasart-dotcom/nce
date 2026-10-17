-- Append-only audit log (SEC-010). Rows are written only by app.log_event() and the audit triggers.

create table public.audit_log (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  actor_id uuid,
  action text not null check (action ~ '^[a-z_]+\.[a-z_]+$'),
  table_name text,
  row_id text,
  old_data jsonb,
  new_data jsonb,
  context jsonb not null default '{}'::jsonb
);
create index audit_log_row_idx on public.audit_log (table_name, row_id);
create index audit_log_actor_idx on public.audit_log (actor_id);

create or replace function app.audit_log_is_append_only() returns trigger
language plpgsql as $$
begin
  raise exception 'audit_log is append-only' using errcode = '42501';
end $$;
create trigger audit_log_no_update before update or delete on public.audit_log
  for each row execute function app.audit_log_is_append_only();
create trigger audit_log_no_truncate before truncate on public.audit_log
  for each statement execute function app.audit_log_is_append_only();

alter table public.audit_log enable row level security;
create policy "audit_log: admins read" on public.audit_log for select to authenticated using (app.is_admin());
revoke insert, update, delete, truncate on public.audit_log from anon, authenticated, service_role;
revoke all on sequence public.audit_log_id_seq from anon, authenticated;

create or replace function app.log_event(action text, table_name text default null, row_id text default null,
  old_data jsonb default null, new_data jsonb default null, context jsonb default '{}'::jsonb) returns bigint
language plpgsql security definer set search_path = '' as $$
declare
  new_id bigint;
begin
  insert into public.audit_log (actor_id, action, table_name, row_id, old_data, new_data, context)
  values (auth.uid(), action, table_name, row_id, old_data, new_data, coalesce(context, '{}'::jsonb))
  returning id into new_id;
  return new_id;
end $$;
revoke execute on function app.log_event(text, text, text, jsonb, jsonb, jsonb) from public, anon;
grant execute on function app.log_event(text, text, text, jsonb, jsonb, jsonb) to authenticated, service_role;

-- Generic row trigger. Records which columns changed and their values.
create or replace function app.audit_row() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  old_j jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  new_j jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
  rid text := coalesce(new_j ->> 'id', old_j ->> 'id', new_j ->> 'vessel_id', old_j ->> 'vessel_id',
                       concat_ws(':', coalesce(new_j, old_j) ->> 'org_id', coalesce(new_j, old_j) ->> 'user_id'));
begin
  if tg_op = 'UPDATE' and old_j - 'updated_at' = new_j - 'updated_at' then
    return new; -- nothing but the timestamp changed
  end if;
  perform app.log_event(tg_table_name || '.' || lower(tg_op), tg_table_name, rid, old_j, new_j);
  return coalesce(new, old);
end $$;

-- Profiles: only role changes are logged, so names and languages stay out of the log.
create or replace function app.audit_profile_roles() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.platform_role is distinct from old.platform_role or new.admin_role is distinct from old.admin_role then
    perform app.log_event('profiles.role_change', 'profiles', new.id::text,
      jsonb_build_object('platform_role', old.platform_role, 'admin_role', old.admin_role),
      jsonb_build_object('platform_role', new.platform_role, 'admin_role', new.admin_role));
  end if;
  return new;
end $$;

create trigger audit_profiles after update on public.profiles for each row execute function app.audit_profile_roles();
create trigger audit_organisations after insert or update or delete on public.organisations for each row execute function app.audit_row();
create trigger audit_memberships after insert or update or delete on public.memberships for each row execute function app.audit_row();
create trigger audit_vessels after insert or update or delete on public.vessels for each row execute function app.audit_row();
create trigger audit_vessel_private after insert or update or delete on public.vessel_private for each row execute function app.audit_row();
create trigger audit_destinations after insert or update or delete on public.destinations for each row execute function app.audit_row();
create trigger audit_media after insert or update or delete on public.media for each row execute function app.audit_row();
