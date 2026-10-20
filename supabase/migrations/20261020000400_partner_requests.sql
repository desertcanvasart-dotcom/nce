-- Batch 4h-2b: company requests and offers (DASH-B2B-004, ADR-092).
-- A travel partner's owner or reservations user sends a request for the company. Operators see it marked as from a
-- travel partner and may offer at the trade rate. The company's owner and reservations users compare the offers and
-- accept one; the reservation then belongs to the company, like a direct trade booking (4h-2a).

alter table public.cruise_requests add column buyer_org_id uuid references public.organisations (id) on delete restrict;
alter table public.cruise_requests add column buyer_name text check (length(buyer_name) <= 120);
create index cruise_requests_buyer_idx on public.cruise_requests (buyer_org_id, created_at desc) where buyer_org_id is not null;

-- The company's name comes from the database, and a request never changes hands.
create or replace function app.guard_request_buyer() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and (new.buyer_org_id is distinct from old.buyer_org_id or new.customer_id is distinct from old.customer_id
                           or new.buyer_name is distinct from old.buyer_name) then
    raise exception 'A request''s requester can''t change' using errcode = '23514';
  end if;
  if tg_op = 'INSERT' then
    new.buyer_name := (select o.display_name from public.organisations o where o.id = new.buyer_org_id);
  end if;
  return new;
end $$;
create trigger cruise_requests_buyer before insert or update on public.cruise_requests
  for each row execute function app.guard_request_buyer();

-- Reading: the company's owner and reservations users read its requests; a requester who leaves the company doesn't.
create or replace function app.can_read_request(req uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select app.is_admin()
    or exists (select 1 from public.cruise_requests r where r.id = req and (
      (r.buyer_org_id is null and r.customer_id = auth.uid())
      or (r.buyer_org_id is not null and app.has_org_role(r.buyer_org_id, array['owner', 'reservations']::public.team_role[]))))
    or exists (select 1 from app.request_orgs(req) o(id) where app.has_org_role(o.id, array['owner', 'reservations', 'finance', 'viewer']::public.team_role[]))
    or exists (select 1 from public.offers f where f.request_id = req and app.has_org_role(f.org_id, array['owner', 'reservations', 'finance', 'viewer']::public.team_role[]));
$$;

-- The own-row checks come first and need no lookup, so a new request can be returned right after insert.
drop policy "cruise_requests: customer, matching operators, admins read" on public.cruise_requests;
create policy "cruise_requests: requester, matching operators, admins read" on public.cruise_requests for select to authenticated
  using ((buyer_org_id is null and customer_id = auth.uid())
         or (buyer_org_id is not null and app.has_org_role(buyer_org_id, array['owner', 'reservations']::public.team_role[]))
         or app.can_read_request(id));
drop policy "cruise_requests: customers create their own" on public.cruise_requests;
create policy "cruise_requests: customers and trading companies create" on public.cruise_requests for insert to authenticated
  with check (customer_id = auth.uid() and status = 'open' and (buyer_org_id is null or app.can_trade(buyer_org_id)));
drop policy "cruise_requests: customers close their own" on public.cruise_requests;
create policy "cruise_requests: requesters close their own" on public.cruise_requests for update to authenticated
  using (status = 'open' and ((buyer_org_id is null and customer_id = auth.uid())
         or (buyer_org_id is not null and app.has_org_role(buyer_org_id, array['owner', 'reservations']::public.team_role[]))))
  with check (status in ('open', 'closed') and ((buyer_org_id is null and customer_id = auth.uid())
         or (buyer_org_id is not null and app.has_org_role(buyer_org_id, array['owner', 'reservations']::public.team_role[]))));

drop policy "offers: customer, the operator's team, admins read" on public.offers;
create policy "offers: requester, the operator's team, admins read" on public.offers for select to authenticated
  using (app.is_admin() or app.has_org_role(org_id, array['owner', 'reservations', 'finance', 'viewer']::public.team_role[])
         or exists (select 1 from public.cruise_requests r where r.id = request_id and (
           (r.buyer_org_id is null and r.customer_id = auth.uid())
           or (r.buyer_org_id is not null and app.has_org_role(r.buyer_org_id, array['owner', 'reservations']::public.team_role[])))));

-- Operators are told a request is from a travel partner (DASH-OPR-002).
create or replace function app.notify_request() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.notifications (org_id, kind, title, link)
  select o.id, 'request.new',
    case when new.buyer_org_id is null then 'New cruise request' else 'New cruise request from a travel partner' end,
    '/dashboard/operator/' || o.id || '/offers/' || new.id || '/'
  from app.request_orgs(new.id) o(id);
  return new;
end $$;

-- ── Sending an offer: as before; the trade plan only for companies, and the company is told ───────────────
create or replace function public.send_offer(
  req uuid, dep uuid, plan public.rate_plan, cur text, cabins jsonb, total bigint, list_total bigint, note text,
  inclusions_text text, terms_text text, eligibility text, expires_in_hours integer default 72, previous uuid default null)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  r public.cruise_requests;
  d record;
  prev public.offers;
  new_id uuid;
  c jsonb;
  ct public.cabin_types;
  n integer := 0;
  guests_offered integer := 0;
begin
  select * into r from public.cruise_requests where id = req;
  if r.id is null then raise exception 'Request not found' using errcode = 'P0002'; end if;
  if r.status <> 'open' then raise exception 'This request is no longer open' using errcode = '22023'; end if;
  select de.id, de.vessel_id, de.departs_on, de.status, v.operator_org_id as org_id, v.gratuity_usd_minor
    into d from public.departures de join public.vessels v on v.id = de.vessel_id where de.id = dep;
  if d.id is null or not app.has_org_role(d.org_id, array['owner', 'reservations']::public.team_role[])
     or not exists (select 1 from public.organisations o where o.id = d.org_id and o.status = 'approved') then
    raise exception 'Only the vessel''s company can make this offer' using errcode = '42501';
  end if;
  if not exists (select 1 from app.request_orgs(req) o(id) where o.id = d.org_id) then
    raise exception 'This request doesn''t match your sailings' using errcode = '22023';
  end if;
  if d.status <> 'scheduled' or d.departs_on < r.earliest_departure or d.departs_on > r.latest_departure then
    raise exception 'Choose a scheduled departure inside the customer''s dates' using errcode = '22023';
  end if;
  -- ADR-092: the trade plan is for travel partners' requests only.
  if plan = 'trade' and r.buyer_org_id is null then
    raise exception 'The trade rate is only for travel partners'' requests' using errcode = '22023';
  end if;
  if expires_in_hours not between 24 and 336 then
    raise exception 'An offer is valid for 24 hours to 14 days' using errcode = '22023';
  end if;
  if previous is not null then
    select * into prev from public.offers where id = previous for update;
    if prev.id is null or prev.request_id <> req or prev.org_id <> d.org_id then
      raise exception 'Previous offer not found' using errcode = 'P0002';
    end if;
    if prev.status <> 'sent' then raise exception 'Only a current offer can be revised' using errcode = '22023'; end if;
    update public.offers set status = 'superseded' where id = prev.id;
  end if;

  insert into public.offers (request_id, org_id, departure_id, thread_id, version, rate_plan, currency, total_minor,
    list_total_minor, pricing_note, gratuity_usd_minor, inclusions, terms, eligibility_conditions, expires_at)
  values (req, d.org_id, dep, coalesce(prev.thread_id, gen_random_uuid()), coalesce(prev.version + 1, 1), plan, cur, total,
    nullif(list_total, 0), nullif(trim(note), ''), d.gratuity_usd_minor, nullif(trim(inclusions_text), ''), terms_text, eligibility,
    now() + make_interval(hours => expires_in_hours))
  returning id into new_id;

  if jsonb_typeof(cabins) <> 'array' or jsonb_array_length(cabins) = 0 then
    raise exception 'Add at least one cabin' using errcode = '22023';
  end if;
  for c in select value from jsonb_array_elements(cabins) loop
    n := n + 1;
    select * into ct from public.cabin_types where id = (c ->> 'cabin_type_id')::uuid and vessel_id = d.vessel_id and active;
    if ct.id is null then raise exception 'Cabin %: choose an active cabin type of this vessel', n using errcode = '22023'; end if;
    -- Infants under 3 don't take a bed (ADR-012); everyone else counts against the cabin's limit.
    if (c ->> 'adults')::int + (select count(*) from jsonb_array_elements_text(coalesce(c -> 'child_ages', '[]')) a where a::int >= 3)
       > ct.max_occupancy then
      raise exception 'Cabin %: % sleeps at most %', n, ct.name, ct.max_occupancy using errcode = '22023';
    end if;
    if (c ->> 'adults')::int + (select count(*) from jsonb_array_elements_text(coalesce(c -> 'child_ages', '[]')) a where a::int >= 12) = 0 then
      raise exception 'Cabin %: each cabin needs a guest aged 12 or over', n using errcode = '22023';
    end if;
    guests_offered := guests_offered + (c ->> 'adults')::int + jsonb_array_length(coalesce(c -> 'child_ages', '[]'));
    insert into public.offer_cabins (offer_id, line, cabin_type_id, deck, cabin_name, adults, child_ages, price_minor)
    values (new_id, n, ct.id, ct.deck, ct.name, (c ->> 'adults')::smallint,
      array(select a::smallint from jsonb_array_elements_text(coalesce(c -> 'child_ages', '[]')) a), (c ->> 'price_minor')::bigint);
  end loop;
  if guests_offered <> r.adults + cardinality(r.child_ages) then
    raise exception 'The cabins hold % guests; the request is for %', guests_offered, r.adults + cardinality(r.child_ages)
      using errcode = '22023';
  end if;

  if r.buyer_org_id is not null then
    insert into public.notifications (org_id, kind, title, link)
    values (r.buyer_org_id, case when previous is null then 'offer.new' else 'offer.updated' end,
      case when previous is null then 'Your company has a new offer' else 'An offer to your company was updated: please review it' end,
      '/dashboard/partner/' || r.buyer_org_id || '/requests/' || req || '/');
    return new_id;
  end if;
  insert into public.notifications (user_id, kind, title, link)
  values (r.customer_id, case when previous is null then 'offer.new' else 'offer.updated' end,
    case when previous is null then 'You have a new offer' else 'An offer was updated: please review it' end,
    '/dashboard/journey/requests/' || req || '/');
  return new_id;
end $$;


-- ── Accepting an offer: as before; for a company request, by its owner or reservations users ─────────────
create or replace function public.accept_offer(target uuid, guests jsonb, terms_read boolean) returns text
language plpgsql security definer set search_path = '' as $$
declare
  o public.offers;
  r public.cruise_requests;
  d public.departures;
  need record;
  inv public.inventory;
  res_id uuid;
  ref text;
  pol uuid;
  g jsonb;
  pos integer := 0;
  guest_age integer;
  adults_seen integer := 0;
  child_seen integer[] := '{}';
  child_offered integer[];
  adults_offered integer;
begin
  if not coalesce(terms_read, false) then
    raise exception 'Read and accept the terms first' using errcode = '22023';
  end if;
  select * into o from public.offers where id = target for update;
  if o.id is null then raise exception 'Offer not found' using errcode = 'P0002'; end if;
  select * into r from public.cruise_requests where id = o.request_id for update;
  -- The customer, or for a company request its owner or reservations users while its trade access is active (ADR-092).
  if (r.buyer_org_id is null and r.customer_id is distinct from auth.uid())
     or (r.buyer_org_id is not null and not app.has_org_role(r.buyer_org_id, array['owner', 'reservations']::public.team_role[])) then
    raise exception 'Offer not found' using errcode = 'P0002';
  end if;
  if r.buyer_org_id is not null and not app.can_trade(r.buyer_org_id) then
    raise exception 'Your company''s trade access isn''t active' using errcode = '42501';
  end if;
  if o.status <> 'sent' then
    raise exception 'This offer can no longer be accepted (it was %)', o.status using errcode = '22023';
  end if;
  if o.expires_at <= now() then raise exception 'This offer has expired' using errcode = '22023'; end if;
  if r.status <> 'open' then raise exception 'This request already has a reservation or was closed' using errcode = '22023'; end if;
  select * into d from public.departures where id = o.departure_id;
  if not public.departure_bookable(d.id) then
    raise exception 'This sailing has no cabins left or can''t be booked right now. Nothing was booked.' using errcode = '22023';
  end if;
  pol := app.policy_for_departure(d.id);

  -- Passengers: everyone named, ages on the departure date matching the offer (DATA-020, ADR-088).
  select coalesce(sum(oc.adults), 0)::int into adults_offered from public.offer_cabins oc where oc.offer_id = o.id;
  select coalesce(array_agg(a::int order by a), '{}') into child_offered
  from public.offer_cabins oc, unnest(oc.child_ages) a where oc.offer_id = o.id;
  if jsonb_typeof(guests) <> 'array' or jsonb_array_length(guests) <> adults_offered + cardinality(child_offered) then
    raise exception 'Give the name and date of birth of all % guests', adults_offered + cardinality(child_offered) using errcode = '22023';
  end if;
  for g in select value from jsonb_array_elements(guests) loop
    if g ->> 'date_of_birth' is null or g ->> 'date_of_birth' !~ '^\d{4}-\d{2}-\d{2}$' or coalesce(length(trim(g ->> 'full_name')), 0) < 2 then
      raise exception 'Every guest needs a full name and a date of birth' using errcode = '22023';
    end if;
    guest_age := extract(year from age(d.departs_on, (g ->> 'date_of_birth')::date))::int;
    if guest_age < 0 then raise exception 'A date of birth is after the departure' using errcode = '22023'; end if;
    if guest_age >= 18 then adults_seen := adults_seen + 1; else child_seen := child_seen || guest_age; end if;
  end loop;
  if adults_seen <> adults_offered or (select array_agg(x order by x) from unnest(child_seen) x) is distinct from
     (case when cardinality(child_offered) = 0 then null else child_offered end) then
    raise exception 'The guests'' ages on the departure date don''t match the offer (% adults, children aged %)',
      adults_offered, coalesce(array_to_string(child_offered, ', '), 'none') using errcode = '22023';
  end if;

  -- Take the cabins: one inventory row per cabin type, locked in a fixed order.
  for need in
    select oc.cabin_type_id, count(*)::int as cabins from public.offer_cabins oc where oc.offer_id = o.id
    group by oc.cabin_type_id order by oc.cabin_type_id
  loop
    select * into inv from public.inventory where departure_id = d.id and cabin_type_id = need.cabin_type_id for update;
    if inv.departure_id is null or inv.available < need.cabins then
      raise exception 'Not enough cabins left for this offer. Nothing was booked; the operator can send a new offer.'
        using errcode = '23514';
    end if;
    if not app.inventory_is_fresh(inv.confirmed_at, inv.source) then
      raise exception 'Availability for this sailing is being confirmed. Try again shortly.' using errcode = '22023';
    end if;
    update public.inventory set available = available - need.cabins
    where departure_id = d.id and cabin_type_id = need.cabin_type_id;
  end loop;

  ref := app.new_reference();
  insert into public.reservations (reference, request_id, offer_id, customer_id, org_id, vessel_id, departure_id, rate_plan,
    currency, total_minor, gratuity_usd_minor, terms, policy, buyer_org_id, buyer_name, booked_by)
  values (ref, r.id, o.id, case when r.buyer_org_id is null then r.customer_id else auth.uid() end, o.org_id, d.vessel_id, d.id, o.rate_plan, o.currency, o.total_minor,
    o.gratuity_usd_minor, o.terms,
    jsonb_build_object('bands', (select bands from public.cancellation_policies where id = pol),
      'terms', (select jsonb_object_agg(locale, terms) from public.cancellation_policy_translations where policy_id = pol)),
    r.buyer_org_id, r.buyer_name, case when r.buyer_org_id is not null then auth.uid() end)
  returning id into res_id;
  if r.buyer_org_id is not null then
    insert into public.partner_booking_details (reservation_id, org_id) values (res_id, r.buyer_org_id);
  end if;
  insert into public.reservation_cabins (reservation_id, line, cabin_type_id, deck, cabin_name, adults, child_ages, price_minor)
  select res_id, line, cabin_type_id, deck, cabin_name, adults, child_ages, price_minor from public.offer_cabins where offer_id = o.id;
  for g in select value from jsonb_array_elements(guests) loop
    pos := pos + 1;
    insert into public.passengers (reservation_id, position, full_name, date_of_birth, nationality)
    values (res_id, pos, trim(g ->> 'full_name'), (g ->> 'date_of_birth')::date,
      case when pos = 1 then nullif(upper(trim(g ->> 'nationality')), '') end);
  end loop;

  update public.offers set status = 'accepted' where id = o.id;
  update public.offers set status = 'closed' where request_id = r.id and id <> o.id and status = 'sent';
  update public.cruise_requests set status = 'accepted' where id = r.id;
  if r.buyer_org_id is not null then
    insert into public.notifications (org_id, kind, title, link)
    values (o.org_id, 'reservation.new', 'Offer accepted: trade booking ' || ref || ' from ' || r.buyer_name,
      '/dashboard/operator/' || o.org_id || '/bookings/' || res_id || '/');
    insert into public.notifications (org_id, kind, title, link)
    values (r.buyer_org_id, 'reservation.new', 'Reservation ' || ref || ' is made. Payment details follow.',
      '/dashboard/partner/' || r.buyer_org_id || '/bookings/' || res_id || '/');
    return ref;
  end if;
  insert into public.notifications (org_id, kind, title, link)
  values (o.org_id, 'reservation.new', 'Offer accepted: reservation ' || ref, '/dashboard/operator/' || o.org_id || '/bookings/' || res_id || '/');
  insert into public.notifications (user_id, kind, title, link)
  values (r.customer_id, 'reservation.new', 'Reservation ' || ref || ' is made. Payment details follow.', '/dashboard/journey/reservations/' || res_id || '/');
  return ref;
end $$;
