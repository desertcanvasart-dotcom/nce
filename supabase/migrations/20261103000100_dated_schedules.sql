-- A schedule that sails only on specific dates, like the Oberoi ships: no weekly sailing days. Its sailings are the
-- departures added one by one; generate_departures creates none for it, and the public calendar shows only those dates.
alter table public.schedules drop constraint schedules_sailing_days_check;
alter table public.schedules add constraint schedules_sailing_days_check
  check (cardinality(sailing_days) <= 7 and sailing_days <@ array[1,2,3,4,5,6,7]::smallint[]);
comment on column public.schedules.sailing_days is
  'ISO weekdays it usually sails on, inside its periods. Empty: it sails only on specific dates (its departures).';
