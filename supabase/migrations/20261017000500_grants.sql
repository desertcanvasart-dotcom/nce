-- Table privileges, granted explicitly (Supabase no longer grants them by default).
-- Privileges say which statements a role may attempt; the RLS policies decide which rows.

grant select on public.vessels, public.vessel_translations, public.destinations, public.destination_translations,
  public.media, public.media_translations to anon;

grant select, insert, update, delete on public.profiles, public.organisations, public.memberships, public.vessels,
  public.vessel_private, public.vessel_translations, public.destinations, public.destination_translations,
  public.media, public.media_translations to authenticated;
grant select on public.audit_log to authenticated;

-- Server jobs (imports, webhooks) run as service_role, which bypasses RLS. The audit log stays insert-by-function only.
grant select, insert, update, delete on public.profiles, public.organisations, public.memberships, public.vessels,
  public.vessel_private, public.vessel_translations, public.destinations, public.destination_translations,
  public.media, public.media_translations to service_role;
grant select on public.audit_log to service_role;

-- Tables added later must grant their own privileges in their migration.
alter default privileges in schema public revoke all on tables from anon, authenticated, service_role;
