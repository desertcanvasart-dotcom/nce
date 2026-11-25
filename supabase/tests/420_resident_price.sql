-- The Egyptian-pound starting price for Egyptians and foreign residents (ADR-113).
begin;
select plan(3);

insert into public.vessels (id, slug, name, type, visibility, published_at, is_sample) values
  ('00000000-0000-4000-e700-000000000001', 'sample-resident-ship', 'Sample Resident Ship', 'motor', 'published', now(), true);

select is((select resident_pricing_approved from public.vessels where id = '00000000-0000-4000-e700-000000000001'), false,
  'a new vessel has no approved resident price');
select throws_ok($$ update public.vessels set resident_from_minor = 100000 where id = '00000000-0000-4000-e700-000000000001' $$,
  '23514', null, 'a resident price needs its basis');
select lives_ok($$ update public.vessels set resident_from_minor = 100000, resident_pricing_basis = 'per_person_per_night'
  where id = '00000000-0000-4000-e700-000000000001' $$, 'with a basis it is stored');

select * from finish();
rollback;
