-- PROPOSED-019 (Faris, 19–20 Oct 2026; ADR-091): when a schedule's ship sails on its first day. A morning sailing means
-- guests arrive the day before (sightseeing that day). Optional, so feeds and older schedules keep working; the exact time,
-- if given, must fall in the period: morning before 12:00, noon 12:00–15:59, evening from 16:00 (Cairo time).
create type public.sailing_period as enum ('morning', 'noon', 'evening');
alter table public.schedules add column sailing_period public.sailing_period;
alter table public.schedules add column sails_at time;
alter table public.schedules add constraint sails_at_in_period check (
  sails_at is null or (
    sailing_period is not null and (
      (sailing_period = 'morning' and sails_at < '12:00')
      or (sailing_period = 'noon' and sails_at >= '12:00' and sails_at < '16:00')
      or (sailing_period = 'evening' and sails_at >= '16:00'))));
