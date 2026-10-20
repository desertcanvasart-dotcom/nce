-- Batch 4h-1: travel partners (DASH-ADM-086–089, DASH-B2B-001, 002, 009–012, ADR-092).
-- Agencies apply from their account and are approved, rejected or paused by admins (like operators, ADR-073). Their
-- teams have owner, reservations and finance roles. Prices reach them only through partner_search(), which returns, per
-- cabin and occupancy, the best rate the company is entitled to: its own company rate, then the trade rate, then the
-- public international rate. Trade and company rates are never readable by customers, the public or other companies.

-- ── Applying (DASH-ADM-086, DASH-B2B-011) ───────────────────────────────────────────────────────────────
create or replace function public.apply_as_partner(display_name text, legal_name text, registration jsonb)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  new_org uuid;
  k text;
begin
  if auth.uid() is null then raise exception 'Sign in first' using errcode = '42501'; end if;
  if length(trim(coalesce(display_name, ''))) = 0 or length(display_name) > 120 then
    raise exception 'Company name is required' using errcode = '22023';
  end if;
  foreach k in array array['country', 'registration_number', 'contact_name', 'contact_phone'] loop
    if length(trim(coalesce(registration ->> k, ''))) = 0 then
      raise exception 'Give the %', replace(k, '_', ' ') using errcode = '22023';
    end if;
  end loop;
  if exists (
    select 1 from public.memberships m join public.organisations o on o.id = m.org_id
    where m.user_id = auth.uid() and o.kind = 'partner' and o.status = 'applied'
  ) then
    raise exception 'You already have an application waiting' using errcode = '23505';
  end if;
  insert into public.organisations (kind, status, display_name, legal_name, registration)
  values ('partner', 'applied', trim(display_name), nullif(trim(coalesce(legal_name, '')), ''), registration)
  returning id into new_org;
  insert into public.memberships (org_id, user_id, team_role) values (new_org, auth.uid(), 'owner');
  return new_org;
end $$;
revoke execute on function public.apply_as_partner(text, text, jsonb) from public, anon;
grant execute on function public.apply_as_partner(text, text, jsonb) to authenticated;

-- An approved partner whose owner or reservations user is asking (finance users don't search or book).
create or replace function app.can_trade(org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.organisations o where o.id = org and o.kind = 'partner' and o.status = 'approved')
    and app.has_org_role(org, array['owner', 'reservations']::public.team_role[]);
$$;
revoke execute on function app.can_trade(uuid) from public, anon;
grant execute on function app.can_trade(uuid) to authenticated, service_role;

-- ── Company rates (DASH-B2B-012) ────────────────────────────────────────────────────────────────────────
-- The trade channel is rate plan 'trade' in public.rates. A rate for one company lives here, so the rates table, its
-- feeds and its API keep their key.
create table public.partner_rates (
  id uuid primary key default gen_random_uuid(),
  partner_org_id uuid not null references public.organisations (id) on delete cascade,
  departure_id uuid not null references public.departures (id) on delete cascade,
  cabin_type_id uuid not null references public.cabin_types (id) on delete cascade,
  vessel_id uuid not null references public.vessels (id) on delete cascade,
  occupancy smallint not null check (occupancy between 1 and 3),
  currency public.currency_code not null check (currency in ('USD', 'EUR')),
  amount_minor bigint not null check (amount_minor > 0),
  -- Filled from the operator's child bands at creation (the trigger below), like rates (DATA-022).
  child_bands jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (partner_org_id, departure_id, cabin_type_id, occupancy, currency)
);
create index partner_rates_departure_idx on public.partner_rates (departure_id);
create trigger partner_rates_updated_at before update on public.partner_rates for each row execute function app.set_updated_at();

-- The same consistency as rates (as last defined in 20261018000700_rate_bands_default): one vessel throughout, occupancy
-- within the cabin, child bands filled at creation and never changed; plus, for company rates, a partner company.
create or replace function app.product_consistency() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  dep_vessel uuid;
  cab public.cabin_types;
begin
  select vessel_id into dep_vessel from public.departures where id = new.departure_id;
  select * into cab from public.cabin_types where id = new.cabin_type_id;
  if dep_vessel is null or cab.id is null or dep_vessel <> cab.vessel_id then
    raise exception 'Departure and cabin type must belong to the same vessel' using errcode = '23514';
  end if;
  new.vessel_id := dep_vessel;
  if tg_table_name in ('rates', 'partner_rates') then
    if new.occupancy > cab.max_occupancy then
      raise exception 'Occupancy % is more than this cabin allows (%)', new.occupancy, cab.max_occupancy using errcode = '23514';
    end if;
    if tg_op = 'INSERT' and (new.child_bands is null or new.child_bands = '[]'::jsonb) then
      new.child_bands := app.child_bands_for_vessel(dep_vessel);
    elsif tg_op = 'UPDATE' then
      new.child_bands := old.child_bands; -- bands never change on an existing rate (20261018000700)
    end if;
  end if;
  -- Nested, not "and": a rates row has no partner_org_id field to read.
  if tg_table_name = 'partner_rates' then
    if not exists (select 1 from public.organisations o where o.id = new.partner_org_id and o.kind = 'partner') then
      raise exception 'A company rate is for a travel partner' using errcode = '23514';
    end if;
  end if;
  return new;
end $$;
create trigger partner_rates_consistency before insert or update on public.partner_rates
  for each row execute function app.product_consistency();

alter table public.partner_rates enable row level security;
-- The operator's team and admins see and edit them; partners never read this table (they get prices from partner_search).
create policy "partner_rates: team and admins read" on public.partner_rates for select to authenticated
  using (app.is_admin() or exists (select 1 from public.vessels v where v.id = vessel_id and v.operator_org_id in (select app.my_org_ids())));
create policy "partner_rates: editors write" on public.partner_rates for all to authenticated
  using (app.can_edit_product(vessel_id)) with check (app.can_edit_product(vessel_id));
grant select, insert, update, delete on public.partner_rates to authenticated, service_role;
create trigger audit_partner_rates after insert or update or delete on public.partner_rates for each row execute function app.audit_row();

-- Approved partners, by name, for operators choosing a company rate and for admins.
create or replace function public.approved_partners() returns table (id uuid, display_name text)
language sql stable security definer set search_path = '' as $$
  select o.id, o.display_name from public.organisations o
  where o.kind = 'partner' and o.status = 'approved'
    and (app.is_admin() or exists (select 1 from public.memberships m join public.organisations x on x.id = m.org_id
                                   where m.user_id = auth.uid() and x.kind = 'operator' and x.status = 'approved'))
  order by o.display_name;
$$;
revoke execute on function public.approved_partners() from public, anon;
grant execute on function public.approved_partners() to authenticated;

-- ── Search (DASH-B2B-001, 002, ADR-092) ─────────────────────────────────────────────────────────────────
create or replace function public.partner_search(org uuid, from_day date, to_day date, route_origin text default null,
  route_destination text default null, nights_min integer default 1, nights_max integer default 21)
returns table (departure_id uuid, vessel_id uuid, vessel_name text, schedule_id uuid, origin text, destination text, nights integer,
  departs_on date, returns_on date, sailing_period text, sails_at time, cabin_type_id uuid, cabin_name text, deck text,
  max_occupancy integer, available integer, occupancy integer, currency text, amount_minor bigint, child_bands jsonb,
  gratuity_usd_minor bigint, tier text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not app.can_trade(org) then
    raise exception 'Your company''s trade access isn''t active' using errcode = '42501';
  end if;
  if to_day < from_day or to_day > from_day + 366 then raise exception 'Choose a date range of up to a year' using errcode = '22023'; end if;
  return query
  with candidates as (
    select d.id as dep, v.id as ves, v.name as vname, s.id as sch, s.origin as orig, s.destination as dest, s.nights::int as n,
      d.departs_on as dep_on, d.returns_on as ret_on, s.sailing_period::text as per, s.sails_at as at,
      c.id as cab, c.name as cname, c.deck as cdeck, c.max_occupancy::int as maxocc, i.available::int as avail,
      v.gratuity_usd_minor as grat
    from public.departures d
    join public.schedules s on s.id = d.schedule_id and s.active
    join public.vessels v on v.id = d.vessel_id
    join public.inventory i on i.departure_id = d.id and i.available > 0 and app.inventory_is_fresh(i.confirmed_at, i.source)
    join public.cabin_types c on c.id = i.cabin_type_id and c.active
    where d.departs_on between greatest(from_day, (now() at time zone 'Africa/Cairo')::date + 1) and to_day
      and s.nights between nights_min and nights_max
      and (route_origin is null or s.origin ilike route_origin)
      and (route_destination is null or s.destination ilike route_destination)
      and public.departure_bookable(d.id)
  ),
  priced as (
    select x.*, p.occupancy::int as occ, p.currency::text as cur, p.amount_minor as amt, p.child_bands as bands, 'company'::text as tr, 1 as rank
    from candidates x join public.partner_rates p on p.departure_id = x.dep and p.cabin_type_id = x.cab and p.partner_org_id = org
    union all
    select x.*, r.occupancy::int, r.currency::text, r.amount_minor, r.child_bands, 'trade', 2
    from candidates x join public.rates r on r.departure_id = x.dep and r.cabin_type_id = x.cab and r.rate_plan = 'trade'
    union all
    select x.*, r.occupancy::int, r.currency::text, r.amount_minor, r.child_bands, 'public', 3
    from candidates x join public.rates r on r.departure_id = x.dep and r.cabin_type_id = x.cab and r.rate_plan = 'international'
  )
  select distinct on (q.dep, q.cab, q.occ, q.cur)
    q.dep, q.ves, q.vname, q.sch, q.orig, q.dest, q.n, q.dep_on, q.ret_on, q.per, q.at, q.cab, q.cname, q.cdeck, q.maxocc, q.avail,
    q.occ, q.cur, q.amt, q.bands, q.grat, q.tr
  from priced q
  order by q.dep, q.cab, q.occ, q.cur, q.rank
  limit 2000;
end $$;
revoke execute on function public.partner_search(uuid, date, date, text, text, integer, integer) from public, anon;
grant execute on function public.partner_search(uuid, date, date, text, text, integer, integer) to authenticated;

-- ── Partner teams (DASH-B2B-010): owner, reservations and finance; no viewer role ───────────────────────────
create or replace function app.partner_roles_only() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.team_role = 'viewer' and (select kind from public.organisations where id = new.org_id) = 'partner' then
    raise exception 'Travel partner teams have owner, reservations and finance roles' using errcode = '23514';
  end if;
  return new;
end $$;
revoke execute on function app.partner_roles_only() from public, anon, authenticated;
create trigger memberships_partner_roles before insert or update on public.memberships for each row execute function app.partner_roles_only();
create trigger org_invitations_partner_roles before insert or update on public.org_invitations for each row execute function app.partner_roles_only();
