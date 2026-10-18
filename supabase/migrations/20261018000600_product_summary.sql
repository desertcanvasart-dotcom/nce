-- DATA-021: the readiness check's product facts for every vessel in one query (runs as the caller, so RLS applies).
-- "Bookable" = a future, scheduled departure with fresh inventory above zero and at least one rate.
create or replace function public.vessel_product_summary(only_vessel uuid default null)
returns table (vessel_id uuid, cabin_types integer, schedules integer, upcoming_departures integer, bookable_departures integer)
language sql stable security invoker set search_path = '' as $$
  select v.id,
    (select count(*)::int from public.cabin_types c where c.vessel_id = v.id and c.active),
    (select count(*)::int from public.schedules s where s.vessel_id = v.id and s.active),
    (select count(*)::int from public.departures d where d.vessel_id = v.id and d.status = 'scheduled' and d.departs_on >= current_date),
    (select count(distinct d.id)::int from public.departures d
       join public.inventory i on i.departure_id = d.id and i.available > 0 and app.inventory_is_fresh(i.confirmed_at, i.source)
       join public.rates r on r.departure_id = d.id and r.cabin_type_id = i.cabin_type_id
     where d.vessel_id = v.id and d.status = 'scheduled' and d.departs_on >= current_date)
  from public.vessels v
  where only_vessel is null or v.id = only_vessel;
$$;
revoke execute on function public.vessel_product_summary(uuid) from public, anon;
grant execute on function public.vessel_product_summary(uuid) to authenticated, service_role;
