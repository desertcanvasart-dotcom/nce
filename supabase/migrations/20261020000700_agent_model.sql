-- ADR-094 (Faris, 20 Oct 2026): Nilecruz acts as the operators' booking agent, and an unpaid booking owes no
-- cancellation charge.
--
-- Agent model: the operator sells the cruise. Nilecruz takes the booking and the payment on the operator's behalf and
-- keeps its commission. Each reservation keeps the seller's name as it was at booking (customers can't read companies),
-- for the booking record and receipts.
--
-- Unpaid bookings: the policy charge only ever comes out of what was paid. Paid beyond the charge is refunded; nothing
-- is owed on top, so the unpaid charge is always zero (kept as a column, now constrained).

alter table public.reservations add column seller_name text check (length(seller_name) <= 200);

create or replace function app.set_seller_name() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.seller_name := (select coalesce(nullif(trim(o.legal_name), ''), o.display_name) from public.organisations o where o.id = new.org_id);
  return new;
end $$;
create trigger reservations_seller_name before insert on public.reservations
  for each row execute function app.set_seller_name();
update public.reservations r set seller_name = (
  select coalesce(nullif(trim(o.legal_name), ''), o.display_name) from public.organisations o where o.id = r.org_id);

update public.cancellation_requests set unpaid_charge_minor = 0 where unpaid_charge_minor <> 0;
alter table public.cancellation_requests add constraint no_unpaid_charge check (unpaid_charge_minor = 0);

-- ── The calculation, as before but never with an unpaid charge (mirrors src/lib/payments/cancellation.ts) ──
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
  unpaid_charge_minor := 0; -- ADR-094: the charge only ever comes out of what was paid
  return next;
end $$;


-- ── Deciding: as before, with no unpaid charge recorded ─────────────────────────────────────────────────
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
    unpaid_charge_minor = 0, decided_by = auth.uid(), decided_at = now(),
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

-- ── Direct bookings' terms name Nilecruz as the operator's booking agent ────────────────────────────────
create or replace function public.customer_reserve(dep uuid, cur text, cabins jsonb, guests jsonb, terms_read boolean)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  d public.departures;
  v public.vessels;
  c jsonb;
  g jsonb;
  ages integer[];
  all_ages integer[] := '{}';
  guest_ages integer[] := '{}';
  priced record;
  total bigint := 0;
  need record;
  inv public.inventory;
  pol uuid;
  ref text;
  res_id uuid;
  line integer := 0;
  pos integer := 0;
  cab public.cabin_types;
begin
  if auth.uid() is null then raise exception 'Sign in to reserve' using errcode = '42501'; end if;
  if not coalesce(terms_read, false) then raise exception 'Read and accept the terms first' using errcode = '22023'; end if;
  select * into d from public.departures where id = dep;
  if d.id is null or not public.departure_bookable(d.id) then
    raise exception 'This sailing has no cabins left or can''t be booked right now. Nothing was booked.' using errcode = '22023';
  end if;
  if cur not in ('USD', 'EUR') then raise exception 'Bookings at the published rate are in US$ or €' using errcode = '22023'; end if;
  if jsonb_typeof(cabins) <> 'array' or jsonb_array_length(cabins) = 0 or jsonb_array_length(cabins) > 5 then
    raise exception 'Choose 1 to 5 cabins; for more, send a request for offers' using errcode = '22023';
  end if;
  select * into v from public.vessels where id = d.vessel_id;

  -- Price each cabin at the published international rate, and collect every guest's age.
  for c in select value from jsonb_array_elements(cabins) loop
    ages := array(select (x)::int from jsonb_array_elements_text(c -> 'ages') x);
    select * into priced from app.public_cabin_price(dep, (c ->> 'cabin_type_id')::uuid, cur, ages);
    total := total + priced.amount_minor;
    all_ages := all_ages || ages;
  end loop;

  -- Every guest named; their ages on the departure date match the cabins (DATA-020).
  if jsonb_typeof(guests) <> 'array' or jsonb_array_length(guests) <> cardinality(all_ages) then
    raise exception 'Give the name and date of birth of all % guests', cardinality(all_ages) using errcode = '22023';
  end if;
  for g in select value from jsonb_array_elements(guests) loop
    if g ->> 'date_of_birth' is null or g ->> 'date_of_birth' !~ '^\d{4}-\d{2}-\d{2}$' or coalesce(length(trim(g ->> 'full_name')), 0) < 2 then
      raise exception 'Every guest needs a full name and a date of birth' using errcode = '22023';
    end if;
    guest_ages := guest_ages || extract(year from age(d.departs_on, (g ->> 'date_of_birth')::date))::int;
  end loop;
  -- Adults (18 and over) match by number; children by their exact ages, as with offers.
  if (select count(*) from unnest(guest_ages) x where x >= 18) <> (select count(*) from unnest(all_ages) x where x >= 18)
     or (select array_agg(x order by x) from unnest(guest_ages) x where x < 18) is distinct from
        (select array_agg(x order by x) from unnest(all_ages) x where x < 18) then
    raise exception 'The guests'' ages on the departure date don''t match the cabins' using errcode = '22023';
  end if;

  -- Take the cabins: one inventory row per cabin type, locked in a fixed order.
  for need in
    select (x ->> 'cabin_type_id')::uuid as cabin_type_id, count(*)::int as n from jsonb_array_elements(cabins) x
    group by 1 order by 1
  loop
    select * into inv from public.inventory where departure_id = d.id and cabin_type_id = need.cabin_type_id for update;
    if inv.departure_id is null or inv.available < need.n then
      raise exception 'Not enough cabins left. Nothing was booked.' using errcode = '23514';
    end if;
    if not app.inventory_is_fresh(inv.confirmed_at, inv.source) then
      raise exception 'Availability for this sailing is being confirmed. Try again shortly.' using errcode = '22023';
    end if;
    update public.inventory set available = available - need.n where departure_id = d.id and cabin_type_id = need.cabin_type_id;
  end loop;

  pol := app.policy_for_departure(d.id);
  ref := app.new_reference();
  insert into public.reservations (reference, offer_id, customer_id, org_id, vessel_id, departure_id, rate_plan, currency, total_minor,
    gratuity_usd_minor, terms, policy, direct)
  values (ref, null, auth.uid(), v.operator_org_id, v.id, d.id, 'international', cur::public.currency_code, total, v.gratuity_usd_minor,
    'Booked through Nilecruz, acting as booking agent for the operator of ' || v.name || ', at the published rate, '
      || 'from check-in on the first day to check-out on the last. '
      || 'Transfers, flights and tours are not included unless stated. The cancellation policy below applies.',
    jsonb_build_object('bands', (select bands from public.cancellation_policies where id = pol),
      'terms', (select jsonb_object_agg(locale, terms) from public.cancellation_policy_translations where policy_id = pol)),
    true)
  returning id into res_id;
  for c in select value from jsonb_array_elements(cabins) loop
    line := line + 1;
    ages := array(select (x)::int from jsonb_array_elements_text(c -> 'ages') x);
    select * into cab from public.cabin_types where id = (c ->> 'cabin_type_id')::uuid;
    select * into priced from app.public_cabin_price(dep, cab.id, cur, ages);
    insert into public.reservation_cabins (reservation_id, line, cabin_type_id, deck, cabin_name, adults, child_ages, price_minor)
    values (res_id, line, cab.id, cab.deck, cab.name, (select count(*) from unnest(ages) a where a >= 18),
      array(select a from unnest(ages) a where a < 18 order by a)::smallint[], priced.amount_minor);
  end loop;
  for g in select value from jsonb_array_elements(guests) loop
    pos := pos + 1;
    insert into public.passengers (reservation_id, position, full_name, date_of_birth, nationality)
    values (res_id, pos, trim(g ->> 'full_name'), (g ->> 'date_of_birth')::date,
      case when pos = 1 then nullif(upper(trim(g ->> 'nationality')), '') end);
  end loop;
  insert into public.notifications (org_id, kind, title, link)
  values (v.operator_org_id, 'reservation.new', 'New booking ' || ref || ' at the published rate',
    '/dashboard/operator/' || v.operator_org_id || '/bookings/' || res_id || '/');
  insert into public.notifications (user_id, kind, title, link)
  values (auth.uid(), 'reservation.new', 'Reservation ' || ref || ' is made. Payment details follow.', '/dashboard/journey/reservations/' || res_id || '/');
  return ref;
end $$;
