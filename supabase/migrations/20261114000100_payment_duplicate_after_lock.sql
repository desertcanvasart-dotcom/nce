-- A card payment's webhook can arrive twice at the same moment (Stripe delivers at least once, and retries overlap).
-- Both functions looked for "already recorded?" BEFORE taking the row lock. The second delivery passed that check,
-- waited on the lock while the first recorded the payment and confirmed the booking, then woke, saw a booking "no
-- longer waiting" and answered 'refund': the customer's money went back while the booking stayed confirmed and paid.
--
-- The check now runs AFTER the lock. Under READ COMMITTED each statement sees what was committed before it started, so
-- once the lock is granted the first delivery's payment row is visible and the second answers 'duplicate'.
-- Nothing else in either function changes (DATA-027, DATA-028).

create or replace function public.service_card_payment(res uuid, session_id text, intent text, amount bigint, cur text)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  r public.reservations;
  p public.payments;
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception 'Service role only' using errcode = '42501'; end if;
  select * into r from public.reservations where id = res for update;
  -- After the lock, never before it: a delivery that waited here must see the payment the other one recorded.
  if exists (select 1 from public.payments where stripe_payment_intent_id = intent) then return 'duplicate'; end if;
  if r.id is null then raise exception 'Reservation not found' using errcode = 'P0002'; end if;
  if r.status <> 'awaiting_payment' or upper(cur) <> r.currency::text then return 'refund'; end if;
  insert into public.payments (reservation_id, method, status, amount_minor, currency, paid_on, stripe_session_id, stripe_payment_intent_id,
    verified_at, receipt_number)
  values (res, 'card', 'verified', amount, upper(cur), (now() at time zone 'Africa/Cairo')::date, session_id, intent, now(), app.next_receipt())
  returning * into p;
  perform app.after_verified(p);
  return 'recorded';
end $$;

create or replace function public.service_tour_payment(target uuid, session_id text, intent text, amount bigint, cur text)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  o public.tour_orders;
  s public.tour_sessions;
  r public.tour_rates;
  gone boolean := false;
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception 'Service role only' using errcode = '42501'; end if;
  select * into o from public.tour_orders where id = target for update;
  -- After the lock, never before it: a delivery that waited here must see the payment the other one recorded.
  if exists (select 1 from public.tour_payments where stripe_payment_intent_id = intent) then return 'duplicate'; end if;
  if o.id is null then raise exception 'Tour order not found' using errcode = 'P0002'; end if;
  if o.session_id is not null then
    select * into s from public.tour_sessions where id = o.session_id for update;
    gone := o.hold_until <= now() and (
      (s.kind = 'private' and app.session_active_orders(s.id) > 0)
      or (s.kind = 'shared' and app.session_taken(s.id) + cardinality(o.ages) > s.capacity));
  else
    perform pg_advisory_xact_lock(hashtextextended(o.rate_id::text || '@' || o.starts_at::text, 0));
    select * into r from public.tour_rates where id = o.rate_id;
    gone := exists (select 1 from public.tour_slot_closures c where c.rate_id = o.rate_id and c.starts_at = o.starts_at)
      or (o.hold_until <= now() and r.mode = 'shared' and app.slot_taken(r.id, o.starts_at) + cardinality(o.ages) > r.max_guests);
  end if;
  -- Late (hold over and the places gone), closed, cancelled, wrong amount or currency: give it back.
  if o.status <> 'awaiting_payment' or upper(cur) <> o.currency::text or amount <> o.total_minor or gone then
    return 'refund';
  end if;
  insert into public.tour_payments (order_id, status, amount_minor, currency, stripe_session_id, stripe_payment_intent_id, receipt_number)
  values (o.id, 'verified', amount, upper(cur)::public.currency_code, session_id, intent, app.next_receipt());
  update public.tour_orders set status = 'confirmed' where id = o.id;
  insert into public.notifications (user_id, kind, title, link)
  values (o.customer_id, 'tour.confirmed', 'Tour order ' || o.reference || ' is paid and confirmed', '/dashboard/journey/tours/' || o.id || '/');
  return 'recorded';
end $$;
