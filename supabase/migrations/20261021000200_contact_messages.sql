-- Batch 7-1 (PAGE-106, ADR-097): messages from the Contact page. Anyone may send one; only admins read and file them.
-- Email notifications come with transactional email in Batch 8.
create type public.contact_topic as enum ('cruise', 'booking', 'vessel', 'partner', 'other');

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 120),
  email text not null check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(email) <= 254),
  topic public.contact_topic not null default 'other',
  message text not null check (length(trim(message)) between 10 and 4000),
  -- The sender's account, when signed in.
  user_id uuid references auth.users (id) on delete set null default auth.uid(),
  handled_at timestamptz,
  handled_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index contact_messages_open_idx on public.contact_messages (created_at desc) where handled_at is null;

alter table public.contact_messages enable row level security;
-- Sending: never already handled, and a signed-in sender can only name themselves.
create policy "contact_messages: anyone sends" on public.contact_messages for insert to anon, authenticated
  with check (handled_at is null and handled_by is null and (user_id is null or user_id = auth.uid()));
create policy "contact_messages: admins read" on public.contact_messages for select to authenticated using (app.is_admin());
create policy "contact_messages: admins file" on public.contact_messages for update to authenticated
  using (app.is_admin()) with check (app.is_admin());
grant insert on public.contact_messages to anon, authenticated;
grant select, update (handled_at, handled_by) on public.contact_messages to authenticated;
grant select, insert, update, delete on public.contact_messages to service_role;
create trigger audit_contact_messages after insert or update or delete on public.contact_messages
  for each row execute function app.audit_row();
