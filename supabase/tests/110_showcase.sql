-- DATA-024: a showcase exception needs a date and a reason, and expires.
begin;
select plan(3);
select throws_ok($$update public.vessels set visibility = 'showcase', showcase_until = null where slug = 'sample-steam-one'$$, '23514', null, 'showcase needs a date and reason');
update public.vessels set visibility = 'showcase', showcase_until = current_date - 1, showcase_reason = 'Expired sample' where slug = 'sample-steam-one';
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select is_empty($$select 1 from public.vessels where slug = 'sample-steam-one'$$, 'an expired showcase is no longer public');
select isnt_empty($$select 1 from public.vessels where slug = 'sample-motor-one'$$, 'a current showcase is public');
select * from finish();
rollback;
