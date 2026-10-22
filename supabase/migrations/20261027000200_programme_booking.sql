-- Batch 8-3b-2 (ADR-102): every other vessel's "with sightseeing" is the cruise plus Nilecruz's programme, a separate
-- Nilecruz order linked to the reservation, paid with it in one checkout, cancelled with it.

-- ── A programme order belongs to a reservation ───────────────────────────────────────────────────────────────
alter table public.tour_orders add column reservation_id uuid references public.reservations (id) on delete set null;
create index tour_orders_reservation_idx on public.tour_orders (reservation_id);
-- One programme per reservation at a time.
create unique index tour_orders_one_programme on public.tour_orders (reservation_id) where reservation_id is not null and status <> 'cancelled';

-- Programmes are priced like private tours: per person by party size, children by age (Faris's sheet, ADR-098).
create or replace function app.tour_slot_price(r public.tour_rates, guest_ages integer[], starts timestamptz,
  out total bigint, out vehicle text)
language plpgsql stable security definer set search_path = '' as $$
declare
  local timestamp := starts at time zone 'Africa/Cairo';
  n integer := coalesce(cardinality(guest_ages), 0);
  party integer;
  tier jsonb;
  v jsonb;
  hour integer := extract(hour from local);
  pct integer;
begin
  if n = 0 then raise exception 'Add at least one guest.' using errcode = '22023'; end if;
  if not exists (select 1 from unnest(guest_ages) a where a >= 12) then
    raise exception 'Each booking needs a guest aged 12 or over.' using errcode = '22023';
  end if;
  total := 0;
  case r.mode
    when 'shared' then
      if n >= 9 then raise exception 'Parties of 9 or more book the private tour.' using errcode = '22023'; end if;
      if n > r.max_guests then raise exception 'A shared group takes at most % guests.', r.max_guests using errcode = '22023'; end if;
      select sum(case when a >= 12 then (r.prices ->> 'adult')::bigint when a >= 6 then (r.prices ->> 'child611')::bigint
                      when a >= 3 then (r.prices ->> 'child35')::bigint else 0 end)
      into total from unnest(guest_ages) a;
    when 'private', 'program' then
      party := (select count(*) from unnest(guest_ages) a where a >= 3);
      select x into tier from jsonb_array_elements(r.prices -> 'tiers') x
      where party >= (x ->> 'min')::int and (coalesce(jsonb_typeof(x -> 'max'), 'null') = 'null' or party <= (x ->> 'max')::int)
      order by (x ->> 'min')::int limit 1;
      if tier is null then
        raise exception '%', case when r.mode = 'program' then 'For a group this size, ask us: Nilecruz quotes the sightseeing by hand.'
                                  else 'There is no private price for this party size.' end using errcode = '22023';
      end if;
      select sum(case when a >= 12 then (tier ->> 'pp')::bigint
                      when a >= 6 then round((tier ->> 'pp')::numeric * (r.prices ->> 'child_pct')::numeric / 100)::bigint
                      when a >= 3 then round((tier ->> 'pp')::numeric * coalesce((r.prices ->> 'child35_pct')::numeric, 25) / 100)::bigint
                      else 0 end)
      into total from unnest(guest_ages) a;
    when 'transfer' then
      select x into v from jsonb_array_elements(r.prices -> 'vehicles') x
      where (x ->> 'max')::int >= n order by (x ->> 'max')::int limit 1;
      if v is null then raise exception 'No vehicle seats this many guests: send a request instead.' using errcode = '22023'; end if;
      total := (v ->> 'price')::bigint + case when hour >= 22 or hour < 6 then (r.prices ->> 'night_extra')::bigint else 0 end;
      vehicle := v ->> 'name';
    else
      select x into tier from jsonb_array_elements(r.prices -> 'tiers') x
      where (x ->> 'max')::int >= n order by (x ->> 'max')::int limit 1;
      if tier is null then raise exception 'There is no price for a party this size.' using errcode = '22023'; end if;
      total := (tier ->> 'price')::bigint;
  end case;
  pct := app.tour_season_pct(r.mode, local::date);
  if pct <> 0 then total := round(total * (100 + pct) / 100.0)::bigint; end if;
end $$;

-- The programme Nilecruz sells with this sailing: linked to its itinerary, published, with an office and an active
-- programme rate. None for a vessel that sells its own sightseeing (no double selling).
create or replace function app.programme_rate_for(d public.departures) returns public.tour_rates
language sql stable security definer set search_path = '' as $$
  select r.* from public.tour_rates r
  join public.tours t on t.id = r.tour_id and t.visibility = 'published' and t.office_id is not null
  join public.tour_schedules ts on ts.tour_id = t.id and ts.schedule_id = d.schedule_id
  where r.mode = 'program' and r.active and not app.sightseeing_approved(d.vessel_id)
  order by r.created_at limit 1;
$$;
revoke execute on function app.programme_rate_for(public.departures) from public, anon, authenticated;

-- The programme starts on the sailing's first day (09:00 Cairo, for the order's date).
create or replace function app.programme_start(d public.departures) returns timestamptz
language sql stable set search_path = '' as $$
  select (d.departs_on + time '09:00') at time zone 'Africa/Cairo';
$$;

-- Anyone signed in: the programme's name and price for a party on a sailing (null when there's none).
create or replace function public.programme_quote(dep uuid, ages integer[])
returns table (rate_id uuid, tour_name text, tour_slug text, total_minor bigint, currency text)
language plpgsql stable security definer set search_path = '' as $$
declare
  d public.departures;
  r public.tour_rates;
  p record;
begin
  if auth.uid() is null then raise exception 'Sign in to see prices' using errcode = '42501'; end if;
  select * into d from public.departures where id = dep;
  if d.id is null then raise exception 'Departure not found' using errcode = 'P0002'; end if;
  r := app.programme_rate_for(d);
  if r.id is null then return; end if;
  select * into p from app.tour_slot_price(r, ages, app.programme_start(d));
  return query select r.id, t.name, t.slug::text, p.total, r.currency::text from public.tours t where t.id = r.tour_id;
end $$;
revoke execute on function public.programme_quote(uuid, integer[]) from public, anon;
grant execute on function public.programme_quote(uuid, integer[]) to authenticated, service_role;

-- Make the programme order for a reservation: the whole party, held until the cruise's payment deadline.
create or replace function app.add_programme(res uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  rv public.reservations;
  d public.departures;
  r public.tour_rates;
  t public.tours;
  ages integer[];
  p record;
  new_id uuid;
begin
  select * into rv from public.reservations where id = res for update;
  select * into d from public.departures where id = rv.departure_id;
  r := app.programme_rate_for(d);
  if r.id is null then raise exception 'There is no Nilecruz sightseeing programme for this sailing' using errcode = '22023'; end if;
  if rv.package = 'with_sightseeing' then
    raise exception 'This booking already includes the vessel''s own sightseeing' using errcode = '22023';
  end if;
  if rv.currency::text <> r.currency::text then
    raise exception 'The sightseeing programme is priced in %; book the cruise in % to add it', r.currency, r.currency using errcode = '22023';
  end if;
  if exists (select 1 from public.tour_orders o where o.reservation_id = res and o.status <> 'cancelled') then
    raise exception 'This booking already has the sightseeing programme' using errcode = '23505';
  end if;
  select * into t from public.tours where id = r.tour_id;
  ages := array(select x from public.reservation_cabins c,
    lateral (select 30 from generate_series(1, c.adults) union all select unnest(c.child_ages)::int) g(x)
    where c.reservation_id = res);
  select * into p from app.tour_slot_price(r, ages, app.programme_start(d));
  insert into public.tour_orders (reference, customer_id, tour_id, rate_id, starts_at, mode, ages, lead_name, currency, total_minor,
    policy, hold_until, reservation_id)
  values (app.new_tour_reference(), rv.customer_id, t.id, r.id, app.programme_start(d), r.mode, ages::smallint[],
    coalesce((select full_name from public.passengers where reservation_id = res order by position limit 1), 'Lead guest'),
    r.currency, p.total,
    jsonb_build_object(
      'bands', case when jsonb_array_length(t.cancellation_bands) > 0 then t.cancellation_bands
                    else '[{"from_days": 2, "percent": 0}, {"from_days": 0, "percent": 100}]'::jsonb end,
      'terms', (select jsonb_object_agg(locale, cancellation_terms) from public.tour_translations
                where tour_id = t.id and cancellation_terms is not null)),
    -- Held like the cruise: until its payment deadline (or the programme's start, whichever is first).
    least(coalesce(rv.payment_due_at, app.programme_start(d)), app.programme_start(d)),
    res)
  returning id into new_id;
  insert into public.notifications (user_id, kind, title, link)
  values (rv.customer_id, 'tour.programme', 'Nilecruz''s sightseeing programme is added to ' || rv.reference || ': pay it with the cruise',
    '/dashboard/journey/reservations/' || res || '/');
  return new_id;
end $$;
revoke execute on function app.add_programme(uuid) from public, anon, authenticated;

-- A customer adds the programme to a cruise they booked (DASH-CUS-011): before it starts, not on approved vessels.
create or replace function public.customer_add_programme(res uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  rv public.reservations;
  d public.departures;
begin
  if auth.uid() is null then raise exception 'Sign in first' using errcode = '42501'; end if;
  select * into rv from public.reservations where id = res;
  if rv.id is null or rv.customer_id <> auth.uid() or rv.buyer_org_id is not null then
    raise exception 'Reservation not found' using errcode = 'P0002';
  end if;
  if rv.status = 'cancelled' then raise exception 'This reservation is cancelled' using errcode = '22023'; end if;
  select * into d from public.departures where id = rv.departure_id;
  if app.programme_start(d) < now() + interval '48 hours' then
    raise exception 'The sightseeing programme can be added up to 2 days before the cruise' using errcode = '22023';
  end if;
  return app.add_programme(res);
end $$;
revoke execute on function public.customer_add_programme(uuid) from public, anon;
grant execute on function public.customer_add_programme(uuid) to authenticated;

-- ── The package "with_programme": the cruise at its own price, and the programme added with the reservation ──
create or replace function app.booking_package(cabins jsonb) returns text
language plpgsql immutable set search_path = '' as $$
declare
  pkgs text[] := array(select distinct coalesce(c ->> 'package', 'cruise') from jsonb_array_elements(cabins) c);
begin
  if cardinality(pkgs) > 1 then raise exception 'Book every cabin with the same package' using errcode = '22023'; end if;
  if pkgs[1] not in ('cruise', 'with_sightseeing', 'with_programme') then raise exception 'Unknown package' using errcode = '22023'; end if;
  return coalesce(pkgs[1], 'cruise');
end $$;

-- The cabin price for a package: the cruise's own for "with_programme" (the programme is its own order).
create or replace function app.check_direct_booking(d public.departures, cur text, cabins jsonb, guests jsonb)
returns bigint
language plpgsql stable security definer set search_path = '' as $$
declare
  c jsonb;
  g jsonb;
  ages integer[];
  all_ages integer[] := '{}';
  guest_ages integer[] := '{}';
  priced record;
  total bigint := 0;
  pkg text;
begin
  if cur not in ('USD', 'EUR') then raise exception 'Bookings at the published rate are in US$ or €' using errcode = '22023'; end if;
  if jsonb_typeof(cabins) <> 'array' or jsonb_array_length(cabins) = 0 or jsonb_array_length(cabins) > 5 then
    raise exception 'Choose 1 to 5 cabins; for more, send a request for offers' using errcode = '22023';
  end if;
  pkg := app.booking_package(cabins);
  if pkg = 'with_programme' then
    if (app.programme_rate_for(d)).id is null then
      raise exception 'There is no Nilecruz sightseeing programme for this sailing' using errcode = '22023';
    end if;
    if cur <> (app.programme_rate_for(d)).currency::text then
      raise exception 'The sightseeing programme is priced in %; book the cruise in % to add it',
        (app.programme_rate_for(d)).currency, (app.programme_rate_for(d)).currency using errcode = '22023';
    end if;
  end if;
  for c in select value from jsonb_array_elements(cabins) loop
    if not exists (select 1 from public.cabin_types ct where ct.id = (c ->> 'cabin_type_id')::uuid and ct.vessel_id = d.vessel_id and ct.active) then
      raise exception 'That cabin type isn''t on this ship' using errcode = '22023';
    end if;
    ages := array(select (x)::int from jsonb_array_elements_text(c -> 'ages') x);
    select * into priced from app.public_cabin_price(d.id, (c ->> 'cabin_type_id')::uuid, cur, ages,
      case when pkg = 'with_sightseeing' then pkg else 'cruise' end);
    total := total + priced.amount_minor;
    all_ages := all_ages || ages;
  end loop;
  if jsonb_typeof(guests) <> 'array' or jsonb_array_length(guests) <> cardinality(all_ages) then
    raise exception 'Give the name and date of birth of all % guests', cardinality(all_ages) using errcode = '22023';
  end if;
  for g in select value from jsonb_array_elements(guests) loop
    if g ->> 'date_of_birth' is null or g ->> 'date_of_birth' !~ '^\d{4}-\d{2}-\d{2}$' or coalesce(length(trim(g ->> 'full_name')), 0) < 2 then
      raise exception 'Every guest needs a full name and a date of birth' using errcode = '22023';
    end if;
    guest_ages := guest_ages || extract(year from age(d.departs_on, (g ->> 'date_of_birth')::date))::int;
  end loop;
  if (select count(*) from unnest(guest_ages) x where x >= 18) <> (select count(*) from unnest(all_ages) x where x >= 18)
     or (select array_agg(x order by x) from unnest(guest_ages) x where x < 18) is distinct from
        (select array_agg(x order by x) from unnest(all_ages) x where x < 18) then
    raise exception 'The guests'' ages on the departure date don''t match the cabins' using errcode = '22023';
  end if;
  return total;
end $$;

-- Same as 20261027000100, plus: a "with_programme" booking is a cruise-only reservation with the programme added.
create or replace function app.make_reservation(customer uuid, d public.departures, cur text, cabins jsonb, guests jsonb,
  by_operator boolean, already_taken boolean default false, out ref text, out res_id uuid)
language plpgsql security definer set search_path = '' as $$
declare
  v public.vessels;
  c jsonb;
  g jsonb;
  ages integer[];
  priced record;
  total bigint;
  taken jsonb;
  pol uuid;
  line integer := 0;
  pos integer := 0;
  cab public.cabin_types;
  pkg text := app.booking_package(cabins);
  own text := case when app.booking_package(cabins) = 'with_sightseeing' then 'with_sightseeing' else 'cruise' end;
  incl jsonb;
begin
  total := app.check_direct_booking(d, cur, cabins, guests);
  select * into v from public.vessels where id = d.vessel_id;
  if own = 'with_sightseeing' then
    select jsonb_build_object('guide', s.guide, 'tickets_included', s.tickets_included, 'sites', to_jsonb(s.sites), 'note', s.note)
      into incl from public.schedule_sightseeing s where s.schedule_id = d.schedule_id;
  end if;
  taken := app.take_cabins(d, cabins, by_operator, already_taken);
  pol := app.policy_for_departure(d.id);
  if pol is null then raise exception 'This sailing has no cancellation policy yet' using errcode = '22023'; end if;
  ref := app.new_reference();
  insert into public.reservations (reference, offer_id, customer_id, org_id, vessel_id, departure_id, rate_plan, currency, total_minor,
    gratuity_usd_minor, terms, policy, direct, package, sightseeing)
  values (ref, null, customer, v.operator_org_id, v.id, d.id, 'international', cur::public.currency_code, total, v.gratuity_usd_minor,
    'Booked through Nilecruz, acting as booking agent for the operator of ' || v.name || ', at the published rate, '
      || 'from check-in on the first day to check-out on the last. '
      || case when own = 'with_sightseeing' then 'Sightseeing by the vessel is included as listed. ' else '' end
      || 'Transfers, flights and tours are not included unless stated. The cancellation policy below applies.',
    jsonb_build_object('bands', (select bands from public.cancellation_policies where id = pol),
      'terms', (select jsonb_object_agg(locale, terms) from public.cancellation_policy_translations where policy_id = pol)),
    true, own, incl)
  returning id into res_id;
  for c in select value from jsonb_array_elements(cabins) loop
    line := line + 1;
    ages := array(select (x)::int from jsonb_array_elements_text(c -> 'ages') x);
    select * into cab from public.cabin_types where id = (c ->> 'cabin_type_id')::uuid;
    select * into priced from app.public_cabin_price(d.id, cab.id, cur, ages, own);
    insert into public.reservation_cabins (reservation_id, line, cabin_type_id, deck, cabin_name, adults, child_ages, price_minor)
    values (res_id, line, cab.id, cab.deck, cab.name, (select count(*) from unnest(ages) a where a >= 18),
      array(select a from unnest(ages) a where a < 18 order by a)::smallint[], priced.amount_minor);
  end loop;
  perform app.stamp_allotment(res_id, taken);
  for g in select value from jsonb_array_elements(guests) loop
    pos := pos + 1;
    insert into public.passengers (reservation_id, position, full_name, date_of_birth, nationality)
    values (res_id, pos, trim(g ->> 'full_name'), (g ->> 'date_of_birth')::date,
      case when pos = 1 then nullif(upper(trim(g ->> 'nationality')), '') end);
  end loop;
  -- ADR-102: Nilecruz's programme, its own order with Nilecruz, linked to this reservation.
  if pkg = 'with_programme' then perform app.add_programme(res_id); end if;
  insert into public.notifications (org_id, kind, title, link)
  values (v.operator_org_id, 'reservation.new',
    'New booking ' || ref || ' at the published rate'
      || case when own = 'with_sightseeing' then ', with sightseeing' else '' end
      || case when taken <> '{}'::jsonb then ', from the Nilecruz allotment' else '' end,
    '/dashboard/operator/' || v.operator_org_id || '/bookings/' || res_id || '/');
  insert into public.notifications (user_id, kind, title, link)
  values (customer, 'reservation.new',
    case when by_operator then 'The operator confirmed your cabins: reservation ' || ref || ' is made. You can pay now.'
         else 'Reservation ' || ref || ' is made. Payment details follow.' end,
    '/dashboard/journey/reservations/' || res_id || '/');
end $$;

-- ── A cancelled cruise cancels its programme: refunded in full when paid, through finance's refund page ──────
create or replace function app.cancel_programme_with_cruise() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  o public.tour_orders;
  paid bigint;
begin
  for o in select * from public.tour_orders where reservation_id = new.id and status <> 'cancelled' loop
    paid := coalesce((select sum(amount_minor) from public.tour_payments where order_id = o.id and status = 'verified'), 0);
    update public.tour_orders set status = 'cancelled', cancelled_at = now(),
      cancelled_reason = 'The cruise ' || new.reference || ' was cancelled',
      cancel_state = case when paid > 0 then 'approved'::public.tour_cancel_state end,
      cancel_requested_on = case when paid > 0 then (now() at time zone 'Africa/Cairo')::date end,
      cancel_percent = case when paid > 0 then 0 end, cancel_charge_minor = case when paid > 0 then 0 end,
      cancel_refund_minor = case when paid > 0 then paid end,
      cancel_note = case when paid > 0 then 'The cruise was cancelled; the sightseeing programme is refunded in full.' end
    where id = o.id;
  end loop;
  return new;
end $$;
revoke execute on function app.cancel_programme_with_cruise() from public, anon, authenticated;
create trigger reservations_cancel_programme after update of status on public.reservations
  for each row when (new.status = 'cancelled' and old.status is distinct from 'cancelled')
  execute function app.cancel_programme_with_cruise();

-- ── The public "from" prices: with sightseeing by the vessel, or the cruise plus Nilecruz's programme for two ─
drop function public.public_vessel_prices();
create function public.public_vessel_prices()
returns table (vessel_id uuid, amount_minor bigint, currency text, bookable boolean,
  sightseeing_amount_minor bigint, sightseeing_currency text, sightseeing_by text)
language sql stable security definer set search_path = '' as $$
  with today as (select (now() at time zone 'Africa/Cairo')::date as d),
  ok as (
    select de.id, de.vessel_id, de.schedule_id
    from public.departures de
    join public.vessels v on v.id = de.vessel_id and v.visibility = 'published'
    cross join today
    where de.departs_on > today.d and de.departs_on <= today.d + 365
      and public.departure_bookable(de.id)
  ),
  priced as (
    select ok.vessel_id, ok.id as dep, r.amount_minor, r.currency::text as cur
    from ok
    join public.rates r on r.departure_id = ok.id and r.rate_plan = 'international' and r.occupancy = 2
    join public.cabin_types c on c.id = r.cabin_type_id and c.active
    join public.inventory i on i.departure_id = ok.id and i.cabin_type_id = c.id and i.available > 0
      and app.inventory_is_fresh(i.confirmed_at, i.source)
  ),
  with_sightseeing as (
    select ok.vessel_id, r.amount_minor, r.currency::text as cur
    from ok
    join public.departures dd on dd.id = ok.id
    join public.sightseeing_rates r on r.departure_id = ok.id and r.rate_plan = 'international' and r.occupancy = 2
    join public.cabin_types c on c.id = r.cabin_type_id and c.active
    join public.inventory i on i.departure_id = ok.id and i.cabin_type_id = c.id and i.available > 0
      and app.inventory_is_fresh(i.confirmed_at, i.source)
    where app.sells_sightseeing(dd)
  ),
  -- The cruise's per-person price plus the programme's per-person price for two, on the same sailing.
  with_programme as (
    select p.vessel_id, p.amount_minor + (app.tour_slot_price(pr, '{30,30}', app.programme_start(dd))).total / 2 as amount_minor, p.cur
    from priced p
    join public.departures dd on dd.id = p.dep
    cross join lateral (select app.programme_rate_for(dd) as pr) x
    where (x.pr).id is not null and p.cur = (x.pr).currency::text
  )
  select v.id, p.amount_minor, p.cur, exists (select 1 from ok where ok.vessel_id = v.id),
    coalesce(s.amount_minor, w.amount_minor), coalesce(s.cur, w.cur),
    case when s.amount_minor is not null then 'vessel' when w.amount_minor is not null then 'nilecruz' end
  from public.vessels v
  left join lateral (
    select priced.amount_minor, priced.cur from priced where priced.vessel_id = v.id
    order by case priced.cur when 'USD' then 0 when 'EUR' then 1 else 2 end, priced.amount_minor
    limit 1
  ) p on true
  left join lateral (
    select ws.amount_minor, ws.cur from with_sightseeing ws where ws.vessel_id = v.id
    order by case ws.cur when 'USD' then 0 when 'EUR' then 1 else 2 end, ws.amount_minor
    limit 1
  ) s on true
  left join lateral (
    select wp.amount_minor, wp.cur from with_programme wp where wp.vessel_id = v.id
    order by wp.amount_minor
    limit 1
  ) w on true
  where v.visibility in ('published', 'showcase');
$$;
revoke execute on function public.public_vessel_prices() from public;
grant execute on function public.public_vessel_prices() to anon, authenticated, service_role;
