-- Operator applications, team invitations, cruise submissions and CSV import batches
-- (DASH-ADM-035–044, DASH-OPR-006/007, DASH-ADM-020–025, ADR-073).

-- ── Operator applications ────────────────────────────────────────────────────────────────────────────────
-- A signed-in person applies; the company starts "applied" with them as owner (ADR-073).
create or replace function public.apply_as_operator(display_name text, legal_name text, registration jsonb)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  new_org uuid;
begin
  if auth.uid() is null then raise exception 'Sign in first' using errcode = '42501'; end if;
  if length(trim(coalesce(display_name, ''))) = 0 or length(display_name) > 120 then
    raise exception 'Company name is required' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.memberships m join public.organisations o on o.id = m.org_id
    where m.user_id = auth.uid() and o.kind = 'operator' and o.status = 'applied'
  ) then
    raise exception 'You already have an application waiting' using errcode = '23505';
  end if;
  insert into public.organisations (kind, status, display_name, legal_name, registration)
  values ('operator', 'applied', trim(display_name), nullif(trim(coalesce(legal_name, '')), ''), coalesce(registration, '{}'::jsonb))
  returning id into new_org;
  insert into public.memberships (org_id, user_id, team_role) values (new_org, auth.uid(), 'owner');
  return new_org;
end $$;
revoke execute on function public.apply_as_operator(text, text, jsonb) from public, anon;
grant execute on function public.apply_as_operator(text, text, jsonb) to authenticated;

-- ── Team invitations (owner invites; the invited person accepts) ────────────────────────────────────────
create table public.org_invitations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations (id) on delete cascade,
  email text not null check (email = lower(email) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  team_role public.team_role not null check (team_role <> 'owner'),
  invited_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '14 days',
  accepted_at timestamptz,
  revoked_at timestamptz
);
create unique index org_invitations_open_idx on public.org_invitations (org_id, email)
  where accepted_at is null and revoked_at is null;

alter table public.org_invitations enable row level security;
create policy "org_invitations: owners and admins manage" on public.org_invitations for all to authenticated
  using (app.is_admin() or app.has_org_role(org_id, array['owner']::public.team_role[]))
  with check (app.is_admin() or app.has_org_role(org_id, array['owner']::public.team_role[]));
-- The invited person sees invitations addressed to their confirmed email.
create policy "org_invitations: invitee reads own" on public.org_invitations for select to authenticated
  using (email = lower(coalesce(auth.jwt() ->> 'email', '')));
grant select, insert, update, delete on public.org_invitations to authenticated, service_role;

create or replace function public.accept_invitation(invitation uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  inv public.org_invitations;
begin
  select * into inv from public.org_invitations i
  where i.id = invitation and i.email = lower(coalesce(auth.jwt() ->> 'email', ''))
    and i.accepted_at is null and i.revoked_at is null and i.expires_at > now();
  if not found then raise exception 'This invitation is not valid for your account' using errcode = '42501'; end if;
  insert into public.memberships (org_id, user_id, team_role) values (inv.org_id, auth.uid(), inv.team_role)
  on conflict (org_id, user_id) do update set team_role = excluded.team_role;
  update public.org_invitations set accepted_at = now() where id = inv.id;
  return inv.org_id;
end $$;
revoke execute on function public.accept_invitation(uuid) from public, anon;
grant execute on function public.accept_invitation(uuid) to authenticated;

-- Owners manage their own team's roles (never their own, never another owner) and remove members.
create policy "memberships: owners manage staff" on public.memberships for update to authenticated
  using (app.has_org_role(org_id, array['owner']::public.team_role[]) and user_id <> auth.uid() and team_role <> 'owner')
  with check (app.has_org_role(org_id, array['owner']::public.team_role[]) and team_role <> 'owner');
create policy "memberships: owners remove staff" on public.memberships for delete to authenticated
  using (app.has_org_role(org_id, array['owner']::public.team_role[]) and user_id <> auth.uid() and team_role <> 'owner');
-- Team members see each other.
create policy "memberships: colleagues read" on public.memberships for select to authenticated
  using (org_id in (select app.my_org_ids()));

create trigger audit_org_invitations after insert or update or delete on public.org_invitations for each row execute function app.audit_row();

-- ── Cruise submissions ─────────────────────────────────────────────────────────────────────────────────
create type public.submission_status as enum ('draft', 'submitted', 'changes_requested', 'approved', 'rejected');
create type public.submission_event as enum ('created', 'edited', 'submitted', 'changes_requested', 'approved', 'rejected');

create table public.vessel_submissions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations (id) on delete cascade,
  -- null: a new vessel the operator proposes; otherwise changes to a vessel assigned to them.
  vessel_id uuid references public.vessels (id) on delete set null,
  status public.submission_status not null default 'draft',
  proposal jsonb not null default '{}'::jsonb,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  submitted_at timestamptz,
  decided_at timestamptz,
  decided_by uuid
);
create index vessel_submissions_org_idx on public.vessel_submissions (org_id);
create index vessel_submissions_status_idx on public.vessel_submissions (status);
create unique index vessel_submissions_one_open_idx on public.vessel_submissions (vessel_id)
  where vessel_id is not null and status in ('draft', 'submitted', 'changes_requested');
create trigger vessel_submissions_updated_at before update on public.vessel_submissions for each row execute function app.set_updated_at();

create table public.vessel_submission_events (
  id bigint generated always as identity primary key,
  submission_id uuid not null references public.vessel_submissions (id) on delete cascade,
  event public.submission_event not null,
  message text check (length(message) <= 4000),
  actor uuid default auth.uid(),
  occurred_at timestamptz not null default now()
);
create index vessel_submission_events_idx on public.vessel_submission_events (submission_id);

alter table public.vessel_submissions enable row level security;
alter table public.vessel_submission_events enable row level security;

create policy "submissions: members and admins read" on public.vessel_submissions for select to authenticated
  using (app.is_admin() or org_id in (select app.my_org_ids()));
-- Operators (owner, reservations) create drafts for an approved company, for new vessels or their own.
create policy "submissions: editors create drafts" on public.vessel_submissions for insert to authenticated
  with check (
    status = 'draft'
    and app.has_org_role(org_id, array['owner', 'reservations']::public.team_role[])
    and exists (select 1 from public.organisations o where o.id = org_id and o.status = 'approved' and o.kind = 'operator')
    and (vessel_id is null or exists (select 1 from public.vessels v where v.id = vessel_id and v.operator_org_id = org_id))
  );
-- Editing the proposal is possible only while it is a draft or has changes requested (DASH-ADM-041).
create policy "submissions: editors edit open drafts" on public.vessel_submissions for update to authenticated
  using (status in ('draft', 'changes_requested') and app.has_org_role(org_id, array['owner', 'reservations']::public.team_role[]))
  with check (status in ('draft', 'changes_requested') and app.has_org_role(org_id, array['owner', 'reservations']::public.team_role[]));
create policy "submissions: editors delete drafts" on public.vessel_submissions for delete to authenticated
  using (status = 'draft' and app.has_org_role(org_id, array['owner', 'reservations']::public.team_role[]));

create policy "submission events: with submission" on public.vessel_submission_events for select to authenticated
  using (exists (select 1 from public.vessel_submissions s where s.id = submission_id
                 and (app.is_admin() or s.org_id in (select app.my_org_ids()))));

-- Status changes only through these functions, which enforce the allowed transitions and write the history.
grant select, insert, update, delete on public.vessel_submissions to authenticated, service_role;
grant select on public.vessel_submission_events to authenticated, service_role;

-- Status and decision fields change only inside app.submission_transition (column revokes can't override a table grant).
create or replace function app.guard_submission_fields() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if current_setting('app.submission_transition', true) = 'on' or auth.uid() is null then return new; end if;
  if tg_op = 'INSERT' then
    if new.status <> 'draft' or new.submitted_at is not null or new.decided_at is not null or new.decided_by is not null then
      raise exception 'A submission starts as a draft' using errcode = '42501';
    end if;
  elsif new.status is distinct from old.status or new.submitted_at is distinct from old.submitted_at
     or new.decided_at is distinct from old.decided_at or new.decided_by is distinct from old.decided_by
     or new.org_id is distinct from old.org_id or new.vessel_id is distinct from old.vessel_id then
    raise exception 'Use submit, request changes, approve or reject to change a submission' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger vessel_submissions_guard before insert or update on public.vessel_submissions
  for each row execute function app.guard_submission_fields();

create or replace function app.submission_transition(target uuid, next public.submission_status, note text)
returns public.vessel_submissions
language plpgsql security definer set search_path = '' as $$
declare
  s public.vessel_submissions;
  allowed boolean;
  ev public.submission_event;
begin
  select * into s from public.vessel_submissions where id = target for update;
  if not found then raise exception 'Submission not found' using errcode = 'P0002'; end if;

  if next = 'submitted' then
    allowed := s.status in ('draft', 'changes_requested')
      and app.has_org_role(s.org_id, array['owner', 'reservations']::public.team_role[]);
    ev := 'submitted';
  elsif next in ('changes_requested', 'approved', 'rejected') then
    allowed := s.status = 'submitted' and app.is_catalogue_admin();
    ev := next::text::public.submission_event;
    if next in ('changes_requested', 'rejected') and length(trim(coalesce(note, ''))) = 0 then
      raise exception 'Tell the operator what to change or why' using errcode = '22023';
    end if;
  else
    allowed := false;
  end if;
  if not allowed then
    raise exception 'This change is not allowed from %', s.status using errcode = '42501';
  end if;

  perform set_config('app.submission_transition', 'on', true);
  update public.vessel_submissions set
    status = next,
    submitted_at = case when next = 'submitted' then now() else submitted_at end,
    decided_at = case when next in ('approved', 'rejected') then now() else decided_at end,
    decided_by = case when next in ('approved', 'rejected') then auth.uid() else decided_by end
  where id = target returning * into s;
  perform set_config('app.submission_transition', 'off', true);
  insert into public.vessel_submission_events (submission_id, event, message) values (target, ev, nullif(trim(coalesce(note, '')), ''));
  perform app.log_event('vessel_submissions.' || ev::text, 'vessel_submissions', target::text, null, to_jsonb(s));
  return s;
end $$;
grant execute on function app.submission_transition(uuid, public.submission_status, text) to authenticated;

create or replace function public.submit_submission(target uuid) returns void
language sql security definer set search_path = '' as $$ select app.submission_transition(target, 'submitted', null); $$;
create or replace function public.request_submission_changes(target uuid, note text) returns void
language sql security definer set search_path = '' as $$ select app.submission_transition(target, 'changes_requested', note); $$;
create or replace function public.reject_submission(target uuid, note text) returns void
language sql security definer set search_path = '' as $$ select app.submission_transition(target, 'rejected', note); $$;

-- Approval applies the proposal: a new vessel becomes a private draft of the operator; changes update their vessel.
create or replace function public.approve_submission(target uuid, new_slug text default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  s public.vessel_submissions;
  p jsonb;
  vid uuid;
begin
  s := app.submission_transition(target, 'approved', null);
  p := s.proposal;
  perform set_config('app.applying_submission', 'on', true);
  if s.vessel_id is null then
    insert into public.vessels (slug, name, type, visibility, operator_org_id, cabin_count, max_guests, deck_count, year_built, route_text)
    values (
      new_slug, p ->> 'name', (p ->> 'type')::public.vessel_type, 'private', s.org_id,
      nullif(p ->> 'cabin_count', '')::int, nullif(p ->> 'max_guests', '')::int, nullif(p ->> 'deck_count', '')::smallint,
      nullif(p ->> 'year_built', '')::smallint, nullif(p ->> 'route_text', '')
    ) returning id into vid;
    perform set_config('app.submission_transition', 'on', true);
    update public.vessel_submissions set vessel_id = vid where id = target;
    perform set_config('app.submission_transition', 'off', true);
  else
    vid := s.vessel_id;
    update public.vessels set
      name = coalesce(p ->> 'name', name),
      type = coalesce((p ->> 'type')::public.vessel_type, type),
      cabin_count = coalesce(nullif(p ->> 'cabin_count', '')::int, cabin_count),
      max_guests = coalesce(nullif(p ->> 'max_guests', '')::int, max_guests),
      deck_count = coalesce(nullif(p ->> 'deck_count', '')::smallint, deck_count),
      year_built = coalesce(nullif(p ->> 'year_built', '')::smallint, year_built),
      route_text = coalesce(nullif(p ->> 'route_text', ''), route_text)
    where id = vid;
  end if;
  if p ? 'description_en' then
    insert into public.vessel_translations (vessel_id, locale, description) values (vid, 'en', p ->> 'description_en')
    on conflict (vessel_id, locale) do update set description = excluded.description;
  end if;
  perform set_config('app.applying_submission', 'off', true);
  return vid;
end $$;

revoke execute on function public.submit_submission(uuid), public.request_submission_changes(uuid, text),
  public.reject_submission(uuid, text), public.approve_submission(uuid, text) from public, anon;
grant execute on function public.submit_submission(uuid), public.request_submission_changes(uuid, text),
  public.reject_submission(uuid, text), public.approve_submission(uuid, text) to authenticated;

-- DASH-ADM-041: while a submission is under review, its vessel is protected from ordinary editing.
create or replace function app.guard_vessel_under_review() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if current_setting('app.applying_submission', true) = 'on' or auth.uid() is null then return new; end if;
  if exists (select 1 from public.vessel_submissions s where s.vessel_id = new.id and s.status = 'submitted') then
    raise exception 'This vessel is under review. Decide the submission first.' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger vessels_guard_under_review before update on public.vessels
  for each row execute function app.guard_vessel_under_review();

-- Edits to a proposal are part of its history.
create or replace function app.log_submission_edit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.vessel_submission_events (submission_id, event) values (new.id, 'created');
  elsif new.proposal is distinct from old.proposal then
    insert into public.vessel_submission_events (submission_id, event) values (new.id, 'edited');
  end if;
  return new;
end $$;
create trigger vessel_submissions_history after insert or update of proposal on public.vessel_submissions
  for each row execute function app.log_submission_edit();
create trigger audit_vessel_submissions after insert or delete on public.vessel_submissions for each row execute function app.audit_row();

-- ── CSV import batches (preview first, write on confirmation; DASH-ADM-020–025) ─────────────────────────
create table public.vessel_import_batches (
  id uuid primary key default gen_random_uuid(),
  created_by uuid default auth.uid(),
  file_name text not null,
  rows jsonb not null,
  summary jsonb not null default '{}'::jsonb,
  status text not null default 'previewed' check (status in ('previewed', 'imported', 'discarded')),
  created_at timestamptz not null default now(),
  imported_at timestamptz
);
alter table public.vessel_import_batches enable row level security;
create policy "import batches: catalogue admins" on public.vessel_import_batches for all to authenticated
  using (app.is_catalogue_admin()) with check (app.is_catalogue_admin());
grant select, insert, update, delete on public.vessel_import_batches to authenticated, service_role;
create trigger audit_vessel_import_batches after insert or update on public.vessel_import_batches for each row execute function app.audit_row();
