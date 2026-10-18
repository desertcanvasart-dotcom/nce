-- Batch 4e: cruise requests, personal offers, reservations (DASH-CUS-004–007, 014, 015, DASH-OPR-002, 003, 011,
-- 017–023, DASH-ADM-004, 057, 090–096, DASH-BND-001, DATA-020, SEC-013, ADR-078, ADR-088).
-- Offers are immutable once sent: a change is a new version, and only the current version can be accepted.
-- Acceptance (public.accept_offer) re-checks everything and takes the cabins in one transaction.

-- ── Cruise cancellation policies (ADR-088): wording + bands; the calculation comes in 4f ───────────────────
create table public.cancellation_policies (
  id uuid primary key default gen_random_uuid(),
  vessel_id uuid not null references public.vessels (id) on delete cascade,
  -- Null: the vessel's default. A schedule's own policy wins over the default.
  schedule_id uuid references public.schedules (id) on delete cascade,
  bands jsonb not null check (jsonb_array_length(bands) > 0 and app.valid_cancellation_bands(bands)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (vessel_id, schedule_id)
);
create trigger cancellation_policies_updated_at before update on public.cancellation_policies for each row execute function app.set_updated_at();
create table public.cancellation_policy_translations (
  policy_id uuid not null references public.cancellation_policies (id) on delete cascade,
  locale public.locale_code not null,
  terms text not null check (length(trim(terms)) between 1 and 4000),
  primary key (policy_id, locale)
);
create or replace function app.check_policy_schedule() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.schedule_id is not null and (select vessel_id from public.schedules where id = new.schedule_id) <> new.vessel_id then
    raise exception 'The schedule belongs to another vessel' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger cancellation_policies_schedule before insert or update on public.cancellation_policies
  for each row execute function app.check_policy_schedule();

create or replace function app.policy_for_departure(dep uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select p.id from public.departures d
  join public.cancellation_policies p on p.vessel_id = d.vessel_id and (p.schedule_id = d.schedule_id or p.schedule_id is null)
  where d.id = dep
  order by p.schedule_id nulls last
  limit 1;
$$;

-- ── The bookable gate (DASH-BND-001) ─────────────────────────────────────────────────────────────────────
-- Published vessel of an approved operator; a scheduled, future departure; a cancellation policy; and at least one
-- active cabin type with a rate and fresh availability (ADR-079).
create or replace function public.departure_bookable(dep uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.departures d
    join public.vessels v on v.id = d.vessel_id and v.visibility = 'published'
    join public.organisations o on o.id = v.operator_org_id and o.status = 'approved'
    where d.id = dep and d.status = 'scheduled' and d.departs_on > (now() at time zone 'Africa/Cairo')::date
      and app.policy_for_departure(d.id) is not null
      and exists (
        select 1 from public.inventory i
        join public.cabin_types c on c.id = i.cabin_type_id and c.active
        where i.departure_id = d.id and i.available > 0 and app.inventory_is_fresh(i.confirmed_at, i.source)
          and exists (select 1 from public.rates r where r.departure_id = d.id and r.cabin_type_id = c.id)
      )
  );
$$;

-- ── Requests (DASH-CUS-004, 014, 015, DATA-020) ──────────────────────────────────────────────────────────
create type public.request_status as enum ('open', 'accepted', 'closed');
create table public.cruise_requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- Null: flexible.
  origin text check (length(origin) <= 80),
  destination text check (length(destination) <= 80),
  earliest_departure date not null,
  latest_departure date not null,
  latest_finish date,
  nights_min smallint not null check (nights_min between 1 and 21),
  nights_max smallint not null check (nights_max between 1 and 21),
  adults smallint not null check (adults between 1 and 30),
  -- DATA-020: each child's age on the travel date (under 18).
  child_ages smallint[] not null default '{}' check (cardinality(child_ages) <= 20 and child_ages <@ array[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17]::smallint[]),
  cabins smallint not null check (cabins between 1 and 30),
  cabin_notes text check (length(cabin_notes) <= 500),
  budget_minor bigint check (budget_minor > 0),
  budget_currency public.currency_code check (budget_currency in ('USD', 'EUR', 'EGP')),
  notes text check (length(notes) <= 2000),
  status public.request_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (latest_departure >= earliest_departure and latest_departure <= earliest_departure + 366),
  check (latest_finish is null or latest_finish > earliest_departure),
  check (nights_max >= nights_min),
  check ((budget_minor is null) = (budget_currency is null))
);
create index cruise_requests_customer_idx on public.cruise_requests (customer_id, created_at desc);
create trigger cruise_requests_updated_at before update on public.cruise_requests for each row execute function app.set_updated_at();

-- ADR-088: the operators who can serve a request.
create or replace function app.request_orgs(req uuid) returns setof uuid
language sql stable security definer set search_path = '' as $$
  select distinct v.operator_org_id
  from public.cruise_requests r
  join public.departures d on d.departs_on between r.earliest_departure and r.latest_departure and d.status = 'scheduled'
  join public.schedules s on s.id = d.schedule_id and s.active and s.nights between r.nights_min and r.nights_max
  join public.vessels v on v.id = d.vessel_id and v.visibility = 'published'
  join public.organisations o on o.id = v.operator_org_id and o.status = 'approved'
  where r.id = req
    and (r.latest_finish is null or d.returns_on <= r.latest_finish)
    and (r.origin is null or lower(s.origin) = lower(r.origin))
    and (r.destination is null or lower(s.destination) = lower(r.destination));
$$;

-- ── Offers (DASH-OPR-011, 017–023) ───────────────────────────────────────────────────────────────────────
create type public.offer_status as enum ('sent', 'superseded', 'withdrawn', 'accepted', 'closed');
create table public.offers (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.cruise_requests (id) on delete cascade,
  org_id uuid not null references public.organisations (id) on delete cascade,
  departure_id uuid not null references public.departures (id) on delete restrict,
  -- Versions of one offer share a thread; a new version supersedes the previous one (DASH-OPR-023).
  thread_id uuid not null default gen_random_uuid(),
  version smallint not null default 1 check (version between 1 and 50),
  status public.offer_status not null default 'sent',
  rate_plan public.rate_plan not null,
  currency public.currency_code not null check (currency in ('USD', 'EUR', 'EGP')),
  total_minor bigint not null check (total_minor > 0),
  list_total_minor bigint check (list_total_minor > 0),
  pricing_note text check (length(pricing_note) <= 500),
  gratuity_usd_minor bigint check (gratuity_usd_minor >= 500),
  inclusions text check (length(inclusions) <= 3000),
  terms text not null check (length(trim(terms)) between 1 and 6000),
  eligibility_conditions text not null check (length(trim(eligibility_conditions)) between 1 and 2000),
  expires_at timestamptz not null,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (thread_id, version),
  constraint egp_only_for_local_plans check (currency <> 'EGP' or rate_plan in ('egyptian_citizen', 'foreign_resident')),
  constraint expiry_window check (expires_at between created_at + interval '23 hours 59 minutes' and created_at + interval '14 days 1 minute')
);
create index offers_request_idx on public.offers (request_id);
create index offers_org_idx on public.offers (org_id, created_at desc);
create trigger offers_updated_at before update on public.offers for each row execute function app.set_updated_at();

create table public.offer_cabins (
  offer_id uuid not null references public.offers (id) on delete cascade,
  line smallint not null check (line between 1 and 30),
  cabin_type_id uuid not null references public.cabin_types (id) on delete restrict,
  -- DASH-OPR-022: the deck as offered, kept even if the cabin type is edited later.
  deck text not null,
  cabin_name text not null,
  adults smallint not null check (adults between 0 and 3),
  child_ages smallint[] not null default '{}',
  price_minor bigint not null check (price_minor >= 0),
  primary key (offer_id, line)
);

-- Offers can't be edited once sent: only their status moves, and only forwards.
create or replace function app.guard_offer() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (to_jsonb(new) - 'status' - 'updated_at') <> (to_jsonb(old) - 'status' - 'updated_at') then
    raise exception 'A sent offer can''t be changed. Send a new version instead.' using errcode = '23514';
  end if;
  if old.status <> 'sent' and new.status <> old.status then
    raise exception 'This offer is already %', old.status using errcode = '23514';
  end if;
  return new;
end $$;
create trigger offers_guard before update on public.offers for each row execute function app.guard_offer();
-- offer_cabins are written only inside send_offer (people have no write grant), so they can't change either.

-- ── Reservations (DASH-ADM-057, 092, 093) and passengers (SEC-013) ──────────────────────────────────────
create type public.reservation_status as enum ('awaiting_payment', 'confirmed', 'cancelled');
create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique check (reference ~ '^NC-[A-HJ-NP-Z2-9]{6}$'),
  request_id uuid references public.cruise_requests (id) on delete set null,
  offer_id uuid not null unique references public.offers (id) on delete restrict,
  customer_id uuid not null references auth.users (id) on delete restrict,
  org_id uuid not null references public.organisations (id) on delete restrict,
  vessel_id uuid not null references public.vessels (id) on delete restrict,
  departure_id uuid not null references public.departures (id) on delete restrict,
  status public.reservation_status not null default 'awaiting_payment',
  rate_plan public.rate_plan not null,
  currency public.currency_code not null,
  total_minor bigint not null check (total_minor > 0),
  gratuity_usd_minor bigint,
  -- What the customer accepted, kept as shown: offer terms and the cancellation policy (wording in all languages).
  terms text not null,
  policy jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index reservations_customer_idx on public.reservations (customer_id);
create index reservations_org_idx on public.reservations (org_id, created_at desc);
create index reservations_departure_idx on public.reservations (departure_id);
create trigger reservations_updated_at before update on public.reservations for each row execute function app.set_updated_at();

create table public.reservation_cabins (
  reservation_id uuid not null references public.reservations (id) on delete cascade,
  line smallint not null,
  cabin_type_id uuid not null references public.cabin_types (id) on delete restrict,
  deck text not null,
  cabin_name text not null,
  adults smallint not null,
  child_ages smallint[] not null,
  price_minor bigint not null,
  primary key (reservation_id, line)
);

create table public.passengers (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations (id) on delete cascade,
  position smallint not null check (position between 1 and 90),
  full_name text not null check (length(trim(full_name)) between 2 and 160),
  date_of_birth date not null check (date_of_birth > '1900-01-01'),
  -- Lead passenger only (ADR-088); ISO 3166-1 alpha-2.
  nationality char(2) check (nationality ~ '^[A-Z]{2}$'),
  unique (reservation_id, position),
  check (nationality is null or position = 1)
);

-- Eligibility proof for local plans (ADR-078, ADR-088): a private file per reservation.
create type public.proof_status as enum ('submitted', 'verified', 'rejected');
create table public.eligibility_proofs (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations (id) on delete cascade,
  storage_path text not null unique check (storage_path ~ '^reservations/[0-9a-f-]{36}/[A-Za-z0-9._-]+$'),
  status public.proof_status not null default 'submitted',
  note text check (length(note) <= 500),
  uploaded_by uuid default auth.uid() references auth.users (id) on delete set null,
  reviewed_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  check (storage_path like 'reservations/' || reservation_id::text || '/%')
);
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('eligibility', 'eligibility', false, 10485760, array['image/jpeg', 'image/png', 'application/pdf'])
on conflict (id) do nothing;

-- ── In-dashboard notices (ADR-088) ───────────────────────────────────────────────────────────────────────
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  org_id uuid references public.organisations (id) on delete cascade,
  kind text not null check (kind ~ '^[a-z_.]+$'),
  title text not null check (length(title) <= 200),
  link text check (link ~ '^/dashboard/'),
  read_at timestamptz,
  created_at timestamptz not null default now(),
  check (num_nonnulls(user_id, org_id) = 1)
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_org_idx on public.notifications (org_id, created_at desc);

-- ── Access ───────────────────────────────────────────────────────────────────────────────────────────────
create or replace function app.can_read_request(req uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select app.is_admin()
    or exists (select 1 from public.cruise_requests r where r.id = req and r.customer_id = auth.uid())
    or exists (select 1 from app.request_orgs(req) o(id) where app.has_org_role(o.id, array['owner', 'reservations', 'finance', 'viewer']::public.team_role[]))
    or exists (select 1 from public.offers f where f.request_id = req and app.has_org_role(f.org_id, array['owner', 'reservations', 'finance', 'viewer']::public.team_role[]));
$$;
create or replace function app.can_read_reservation(res uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select app.is_admin() or exists (
    select 1 from public.reservations r where r.id = res
      and (r.customer_id = auth.uid() or app.has_org_role(r.org_id, array['owner', 'reservations', 'finance', 'viewer']::public.team_role[])));
$$;
revoke execute on function app.request_orgs(uuid), app.can_read_request(uuid), app.can_read_reservation(uuid),
  app.policy_for_departure(uuid) from public, anon;
grant execute on function app.can_read_request(uuid), app.can_read_reservation(uuid), app.policy_for_departure(uuid)
  to authenticated, service_role;
grant execute on function app.request_orgs(uuid) to service_role;
revoke execute on function public.departure_bookable(uuid) from public;
grant execute on function public.departure_bookable(uuid) to anon, authenticated, service_role;

alter table public.cancellation_policies enable row level security;
alter table public.cancellation_policy_translations enable row level security;
alter table public.cruise_requests enable row level security;
alter table public.offers enable row level security;
alter table public.offer_cabins enable row level security;
alter table public.reservations enable row level security;
alter table public.reservation_cabins enable row level security;
alter table public.passengers enable row level security;
alter table public.eligibility_proofs enable row level security;
alter table public.notifications enable row level security;

create policy "cancellation_policies: with vessel" on public.cancellation_policies for select to anon, authenticated
  using (app.can_read_product(vessel_id));
create policy "cancellation_policies: product editors write" on public.cancellation_policies for all to authenticated
  using (app.can_edit_product(vessel_id)) with check (app.can_edit_product(vessel_id));
create policy "cancellation_policy_translations: with policy" on public.cancellation_policy_translations for select to anon, authenticated
  using (exists (select 1 from public.cancellation_policies p where p.id = policy_id and app.can_read_product(p.vessel_id)));
create policy "cancellation_policy_translations: product editors write" on public.cancellation_policy_translations for all to authenticated
  using (exists (select 1 from public.cancellation_policies p where p.id = policy_id and app.can_edit_product(p.vessel_id)))
  with check (exists (select 1 from public.cancellation_policies p where p.id = policy_id and app.can_edit_product(p.vessel_id)));

-- The customer's own check comes first and needs no lookup, so a new request can be returned right after insert.
create policy "cruise_requests: customer, matching operators, admins read" on public.cruise_requests for select to authenticated
  using (customer_id = auth.uid() or app.can_read_request(id));
create policy "cruise_requests: customers create their own" on public.cruise_requests for insert to authenticated
  with check (customer_id = auth.uid() and status = 'open');
create policy "cruise_requests: customers close their own" on public.cruise_requests for update to authenticated
  using (customer_id = auth.uid() and status = 'open') with check (customer_id = auth.uid() and status in ('open', 'closed'));

create policy "offers: customer, the operator's team, admins read" on public.offers for select to authenticated
  using (app.is_admin() or app.has_org_role(org_id, array['owner', 'reservations', 'finance', 'viewer']::public.team_role[])
         or exists (select 1 from public.cruise_requests r where r.id = request_id and r.customer_id = auth.uid()));
create policy "offer_cabins: with offer" on public.offer_cabins for select to authenticated
  using (exists (select 1 from public.offers o where o.id = offer_id));

create policy "reservations: customer, operator team, admins read" on public.reservations for select to authenticated
  using (app.can_read_reservation(id));
create policy "reservation_cabins: with reservation" on public.reservation_cabins for select to authenticated
  using (app.can_read_reservation(reservation_id));
create policy "passengers: customer, operator team, admins read" on public.passengers for select to authenticated
  using (app.can_read_reservation(reservation_id));
create policy "eligibility_proofs: with reservation" on public.eligibility_proofs for select to authenticated
  using (app.can_read_reservation(reservation_id));
create policy "eligibility_proofs: customer uploads" on public.eligibility_proofs for insert to authenticated
  with check (status = 'submitted' and exists (select 1 from public.reservations r where r.id = reservation_id and r.customer_id = auth.uid()));

create policy "notifications: own or company" on public.notifications for select to authenticated
  using (user_id = auth.uid() or (org_id is not null and app.has_org_role(org_id, array['owner', 'reservations', 'finance', 'viewer']::public.team_role[])));
create policy "notifications: mark read" on public.notifications for update to authenticated
  using (user_id = auth.uid() or (org_id is not null and app.has_org_role(org_id, array['owner', 'reservations', 'finance', 'viewer']::public.team_role[])))
  with check (user_id = auth.uid() or (org_id is not null and app.has_org_role(org_id, array['owner', 'reservations', 'finance', 'viewer']::public.team_role[])));

-- Storage: proofs live under reservations/<id>/; the customer uploads, the reservation's readers read.
create or replace function app.storage_reservation_id(object_name text) returns uuid
language sql immutable set search_path = '' as $$
  select case when object_name ~ '^reservations/[0-9a-f-]{36}/' then split_part(object_name, '/', 2)::uuid end;
$$;
grant execute on function app.storage_reservation_id(text) to authenticated, service_role;
create policy "eligibility bucket: customer uploads" on storage.objects for insert to authenticated
  with check (bucket_id = 'eligibility' and exists (
    select 1 from public.reservations r where r.id = app.storage_reservation_id(name) and r.customer_id = auth.uid()));
create policy "eligibility bucket: reservation readers" on storage.objects for select to authenticated
  using (bucket_id = 'eligibility' and app.storage_reservation_id(name) is not null and app.can_read_reservation(app.storage_reservation_id(name)));

grant select, insert, update, delete on public.cancellation_policies, public.cancellation_policy_translations to authenticated, service_role;
grant select on public.cancellation_policies, public.cancellation_policy_translations to anon;
grant select on public.offers, public.offer_cabins, public.reservations, public.reservation_cabins, public.passengers to authenticated;
grant select, insert, update on public.cruise_requests to authenticated;
grant select, insert on public.eligibility_proofs to authenticated;
grant select, update on public.notifications to authenticated;
grant select, insert, update, delete on public.cruise_requests, public.offers, public.offer_cabins, public.reservations,
  public.reservation_cabins, public.passengers, public.eligibility_proofs, public.notifications to service_role;

create trigger audit_cancellation_policies after insert or update or delete on public.cancellation_policies for each row execute function app.audit_row();
create trigger audit_cruise_requests after insert or update or delete on public.cruise_requests for each row execute function app.audit_row();
create trigger audit_offers after insert or update or delete on public.offers for each row execute function app.audit_row();
create trigger audit_reservations after insert or update or delete on public.reservations for each row execute function app.audit_row();
-- SEC-013: changes to passenger data are logged without copying it into the log.
create or replace function app.audit_passenger() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform app.log_event('passengers.' || lower(tg_op), 'passengers', coalesce(new.id, old.id)::text, null, null,
    jsonb_build_object('reservation_id', coalesce(new.reservation_id, old.reservation_id)));
  return coalesce(new, old);
end $$;
create trigger audit_passengers after insert or update or delete on public.passengers for each row execute function app.audit_passenger();

-- ── Notices for a new request: every company that can serve it (DASH-OPR-002) ────────────────────────────
create or replace function app.notify_request() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.notifications (org_id, kind, title, link)
  select o.id, 'request.new', 'New cruise request', '/dashboard/operator/' || o.id || '/offers/' || new.id || '/'
  from app.request_orgs(new.id) o(id);
  return new;
end $$;
create trigger cruise_requests_notify after insert on public.cruise_requests for each row execute function app.notify_request();

-- ── Sending an offer (DASH-OPR-011, 017–023) ─────────────────────────────────────────────────────────────
-- cabins: [{cabin_type_id, adults, child_ages: [], price_minor}]. With `previous`, the new offer is the next version
-- of that thread and the previous version is superseded (it can no longer be accepted).
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
    list_total, nullif(trim(note), ''), d.gratuity_usd_minor, nullif(trim(inclusions_text), ''), terms_text, eligibility,
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

  insert into public.notifications (user_id, kind, title, link)
  values (r.customer_id, case when previous is null then 'offer.new' else 'offer.updated' end,
    case when previous is null then 'You have a new offer' else 'An offer was updated: please review it' end,
    '/dashboard/journey/requests/' || req || '/');
  return new_id;
end $$;

create or replace function public.withdraw_offer(target uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  o public.offers;
begin
  select * into o from public.offers where id = target for update;
  if o.id is null or not app.has_org_role(o.org_id, array['owner', 'reservations']::public.team_role[]) then
    raise exception 'Offer not found' using errcode = 'P0002';
  end if;
  update public.offers set status = 'withdrawn' where id = target and status = 'sent';
end $$;

-- ── Accepting an offer (DASH-OPR-021, DASH-CUS-007, DASH-ADM-057) ────────────────────────────────────────
-- One transaction: re-check, take cabins, create the reservation and its passengers. Inventory rows are locked in
-- cabin-type order, so parallel acceptances queue rather than deadlock, and availability never goes below zero.
create or replace function app.new_reference() returns text
language plpgsql volatile set search_path = '' as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  ref text;
begin
  loop
    ref := 'NC-' || (select string_agg(substr(alphabet, 1 + (get_byte(b, i) % 32), 1), '')
                     from (select extensions.gen_random_bytes(6) b) x, generate_series(0, 5) i);
    exit when not exists (select 1 from public.reservations where reference = ref);
  end loop;
  return ref;
end $$;

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
  if r.customer_id is distinct from auth.uid() then raise exception 'Offer not found' using errcode = 'P0002'; end if;
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
    currency, total_minor, gratuity_usd_minor, terms, policy)
  values (ref, r.id, o.id, r.customer_id, o.org_id, d.vessel_id, d.id, o.rate_plan, o.currency, o.total_minor,
    o.gratuity_usd_minor, o.terms,
    jsonb_build_object('bands', (select bands from public.cancellation_policies where id = pol),
      'terms', (select jsonb_object_agg(locale, terms) from public.cancellation_policy_translations where policy_id = pol)))
  returning id into res_id;
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
  insert into public.notifications (org_id, kind, title, link)
  values (o.org_id, 'reservation.new', 'Offer accepted: reservation ' || ref, '/dashboard/operator/' || o.org_id || '/bookings/' || res_id || '/');
  insert into public.notifications (user_id, kind, title, link)
  values (r.customer_id, 'reservation.new', 'Reservation ' || ref || ' is made. Payment details follow.', '/dashboard/journey/reservations/' || res_id || '/');
  return ref;
end $$;

create or replace function public.review_eligibility_proof(target uuid, decision public.proof_status, review_note text default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  p public.eligibility_proofs;
  org uuid;
begin
  select * into p from public.eligibility_proofs where id = target for update;
  select r.org_id into org from public.reservations r where r.id = p.reservation_id;
  if p.id is null or not (app.is_admin() or app.has_org_role(org, array['owner', 'reservations']::public.team_role[])) then
    raise exception 'Proof not found' using errcode = 'P0002';
  end if;
  if decision = 'submitted' then raise exception 'Choose verified or rejected' using errcode = '22023'; end if;
  update public.eligibility_proofs set status = decision, note = nullif(trim(review_note), ''), reviewed_by = auth.uid(), reviewed_at = now()
  where id = target;
end $$;

revoke execute on function public.send_offer(uuid, uuid, public.rate_plan, text, jsonb, bigint, bigint, text, text, text, text, integer, uuid),
  public.withdraw_offer(uuid), public.accept_offer(uuid, jsonb, boolean), public.review_eligibility_proof(uuid, public.proof_status, text),
  app.new_reference() from public, anon;
grant execute on function public.send_offer(uuid, uuid, public.rate_plan, text, jsonb, bigint, bigint, text, text, text, text, integer, uuid),
  public.withdraw_offer(uuid), public.accept_offer(uuid, jsonb, boolean), public.review_eligibility_proof(uuid, public.proof_status, text)
  to authenticated;
