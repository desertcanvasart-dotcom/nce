-- Operator loop, Part B (ADR-099): "send us what you already send". Vacancy sheets arrive by email, WhatsApp or an
-- admin's upload; they are read into the Nilecruz format and go through the existing preview (app.apply_inventory_rows)
-- with source `sheet` and the sheet's date as the time the availability was confirmed. A Nilecruz admin confirms on the
-- operator's behalf; auto-confirm is a per-operator switch, off by default. Nothing is created or deleted.

create type public.sheet_channel as enum ('email', 'whatsapp', 'upload');
create type public.sheet_status as enum ('received', 'unknown_sender', 'preview', 'confirmed', 'rejected', 'failed');

create table public.sheet_ingests (
  id uuid primary key default gen_random_uuid(),
  -- Null until the sender is recognised or an admin picks the operator.
  org_id uuid references public.organisations (id) on delete cascade,
  channel public.sheet_channel not null,
  sender text check (length(sender) <= 320),
  received_at timestamptz not null default now(),
  -- The raw file in the private "sheets" bucket (none for a plain text message).
  file_path text check (file_path ~ '^[0-9a-f-]{36}/[A-Za-z0-9._-]{1,160}$'),
  file_name text check (length(file_name) <= 200),
  content_type text check (length(content_type) <= 120),
  size_bytes integer check (size_bytes between 0 and 15728640),
  body_text text check (length(body_text) <= 50000),
  status public.sheet_status not null default 'received',
  parser_version text check (length(parser_version) <= 60),
  -- The date printed on the sheet: the "as of" for every row (else the received time).
  sheet_date date,
  -- The rows as read (ship, date, cabin as written, free), kept so a name mapped later can be applied again.
  raw_rows jsonb,
  -- The rows read from the sheet, mapped to the operator's ships and cabin types where possible (format v1, plus the
  -- names as written); names that didn't map; anything the reader wants the reviewer to know.
  rows jsonb,
  unmatched jsonb not null default '[]'::jsonb,
  notes jsonb not null default '[]'::jsonb,
  run_id uuid references public.inventory_runs (id) on delete set null,
  -- An admin changed a row or mapped a name: not a clean import.
  edited boolean not null default false,
  auto_confirmed boolean not null default false,
  reviewer uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  error text check (length(error) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index sheet_ingests_org_idx on public.sheet_ingests (org_id, received_at desc);
create index sheet_ingests_open_idx on public.sheet_ingests (status) where status in ('received', 'unknown_sender', 'preview');
create trigger sheet_ingests_updated_at before update on public.sheet_ingests for each row execute function app.set_updated_at();

-- Per operator: a sheet's name for a ship or cabin type ("Deluxe Upper" → the Deluxe Upper Deck cabin type).
create table public.operator_aliases (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations (id) on delete cascade,
  kind text not null check (kind in ('vessel', 'cabin')),
  sheet_name text not null check (length(trim(sheet_name)) between 1 and 160),
  -- A ship's slug, or a cabin type's code (scoped to a ship's slug).
  target text not null check (length(target) between 1 and 120),
  vessel_slug text check (vessel_slug is null or kind = 'cabin'),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index operator_aliases_name_idx on public.operator_aliases (org_id, kind, lower(trim(sheet_name)), coalesce(vessel_slug, ''));

alter table public.operator_settings add column sheet_auto_confirm boolean not null default false;
alter table public.operator_settings add column sheet_ack boolean not null default false;
-- Consecutive clean imports; auto-confirm can be switched on after 4.
alter table public.operator_settings add column clean_imports smallint not null default 0 check (clean_imports >= 0);

-- Every row carries the sheet's date as the time it was confirmed (the no-overwrite rule then keeps newer data).
create or replace function app.sheet_rows(s public.sheet_ingests) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(r || jsonb_build_object('confirmed_at',
    coalesce(((s.sheet_date::timestamp + time '00:00') at time zone 'Africa/Cairo'), s.received_at))), '[]'::jsonb)
  from jsonb_array_elements(coalesce(s.rows, '[]'::jsonb)) r
  where coalesce((r ->> 'unmapped')::boolean, false) = false;
$$;

create or replace function app.can_review_sheets() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(auth.role(), '') = 'service_role' or app.is_catalogue_admin();
$$;

-- Preview: the existing checks, dry run, kept as a run with every row's result.
create or replace function public.preview_sheet(ingest uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  s public.sheet_ingests;
  outcome jsonb;
  rows jsonb;
  new_run uuid;
begin
  if not app.can_review_sheets() then raise exception 'Only catalogue admins review sheets' using errcode = '42501'; end if;
  select * into s from public.sheet_ingests where id = ingest for update;
  if s.id is null then raise exception 'Sheet not found' using errcode = 'P0002'; end if;
  if s.org_id is null then raise exception 'Choose the operator first' using errcode = '22023'; end if;
  if s.status in ('confirmed', 'rejected') then raise exception 'This sheet is already %', s.status using errcode = '22023'; end if;
  rows := app.sheet_rows(s);
  outcome := app.apply_inventory_rows(s.org_id, 'sheet', rows, true);
  insert into public.inventory_runs (org_id, source, status, label, rows, results, rows_received, rows_changed, rows_unchanged,
    rows_skipped, rows_failed)
  values (s.org_id, 'sheet', 'previewed', left('Sheet ' || coalesce(s.file_name, s.channel::text), 200), rows, outcome -> 'results',
    (outcome ->> 'total')::int, (outcome ->> 'changed')::int, (outcome ->> 'unchanged')::int, (outcome ->> 'skipped')::int,
    (outcome ->> 'failed')::int)
  returning id into new_run;
  update public.sheet_ingests set status = 'preview', run_id = new_run, error = null where id = s.id;
  return new_run;
end $$;

-- Confirm: checked again now (sailings or newer data may have changed), then applied. Sheet previews last 48 hours.
create or replace function public.confirm_sheet(ingest uuid, auto boolean default false) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  s public.sheet_ingests;
  rr public.inventory_runs;
  outcome jsonb;
  clean boolean;
begin
  if not app.can_review_sheets() then raise exception 'Only catalogue admins confirm sheets' using errcode = '42501'; end if;
  if auto and coalesce(auth.role(), '') <> 'service_role' then raise exception 'Service role only' using errcode = '42501'; end if;
  select * into s from public.sheet_ingests where id = ingest for update;
  if s.id is null then raise exception 'Sheet not found' using errcode = 'P0002'; end if;
  if s.status <> 'preview' then raise exception 'Preview the sheet first' using errcode = '22023'; end if;
  select * into rr from public.inventory_runs where id = s.run_id for update;
  if rr.status <> 'previewed' or rr.created_at < now() - interval '48 hours' then
    raise exception 'This preview is more than 48 hours old or already used. Preview it again.' using errcode = '22023';
  end if;
  outcome := app.apply_inventory_rows(s.org_id, 'sheet', rr.rows, false);
  update public.inventory_runs set status = 'applied', rows = null, results = app.first_rows(app.attention_rows(outcome), 200),
    rows_received = (outcome ->> 'total')::int, rows_changed = (outcome ->> 'changed')::int,
    rows_unchanged = (outcome ->> 'unchanged')::int, rows_skipped = (outcome ->> 'skipped')::int,
    rows_failed = (outcome ->> 'failed')::int, error = app.rows_problem(outcome), finished_at = now()
  where id = rr.id;
  clean := (outcome ->> 'failed')::int = 0 and not s.edited and jsonb_array_length(s.unmatched) = 0;
  update public.sheet_ingests set status = 'confirmed', reviewer = auth.uid(), reviewed_at = now(), auto_confirmed = auto where id = s.id;
  insert into public.operator_settings (org_id, clean_imports) values (s.org_id, case when clean then 1 else 0 end)
  on conflict (org_id) do update set clean_imports = case when clean then public.operator_settings.clean_imports + 1 else 0 end,
    -- An import that needed fixing switches auto-confirm off again.
    sheet_auto_confirm = public.operator_settings.sheet_auto_confirm and clean;
  perform app.log_event('inventory.sheet_confirmed', 'sheet_ingests', s.id::text, null, outcome - 'results',
    jsonb_build_object('org_id', s.org_id, 'auto', auto));
  return (outcome - 'results') || jsonb_build_object('clean', clean);
end $$;

create or replace function public.reject_sheet(ingest uuid, why text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not app.can_review_sheets() then raise exception 'Only catalogue admins review sheets' using errcode = '42501'; end if;
  update public.sheet_ingests set status = 'rejected', error = left(nullif(trim(why), ''), 2000), reviewer = auth.uid(), reviewed_at = now()
  where id = ingest and status not in ('confirmed', 'rejected');
  if not found then raise exception 'This sheet can''t be rejected' using errcode = '22023'; end if;
end $$;

-- Auto-confirm needs 4 clean imports in a row before an admin may switch it on.
create or replace function app.check_auto_confirm() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.sheet_auto_confirm and not coalesce(old.sheet_auto_confirm, false) and new.clean_imports < 4 then
    raise exception 'Auto-confirm needs 4 clean imports in a row (this operator has %)', new.clean_imports using errcode = '23514';
  end if;
  return new;
end $$;
create trigger operator_settings_auto_confirm before insert or update of sheet_auto_confirm on public.operator_settings
  for each row execute function app.check_auto_confirm();

-- ── Access ───────────────────────────────────────────────────────────────────────────────────────────────────
alter table public.sheet_ingests enable row level security;
alter table public.operator_aliases enable row level security;
create policy "sheet_ingests: admins, and the operator's team" on public.sheet_ingests for select to authenticated
  using (app.is_admin() or (org_id is not null and app.can_read_connections(org_id)));
create policy "sheet_ingests: catalogue admins change" on public.sheet_ingests for update to authenticated
  using (app.is_catalogue_admin()) with check (app.is_catalogue_admin());
create policy "operator_aliases: admins read" on public.operator_aliases for select to authenticated using (app.is_admin());
create policy "operator_aliases: catalogue admins write" on public.operator_aliases for all to authenticated
  using (app.is_catalogue_admin()) with check (app.is_catalogue_admin());

grant select, update on public.sheet_ingests to authenticated;
grant select, insert, update, delete on public.sheet_ingests to service_role;
grant select, insert, update, delete on public.operator_aliases to authenticated, service_role;

revoke execute on function app.sheet_rows(public.sheet_ingests), app.can_review_sheets(), app.check_auto_confirm() from public, anon, authenticated;
revoke execute on function public.preview_sheet(uuid), public.confirm_sheet(uuid, boolean), public.reject_sheet(uuid, text) from public, anon;
grant execute on function public.preview_sheet(uuid), public.confirm_sheet(uuid, boolean), public.reject_sheet(uuid, text) to authenticated, service_role;

-- The raw files: private; admins read them through signed links.
insert into storage.buckets (id, name, public, file_size_limit) values ('sheets', 'sheets', false, 15728640) on conflict (id) do nothing;
create policy "sheets: admins read" on storage.objects for select to authenticated using (bucket_id = 'sheets' and app.is_admin());

create trigger audit_sheet_ingests after insert or update or delete on public.sheet_ingests for each row execute function app.audit_row();
create trigger audit_operator_aliases after insert or update or delete on public.operator_aliases for each row execute function app.audit_row();
