-- Batch 4f-2a: cancellation requests and refunds (DASH-PAY-011, 012, DASH-CUS-010, DASH-OPR-015, DASH-ADM-005, 095,
-- 104, 105, DATA-029, 036, 037, ADR-026, ADR-089).
-- The charge is fixed on the Cairo day the request arrives, from the policy accepted at booking. The operator confirms or
-- contests the figures; a finance admin decides. Refunds are issued through Stripe (by the server, after approval) or
-- recorded as made outside the system, and each one reverses commission and payable in proportion (DASH-BND-008).

-- ── The calculation (mirrors src/lib/payments/cancellation.ts) ───────────────────────────────────────────
create or replace function app.cancellation_quote(res uuid, on_day date)
returns table (days_before integer, percent integer, total_minor bigint, paid_minor bigint, charge_minor bigint,
  refund_minor bigint, unpaid_charge_minor bigint)
language plpgsql stable security definer set search_path = '' as $$
declare
  r public.reservations;
  departs date;
  pct integer;
  charge bigint;
  paid bigint;
begin
  select * into r from public.reservations where id = res;
  if r.id is null then raise exception 'Reservation not found' using errcode = 'P0002'; end if;
  select d.departs_on into departs from public.departures d where d.id = r.departure_id;
  days_before := departs - on_day;
  if days_before < 0 then raise exception 'This sailing has already left' using errcode = '22023'; end if;
  select (b ->> 'percent')::int into pct
  from jsonb_array_elements(r.policy -> 'bands') b
  where (b ->> 'from_days')::int <= days_before
  order by (b ->> 'from_days')::int desc
  limit 1;
  if pct is null then raise exception 'No cancellation band covers this date' using errcode = '22023'; end if;
  charge := floor(r.total_minor * pct / 100.0 + 0.5);
  paid := app.reservation_paid(r.id);
  percent := pct;
  total_minor := r.total_minor;
  paid_minor := paid;
  charge_minor := charge;
  refund_minor := greatest(paid - charge, 0);
  unpaid_charge_minor := greatest(charge - paid, 0);
  return next;
end $$;

-- What cancelling today would cost, for anyone who can read the reservation.
create or replace function public.cancellation_quote(res uuid)
returns table (days_before integer, percent integer, total_minor bigint, paid_minor bigint, charge_minor bigint,
  refund_minor bigint, unpaid_charge_minor bigint)
language sql stable security definer set search_path = '' as $$
  select q.* from app.cancellation_quote(res, (now() at time zone 'Africa/Cairo')::date) q
  where app.can_read_reservation(res);
$$;

-- ── Requests ─────────────────────────────────────────────────────────────────────────────────────────────
create type public.cancellation_status as enum ('requested', 'withdrawn', 'rejected', 'refund_due', 'closed');
create type public.operator_review as enum ('pending', 'confirmed', 'contested');
create table public.cancellation_requests (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations (id) on delete restrict,
  status public.cancellation_status not null default 'requested',
  reason text check (length(reason) <= 1000),
  requested_by uuid references auth.users (id) on delete set null,
  requested_on date not null,
  -- The quote as given on the day of the request. Paid, refund and unpaid charge are refreshed when an admin decides.
  days_before integer not null check (days_before >= 0),
  percent integer not null check (percent between 0 and 100),
  currency public.currency_code not null,
  total_minor bigint not null check (total_minor > 0),
  charge_minor bigint not null check (charge_minor >= 0),
  paid_minor bigint not null check (paid_minor >= 0),
  refund_minor bigint not null check (refund_minor >= 0),
  unpaid_charge_minor bigint not null check (unpaid_charge_minor >= 0),
  operator_review public.operator_review not null default 'pending',
  operator_note text check (length(operator_note) <= 1000),
  operator_reviewed_by uuid references auth.users (id) on delete set null,
  operator_reviewed_at timestamptz,
  decided_by uuid references auth.users (id) on delete set null,
  decided_at timestamptz,
  decision_note text check (length(decision_note) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (operator_review = 'pending' or operator_reviewed_at is not null),
  check (status in ('requested', 'withdrawn') or decided_at is not null)
);
-- One open request per reservation.
create unique index cancellation_requests_open_idx on public.cancellation_requests (reservation_id)
  where status in ('requested', 'refund_due');
create index cancellation_requests_status_idx on public.cancellation_requests (status, created_at);
create trigger cancellation_requests_updated_at before update on public.cancellation_requests for each row execute function app.set_updated_at();

-- ── Refunds: each one against the payment it gives back ─────────────────────────────────────────────────
create type public.refund_method as enum ('stripe', 'manual');
create table public.refunds (
  id uuid primary key default gen_random_uuid(),
  cancellation_id uuid not null references public.cancellation_requests (id) on delete restrict,
  reservation_id uuid not null references public.reservations (id) on delete restrict,
  payment_id uuid not null references public.payments (id) on delete restrict,
  method public.refund_method not null,
  amount_minor bigint not null check (amount_minor > 0),
  currency public.currency_code not null,
  stripe_refund_id text unique,
  how text check (length(how) <= 80),
  reference text check (length(reference) <= 200),
  recorded_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  check (method <> 'stripe' or stripe_refund_id is not null)
);
create index refunds_reservation_idx on public.refunds (reservation_id);
create index refunds_payment_idx on public.refunds (payment_id);

create or replace function app.payment_refunded(pay uuid) returns bigint
language sql stable security definer set search_path = '' as $$
  select coalesce(sum(amount_minor), 0)::bigint from public.refunds where payment_id = pay;
$$;
create or replace function app.reservation_refunded(res uuid) returns bigint
language sql stable security definer set search_path = '' as $$
  select coalesce(sum(amount_minor), 0)::bigint from public.refunds where reservation_id = res;
$$;
create or replace function app.cancellation_refunded(target uuid) returns bigint
language sql stable security definer set search_path = '' as $$
  select coalesce(sum(amount_minor), 0)::bigint from public.refunds where cancellation_id = target;
$$;

-- The balance now also shows what was given back.
drop function public.reservation_balance(uuid);
create or replace function public.reservation_balance(res uuid)
returns table (total_minor bigint, paid_minor bigint, outstanding_minor bigint, reported_minor bigint, refunded_minor bigint,
  currency text, payment_due_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select r.total_minor, app.reservation_paid(r.id),
    case when r.status = 'cancelled' then 0 else greatest(r.total_minor - app.reservation_paid(r.id), 0) end,
    coalesce((select sum(p.amount_minor) from public.payments p where p.reservation_id = r.id and p.status = 'reported'), 0)::bigint,
    app.reservation_refunded(r.id), r.currency::text, r.payment_due_at
  from public.reservations r where r.id = res and app.can_read_reservation(r.id);
$$;

-- One part of a refund: the row, its proportional commission reversal, and closing the request when it's all given back.
create or replace function app.record_refund_part(c public.cancellation_requests, p public.payments, amount bigint,
  how_method public.refund_method, stripe_id text, how_text text, ref text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  r public.reservations;
  original public.commission_entries;
  commission bigint;
  refunded bigint;
begin
  select * into r from public.reservations where id = c.reservation_id;
  insert into public.refunds (cancellation_id, reservation_id, payment_id, method, amount_minor, currency, stripe_refund_id, how, reference)
  values (c.id, c.reservation_id, p.id, how_method, amount, p.currency, stripe_id, nullif(trim(how_text), ''), nullif(trim(ref), ''));
  select * into original from public.commission_entries where payment_id = p.id and kind = 'payment' limit 1;
  if original.id is not null then
    commission := floor(original.commission_minor * amount::numeric / p.amount_minor + 0.5);
    insert into public.commission_entries (payment_id, reservation_id, org_id, kind, currency, base_minor, commission_bp, commission_minor, payable_minor)
    values (p.id, r.id, r.org_id, 'reversal', p.currency, -amount, original.commission_bp, -commission, -(amount - commission));
  end if;
  refunded := app.cancellation_refunded(c.id);
  if refunded >= c.refund_minor then
    update public.cancellation_requests set status = 'closed' where id = c.id;
    insert into public.notifications (user_id, kind, title, link)
    values (r.customer_id, 'cancellation.refunded', 'Your refund for reservation ' || r.reference || ' has been issued',
      '/dashboard/journey/reservations/' || r.id || '/');
  end if;
end $$;

-- ── Customer: ask to cancel (DASH-CUS-010, DASH-PAY-013) ────────────────────────────────────────────────
create or replace function public.request_cancellation(res uuid, why text, policy_read boolean) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  r public.reservations;
  q record;
  today date := (now() at time zone 'Africa/Cairo')::date;
  new_id uuid;
begin
  select * into r from public.reservations where id = res for update;
  if r.id is null or r.customer_id <> auth.uid() then raise exception 'Reservation not found' using errcode = 'P0002'; end if;
  if r.status = 'cancelled' then raise exception 'This reservation is already cancelled' using errcode = '22023'; end if;
  if not coalesce(policy_read, false) then
    raise exception 'Confirm that you have read the cancellation policy' using errcode = '22023';
  end if;
  if exists (select 1 from public.cancellation_requests where reservation_id = res and status in ('requested', 'refund_due')) then
    raise exception 'A cancellation request is already open for this reservation' using errcode = '22023';
  end if;
  select * into q from app.cancellation_quote(res, today);
  insert into public.cancellation_requests (reservation_id, reason, requested_by, requested_on, days_before, percent, currency,
    total_minor, charge_minor, paid_minor, refund_minor, unpaid_charge_minor)
  values (res, nullif(trim(why), ''), auth.uid(), today, q.days_before, q.percent, r.currency, q.total_minor, q.charge_minor,
    q.paid_minor, q.refund_minor, q.unpaid_charge_minor)
  returning id into new_id;
  insert into public.notifications (org_id, kind, title, link)
  values (r.org_id, 'cancellation.requested', 'Cancellation requested for reservation ' || r.reference || ': please check the figures',
    '/dashboard/operator/' || r.org_id || '/bookings/' || r.id || '/');
  return new_id;
end $$;

create or replace function public.withdraw_cancellation(target uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  c public.cancellation_requests;
begin
  select * into c from public.cancellation_requests where id = target for update;
  if c.id is null or not exists (select 1 from public.reservations r where r.id = c.reservation_id and r.customer_id = auth.uid()) then
    raise exception 'Cancellation request not found' using errcode = 'P0002';
  end if;
  if c.status <> 'requested' then raise exception 'This request has already been decided' using errcode = '22023'; end if;
  update public.cancellation_requests set status = 'withdrawn' where id = c.id;
end $$;

-- ── Operator: confirm or contest the figures (DASH-OPR-015). Never releases money (ADR-089). ─────────────
create or replace function public.review_cancellation(target uuid, agree boolean, review_note text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare
  c public.cancellation_requests;
  r public.reservations;
begin
  select * into c from public.cancellation_requests where id = target for update;
  select * into r from public.reservations where id = c.reservation_id;
  if c.id is null or not app.has_org_role(r.org_id, array['owner', 'reservations', 'finance']::public.team_role[]) then
    raise exception 'Cancellation request not found' using errcode = 'P0002';
  end if;
  if c.status <> 'requested' then raise exception 'This request has already been decided' using errcode = '22023'; end if;
  if not agree and coalesce(length(trim(review_note)), 0) < 3 then
    raise exception 'Say what is wrong with the figures' using errcode = '22023';
  end if;
  update public.cancellation_requests
  set operator_review = case when agree then 'confirmed'::public.operator_review else 'contested'::public.operator_review end,
    operator_note = nullif(trim(review_note), ''), operator_reviewed_by = auth.uid(), operator_reviewed_at = now()
  where id = c.id;
end $$;

-- ── Finance admin: decide (DASH-ADM-095, 104, DATA-029) ─────────────────────────────────────────────────
-- Approving cancels the reservation and returns its cabins. The refund is refreshed against what has been received by now;
-- the charge stays as quoted on the day of the request.
create or replace function public.decide_cancellation(target uuid, approve boolean, note text default null)
returns public.cancellation_status
language plpgsql security definer set search_path = '' as $$
declare
  c public.cancellation_requests;
  r public.reservations;
  paid bigint;
  outcome public.cancellation_status;
begin
  if not app.is_finance_admin() then raise exception 'Only finance admins decide cancellations' using errcode = '42501'; end if;
  select * into c from public.cancellation_requests where id = target for update;
  if c.id is null then raise exception 'Cancellation request not found' using errcode = 'P0002'; end if;
  if c.status <> 'requested' then raise exception 'This request has already been decided' using errcode = '22023'; end if;
  select * into r from public.reservations where id = c.reservation_id for update;

  if not approve then
    if coalesce(length(trim(note)), 0) < 3 then raise exception 'Give the reason for refusing' using errcode = '22023'; end if;
    update public.cancellation_requests set status = 'rejected', decided_by = auth.uid(), decided_at = now(), decision_note = trim(note)
    where id = c.id;
    insert into public.notifications (user_id, kind, title, link)
    values (r.customer_id, 'cancellation.rejected', 'Your cancellation request for reservation ' || r.reference || ' was not accepted',
      '/dashboard/journey/reservations/' || r.id || '/');
    return 'rejected';
  end if;

  paid := app.reservation_paid(r.id);
  outcome := case when greatest(paid - c.charge_minor, 0) > 0 then 'refund_due'::public.cancellation_status else 'closed'::public.cancellation_status end;
  update public.cancellation_requests
  set status = outcome, paid_minor = paid, refund_minor = greatest(paid - c.charge_minor, 0),
    unpaid_charge_minor = greatest(c.charge_minor - paid, 0), decided_by = auth.uid(), decided_at = now(),
    decision_note = nullif(trim(note), '')
  where id = c.id;
  if r.status <> 'cancelled' then
    update public.reservations set status = 'cancelled', cancelled_at = now(), cancelled_reason = 'Cancelled at the customer''s request'
    where id = r.id;
    update public.inventory i set available = i.available + x.cabins
    from (select cabin_type_id, count(*)::int as cabins from public.reservation_cabins where reservation_id = r.id group by cabin_type_id) x
    where i.departure_id = r.departure_id and i.cabin_type_id = x.cabin_type_id;
  end if;
  insert into public.notifications (user_id, kind, title, link)
  values (r.customer_id, 'cancellation.approved', 'Reservation ' || r.reference || ' is cancelled' ||
    case when outcome = 'refund_due' then '; your refund is being issued' else '' end,
    '/dashboard/journey/reservations/' || r.id || '/');
  insert into public.notifications (org_id, kind, title, link)
  values (r.org_id, 'cancellation.approved', 'Reservation ' || r.reference || ' was cancelled at the customer''s request',
    '/dashboard/operator/' || r.org_id || '/bookings/' || r.id || '/');
  return outcome;
end $$;

-- What can still be given back through Stripe, card payments first and newest first, up to what is due.
create or replace function public.stripe_refund_plan(target uuid)
returns table (payment_id uuid, payment_intent text, currency text, amount_minor bigint)
language plpgsql stable security definer set search_path = '' as $$
declare
  c public.cancellation_requests;
  due bigint;
  p record;
  part bigint;
begin
  if not app.is_finance_admin() then raise exception 'Only finance admins issue refunds' using errcode = '42501'; end if;
  select * into c from public.cancellation_requests where id = target;
  if c.id is null or c.status <> 'refund_due' then return; end if;
  due := c.refund_minor - app.cancellation_refunded(c.id);
  for p in
    select x.id, x.stripe_payment_intent_id, x.currency, x.amount_minor - app.payment_refunded(x.id) as left_minor
    from public.payments x
    where x.reservation_id = c.reservation_id and x.status = 'verified' and x.method = 'card'
    order by x.created_at desc
  loop
    exit when due <= 0;
    part := least(due, p.left_minor);
    if part > 0 then
      payment_id := p.id; payment_intent := p.stripe_payment_intent_id; currency := p.currency::text; amount_minor := part;
      due := due - part;
      return next;
    end if;
  end loop;
end $$;

-- Service role only: a Stripe refund the server has just issued for an approved request.
create or replace function public.service_record_stripe_refund(target uuid, pay uuid, amount bigint, refund text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  c public.cancellation_requests;
  p public.payments;
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception 'Service role only' using errcode = '42501'; end if;
  if exists (select 1 from public.refunds where stripe_refund_id = refund) then return; end if;
  select * into c from public.cancellation_requests where id = target for update;
  select * into p from public.payments where id = pay;
  if c.id is null or p.id is null or p.reservation_id <> c.reservation_id or p.method <> 'card' or p.status <> 'verified' then
    raise exception 'Refund doesn''t match the request' using errcode = '22023';
  end if;
  if c.status <> 'refund_due' or amount > c.refund_minor - app.cancellation_refunded(c.id) or amount > p.amount_minor - app.payment_refunded(p.id) then
    raise exception 'More than is due' using errcode = '22023';
  end if;
  perform app.record_refund_part(c, p, amount, 'stripe', refund, 'Card (Stripe)', refund);
end $$;

-- Finance admin: a refund made outside the system (bank transfer, cash), spread over the payments newest first.
create or replace function public.record_manual_refund(target uuid, amount bigint, how text, ref text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  c public.cancellation_requests;
  p public.payments;
  left_minor bigint := amount;
  part bigint;
begin
  if not app.is_finance_admin() then raise exception 'Only finance admins record refunds' using errcode = '42501'; end if;
  if coalesce(length(trim(how)), 0) < 2 or coalesce(length(trim(ref)), 0) < 2 then
    raise exception 'Give how the refund was made and its reference' using errcode = '22023';
  end if;
  select * into c from public.cancellation_requests where id = target for update;
  if c.id is null then raise exception 'Cancellation request not found' using errcode = 'P0002'; end if;
  if c.status <> 'refund_due' then raise exception 'No refund is due on this request' using errcode = '22023'; end if;
  if amount <= 0 or amount > c.refund_minor - app.cancellation_refunded(c.id) then
    raise exception 'The amount is more than is still due' using errcode = '22023';
  end if;
  for p in
    select * from public.payments where reservation_id = c.reservation_id and status = 'verified' order by created_at desc
  loop
    exit when left_minor <= 0;
    part := least(left_minor, p.amount_minor - app.payment_refunded(p.id));
    if part > 0 then
      perform app.record_refund_part(c, p, part, 'manual', null, how, ref);
      left_minor := left_minor - part;
      select * into c from public.cancellation_requests where id = target;
    end if;
  end loop;
end $$;

-- An open request waits for the admin rather than being released at the deadline (DATA-040).
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
      and not exists (select 1 from public.cancellation_requests c where c.reservation_id = x.id and c.status = 'requested')
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

-- ── Access ───────────────────────────────────────────────────────────────────────────────────────────────
alter table public.cancellation_requests enable row level security;
alter table public.refunds enable row level security;
create policy "cancellation_requests: reservation readers" on public.cancellation_requests for select to authenticated
  using (app.can_read_reservation(reservation_id));
create policy "refunds: reservation readers" on public.refunds for select to authenticated
  using (app.can_read_reservation(reservation_id));
grant select on public.cancellation_requests, public.refunds to authenticated;
grant select, insert, update, delete on public.cancellation_requests, public.refunds to service_role;

revoke execute on function app.cancellation_quote(uuid, date), app.payment_refunded(uuid), app.reservation_refunded(uuid),
  app.cancellation_refunded(uuid),
  app.record_refund_part(public.cancellation_requests, public.payments, bigint, public.refund_method, text, text, text)
  from public, anon, authenticated;
grant execute on function app.cancellation_quote(uuid, date) to service_role;
revoke execute on function public.cancellation_quote(uuid), public.reservation_balance(uuid), public.request_cancellation(uuid, text, boolean),
  public.withdraw_cancellation(uuid), public.review_cancellation(uuid, boolean, text), public.decide_cancellation(uuid, boolean, text),
  public.stripe_refund_plan(uuid), public.service_record_stripe_refund(uuid, uuid, bigint, text),
  public.record_manual_refund(uuid, bigint, text, text) from public, anon;
grant execute on function public.cancellation_quote(uuid), public.reservation_balance(uuid), public.request_cancellation(uuid, text, boolean),
  public.withdraw_cancellation(uuid), public.review_cancellation(uuid, boolean, text), public.decide_cancellation(uuid, boolean, text),
  public.stripe_refund_plan(uuid), public.record_manual_refund(uuid, bigint, text, text) to authenticated;
revoke execute on function public.service_record_stripe_refund(uuid, uuid, bigint, text) from authenticated;
grant execute on function public.service_record_stripe_refund(uuid, uuid, bigint, text) to service_role;

create trigger audit_cancellation_requests after insert or update or delete on public.cancellation_requests for each row execute function app.audit_row();
create trigger audit_refunds after insert or update or delete on public.refunds for each row execute function app.audit_row();
