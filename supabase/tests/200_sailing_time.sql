-- PROPOSED-019: a schedule's sailing time of day; an exact time must fall in its period.
begin;
select plan(6);

insert into public.schedules (id, vessel_id, code, origin, destination, nights, sailing_days) values
  ('00000000-0000-4000-f900-000000000001', '00000000-0000-4000-8000-000000000003', 'ST4', 'Aswan', 'Luxor', 4, '{1}');
select lives_ok($$update public.schedules set sailing_period = 'morning' where id = '00000000-0000-4000-f900-000000000001'$$,
  'a period alone is enough');
select lives_ok($$update public.schedules set sails_at = '08:00' where id = '00000000-0000-4000-f900-000000000001'$$,
  'a morning time with a morning period');
select throws_ok($$update public.schedules set sails_at = '13:00' where id = '00000000-0000-4000-f900-000000000001'$$, '23514', null,
  'a noon time can''t be a morning sailing');
select lives_ok($$update public.schedules set sailing_period = 'noon', sails_at = '12:00' where id = '00000000-0000-4000-f900-000000000001'$$,
  '12:00 is noon');
select throws_ok($$update public.schedules set sailing_period = 'noon', sails_at = '16:00' where id = '00000000-0000-4000-f900-000000000001'$$, '23514', null,
  '16:00 is evening');
select throws_ok($$update public.schedules set sailing_period = null, sails_at = '09:00' where id = '00000000-0000-4000-f900-000000000001'$$, '23514', null,
  'a time needs its period');

select * from finish();
rollback;
