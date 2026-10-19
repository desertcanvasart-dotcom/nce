-- Batch 4f-2c: tour orders (DASH-PAY-014, DATA-027, DATA-041, ADR-087).
-- A customer orders places on a bookable session. The places are held for 60 minutes while they pay by card through
-- Stripe; the payment is recorded only from the signed webhook. Tours are Nilecruz's own: no commission and no operator
-- payable, and a tour payment never touches a cruise reservation (separate tables). Cancellation follows the tour's own
-- bands; a finance admin approves it and the refund goes back through Stripe or is recorded as made outside the system.

create type public.tour_order_status as enum ('awaiting_payment', 'confirmed', 'cancelled');
create type public.tour_cancel_state as enum ('requested', 'refused', 'approved');

create table public.tour_orders (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique check (reference ~ '^NT-[A-HJ-NP-Z2-9]{6}$'),
  customer_id uuid not null references auth.users (id) on delete restrict,
  tour_id uuid not null references public.tours (id) on delete restrict,
  session_id uuid not null references public.tour_sessions (id) on delete restrict,
  status public.tour_order_status not null default 'awaiting_payment',
  -- Every guest's age on the day; capacity counts every guest, under-3s travel free on per-guest prices (ADR-087).
  ages smallint[] not null check (cardinality(ages) between 1 and 500),
  lead_name text not null check (length(trim(lead_name)) between 2 and 160),
  -- Pickup place, flight number and time, or anything the guide needs.
  notes text check (length(notes) <= 1000),
  currency public.currency_code not null check (currency in ('USD', 'EUR')),
  total_minor bigint not null check (total_minor > 0),
  -- The tour's cancellation bands and wording as accepted when ordering (like a reservation's policy).
  policy jsonb not null,
  hold_until timestamptz not null,
  cancelled_at timestamptz,
  cancelled_reason text check (length(cancelled_reason) <= 500),
  -- Cancellation, decided by a finance admin. The charge is fixed on the Cairo day the request arrives.
  cancel_state public.tour_cancel_state,
  cancel_reason text check (length(cancel_reason) <= 1000),
  cancel_requested_on date,
  cancel_days_before integer,
  cancel_percent integer check (cancel_percent between 0 and 100),
  cancel_charge_minor bigint,
  cancel_refund_minor bigint,
  cancel_note text check (length(cancel_note) <= 1000),
  cancel_decided_by uuid references auth.users (id) on delete set null,
  cancel_decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tour_orders_customer_idx on public.tour_orders (customer_id, created_at desc);
create index tour_orders_session_idx on public.tour_orders (session_id);
create trigger tour_orders_updated_at before update on public.tour_orders for each row execute function app.set_updated_at();

create table public.tour_payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.tour_orders (id) on delete restrict,
  status public.payment_status not null check (status in ('verified', 'refunded')),
  amount_minor bigint not null check (amount_minor > 0),
  currency public.currency_code not null,
  stripe_session_id text unique,
  stripe_payment_intent_id text not null unique,
  stripe_refund_id text unique,
  receipt_number text unique check (receipt_number ~ '^NCR-[0-9]{4}-[0-9]{6}$'),
  note text check (length(note) <= 500),
  created_at timestamptz not null default now(),
  check (status <> 'verified' or receipt_number is not null)
);
create index tour_payments_order_idx on public.tour_payments (order_id);

create table public.tour_refunds (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.tour_orders (id) on delete restrict,
  payment_id uuid not null references public.tour_payments (id) on delete restrict,
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
create index tour_refunds_order_idx on public.tour_refunds (order_id);

create or replace function app.new_tour_reference() returns text
language plpgsql volatile set search_path = '' as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  ref text;
begin
  loop
    ref := 'NT-' || (select string_agg(substr(alphabet, 1 + (get_byte(b, i) % 32), 1), '')
                     from (select extensions.gen_random_bytes(6) b) x, generate_series(0, 5) i);
    exit when not exists (select 1 from public.tour_orders where reference = ref);
  end loop;
  return ref;
end $$;

-- Places taken on a session: confirmed orders, and unpaid ones still within their hold.
create or replace function app.session_taken(sess uuid) returns integer
language sql stable security definer set search_path = '' as $$
  select coalesce(sum(cardinality(o.ages)), 0)::int from public.tour_orders o
  where o.session_id = sess and (o.status = 'confirmed' or (o.status = 'awaiting_payment' and o.hold_until > now()));
$$;
create or replace function app.session_active_orders(sess uuid) returns integer
language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.tour_orders o
  where o.session_id = sess and (o.status = 'confirmed' or (o.status = 'awaiting_payment' and o.hold_until > now()));
$$;

-- What anyone may see about a session: places left (a private session is one party's or no one's).
create or replace function public.session_places_left(sess uuid) returns integer
language sql stable security definer set search_path = '' as $$
  select case when s.kind = 'private' then case when app.session_active_orders(s.id) > 0 then 0 else s.capacity end
              else greatest(s.capacity - app.session_taken(s.id), 0) end
  from public.tour_sessions s where s.id = sess;
$$;

-- ── Customer: order places (DASH-PAY-014). Mirrors quoteSession in src/lib/tours/tours.ts. ───────────────
create or replace function public.order_tour(sess uuid, guest_ages integer[], lead text, order_notes text, terms_read boolean)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  s public.tour_sessions;
  t public.tours;
  paying integer;
  total bigint;
  new_id uuid;
begin
  if auth.uid() is null then raise exception 'Sign in to order' using errcode = '42501'; end if;
  if not coalesce(terms_read, false) then
    raise exception 'Confirm that you have read the terms and the cancellation policy' using errcode = '22023';
  end if;
  -- One session at a time: the row lock serialises the capacity check.
  select * into s from public.tour_sessions where id = sess for update;
  if s.id is null then raise exception 'Session not found' using errcode = 'P0002'; end if;
  select * into t from public.tours where id = s.tour_id;
  if not public.tour_is_bookable(t.id) or s.status <> 'scheduled' or s.starts_at <= now() then
    raise exception 'This session can''t be booked' using errcode = '22023';
  end if;
  if guest_ages is null or cardinality(guest_ages) = 0 then raise exception 'Add at least one guest' using errcode = '22023'; end if;
  if exists (select 1 from unnest(guest_ages) a where a < 0 or a > 120) then
    raise exception 'Every guest needs an age' using errcode = '22023';
  end if;
  if t.adults_only and exists (select 1 from unnest(guest_ages) a where a < 18) then
    raise exception 'This tour is for adults only (18 and over)' using errcode = '22023';
  end if;
  if s.kind = 'private' then
    if cardinality(guest_ages) > s.capacity then
      raise exception 'This private session takes up to % guests', s.capacity using errcode = '22023';
    end if;
    if app.session_active_orders(s.id) > 0 then raise exception 'This private session is already taken' using errcode = '23514'; end if;
  elsif app.session_taken(s.id) + cardinality(guest_ages) > s.capacity then
    raise exception 'Only % places left', greatest(s.capacity - app.session_taken(s.id), 0) using errcode = '23514';
  end if;
  paying := (select count(*) from unnest(guest_ages) a where a >= 3);
  total := case when s.pricing = 'per_group' then s.price_minor else s.price_minor * paying end;
  if total <= 0 then raise exception 'Guests under 3 travel free but need a paying guest' using errcode = '22023'; end if;
  insert into public.tour_orders (reference, customer_id, tour_id, session_id, ages, lead_name, notes, currency, total_minor, policy, hold_until)
  values (app.new_tour_reference(), auth.uid(), t.id, s.id, guest_ages::smallint[], trim(lead), nullif(trim(order_notes), ''),
    s.currency, total,
    jsonb_build_object('bands', t.cancellation_bands,
      'terms', (select jsonb_object_agg(locale, cancellation_terms) from public.tour_translations
                where tour_id = t.id and cancellation_terms is not null)),
    now() + interval '60 minutes')
  returning id into new_id;
  return new_id;
end $$;

-- ── Card payment, from the signed webhook only (DATA-027, 028) ───────────────────────────────────────────
create or replace function public.service_tour_payment(target uuid, session_id text, intent text, amount bigint, cur text)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  o public.tour_orders;
  s public.tour_sessions;
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception 'Service role only' using errcode = '42501'; end if;
  if exists (select 1 from public.tour_payments where stripe_payment_intent_id = intent) then return 'duplicate'; end if;
  select * into o from public.tour_orders where id = target for update;
  if o.id is null then raise exception 'Tour order not found' using errcode = 'P0002'; end if;
  select * into s from public.tour_sessions where id = o.session_id for update;
  -- Late (hold over and the places gone), cancelled, wrong amount or currency: give it back.
  if o.status <> 'awaiting_payment' or upper(cur) <> o.currency::text or amount <> o.total_minor
     or (o.hold_until <= now() and (
       (s.kind = 'private' and app.session_active_orders(s.id) > 0)
       or (s.kind = 'shared' and app.session_taken(s.id) + cardinality(o.ages) > s.capacity))) then
    return 'refund';
  end if;
  insert into public.tour_payments (order_id, status, amount_minor, currency, stripe_session_id, stripe_payment_intent_id, receipt_number)
  values (o.id, 'verified', amount, upper(cur)::public.currency_code, session_id, intent, app.next_receipt());
  update public.tour_orders set status = 'confirmed' where id = o.id;
  insert into public.notifications (user_id, kind, title, link)
  values (o.customer_id, 'tour.confirmed', 'Tour order ' || o.reference || ' is paid and confirmed', '/dashboard/journey/tours/' || o.id || '/');
  return 'recorded';
end $$;

create or replace function public.service_tour_refunded(target uuid, session_id text, intent text, refund text, amount bigint, cur text)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception 'Service role only' using errcode = '42501'; end if;
  insert into public.tour_payments (order_id, status, amount_minor, currency, stripe_session_id, stripe_payment_intent_id, stripe_refund_id, note)
  values (target, 'refunded', amount, upper(cur)::public.currency_code, session_id, intent, refund,
    'Paid after the order was closed; refunded in full automatically.')
  on conflict (stripe_payment_intent_id) do nothing;
end $$;

-- Unpaid holds past their time are released (places are free anyway once the hold ends). Every 15 minutes.
create or replace function app.release_tour_holds() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  n integer;
begin
  update public.tour_orders set status = 'cancelled', cancelled_at = now(), cancelled_reason = 'Not paid within 60 minutes'
  where status = 'awaiting_payment' and hold_until < now() - interval '15 minutes';
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function app.release_tour_holds() from public, anon, authenticated;
select cron.schedule('nilecruz-release-tour-holds', '*/15 * * * *', 'select app.release_tour_holds()');

-- ── Cancelling a paid order (DASH-PAY-014): the tour's bands, a finance admin decides ─────────────────────
create or replace function app.tour_cancel_quote(o public.tour_orders, on_day date)
returns table (days_before integer, percent integer, charge_minor bigint, paid_minor bigint, refund_minor bigint)
language plpgsql stable security definer set search_path = '' as $$
declare
  starts date;
  pct integer;
  paid bigint;
begin
  select (s.starts_at at time zone 'Africa/Cairo')::date into starts from public.tour_sessions s where s.id = o.session_id;
  days_before := starts - on_day;
  if days_before < 0 then raise exception 'This tour has already taken place' using errcode = '22023'; end if;
  select (b ->> 'percent')::int into pct from jsonb_array_elements(o.policy -> 'bands') b
  where (b ->> 'from_days')::int <= days_before order by (b ->> 'from_days')::int desc limit 1;
  if pct is null then raise exception 'No cancellation band covers this date' using errcode = '22023'; end if;
  paid := coalesce((select sum(amount_minor) from public.tour_payments where order_id = o.id and status = 'verified'), 0);
  percent := pct;
  charge_minor := floor(o.total_minor * pct / 100.0 + 0.5);
  paid_minor := paid;
  refund_minor := greatest(paid - floor(o.total_minor * pct / 100.0 + 0.5)::bigint, 0);
  return next;
end $$;

create or replace function public.tour_cancel_quote(target uuid)
returns table (days_before integer, percent integer, charge_minor bigint, paid_minor bigint, refund_minor bigint)
language plpgsql stable security definer set search_path = '' as $$
declare
  o public.tour_orders;
begin
  select * into o from public.tour_orders where id = target and (customer_id = auth.uid() or app.is_admin());
  if o.id is null or o.status <> 'confirmed' then return; end if;
  return query select * from app.tour_cancel_quote(o, (now() at time zone 'Africa/Cairo')::date);
end $$;

create or replace function public.request_tour_cancellation(target uuid, why text, policy_read boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare
  o public.tour_orders;
  q record;
  today date := (now() at time zone 'Africa/Cairo')::date;
begin
  select * into o from public.tour_orders where id = target for update;
  if o.id is null or o.customer_id <> auth.uid() then raise exception 'Tour order not found' using errcode = 'P0002'; end if;
  if o.status = 'awaiting_payment' then
    -- Nothing paid: cancelling just lets the places go.
    update public.tour_orders set status = 'cancelled', cancelled_at = now(), cancelled_reason = 'Cancelled before payment' where id = o.id;
    return;
  end if;
  if o.status <> 'confirmed' then raise exception 'This order is already cancelled' using errcode = '22023'; end if;
  if o.cancel_state = 'requested' then raise exception 'A cancellation request is already open' using errcode = '22023'; end if;
  if not coalesce(policy_read, false) then
    raise exception 'Confirm that you have read the cancellation policy' using errcode = '22023';
  end if;
  select * into q from app.tour_cancel_quote(o, today);
  update public.tour_orders set cancel_state = 'requested', cancel_reason = nullif(trim(why), ''), cancel_requested_on = today,
    cancel_days_before = q.days_before, cancel_percent = q.percent, cancel_charge_minor = q.charge_minor,
    cancel_refund_minor = q.refund_minor, cancel_note = null, cancel_decided_by = null, cancel_decided_at = null
  where id = o.id;
end $$;

create or replace function public.decide_tour_cancellation(target uuid, approve boolean, note text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare
  o public.tour_orders;
begin
  if not app.is_finance_admin() then raise exception 'Only finance admins decide cancellations' using errcode = '42501'; end if;
  select * into o from public.tour_orders where id = target for update;
  if o.id is null then raise exception 'Tour order not found' using errcode = 'P0002'; end if;
  if o.cancel_state is distinct from 'requested' then raise exception 'No cancellation request is open' using errcode = '22023'; end if;
  if not approve and coalesce(length(trim(note)), 0) < 3 then raise exception 'Give the reason for refusing' using errcode = '22023'; end if;
  update public.tour_orders set
    cancel_state = case when approve then 'approved'::public.tour_cancel_state else 'refused'::public.tour_cancel_state end,
    cancel_note = nullif(trim(note), ''), cancel_decided_by = auth.uid(), cancel_decided_at = now(),
    status = case when approve then 'cancelled'::public.tour_order_status else status end,
    cancelled_at = case when approve then now() else cancelled_at end,
    cancelled_reason = case when approve then 'Cancelled at the customer''s request' else cancelled_reason end
  where id = o.id;
  insert into public.notifications (user_id, kind, title, link)
  values (o.customer_id, case when approve then 'tour.cancelled' else 'tour.cancellation_refused' end,
    case when approve then 'Tour order ' || o.reference || ' is cancelled' ||
           case when o.cancel_refund_minor > 0 then '; your refund is being issued' else '' end
         else 'Your cancellation request for tour order ' || o.reference || ' was not accepted' end,
    '/dashboard/journey/tours/' || o.id || '/');
end $$;

create or replace function app.tour_refunded(target uuid) returns bigint
language sql stable security definer set search_path = '' as $$
  select coalesce(sum(amount_minor), 0)::bigint from public.tour_refunds where order_id = target;
$$;

-- Service role only: a Stripe refund the server issued for an approved cancellation.
create or replace function public.service_record_tour_refund(target uuid, pay uuid, amount bigint, refund text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  o public.tour_orders;
  p public.tour_payments;
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception 'Service role only' using errcode = '42501'; end if;
  if exists (select 1 from public.tour_refunds where stripe_refund_id = refund) then return; end if;
  select * into o from public.tour_orders where id = target for update;
  select * into p from public.tour_payments where id = pay;
  if o.id is null or p.id is null or p.order_id <> o.id or p.status <> 'verified' or o.cancel_state is distinct from 'approved'
     or amount > o.cancel_refund_minor - app.tour_refunded(o.id) then
    raise exception 'Refund doesn''t match the order' using errcode = '22023';
  end if;
  insert into public.tour_refunds (order_id, payment_id, method, amount_minor, currency, stripe_refund_id, how, reference)
  values (o.id, p.id, 'stripe', amount, p.currency, refund, 'Card (Stripe)', refund);
end $$;

-- Finance admin: a refund made outside the system.
create or replace function public.record_tour_manual_refund(target uuid, amount bigint, how text, ref text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  o public.tour_orders;
  p public.tour_payments;
begin
  if not app.is_finance_admin() then raise exception 'Only finance admins record refunds' using errcode = '42501'; end if;
  if coalesce(length(trim(how)), 0) < 2 or coalesce(length(trim(ref)), 0) < 2 then
    raise exception 'Give how the refund was made and its reference' using errcode = '22023';
  end if;
  select * into o from public.tour_orders where id = target for update;
  if o.id is null or o.cancel_state is distinct from 'approved' then raise exception 'No refund is due on this order' using errcode = '22023'; end if;
  if amount <= 0 or amount > o.cancel_refund_minor - app.tour_refunded(o.id) then
    raise exception 'The amount is more than is still due' using errcode = '22023';
  end if;
  select * into p from public.tour_payments where order_id = o.id and status = 'verified' order by created_at desc limit 1;
  insert into public.tour_refunds (order_id, payment_id, method, amount_minor, currency, how, reference)
  values (o.id, p.id, 'manual', amount, p.currency, trim(how), trim(ref));
end $$;

-- ── Access ───────────────────────────────────────────────────────────────────────────────────────────────
alter table public.tour_orders enable row level security;
alter table public.tour_payments enable row level security;
alter table public.tour_refunds enable row level security;
create policy "tour_orders: the customer and admins" on public.tour_orders for select to authenticated
  using (customer_id = auth.uid() or app.is_admin());
create policy "tour_payments: with the order" on public.tour_payments for select to authenticated
  using (exists (select 1 from public.tour_orders o where o.id = order_id and (o.customer_id = auth.uid() or app.is_admin())));
create policy "tour_refunds: with the order" on public.tour_refunds for select to authenticated
  using (exists (select 1 from public.tour_orders o where o.id = order_id and (o.customer_id = auth.uid() or app.is_admin())));
grant select on public.tour_orders, public.tour_payments, public.tour_refunds to authenticated;
grant select, insert, update, delete on public.tour_orders, public.tour_payments, public.tour_refunds to service_role;

revoke execute on function app.new_tour_reference(), app.session_taken(uuid), app.session_active_orders(uuid),
  app.tour_cancel_quote(public.tour_orders, date), app.tour_refunded(uuid) from public, anon, authenticated;
revoke execute on function public.session_places_left(uuid), public.order_tour(uuid, integer[], text, text, boolean),
  public.service_tour_payment(uuid, text, text, bigint, text), public.service_tour_refunded(uuid, text, text, text, bigint, text),
  public.tour_cancel_quote(uuid), public.request_tour_cancellation(uuid, text, boolean), public.decide_tour_cancellation(uuid, boolean, text),
  public.service_record_tour_refund(uuid, uuid, bigint, text), public.record_tour_manual_refund(uuid, bigint, text, text) from public, anon;
grant execute on function public.session_places_left(uuid) to anon, authenticated, service_role;
grant execute on function public.order_tour(uuid, integer[], text, text, boolean), public.tour_cancel_quote(uuid),
  public.request_tour_cancellation(uuid, text, boolean), public.decide_tour_cancellation(uuid, boolean, text),
  public.record_tour_manual_refund(uuid, bigint, text, text) to authenticated;
revoke execute on function public.service_tour_payment(uuid, text, text, bigint, text), public.service_tour_refunded(uuid, text, text, text, bigint, text),
  public.service_record_tour_refund(uuid, uuid, bigint, text) from authenticated;
grant execute on function public.service_tour_payment(uuid, text, text, bigint, text), public.service_tour_refunded(uuid, text, text, text, bigint, text),
  public.service_record_tour_refund(uuid, uuid, bigint, text) to service_role;

create trigger audit_tour_orders after insert or update or delete on public.tour_orders for each row execute function app.audit_row();
create trigger audit_tour_payments after insert or update or delete on public.tour_payments for each row execute function app.audit_row();
create trigger audit_tour_refunds after insert or update or delete on public.tour_refunds for each row execute function app.audit_row();
