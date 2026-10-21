-- Batch 8-2b (ADR-101): what assistants (MCP) may read, the same as a visitor without an account (DASH-PUB-011, 012).

-- Each sailing's booking mode for the next year: instant, confirmed by the operator (request), sold out, or to be
-- confirmed. No prices and no cabin counts; signed-in screens keep using vessel_departure_prices.
create or replace function public.public_sailing_modes(target uuid)
returns table (departure_id uuid, schedule_id uuid, departs_on date, returns_on date, booking_mode text)
language sql stable security definer set search_path = '' as $$
  with today as (select (now() at time zone 'Africa/Cairo')::date as d),
  cabins as (
    select de.id, de.schedule_id, de.departs_on, de.returns_on, public.departure_bookable(de.id) as bookable,
      app.cabin_mode(de.id, c.id) as mode
    from public.departures de
    cross join today
    join public.vessels v on v.id = de.vessel_id and v.visibility = 'published'
    join public.schedules s on s.id = de.schedule_id and s.active
    join public.cabin_types c on c.vessel_id = v.id and c.active
    where v.id = target and de.status = 'scheduled' and de.departs_on > today.d and de.departs_on <= today.d + 365
      and exists (select 1 from public.rates r where r.departure_id = de.id and r.cabin_type_id = c.id and r.rate_plan = 'international')
  )
  select id, schedule_id, departs_on, returns_on,
    case
      when bool_or(bookable and mode = 'instant') then 'instant'
      when bool_or(bookable and mode = 'request') then 'request'
      when bool_and(mode = 'sold_out') then 'sold_out'
      else 'unconfirmed'
    end
  from cabins
  group by id, schedule_id, departs_on, returns_on
  order by departs_on;
$$;
revoke execute on function public.public_sailing_modes(uuid) from public;
grant execute on function public.public_sailing_modes(uuid) to anon, authenticated, service_role;
