-- Hosted Supabase grants every privilege (TRUNCATE included) to anon and authenticated on new tables,
-- and the local Docker stack does not. RLS blocked every row, but TRUNCATE bypasses RLS, so privileges
-- are reset here to exactly the intended set (ADR-056, ADR-061). Checked after every deploy by
-- scripts/check-grants.sql and locally by supabase/tests/060_privileges.sql.

revoke all on all tables in schema public from anon, authenticated, service_role;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated;

grant select on public.vessels, public.vessel_translations, public.destinations, public.destination_translations,
  public.media, public.media_translations to anon;

grant select, insert, update, delete on public.profiles, public.organisations, public.memberships, public.vessels,
  public.vessel_private, public.vessel_translations, public.destinations, public.destination_translations,
  public.media, public.media_translations to authenticated, service_role;
grant select on public.audit_log to authenticated, service_role;

-- New tables start closed whichever admin role creates them; each migration grants what its table needs.
alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated, service_role;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated, service_role;
alter default privileges for role postgres in schema public revoke all on functions from anon, authenticated, service_role;
