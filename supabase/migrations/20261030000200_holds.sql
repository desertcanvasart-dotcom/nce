-- Vessel onboarding spec, gap 3 (ADR-103): holds as their own records.
-- One row per hold: a sailing, a cabin type, a number of cabins, an expiry and a status. An operator's "Hold 72h" answer
-- writes one per cabin type (mirrored from booking_requests, which keeps working as before); catalogue admins can place
-- a hold, extend any active hold, and release their own. Held cabins are taken off availability while active, as the
-- request holds already were, so free / held / booked add up.

create type public.hold_status as enum ('active', 'confirmed', 'expired', 'released');

create table public.holds (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations (id) on delete cascade,
  vessel_id uuid not null references public.vessels (id) on delete cascade,
  departure_id uuid not null references public.departures (id) on delete cascade,
  cabin_type_id uuid not null references public.cabin_types (id) on delete cascade,
  cabins smallint not null check (cabins between 1 and 50),
  expires_at timestamptz not null,
  status public.hold_status not null default 'active',
  -- Set when the hold is an operator's answer to a booking request; null for a hold an admin placed.
  booking_request_id uuid references public.booking_requests (id) on delete cascade,
  note text check (length(note) <= 500),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  ended_at timestamptz,
  ended_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  check ((status = 'active') = (ended_at is null))
);
create index holds_sailing_idx on public.holds (departure_id, cabin_type_id) where status = 'active';
create index holds_expiry_idx on public.holds (expires_at) where status = 'active';
create index holds_request_idx on public.holds (booking_request_id) where booking_request_id is not null;
create index holds_org_idx on public.holds (org_id, status);
create trigger holds_updated_at before update on public.holds for each row execute function app.set_updated_at();

-- ── Request holds, mirrored ──────────────────────────────────────────────────────────────────────────────────
create or replace function app.mirror_request_hold() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'held' and old.status is distinct from 'held' then
    insert into public.holds (org_id, vessel_id, departure_id, cabin_type_id, cabins, expires_at, booking_request_id)
    select new.org_id, new.vessel_id, new.departure_id, k::uuid, (new.held ->> k)::int, new.hold_until, new.id
    from jsonb_object_keys(coalesce(new.held, '{}'::jsonb)) k
    where (new.held ->> k)::int > 0;
  elsif old.status = 'held' and new.status <> 'held' then
    update public.holds set status = case new.status when 'confirmed' then 'confirmed' when 'expired' then 'expired'
        else 'released' end::public.hold_status, ended_at = now(), ended_by = auth.uid()
    where booking_request_id = new.id and status = 'active';
  elsif new.status = 'held' and new.hold_until is distinct from old.hold_until then
    update public.holds set expires_at = new.hold_until where booking_request_id = new.id and status = 'active';
  end if;
  return null;
end $$;
create trigger booking_requests_mirror_hold after update of status, hold_until on public.booking_requests
  for each row execute function app.mirror_request_hold();

-- Holds already running when this ships.
insert into public.holds (org_id, vessel_id, departure_id, cabin_type_id, cabins, expires_at, booking_request_id, created_by, created_at)
select r.org_id, r.vessel_id, r.departure_id, k::uuid, (r.held ->> k)::int, r.hold_until, r.id, null, r.updated_at
from public.booking_requests r, jsonb_object_keys(coalesce(r.held, '{}'::jsonb)) k
where r.status = 'held' and (r.held ->> k)::int > 0;

-- ── Admin holds ──────────────────────────────────────────────────────────────────────────────────────────────
-- Cabins go back to availability as they were (no new source or time: nobody re-confirmed them), while the sailing
-- is still to come.
create or replace function app.give_back_hold(h public.holds) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.inventory i set available = i.available + h.cabins
  from public.departures d
  where d.id = h.departure_id and i.departure_id = h.departure_id and i.cabin_type_id = h.cabin_type_id
    and d.departs_on > (now() at time zone 'Africa/Cairo')::date;
end $$;

create or replace function public.admin_place_hold(dep uuid, cab uuid, n integer, hours integer, note text default null)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  d public.departures;
  v public.vessels;
  inv public.inventory;
  hold_id uuid;
begin
  if not app.is_catalogue_admin() then raise exception 'Only catalogue admins place holds' using errcode = '42501'; end if;
  if n is null or n not between 1 and 50 then raise exception 'Hold 1 to 50 cabins' using errcode = '22023'; end if;
  if hours is null or hours not between 1 and 168 then raise exception 'Hold for 1 to 168 hours' using errcode = '22023'; end if;
  select * into d from public.departures where id = dep;
  if d.id is null or d.status <> 'scheduled' or d.departs_on <= (now() at time zone 'Africa/Cairo')::date then
    raise exception 'Choose a coming sailing' using errcode = '22023';
  end if;
  select * into v from public.vessels where id = d.vessel_id;
  if not exists (select 1 from public.cabin_types where id = cab and vessel_id = v.id and active) then
    raise exception 'That cabin type isn''t on this ship' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('allotment@' || d.id::text || '@' || cab::text, 0));
  select * into inv from public.inventory where departure_id = d.id and cabin_type_id = cab for update;
  if inv.departure_id is null or inv.available < n then
    raise exception 'Only % cabins free to hold', coalesce(inv.available, 0) using errcode = '23514';
  end if;
  update public.inventory set available = available - n where departure_id = d.id and cabin_type_id = cab;
  insert into public.holds (org_id, vessel_id, departure_id, cabin_type_id, cabins, expires_at, note)
  values (v.operator_org_id, v.id, d.id, cab, n, now() + make_interval(hours => hours), nullif(trim(note), ''))
  returning id into hold_id;
  insert into public.notifications (org_id, kind, title, link)
  values (v.operator_org_id, 'hold.new', 'Nilecruz is holding ' || n || ' cabin' || case when n = 1 then '' else 's' end
    || ' on ' || v.name || ', ' || to_char(d.departs_on, 'DD Mon YYYY'),
    -- The Overview, which every team member can open (Inventory connections is owners only).
    '/dashboard/operator/' || v.operator_org_id || '/#holds');
  return hold_id;
end $$;

-- Any active hold: an admin's, or an operator's answer (whose request then holds as long).
create or replace function public.admin_extend_hold(target uuid, hours integer) returns timestamptz
language plpgsql security definer set search_path = '' as $$
declare
  h public.holds;
  until timestamptz;
begin
  if not app.is_catalogue_admin() then raise exception 'Only catalogue admins extend holds' using errcode = '42501'; end if;
  if hours is null or hours not between 1 and 168 then raise exception 'Extend by 1 to 168 hours' using errcode = '22023'; end if;
  select * into h from public.holds where id = target for update;
  if h.id is null or h.status <> 'active' then raise exception 'That hold isn''t active' using errcode = '22023'; end if;
  until := least(greatest(h.expires_at, now()) + make_interval(hours => hours), now() + interval '14 days');
  if h.booking_request_id is not null then
    update public.booking_requests set hold_until = until where id = h.booking_request_id and status = 'held';
  else
    update public.holds set expires_at = until where id = h.id;
  end if;
  return until;
end $$;

-- An admin's own hold only: an operator's answer is ended by the operator or by the request's expiry.
create or replace function public.admin_release_hold(target uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  h public.holds;
begin
  if not app.is_catalogue_admin() then raise exception 'Only catalogue admins release holds' using errcode = '42501'; end if;
  select * into h from public.holds where id = target for update;
  if h.id is null or h.status <> 'active' then raise exception 'That hold isn''t active' using errcode = '22023'; end if;
  if h.booking_request_id is not null then
    raise exception 'This hold is the operator''s answer to a booking request; it ends with the request' using errcode = '22023';
  end if;
  perform app.give_back_hold(h);
  update public.holds set status = 'released', ended_at = now(), ended_by = auth.uid() where id = h.id;
end $$;

create or replace function app.expire_holds() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  h public.holds;
  n integer := 0;
begin
  for h in select * from public.holds where status = 'active' and booking_request_id is null and expires_at < now()
           for update skip locked loop
    perform app.give_back_hold(h);
    update public.holds set status = 'expired', ended_at = now() where id = h.id;
    n := n + 1;
  end loop;
  return n;
end $$;
select cron.schedule('nilecruz-expire-holds', '*/15 * * * *', 'select app.expire_holds()');

-- ── Free / held / booked per cabin type on one sailing (operator's team and admins) ──────────────────────────
create or replace function public.sailing_inventory(dep uuid)
returns table (cabin_type_id uuid, code text, name text, cabin_count smallint, free integer, held integer, booked integer,
  allotment_left integer, source text, confirmed_at timestamptz, mode text, stop_sale boolean, freesale boolean)
language sql stable security definer set search_path = '' as $$
  select c.id, c.code, c.name, c.cabin_count, i.available,
    coalesce((select sum(h.cabins) from public.holds h where h.departure_id = d.id and h.cabin_type_id = c.id and h.status = 'active'), 0)::int,
    (select count(*) from public.reservation_cabins rc join public.reservations r on r.id = rc.reservation_id
     where r.departure_id = d.id and rc.cabin_type_id = c.id and r.status <> 'cancelled')::int,
    app.allotment_left(d.id, c.id), i.source::text, i.confirmed_at, app.cabin_mode(d.id, c.id),
    app.stop_sale_on(d.id, c.id), app.freesale_on(d.id, c.id)
  from public.departures d
  join public.vessels v on v.id = d.vessel_id
  join public.cabin_types c on c.vessel_id = v.id and c.active
  left join public.inventory i on i.departure_id = d.id and i.cabin_type_id = c.id
  where d.id = dep and (app.is_admin() or app.can_read_connections(v.operator_org_id))
  order by c.sort_order, c.name;
$$;

-- ── Access ───────────────────────────────────────────────────────────────────────────────────────────────────
alter table public.holds enable row level security;
create policy "holds: admins and the operator's team read" on public.holds for select to authenticated
  using (app.is_admin() or app.can_read_connections(org_id));
-- Written only through the functions above.
grant select on public.holds to authenticated, service_role;

revoke execute on function app.mirror_request_hold(), app.give_back_hold(public.holds), app.expire_holds() from public, anon, authenticated;
revoke execute on function public.admin_place_hold(uuid, uuid, integer, integer, text), public.admin_extend_hold(uuid, integer),
  public.admin_release_hold(uuid), public.sailing_inventory(uuid) from public, anon;
grant execute on function public.admin_place_hold(uuid, uuid, integer, integer, text), public.admin_extend_hold(uuid, integer),
  public.admin_release_hold(uuid), public.sailing_inventory(uuid) to authenticated;

create trigger audit_holds after insert or update or delete on public.holds for each row execute function app.audit_row();
