-- Batch 5-1: the public marketplace (PAGE-060–067, DASH-PUB-001, 005, 010, DATA-032, ADR-025, ADR-093).
-- Visitors already read published and showcase vessels, their schedules, departures, cabins, evaluations and photos
-- (row-level security). Rates and inventory stay private: this one function tells the public, per vessel, the single
-- "from" price and whether anything can be booked, and nothing else.

-- The "from" price (ADR-093): the lowest international per-person price for two sharing a cabin, over bookable
-- departures in the next 12 months, on a cabin type with places left in confirmed inventory. US$ is preferred, then €.
-- `bookable` is false for showcase and information-only vessels, which then show no price at all (DASH-PUB-010).
create or replace function public.public_vessel_prices()
returns table (vessel_id uuid, amount_minor bigint, currency text, bookable boolean)
language sql stable security definer set search_path = '' as $$
  with today as (select (now() at time zone 'Africa/Cairo')::date as d),
  ok as (
    select de.id, de.vessel_id
    from public.departures de
    join public.vessels v on v.id = de.vessel_id and v.visibility = 'published'
    cross join today
    where de.departs_on > today.d and de.departs_on <= today.d + 365
      and public.departure_bookable(de.id)
  ),
  priced as (
    select ok.vessel_id, r.amount_minor, r.currency::text as cur
    from ok
    join public.rates r on r.departure_id = ok.id and r.rate_plan = 'international' and r.occupancy = 2
    join public.cabin_types c on c.id = r.cabin_type_id and c.active
    join public.inventory i on i.departure_id = ok.id and i.cabin_type_id = c.id and i.available > 0
      and app.inventory_is_fresh(i.confirmed_at, i.source)
  )
  select v.id, p.amount_minor, p.cur, exists (select 1 from ok where ok.vessel_id = v.id)
  from public.vessels v
  left join lateral (
    select priced.amount_minor, priced.cur from priced where priced.vessel_id = v.id
    order by case priced.cur when 'USD' then 0 when 'EUR' then 1 else 2 end, priced.amount_minor
    limit 1
  ) p on true
  where v.visibility in ('published', 'showcase');
$$;
revoke execute on function public.public_vessel_prices() from public;
grant execute on function public.public_vessel_prices() to anon, authenticated, service_role;
