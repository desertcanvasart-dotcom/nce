-- A second public starting price, in Egyptian pounds, for Egyptians and foreign residents (Islam, 25 Nov 2026; ADR-113,
-- an exception to ADR-109's euro-only rule). A selling figure per person that includes the margin; the operator's net
-- rates never live here. The euro stays the public price for everyone else. Idempotent.
alter table public.vessels
  add column if not exists resident_from_minor bigint check (resident_from_minor > 0),
  add column if not exists resident_price_basis text check (resident_price_basis in ('per_person_per_trip', 'per_person_per_night')),
  add column if not exists resident_price_valid_to date,
  add column if not exists resident_price_approved boolean not null default false;
alter table public.vessels drop constraint if exists vessels_resident_price_complete;
alter table public.vessels add constraint vessels_resident_price_complete
  check (resident_from_minor is null or resident_price_basis is not null);

comment on column public.vessels.resident_from_minor is
  'Public "from" price for Egyptians and foreign residents, in piastres. Shown only when approved and in date.';

-- As for the euro price: only Nilecruz catalogue admins set it.
create or replace function app.guard_vessel_resident_price() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if app.is_catalogue_admin() or auth.uid() is null then
    return new;
  end if;
  if row(new.resident_from_minor, new.resident_price_basis, new.resident_price_valid_to, new.resident_price_approved)
     is distinct from
     row(old.resident_from_minor, old.resident_price_basis, old.resident_price_valid_to, old.resident_price_approved) then
    raise exception 'Only Nilecruz catalogue admins can change a vessel''s resident price' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists vessels_guard_resident_price on public.vessels;
create trigger vessels_guard_resident_price before update on public.vessels
  for each row execute function app.guard_vessel_resident_price();
