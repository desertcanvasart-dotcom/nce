-- ADR-073: an invited person sees which company is inviting them before accepting.
create or replace function app.invited_to(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.org_invitations i
    where i.org_id = target and i.email = lower(coalesce(auth.jwt() ->> 'email', ''))
      and i.accepted_at is null and i.revoked_at is null and i.expires_at > now()
  );
$$;
grant execute on function app.invited_to(uuid) to authenticated;

create policy "organisations: invitees read the inviting company" on public.organisations for select to authenticated
  using (app.invited_to(id));
