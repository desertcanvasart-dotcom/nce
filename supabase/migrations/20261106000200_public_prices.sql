-- Public starting prices in euros (Islam's pricing brief, 6 Nov 2026; ADR-109, which replaces ADR-025 for starting
-- prices). Three levels: a starting price everyone can read; a rate for given dates, sent by an adviser by email (or,
-- where set, shown to a signed-in traveller); and an optional account that saves quotes and alerts on price changes.
-- Idempotent, so it can run again on a database that already has it.

-- ── Level 1: the one public price per vessel ─────────────────────────────────────────────────────────────────────
do $$ begin
  create type public.public_price_mode as enum ('from_price', 'price_band', 'on_request');
exception when duplicate_object then null;
end $$;
do $$ begin
  create type public.rate_display as enum ('offer_by_adviser', 'signed_in_price');
exception when duplicate_object then null;
end $$;

-- Safe defaults: "Price on request" until the operator approves a figure, and a rate for given dates comes as an
-- adviser's offer by email. Amounts are selling prices per person in euro cents and already include Nilecruz's margin.
-- Net rates and the margin itself never live here: they stay in the role-restricted rate tables.
alter table public.vessels
  add column if not exists public_pricing_mode public.public_price_mode not null default 'on_request',
  add column if not exists from_price_minor bigint check (from_price_minor > 0),
  add column if not exists price_band_min_minor bigint check (price_band_min_minor > 0),
  add column if not exists price_band_max_minor bigint check (price_band_max_minor > 0),
  -- The euro is the only public selling currency; a price is never converted from another one.
  add column if not exists pricing_currency char(3) not null default 'EUR' check (pricing_currency = 'EUR'),
  add column if not exists pricing_basis text check (pricing_basis in ('per_person_per_trip', 'per_person_per_night')),
  -- A per-trip price for a cruise of this length, said only once Nilecruz has confirmed the sailing.
  add column if not exists pricing_trip_nights smallint check (pricing_trip_nights between 1 and 21),
  add column if not exists pricing_valid_from date,
  add column if not exists pricing_valid_to date,
  add column if not exists pricing_last_checked date,
  add column if not exists operator_pricing_approved boolean not null default false,
  add column if not exists rate_display_after_request public.rate_display not null default 'offer_by_adviser';

alter table public.vessels drop constraint if exists vessels_public_price_complete;
alter table public.vessels add constraint vessels_public_price_complete check (
  (public_pricing_mode = 'on_request')
  or (public_pricing_mode = 'from_price' and from_price_minor is not null and pricing_basis is not null
    and pricing_last_checked is not null)
  or (public_pricing_mode = 'price_band' and price_band_min_minor is not null and price_band_max_minor is not null
    and price_band_min_minor <= price_band_max_minor and pricing_basis is not null and pricing_last_checked is not null));
alter table public.vessels drop constraint if exists vessels_price_valid_order;
alter table public.vessels add constraint vessels_price_valid_order
  check (pricing_valid_from is null or pricing_valid_to is null or pricing_valid_from <= pricing_valid_to);
alter table public.vessels drop constraint if exists vessels_price_nights_per_trip;
alter table public.vessels add constraint vessels_price_nights_per_trip
  check (pricing_trip_nights is null or pricing_basis = 'per_person_per_trip');

comment on column public.vessels.public_pricing_mode is
  'Level 1 public price: from_price, price_band or on_request. Shown only when operator_pricing_approved and in date.';
comment on column public.vessels.operator_pricing_approved is
  'The operator approved this public selling price. Without it the vessel shows "Price on request".';

-- Only Nilecruz catalogue admins set the public price and its approval; operators approve outside the system.
create or replace function app.guard_vessel_public_price() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if app.is_catalogue_admin() or auth.uid() is null then
    return new;
  end if;
  if row(new.public_pricing_mode, new.from_price_minor, new.price_band_min_minor, new.price_band_max_minor,
         new.pricing_currency, new.pricing_basis, new.pricing_trip_nights, new.pricing_valid_from, new.pricing_valid_to,
         new.pricing_last_checked, new.operator_pricing_approved, new.rate_display_after_request)
     is distinct from
     row(old.public_pricing_mode, old.from_price_minor, old.price_band_min_minor, old.price_band_max_minor,
         old.pricing_currency, old.pricing_basis, old.pricing_trip_nights, old.pricing_valid_from, old.pricing_valid_to,
         old.pricing_last_checked, old.operator_pricing_approved, old.rate_display_after_request) then
    raise exception 'Only Nilecruz catalogue admins can change a vessel''s public price' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists vessels_guard_public_price on public.vessels;
create trigger vessels_guard_public_price before update on public.vessels
  for each row execute function app.guard_vessel_public_price();

-- ── Launch data ──────────────────────────────────────────────────────────────────────────────────────────────────
-- No price is converted from US dollars: every dollar guide price is removed, and those vessels show "Price on request".
update public.vessels set indicative_per_night_minor = null, indicative_per_trip_minor = null,
  indicative_trip_nights = null, indicative_currency = null, indicative_basis = null, indicative_status = null
where indicative_currency is not null;

-- The one value the brief confirms: Mövenpick MS Royal Lily from €1,120 per person for the 4-night cruise, Luxor to
-- Aswan, including our margin; last checked 6 Nov 2026, no expiry (Islam). Nothing happens on a database without it.
update public.vessels set public_pricing_mode = 'from_price', from_price_minor = 112000, pricing_currency = 'EUR',
  pricing_basis = 'per_person_per_trip', pricing_trip_nights = 4, pricing_last_checked = date '2026-11-06',
  operator_pricing_approved = true
where slug = 'movenpick-royal-lily';

-- ── Level 2: what a traveller asked for when checking rates for their dates ──────────────────────────────────────
alter table public.contact_messages
  add column if not exists cabin_preference text check (length(cabin_preference) <= 120);
-- "Check rates for your dates" asks only for an email address: the name is optional for offer requests.
alter table public.contact_messages alter column name drop not null;
alter table public.contact_messages drop constraint if exists contact_messages_name_check;
alter table public.contact_messages add constraint contact_messages_name_check
  check (name is null or length(trim(name)) between 1 and 120);
alter table public.contact_messages drop constraint if exists contact_messages_name_unless_offer;
alter table public.contact_messages add constraint contact_messages_name_unless_offer
  check (name is not null or topic = 'offer');

create or replace function app.notify_contact_message() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.notifications (org_id, kind, title, link)
  select o.id, 'contact.new', 'New Contact message: ' || left(coalesce(new.name, new.email), 80), '/dashboard/admin/messages/'
  from public.organisations o where o.kind = 'nilecruz' limit 1;
  return new;
end $$;

-- ── Level 3: saved quotes and price alerts (an account is optional, never needed to read a price or ask) ─────────
create table if not exists public.saved_quotes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  vessel_id uuid not null references public.vessels (id) on delete cascade,
  schedule_code text check (length(schedule_code) <= 40),
  route text check (length(route) <= 80),
  nights smallint check (nights between 1 and 21),
  departs_on date,
  guests smallint check (guests between 1 and 30),
  cabin_preference text check (length(cabin_preference) <= 120),
  -- Alert when the vessel's public price changes. Only offered when it has a public figure to change.
  pricing_alert boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists saved_quotes_user_idx on public.saved_quotes (user_id, created_at desc);
create index if not exists saved_quotes_alert_idx on public.saved_quotes (vessel_id) where pricing_alert;
alter table public.saved_quotes enable row level security;
drop policy if exists "saved_quotes: own" on public.saved_quotes;
create policy "saved_quotes: own" on public.saved_quotes for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "saved_quotes: admins read" on public.saved_quotes;
create policy "saved_quotes: admins read" on public.saved_quotes for select to authenticated using (app.is_admin());
revoke all on public.saved_quotes from anon, authenticated;
grant select, insert, update (pricing_alert), delete on public.saved_quotes to authenticated;
grant select, insert, update, delete on public.saved_quotes to service_role;

-- When a vessel's shown public price changes, each traveller with an alert on it gets a notice (and its email).
create or replace function app.alert_public_price_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if row(new.public_pricing_mode, new.from_price_minor, new.price_band_min_minor, new.price_band_max_minor,
         new.operator_pricing_approved, new.pricing_valid_to)
     is not distinct from
     row(old.public_pricing_mode, old.from_price_minor, old.price_band_min_minor, old.price_band_max_minor,
         old.operator_pricing_approved, old.pricing_valid_to) then
    return new;
  end if;
  insert into public.notifications (user_id, kind, title, link)
  select distinct q.user_id, 'price.changed', left('The price of ' || new.name || ' has changed', 200), '/dashboard/journey/'
  from public.saved_quotes q where q.vessel_id = new.id and q.pricing_alert;
  return new;
end $$;
drop trigger if exists vessels_alert_public_price on public.vessels;
create trigger vessels_alert_public_price after update on public.vessels
  for each row execute function app.alert_public_price_change();
