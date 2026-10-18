-- DATA-022: new rates take the operator's (or default) child bands; callers never need to send them.
alter table public.rates alter column child_bands set default '[]'::jsonb;

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
  if tg_table_name = 'rates' then
    if new.occupancy > cab.max_occupancy then
      raise exception 'Occupancy % is more than this cabin allows (%)', new.occupancy, cab.max_occupancy using errcode = '23514';
    end if;
    if tg_op = 'INSERT' and (new.child_bands is null or new.child_bands = '[]'::jsonb) then
      new.child_bands := app.child_bands_for_vessel(dep_vessel);
    elsif tg_op = 'UPDATE' then
      new.child_bands := old.child_bands; -- bands never change on an existing rate
    end if;
  end if;
  return new;
end $$;
