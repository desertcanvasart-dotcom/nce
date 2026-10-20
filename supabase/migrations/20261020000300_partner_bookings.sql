-- Batch 4h-2a: travel partners book for their clients (DASH-B2B-003, 005–008, 013, ADR-092).
-- A reservation may belong to a buyer company. Its owner, reservations and finance users read it like a customer would,
-- and act on it by role: finance users and owners pay, everyone with a role can ask to cancel. The client's reference and
-- the agency's selling total live apart, readable only by the agency (and admins), never by the operator.

alter table public.reservations add column buyer_org_id uuid references public.organisations (id) on delete restrict;
alter table public.reservations add column buyer_name text check (length(buyer_name) <= 120);
alter table public.reservations add column booked_by uuid references auth.users (id) on delete set null;
-- A direct trade booking has no offer; every other reservation still comes from one.
alter table public.reservations alter column offer_id drop not null;
alter table public.reservations add constraint offer_or_buyer check (offer_id is not null or buyer_org_id is not null);
create index reservations_buyer_idx on public.reservations (buyer_org_id, created_at desc) where buyer_org_id is not null;

-- Who may act on a reservation: its customer, or for a company booking the company's people with one of `roles`.
create or replace function app.acts_for_reservation(res uuid, roles public.team_role[]) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.reservations r where r.id = res and (
      (r.buyer_org_id is null and r.customer_id = auth.uid())
      or (r.buyer_org_id is not null and app.has_org_role(r.buyer_org_id, roles))));
$$;
revoke execute on function app.acts_for_reservation(uuid, public.team_role[]) from public, anon;
grant execute on function app.acts_for_reservation(uuid, public.team_role[]) to authenticated, service_role;

-- Reading: customers, the operator's team, admins, and now the buyer company's people (DASH-B2B-005).
create or replace function app.can_read_reservation(res uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select app.is_admin() or exists (
    select 1 from public.reservations r where r.id = res
      and (r.customer_id = auth.uid()
           or app.has_org_role(r.org_id, array['owner', 'reservations', 'finance', 'viewer']::public.team_role[])
           or (r.buyer_org_id is not null and app.has_org_role(r.buyer_org_id, array['owner', 'reservations', 'finance']::public.team_role[]))));
$$;

-- Proofs: the company's people upload eligibility proof and transfer proof for their bookings.
drop policy "eligibility_proofs: customer uploads" on public.eligibility_proofs;
create policy "eligibility_proofs: customer or buyer uploads" on public.eligibility_proofs for insert to authenticated
  with check (status = 'submitted' and app.acts_for_reservation(reservation_id, array['owner', 'reservations']::public.team_role[]));
drop policy "eligibility bucket: customer uploads" on storage.objects;
create policy "eligibility bucket: customer or buyer uploads" on storage.objects for insert to authenticated
  with check (bucket_id = 'eligibility' and app.acts_for_reservation(app.storage_reservation_id(name), array['owner', 'reservations']::public.team_role[]));
drop policy "payment-proofs bucket: customer uploads" on storage.objects;
create policy "payment-proofs bucket: customer or buyer uploads" on storage.objects for insert to authenticated
  with check (bucket_id = 'payment-proofs' and app.acts_for_reservation(app.storage_reservation_id(name), array['owner', 'finance']::public.team_role[]));

-- Paying and cancelling: as before, with the company's roles (finance users and owners pay).
create or replace function public.report_payment(res uuid, amount bigint, cur text, paid_date date, ref text, proof text default null)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  r public.reservations;
  new_id uuid;
begin
  select * into r from public.reservations where id = res;
  if r.id is null or not app.acts_for_reservation(r.id, array['owner', 'finance']::public.team_role[]) then
    raise exception 'Reservation not found' using errcode = 'P0002';
  end if;
  if r.status <> 'awaiting_payment' then raise exception 'This reservation isn''t waiting for payment' using errcode = '22023'; end if;
  if cur is distinct from r.currency::text then raise exception 'Report the payment in the reservation''s currency (%)', r.currency using errcode = '22023'; end if;
  if paid_date > (now() at time zone 'Africa/Cairo')::date then raise exception 'The payment date can''t be in the future' using errcode = '22023'; end if;
  if proof is not null and proof not like 'reservations/' || res::text || '/%' then raise exception 'Upload the proof again' using errcode = '22023'; end if;
  insert into public.payments (reservation_id, method, status, amount_minor, currency, paid_on, reference, proof_path, reported_by)
  values (res, 'transfer', 'reported', amount, cur, paid_date, nullif(trim(ref), ''), proof, auth.uid())
  returning id into new_id;
  return new_id;
end $$;

create or replace function public.request_cancellation(res uuid, why text, policy_read boolean) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  r public.reservations;
  q record;
  today date := (now() at time zone 'Africa/Cairo')::date;
  new_id uuid;
begin
  select * into r from public.reservations where id = res for update;
  if r.id is null or not app.acts_for_reservation(r.id, array['owner', 'reservations', 'finance']::public.team_role[]) then
    raise exception 'Reservation not found' using errcode = 'P0002';
  end if;
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
  if c.id is null or not app.acts_for_reservation(c.reservation_id, array['owner', 'reservations', 'finance']::public.team_role[]) then
    raise exception 'Cancellation request not found' using errcode = 'P0002';
  end if;
  if c.status <> 'requested' then raise exception 'This request has already been decided' using errcode = '22023'; end if;
  update public.cancellation_requests set status = 'withdrawn' where id = c.id;
end $$;

-- ── The agency's own details (DASH-B2B-006, 007): never shown to the operator ─────────────────────────────
create table public.partner_booking_details (
  reservation_id uuid primary key references public.reservations (id) on delete cascade,
  org_id uuid not null references public.organisations (id) on delete restrict,
  client_reference text check (length(client_reference) <= 120),
  selling_total_minor bigint check (selling_total_minor > 0),
  updated_at timestamptz not null default now()
);
create trigger partner_booking_details_updated_at before update on public.partner_booking_details
  for each row execute function app.set_updated_at();
alter table public.partner_booking_details enable row level security;
create policy "partner_booking_details: the agency and admins read" on public.partner_booking_details for select to authenticated
  using (app.is_admin() or app.has_org_role(org_id, array['owner', 'reservations', 'finance']::public.team_role[]));
create policy "partner_booking_details: the agency's owner and reservations users edit" on public.partner_booking_details
  for update to authenticated
  using (app.has_org_role(org_id, array['owner', 'reservations']::public.team_role[]))
  with check (app.has_org_role(org_id, array['owner', 'reservations']::public.team_role[]));
grant select, update on public.partner_booking_details to authenticated;
grant select, insert, update, delete on public.partner_booking_details to service_role;
create trigger audit_partner_booking_details after insert or update or delete on public.partner_booking_details
  for each row execute function app.audit_row();

-- ── One cabin's price for a party at the agency's rate (mirrors linePrice in src/lib/bookings/bookings.ts) ──
create or replace function app.partner_cabin_price(org uuid, dep uuid, cab uuid, cur text, ages integer[])
returns table (amount_minor bigint, tier text)
language plpgsql stable security definer set search_path = '' as $$
declare
  occ integer := (select count(*) from unnest(ages) a where a >= 3);
  maxocc integer;
  rate bigint;
  bands jsonb;
  t text;
  total bigint := 0;
  a integer;
  pct numeric;
begin
  select max_occupancy into maxocc from public.cabin_types where id = cab;
  if not exists (select 1 from unnest(ages) x where x >= 12) then raise exception 'A cabin needs at least one adult' using errcode = '22023'; end if;
  if occ > maxocc then raise exception 'This cabin sleeps %; infants under 3 don''t count', maxocc using errcode = '22023'; end if;
  select x.amount_minor, x.child_bands, x.tr into rate, bands, t from (
    select p.amount_minor, p.child_bands, 'company' as tr, 1 as rk from public.partner_rates p
      where p.partner_org_id = org and p.departure_id = dep and p.cabin_type_id = cab and p.occupancy = occ and p.currency::text = cur
    union all
    select r.amount_minor, r.child_bands, 'trade', 2 from public.rates r
      where r.departure_id = dep and r.cabin_type_id = cab and r.occupancy = occ and r.currency::text = cur and r.rate_plan = 'trade'
    union all
    select r.amount_minor, r.child_bands, 'public', 3 from public.rates r
      where r.departure_id = dep and r.cabin_type_id = cab and r.occupancy = occ and r.currency::text = cur and r.rate_plan = 'international'
  ) x order by x.rk limit 1;
  if rate is null then raise exception 'There is no % rate for % guests in this cabin', cur, occ using errcode = '22023'; end if;
  foreach a in array ages loop
    if a >= 18 then
      total := total + rate;
    else
      select (b ->> 'percent')::numeric into pct from jsonb_array_elements(bands) b
      where (b ->> 'from')::int <= a and ((b ->> 'to') is null or a < (b ->> 'to')::int) limit 1;
      total := total + floor(rate * coalesce(pct, 100) / 100.0 + 0.5);
    end if;
  end loop;
  amount_minor := total;
  tier := t;
  return next;
end $$;
revoke execute on function app.partner_cabin_price(uuid, uuid, uuid, text, integer[]) from public, anon, authenticated;

-- ── Reserve for a client (DASH-B2B-003, 006, 013) ─────────────────────────────────────────────────────────
-- cabins: [{"cabin_type_id": …, "ages": [40, 38]}]; guests: [{"full_name", "date_of_birth", "nationality"?}], lead first.
create or replace function public.partner_reserve(org uuid, dep uuid, cur text, cabins jsonb, guests jsonb, client_ref text,
  selling_total bigint, terms_read boolean)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  d public.departures;
  v public.vessels;
  agency public.organisations;
  c jsonb;
  g jsonb;
  ages integer[];
  all_ages integer[] := '{}';
  guest_ages integer[] := '{}';
  priced record;
  total bigint := 0;
  any_trade boolean := false;
  need record;
  inv public.inventory;
  pol uuid;
  ref text;
  res_id uuid;
  line integer := 0;
  pos integer := 0;
  cab public.cabin_types;
begin
  if not app.can_trade(org) then raise exception 'Your company''s trade access isn''t active' using errcode = '42501'; end if;
  if not coalesce(terms_read, false) then raise exception 'Read and accept the terms first' using errcode = '22023'; end if;
  select * into d from public.departures where id = dep;
  if d.id is null or not public.departure_bookable(d.id) then
    raise exception 'This sailing has no cabins left or can''t be booked right now. Nothing was booked.' using errcode = '22023';
  end if;
  if cur not in ('USD', 'EUR') then raise exception 'Trade bookings are in US$ or €' using errcode = '22023'; end if;
  if jsonb_typeof(cabins) <> 'array' or jsonb_array_length(cabins) = 0 or jsonb_array_length(cabins) > 20 then
    raise exception 'Choose 1 to 20 cabins' using errcode = '22023';
  end if;
  select * into v from public.vessels where id = d.vessel_id;
  select * into agency from public.organisations where id = org;

  -- Price each cabin at the agency's rate, and collect every guest's age.
  for c in select value from jsonb_array_elements(cabins) loop
    ages := array(select (x)::int from jsonb_array_elements_text(c -> 'ages') x);
    select * into priced from app.partner_cabin_price(org, dep, (c ->> 'cabin_type_id')::uuid, cur, ages);
    total := total + priced.amount_minor;
    any_trade := any_trade or priced.tier in ('company', 'trade');
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
    gratuity_usd_minor, terms, policy, buyer_org_id, buyer_name, booked_by)
  values (ref, null, auth.uid(), v.operator_org_id, v.id, d.id,
    case when any_trade then 'trade'::public.rate_plan else 'international'::public.rate_plan end,
    cur::public.currency_code, total, v.gratuity_usd_minor,
    'Trade booking made through Nilecruz by ' || agency.display_name || '. The cancellation policy below applies.',
    jsonb_build_object('bands', (select bands from public.cancellation_policies where id = pol),
      'terms', (select jsonb_object_agg(locale, terms) from public.cancellation_policy_translations where policy_id = pol)),
    org, agency.display_name, auth.uid())
  returning id into res_id;
  for c in select value from jsonb_array_elements(cabins) loop
    line := line + 1;
    ages := array(select (x)::int from jsonb_array_elements_text(c -> 'ages') x);
    select * into cab from public.cabin_types where id = (c ->> 'cabin_type_id')::uuid;
    select * into priced from app.partner_cabin_price(org, dep, cab.id, cur, ages);
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
  insert into public.partner_booking_details (reservation_id, org_id, client_reference, selling_total_minor)
  values (res_id, org, nullif(trim(client_ref), ''), nullif(selling_total, 0));
  insert into public.notifications (org_id, kind, title, link)
  values (v.operator_org_id, 'reservation.new', 'Trade booking ' || ref || ' from ' || agency.display_name,
    '/dashboard/operator/' || v.operator_org_id || '/bookings/' || res_id || '/');
  insert into public.notifications (org_id, kind, title, link)
  values (org, 'reservation.new', 'Reservation ' || ref || ' is made. Payment details follow.', '/dashboard/partner/' || org || '/bookings/' || res_id || '/');
  return ref;
end $$;
revoke execute on function public.partner_reserve(uuid, uuid, text, jsonb, jsonb, text, bigint, boolean) from public, anon;
grant execute on function public.partner_reserve(uuid, uuid, text, jsonb, jsonb, text, bigint, boolean) to authenticated;
