-- Faris's rate sheet (Questions tab, 21 Oct 2026; ADR-102 question 5): a tour booked on its own can be booked up to
-- 1 week ahead. A setting, so admins can change it; programmes go with their cruise and don't use it.
insert into public.platform_settings (key, value) values ('tour_horizon_days', '7') on conflict (key) do nothing;

create or replace function app.tour_horizon_days() returns integer
language sql stable security definer set search_path = '' as $$
  select coalesce((select (value #>> '{}')::int from public.platform_settings where key = 'tour_horizon_days'), 365);
$$;
revoke execute on function app.tour_horizon_days() from public, anon, authenticated;

create or replace function app.slot_problem(r public.tour_rates, starts timestamptz) returns text
language plpgsql stable security definer set search_path = '' as $$
declare
  local timestamp := starts at time zone 'Africa/Cairo';
  horizon integer := app.tour_horizon_days();
begin
  if r.mode = 'program' then return 'A sightseeing programme is booked together with its cruise'; end if;
  if not r.active or not public.tour_is_bookable(r.tour_id) then return 'This tour can''t be booked'; end if;
  if extract(isodow from local)::smallint <> all (r.days) then return 'The tour doesn''t run on that day'; end if;
  if cardinality(r.start_times) > 0 and local::time <> all (r.start_times) then return 'The tour doesn''t start at that time'; end if;
  if cardinality(r.start_times) = 0 and (extract(minute from local)::int % 15 <> 0 or extract(second from local) <> 0) then
    return 'Pick a time on the quarter hour';
  end if;
  if starts < now() + make_interval(hours => r.lead_hours) then
    return format('Book at least %s hours before the start', r.lead_hours);
  end if;
  -- Counted in Cairo days: the last day of the window is bookable all day.
  if local::date > (now() at time zone 'Africa/Cairo')::date + horizon then
    return format('Book up to %s days ahead', horizon);
  end if;
  if exists (select 1 from public.tour_slot_closures c where c.rate_id = r.id and c.starts_at = starts) then
    return 'This start has been cancelled by the office';
  end if;
  return null;
end $$;
