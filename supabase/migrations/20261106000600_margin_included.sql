-- DATA-002: a column named like money must hold bigint minor units, so the yes/no "includes our margin" flag can't be
-- called price_*. Renamed; same meaning (false: shown without "Includes our margin" until the figure is confirmed).
alter table public.vessels rename column price_includes_margin to margin_included;
comment on column public.vessels.margin_included is
  'False: the public price is shown without "Includes our margin" (the figure is not yet confirmed to include it).';

-- The guard reads columns by name at run time, so it follows the rename.
create or replace function app.guard_vessel_booking_availability() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if app.is_catalogue_admin() or auth.uid() is null then
    return new;
  end if;
  if row(new.booking_availability, new.commercial_relationship, new.enquiry_partner_name, new.enquiry_partner_email,
         new.margin_included)
     is distinct from
     row(old.booking_availability, old.commercial_relationship, old.enquiry_partner_name, old.enquiry_partner_email,
         old.margin_included) then
    raise exception 'Only Nilecruz catalogue admins can change how a vessel is booked' using errcode = '42501';
  end if;
  return new;
end $$;
