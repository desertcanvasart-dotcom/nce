-- Batch 4f-1: deadlines, payments, receipts, balances, commission, payables, payouts (DASH-PAY-001–010,
-- DASH-ADM-003, 097–103, 106, 107, DASH-OPR-013, 014, DASH-CUS-008, 009, DATA-026–028, 030, 035–040, 043,
-- ADR-026, ADR-027, ADR-030, ADR-089). Recording or verifying a payment never moves money (DASH-ADM-107).

create or replace function app.is_finance_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select app.has_admin_role(array['super', 'finance']::public.admin_role[]);
$$;
revoke execute on function app.is_finance_admin() from public;
grant execute on function app.is_finance_admin() to anon, authenticated, service_role;

-- ── Premium calendar (DASH-ADM-099, DASH-PAY-006, 007) ───────────────────────────────────────────────────
create table public.premium_periods (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 120),
  starts_on date not null,
  ends_on date not null check (ends_on >= starts_on and ends_on <= starts_on + 60),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger premium_periods_updated_at before update on public.premium_periods for each row execute function app.set_updated_at();
insert into public.premium_periods (name, starts_on, ends_on) values ('Western Easter 2027', '2027-03-21', '2027-03-29');
insert into public.platform_settings (key, value) values ('commission_bp', '1000');

-- ── The deadline (ADR-027, DATA-039); mirrors src/lib/payments/deadlines.ts ─────────────────────────────
create or replace function app.payment_deadline(booked_on date, departs_on date)
returns table (rule text, days integer, due_on date, due_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
declare
  md text := to_char(departs_on, 'MM-DD');
  m integer := extract(month from departs_on)::int;
  d date;
begin
  if md >= '12-24' or md <= '01-07' then rule := 'festive'; days := 3;
  elsif exists (select 1 from public.premium_periods p where departs_on between p.starts_on and p.ends_on) then rule := 'premium'; days := 3;
  elsif m between 5 and 9 then rule := 'summer'; days := 14;
  else rule := 'winter'; days := 7;
  end if;
  d := least(booked_on + days, departs_on - 1);
  due_on := greatest(d, booked_on);
  -- The end of the due day in Cairo.
  due_at := ((due_on + 1)::timestamp at time zone 'Africa/Cairo');
  return next;
end $$;

alter table public.reservations add column booked_on date;
alter table public.reservations add column payment_due_at timestamptz;
alter table public.reservations add column deadline_rule text check (deadline_rule in ('festive', 'premium', 'winter', 'summer'));
alter table public.reservations add column cancelled_at timestamptz;
alter table public.reservations add column cancelled_reason text check (length(cancelled_reason) <= 500);

-- DASH-PAY-010: set once, when the reservation is made; later calendar or rule changes never rewrite it.
create or replace function app.set_payment_deadline() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  dl record;
begin
  new.booked_on := coalesce(new.booked_on, (now() at time zone 'Africa/Cairo')::date);
  select * into dl from app.payment_deadline(new.booked_on, (select departs_on from public.departures where id = new.departure_id));
  new.payment_due_at := dl.due_at;
  new.deadline_rule := dl.rule;
  return new;
end $$;
create trigger reservations_deadline before insert on public.reservations for each row execute function app.set_payment_deadline();
create or replace function app.keep_deadline() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.payment_due_at is distinct from old.payment_due_at or new.booked_on is distinct from old.booked_on
     or new.deadline_rule is distinct from old.deadline_rule then
    raise exception 'A reservation keeps the deadline agreed at booking' using errcode = '23514';
  end if;
  return new;
end $$;

-- Reservations made before this batch get their deadline now, from the day they were booked.
update public.reservations r set booked_on = (r.created_at at time zone 'Africa/Cairo')::date,
  payment_due_at = (select dl.due_at from app.payment_deadline((r.created_at at time zone 'Africa/Cairo')::date,
    (select d.departs_on from public.departures d where d.id = r.departure_id)) dl),
  deadline_rule = (select dl.rule from app.payment_deadline((r.created_at at time zone 'Africa/Cairo')::date,
    (select d.departs_on from public.departures d where d.id = r.departure_id)) dl)
where r.payment_due_at is null;
alter table public.reservations alter column booked_on set not null;
alter table public.reservations alter column payment_due_at set not null;
alter table public.reservations alter column deadline_rule set not null;
create trigger reservations_keep_deadline before update on public.reservations for each row execute function app.keep_deadline();

-- ── Payments (DASH-ADM-097, 100–102, DASH-CUS-009, DATA-026–028, 043) ────────────────────────────────────
create type public.payment_method as enum ('card', 'transfer', 'manual');
create type public.payment_status as enum ('reported', 'verified', 'rejected', 'refunded');
create sequence public.receipt_seq;
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations (id) on delete restrict,
  method public.payment_method not null,
  status public.payment_status not null,
  amount_minor bigint not null check (amount_minor > 0),
  currency public.currency_code not null,
  paid_on date,
  reference text check (length(reference) <= 200),
  proof_path text check (proof_path ~ '^reservations/[0-9a-f-]{36}/[A-Za-z0-9._-]+$'),
  note text check (length(note) <= 500),
  stripe_session_id text unique,
  stripe_payment_intent_id text unique,
  stripe_refund_id text unique,
  receipt_number text unique check (receipt_number ~ '^NCR-[0-9]{4}-[0-9]{6}$'),
  reported_by uuid references auth.users (id) on delete set null,
  verified_by uuid references auth.users (id) on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (method <> 'card' or stripe_payment_intent_id is not null),
  check (status <> 'verified' or receipt_number is not null)
);
create index payments_reservation_idx on public.payments (reservation_id);
create trigger payments_updated_at before update on public.payments for each row execute function app.set_updated_at();

-- ── Commission and payables (DASH-ADM-106, DATA-036–038) ────────────────────────────────────────────────
create type public.commission_kind as enum ('payment', 'reversal');
create table public.commission_entries (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments (id) on delete restrict,
  reservation_id uuid not null references public.reservations (id) on delete restrict,
  org_id uuid not null references public.organisations (id) on delete restrict,
  kind public.commission_kind not null,
  currency public.currency_code not null,
  base_minor bigint not null,
  commission_bp integer not null check (commission_bp between 0 and 5000),
  commission_minor bigint not null,
  payable_minor bigint not null,
  created_at timestamptz not null default now()
);
create index commission_entries_org_idx on public.commission_entries (org_id, created_at desc);

create table public.payouts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations (id) on delete restrict,
  amount_minor bigint not null check (amount_minor > 0),
  currency public.currency_code not null,
  method text not null check (length(trim(method)) between 1 and 80),
  reference text check (length(reference) <= 200),
  paid_on date not null,
  note text check (length(note) <= 500),
  recorded_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index payouts_org_idx on public.payouts (org_id, paid_on desc);

-- Private bucket for transfer proofs, under reservations/<id>/ like eligibility proofs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('payment-proofs', 'payment-proofs', false, 10485760, array['image/jpeg', 'image/png', 'application/pdf'])
on conflict (id) do nothing;
create policy "payment-proofs bucket: customer uploads" on storage.objects for insert to authenticated
  with check (bucket_id = 'payment-proofs' and exists (
    select 1 from public.reservations r where r.id = app.storage_reservation_id(name) and r.customer_id = auth.uid()));
create policy "payment-proofs bucket: reservation readers" on storage.objects for select to authenticated
  using (bucket_id = 'payment-proofs' and app.storage_reservation_id(name) is not null and app.can_read_reservation(app.storage_reservation_id(name)));

-- ── Balance (DASH-CUS-008, DASH-ADM-103) ─────────────────────────────────────────────────────────────────
create or replace function app.reservation_paid(res uuid) returns bigint
language sql stable security definer set search_path = '' as $$
  select coalesce(sum(amount_minor) filter (where status = 'verified'), 0)::bigint from public.payments where reservation_id = res;
$$;
create or replace function public.reservation_balance(res uuid)
returns table (total_minor bigint, paid_minor bigint, outstanding_minor bigint, reported_minor bigint, currency text, payment_due_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select r.total_minor, app.reservation_paid(r.id), greatest(r.total_minor - app.reservation_paid(r.id), 0),
    coalesce((select sum(p.amount_minor) from public.payments p where p.reservation_id = r.id and p.status = 'reported'), 0)::bigint,
    r.currency::text, r.payment_due_at
  from public.reservations r where r.id = res and app.can_read_reservation(r.id);
$$;

-- A verified payment gets a receipt number, its commission entry, and may confirm the reservation.
create or replace function app.after_verified(p public.payments) returns void
language plpgsql security definer set search_path = '' as $$
declare
  r public.reservations;
  bp integer := coalesce((select value::text::int from public.platform_settings where key = 'commission_bp'), 1000);
  commission bigint;
begin
  select * into r from public.reservations where id = p.reservation_id for update;
  commission := floor(p.amount_minor * bp / 10000.0 + 0.5);
  insert into public.commission_entries (payment_id, reservation_id, org_id, kind, currency, base_minor, commission_bp, commission_minor, payable_minor)
  values (p.id, r.id, r.org_id, 'payment', p.currency, p.amount_minor, bp, commission, p.amount_minor - commission);
  if r.status = 'awaiting_payment' and app.reservation_paid(r.id) >= r.total_minor then
    update public.reservations set status = 'confirmed' where id = r.id;
    insert into public.notifications (user_id, kind, title, link)
    values (r.customer_id, 'reservation.confirmed', 'Reservation ' || r.reference || ' is paid and confirmed', '/dashboard/journey/reservations/' || r.id || '/');
    insert into public.notifications (org_id, kind, title, link)
    values (r.org_id, 'reservation.confirmed', 'Reservation ' || r.reference || ' is paid in full', '/dashboard/operator/' || r.org_id || '/bookings/' || r.id || '/');
  end if;
end $$;

create or replace function app.next_receipt() returns text
language sql volatile security definer set search_path = '' as $$
  select 'NCR-' || to_char(now() at time zone 'Africa/Cairo', 'YYYY') || '-' || lpad(nextval('public.receipt_seq')::text, 6, '0');
$$;

-- Customer: report a transfer (DASH-CUS-009). Never verified by the customer.
create or replace function public.report_payment(res uuid, amount bigint, cur text, paid_date date, ref text, proof text default null)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  r public.reservations;
  new_id uuid;
begin
  select * into r from public.reservations where id = res;
  if r.id is null or r.customer_id is distinct from auth.uid() then raise exception 'Reservation not found' using errcode = 'P0002'; end if;
  if r.status <> 'awaiting_payment' then raise exception 'This reservation isn''t waiting for payment' using errcode = '22023'; end if;
  if cur is distinct from r.currency::text then raise exception 'Report the payment in the reservation''s currency (%)', r.currency using errcode = '22023'; end if;
  if paid_date > (now() at time zone 'Africa/Cairo')::date then raise exception 'The payment date can''t be in the future' using errcode = '22023'; end if;
  if proof is not null and proof not like 'reservations/' || res::text || '/%' then raise exception 'Upload the proof again' using errcode = '22023'; end if;
  insert into public.payments (reservation_id, method, status, amount_minor, currency, paid_on, reference, proof_path, reported_by)
  values (res, 'transfer', 'reported', amount, cur, paid_date, nullif(trim(ref), ''), proof, auth.uid())
  returning id into new_id;
  return new_id;
end $$;

-- Admin (finance or super): verify or reject a reported payment (DASH-ADM-097).
create or replace function public.verify_payment(target uuid, decision public.payment_status, review_note text default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  p public.payments;
begin
  if not app.is_finance_admin() then raise exception 'Only finance admins verify payments' using errcode = '42501'; end if;
  if decision not in ('verified', 'rejected') then raise exception 'Choose verified or rejected' using errcode = '22023'; end if;
  if decision = 'rejected' and coalesce(length(trim(review_note)), 0) = 0 then raise exception 'Give the customer a reason' using errcode = '22023'; end if;
  select * into p from public.payments where id = target for update;
  if p.id is null then raise exception 'Payment not found' using errcode = 'P0002'; end if;
  if p.status <> 'reported' then raise exception 'This payment was already %', p.status using errcode = '22023'; end if;
  update public.payments set status = decision, note = nullif(trim(review_note), ''), verified_by = auth.uid(), verified_at = now(),
    receipt_number = case when decision = 'verified' then app.next_receipt() end
  where id = target returning * into p;
  if decision = 'verified' then perform app.after_verified(p); end if;
end $$;

-- Admin (finance or super): record a manual payment, e.g. a bank transfer seen on the statement (DATA-043).
create or replace function public.record_manual_payment(res uuid, amount bigint, cur text, how text, ref text, paid_date date)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  r public.reservations;
  p public.payments;
begin
  if not app.is_finance_admin() then raise exception 'Only finance admins record payments' using errcode = '42501'; end if;
  select * into r from public.reservations where id = res;
  if r.id is null then raise exception 'Reservation not found' using errcode = 'P0002'; end if;
  if r.status = 'cancelled' then raise exception 'This reservation is cancelled' using errcode = '22023'; end if;
  if cur is distinct from r.currency::text then raise exception 'Record the payment in the reservation''s currency (%)', r.currency using errcode = '22023'; end if;
  if coalesce(length(trim(how)), 0) = 0 or coalesce(length(trim(ref)), 0) = 0 then
    raise exception 'Give the method and a reference' using errcode = '22023';
  end if;
  insert into public.payments (reservation_id, method, status, amount_minor, currency, paid_on, reference, note, reported_by, verified_by, verified_at, receipt_number)
  values (res, 'manual', 'verified', amount, cur, paid_date, trim(ref), trim(how), auth.uid(), auth.uid(), now(), app.next_receipt())
  returning * into p;
  perform app.after_verified(p);
  return p.id;
end $$;

-- Service role: a card payment from a verified Stripe webhook (DATA-028). Idempotent per payment intent.
-- Returns 'recorded', 'duplicate', or 'refund' when the reservation is no longer waiting (the caller refunds it).
create or replace function public.service_card_payment(res uuid, session_id text, intent text, amount bigint, cur text)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  r public.reservations;
  p public.payments;
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception 'Service role only' using errcode = '42501'; end if;
  if exists (select 1 from public.payments where stripe_payment_intent_id = intent) then return 'duplicate'; end if;
  select * into r from public.reservations where id = res for update;
  if r.id is null then raise exception 'Reservation not found' using errcode = 'P0002'; end if;
  if r.status <> 'awaiting_payment' or upper(cur) <> r.currency::text then return 'refund'; end if;
  insert into public.payments (reservation_id, method, status, amount_minor, currency, paid_on, stripe_session_id, stripe_payment_intent_id,
    verified_at, receipt_number)
  values (res, 'card', 'verified', amount, upper(cur), (now() at time zone 'Africa/Cairo')::date, session_id, intent, now(), app.next_receipt())
  returning * into p;
  perform app.after_verified(p);
  return 'recorded';
end $$;

-- Service role: a card payment that arrived for a reservation no longer waiting, refunded straight back.
create or replace function public.service_card_refunded(res uuid, session_id text, intent text, refund text, amount bigint, cur text)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception 'Service role only' using errcode = '42501'; end if;
  insert into public.payments (reservation_id, method, status, amount_minor, currency, paid_on, stripe_session_id, stripe_payment_intent_id,
    stripe_refund_id, note)
  values (res, 'card', 'refunded', amount, upper(cur), (now() at time zone 'Africa/Cairo')::date, session_id, intent, refund,
    'Paid after the reservation was closed; refunded in full automatically.')
  on conflict (stripe_payment_intent_id) do nothing;
end $$;

-- Admin: payouts to operators made outside the system (DATA-037).
create or replace function public.record_payout(target_org uuid, amount bigint, cur text, how text, ref text, paid_date date, payout_note text default null)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  new_id uuid;
begin
  if not app.is_finance_admin() then raise exception 'Only finance admins record payouts' using errcode = '42501'; end if;
  insert into public.payouts (org_id, amount_minor, currency, method, reference, paid_on, note)
  values (target_org, amount, cur, trim(how), nullif(trim(ref), ''), paid_date, nullif(trim(payout_note), ''))
  returning id into new_id;
  return new_id;
end $$;

-- Operators send reminders (ADR-089: they never record money). At most one per reservation every 12 hours.
create or replace function public.send_payment_reminder(res uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  r public.reservations;
begin
  select * into r from public.reservations where id = res;
  if r.id is null or not app.has_org_role(r.org_id, array['owner', 'reservations', 'finance']::public.team_role[]) then
    raise exception 'Reservation not found' using errcode = 'P0002';
  end if;
  if r.status <> 'awaiting_payment' then raise exception 'This reservation isn''t waiting for payment' using errcode = '22023'; end if;
  if exists (select 1 from public.notifications n where n.user_id = r.customer_id and n.kind = 'payment.reminder'
             and n.link like '%' || r.id::text || '%' and n.created_at > now() - interval '12 hours') then
    raise exception 'A reminder was sent in the last 12 hours' using errcode = '22023';
  end if;
  insert into public.notifications (user_id, kind, title, link)
  values (r.customer_id, 'payment.reminder', 'Reminder: reservation ' || r.reference || ' is waiting for payment',
    '/dashboard/journey/reservations/' || r.id || '/');
end $$;

-- ── Release at the deadline (DATA-040, DASH-PAY-008, 009) ────────────────────────────────────────────────
-- Unpaid reservations past their deadline are cancelled and their cabins returned, unless a reported payment
-- awaits verification: those stay for an admin to decide. Runs hourly; safe to run again.
create or replace function app.release_unpaid() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  r public.reservations;
  n integer := 0;
begin
  for r in
    select * from public.reservations x
    where x.status = 'awaiting_payment' and x.payment_due_at < now()
      and app.reservation_paid(x.id) < x.total_minor
      and not exists (select 1 from public.payments p where p.reservation_id = x.id and p.status = 'reported')
    for update skip locked
  loop
    update public.reservations set status = 'cancelled', cancelled_at = now(), cancelled_reason = 'Not paid by the deadline'
    where id = r.id;
    update public.inventory i set available = i.available + c.cabins
    from (select cabin_type_id, count(*)::int as cabins from public.reservation_cabins where reservation_id = r.id group by cabin_type_id) c
    where i.departure_id = r.departure_id and i.cabin_type_id = c.cabin_type_id;
    insert into public.notifications (user_id, kind, title, link)
    values (r.customer_id, 'reservation.released', 'Reservation ' || r.reference || ' was cancelled: it wasn''t paid by the deadline',
      '/dashboard/journey/reservations/' || r.id || '/');
    insert into public.notifications (org_id, kind, title, link)
    values (r.org_id, 'reservation.released', 'Reservation ' || r.reference || ' was released: unpaid at the deadline',
      '/dashboard/operator/' || r.org_id || '/bookings/' || r.id || '/');
    n := n + 1;
  end loop;
  return n;
end $$;
revoke execute on function app.release_unpaid() from public, anon, authenticated;
select cron.schedule('nilecruz-release-unpaid', '7 * * * *', 'select app.release_unpaid()');

-- ── Access ───────────────────────────────────────────────────────────────────────────────────────────────
alter table public.premium_periods enable row level security;
alter table public.payments enable row level security;
alter table public.commission_entries enable row level security;
alter table public.payouts enable row level security;

create policy "premium_periods: signed-in read" on public.premium_periods for select to authenticated using (true);
create policy "premium_periods: finance admins write" on public.premium_periods for all to authenticated
  using (app.is_finance_admin()) with check (app.is_finance_admin());
create policy "payments: reservation readers" on public.payments for select to authenticated using (app.can_read_reservation(reservation_id));
create policy "commission_entries: admins and the operator's owners and finance" on public.commission_entries for select to authenticated
  using (app.is_admin() or app.has_org_role(org_id, array['owner', 'finance']::public.team_role[]));
create policy "payouts: admins and the operator's owners and finance" on public.payouts for select to authenticated
  using (app.is_admin() or app.has_org_role(org_id, array['owner', 'finance']::public.team_role[]));

grant select, insert, update, delete on public.premium_periods to authenticated, service_role;
grant select on public.payments, public.commission_entries, public.payouts to authenticated;
grant select, insert, update, delete on public.payments, public.commission_entries, public.payouts to service_role;
revoke all on sequence public.receipt_seq from public, anon, authenticated;

revoke execute on function app.payment_deadline(date, date), app.reservation_paid(uuid), app.after_verified(public.payments), app.next_receipt(),
  app.set_payment_deadline(), app.keep_deadline() from public, anon, authenticated;
grant execute on function app.payment_deadline(date, date) to service_role;
revoke execute on function public.reservation_balance(uuid), public.report_payment(uuid, bigint, text, date, text, text),
  public.verify_payment(uuid, public.payment_status, text), public.record_manual_payment(uuid, bigint, text, text, text, date),
  public.service_card_payment(uuid, text, text, bigint, text), public.service_card_refunded(uuid, text, text, text, bigint, text),
  public.record_payout(uuid, bigint, text, text, text, date, text), public.send_payment_reminder(uuid) from public, anon;
grant execute on function public.reservation_balance(uuid), public.report_payment(uuid, bigint, text, date, text, text),
  public.verify_payment(uuid, public.payment_status, text), public.record_manual_payment(uuid, bigint, text, text, text, date),
  public.record_payout(uuid, bigint, text, text, text, date, text), public.send_payment_reminder(uuid) to authenticated;
revoke execute on function public.service_card_payment(uuid, text, text, bigint, text), public.service_card_refunded(uuid, text, text, text, bigint, text)
  from authenticated;
grant execute on function public.service_card_payment(uuid, text, text, bigint, text), public.service_card_refunded(uuid, text, text, text, bigint, text)
  to service_role;

create trigger audit_premium_periods after insert or update or delete on public.premium_periods for each row execute function app.audit_row();
create trigger audit_payments after insert or update or delete on public.payments for each row execute function app.audit_row();
create trigger audit_payouts after insert or update or delete on public.payouts for each row execute function app.audit_row();
