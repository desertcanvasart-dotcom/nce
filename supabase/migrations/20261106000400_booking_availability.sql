-- Who can book a vessel, and guide prices that don't include our margin (Islam's review of the live site, 6 Nov 2026).
-- Idempotent, so it can run again on a database that already has it. Runs after 20261106000200_public_prices.sql.

-- ── Booking availability ─────────────────────────────────────────────────────────────────────────────────────────
-- A vessel Nilecruz can't sell shows no price and no Nilecruz booking action. It may name a travel company that takes
-- enquiries for it (never described as the operator), with the address that company approved.
alter table public.vessels
  add column if not exists booking_availability text not null default 'available_through_nilecruz'
    check (booking_availability in ('available_through_nilecruz', 'not_available_through_nilecruz')),
  add column if not exists commercial_relationship text
    check (commercial_relationship in ('agreement', 'none')),
  add column if not exists enquiry_partner_name text check (length(trim(enquiry_partner_name)) between 1 and 80),
  add column if not exists enquiry_partner_email text
    check (enquiry_partner_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(enquiry_partner_email) <= 120);

alter table public.vessels drop constraint if exists vessels_enquiry_partner_complete;
alter table public.vessels add constraint vessels_enquiry_partner_complete check (
  (enquiry_partner_name is null) = (enquiry_partner_email is null)
  and (enquiry_partner_name is null or booking_availability = 'not_available_through_nilecruz'));

comment on column public.vessels.booking_availability is
  'not_available_through_nilecruz: no price, no Nilecruz booking or offer request; the page may name an enquiry partner.';
comment on column public.vessels.enquiry_partner_name is
  'A travel company that takes enquiries for a vessel Nilecruz cannot sell. Never the operator. Shown only with its approval.';

-- ── Guide prices without our margin ──────────────────────────────────────────────────────────────────────────────
-- Until Islam confirms that a figure includes our margin, its page says "A guide, not a quote" without "Includes our
-- margin", and doesn't repeat that all our prices include it.
alter table public.vessels add column if not exists price_includes_margin boolean not null default true;
comment on column public.vessels.price_includes_margin is
  'False: the public price is shown without "Includes our margin" (the figure is not yet confirmed to include it).';

-- Only Nilecruz catalogue admins set these, like the public price.
create or replace function app.guard_vessel_booking_availability() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if app.is_catalogue_admin() or auth.uid() is null then
    return new;
  end if;
  if row(new.booking_availability, new.commercial_relationship, new.enquiry_partner_name, new.enquiry_partner_email,
         new.price_includes_margin)
     is distinct from
     row(old.booking_availability, old.commercial_relationship, old.enquiry_partner_name, old.enquiry_partner_email,
         old.price_includes_margin) then
    raise exception 'Only Nilecruz catalogue admins can change how a vessel is booked' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists vessels_guard_booking_availability on public.vessels;
create trigger vessels_guard_booking_availability before update on public.vessels
  for each row execute function app.guard_vessel_booking_availability();

-- ── Launch data ──────────────────────────────────────────────────────────────────────────────────────────────────
-- Steam Ship Sudan can't be booked through Nilecruz and has no agreement with us. Original Travel takes enquiries for
-- it and approved this address (Islam, 6 Nov 2026). Original Travel is not its operator.
update public.vessels set booking_availability = 'not_available_through_nilecruz', commercial_relationship = 'none',
  enquiry_partner_name = 'Original Travel', enquiry_partner_email = 'jamie.armstrong@originaltravel.co.uk'
where slug = 'steam-ship-sudan';

-- The Nour El Nil dahabiyas keep their euro "from" prices, from the operator's email, which Islam confirmed for now
-- (6 Nov 2026), without "Includes our margin" until he confirms the figures include it. Copied as stored, never
-- converted; last checked on the fleet data's date.
update public.vessels set public_pricing_mode = 'from_price', from_price_minor = indicative_per_trip_minor,
  pricing_currency = 'EUR', pricing_basis = 'per_person_per_trip', pricing_trip_nights = indicative_trip_nights,
  pricing_last_checked = date '2026-11-03', operator_pricing_approved = true, price_includes_margin = false
where slug like 'nour-el-nil-%' and indicative_currency = 'EUR' and indicative_per_trip_minor > 0
  and public_pricing_mode = 'on_request';

-- No other guide price stays stored: the public price columns replace them (ADR-109).
update public.vessels set indicative_per_night_minor = null, indicative_per_trip_minor = null,
  indicative_trip_nights = null, indicative_currency = null, indicative_basis = null, indicative_status = null
where indicative_currency is not null;

