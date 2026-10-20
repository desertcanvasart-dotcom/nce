-- Batch 6-1 (DATA-009, ADR-096): the vessel-type comparison's guest and cabin figures come from the catalogue, not from
-- the design system's sample profiles. Visitors can't read private directory rows, so this returns only aggregates per
-- type: how many vessels, and the middle half (25th–75th percentile) of guests and cabins. Sample records are left out.
create or replace function public.vessel_type_stats()
returns table (type public.vessel_type, vessels integer, guests_low integer, guests_high integer, cabins_low integer, cabins_high integer)
language sql stable security definer set search_path = '' as $$
  select v.type, count(*)::int,
    round(percentile_cont(0.25) within group (order by v.max_guests))::int,
    round(percentile_cont(0.75) within group (order by v.max_guests))::int,
    round(percentile_cont(0.25) within group (order by v.cabin_count))::int,
    round(percentile_cont(0.75) within group (order by v.cabin_count))::int
  from public.vessels v
  where not v.is_sample
  group by v.type;
$$;
revoke execute on function public.vessel_type_stats() from public;
grant execute on function public.vessel_type_stats() to anon, authenticated, service_role;
