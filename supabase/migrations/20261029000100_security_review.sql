-- Batch 11-1 (SEC-011): fixes from the pre-launch security review (docs/SECURITY-REVIEW.md).

-- ── High: a sheet sender belongs to one operator only ─────────────────────────────────────────────────────────
-- Inbound sheets are credited to the operator whose contact sent them; an address or number shared by two operators
-- would let one claim the other's sheets.
create unique index operator_contacts_email_unique on public.operator_contacts (lower(email)) where email is not null;
create unique index operator_contacts_whatsapp_unique on public.operator_contacts (whatsapp) where whatsapp is not null;

-- ── Medium: notifications can only be marked read ─────────────────────────────────────────────────────────────
-- The update policy covered every column, so a member could rewrite a title and reset email_status to resend it.
revoke update on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;

-- ── Medium: availability written directly is always manual and never in the future ───────────────────────────
-- Feeds, the API, sheets and taps go through security-definer functions (owned by postgres), which set the true
-- source and time. A direct write through the API (role authenticated) is an operator typing it in.
create or replace function app.guard_inventory_source() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user = 'authenticated' then
    new.source := 'manual';
    new.confirmed_at := least(coalesce(new.confirmed_at, now()), now());
  end if;
  return new;
end $$;
create trigger inventory_guard_source before insert or update on public.inventory
  for each row execute function app.guard_inventory_source();

-- ── Medium: an alternative offer is accepted only while its sailing is still on, and lapses after 7 days ─────
create or replace function public.customer_accept_alternative(req uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  r public.booking_requests;
  d public.departures;
  cabins jsonb;
  guests jsonb;
  made record;
begin
  select * into r from public.booking_requests where id = req for update;
  if r.id is null or not app.is_requester(r) then raise exception 'Booking request not found' using errcode = 'P0002'; end if;
  if r.status <> 'alternative_offered' then raise exception 'There is no other offer to accept' using errcode = '22023'; end if;
  if (r.alternative ->> 'cabins')::int <> jsonb_array_length(r.cabins) then
    raise exception 'The operator offers % cabins: send a new request with your party in them', r.alternative ->> 'cabins' using errcode = '22023';
  end if;
  select * into d from public.departures where id = coalesce((r.alternative ->> 'departure_id')::uuid, r.departure_id);
  -- SEC-011: the sailing must still be scheduled, in the future, on a published vessel of an approved operator.
  if d.id is null or d.status <> 'scheduled' or d.departs_on <= (now() at time zone 'Africa/Cairo')::date
     or not exists (select 1 from public.vessels v join public.organisations o on o.id = v.operator_org_id
                    where v.id = d.vessel_id and v.visibility = 'published' and o.status = 'approved') then
    raise exception 'That sailing can no longer be booked: send a new request' using errcode = '22023';
  end if;
  cabins := (select jsonb_agg(case when r.alternative ? 'cabin_type_id' then c || jsonb_build_object('cabin_type_id', r.alternative ->> 'cabin_type_id') else c end)
             from jsonb_array_elements(r.cabins) c);
  guests := (select g.guests from public.booking_request_guests g where g.request_id = r.id);
  if r.buyer_org_id is not null then
    select * into made from app.make_partner_reservation(r.customer_id, r.buyer_org_id, d, r.currency::text, cabins, guests,
      r.client_reference, coalesce(r.selling_total_minor, 0), true);
  else
    select * into made from app.make_reservation(r.customer_id, d, r.currency::text, cabins, guests, true);
  end if;
  update public.booking_requests set status = 'confirmed', reservation_id = made.res_id where id = r.id;
  return made.res_id;
end $$;

create or replace function app.expire_booking_requests() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  r public.booking_requests;
  n integer := 0;
begin
  for r in select * from public.booking_requests
           where (status = 'held' and hold_until < now()) or (status = 'waiting' and created_at < now() - interval '7 days')
              or (status = 'alternative_offered' and updated_at < now() - interval '7 days')
           for update skip locked loop
    if r.status = 'held' then perform app.release_hold(r); end if;
    update public.booking_requests set status = 'expired', hold_until = null, held = null where id = r.id;
    perform app.notify_requester(r, 'booking_request.expired', 'Booking request ' || r.reference || ' has expired without a confirmation');
    n := n + 1;
  end loop;
  return n;
end $$;

-- ── Medium: admin roles are kept apart ────────────────────────────────────────────────────────────────────────
-- Every admin reads; only catalogue (and super) admins manage companies and their teams, only super admins people.
drop policy "organisations: admin manages" on public.organisations;
create policy "organisations: catalogue admins manage" on public.organisations for all to authenticated
  using (app.has_admin_role(array['super', 'catalogue']::public.admin_role[]))
  with check (app.has_admin_role(array['super', 'catalogue']::public.admin_role[]));
drop policy "memberships: admin manages" on public.memberships;
create policy "memberships: catalogue admins manage" on public.memberships for all to authenticated
  using (app.has_admin_role(array['super', 'catalogue']::public.admin_role[]))
  with check (app.has_admin_role(array['super', 'catalogue']::public.admin_role[]));
drop policy "profiles: admin manages" on public.profiles;
create policy "profiles: super admins manage" on public.profiles for all to authenticated
  using (app.has_admin_role(array['super']::public.admin_role[]))
  with check (app.has_admin_role(array['super']::public.admin_role[]));

-- ── Low: the commission rate is never readable outside Nilecruz ───────────────────────────────────────────────
drop policy "platform_settings: signed-in read" on public.platform_settings;
create policy "platform_settings: signed-in read" on public.platform_settings for select to authenticated
  using (app.is_admin() or key <> 'commission_bp');

-- ── Low: rows can't be moved to another booking, company or person ─────────────────────────────────────────────
revoke update on public.partner_booking_details from authenticated;
grant update (client_reference, selling_total_minor) on public.partner_booking_details to authenticated;
revoke update on public.memberships from authenticated;
grant update (team_role) on public.memberships to authenticated;
