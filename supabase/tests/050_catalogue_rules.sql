-- SEO-030 reserved slugs, slug format, BRAND-014 one parent per media row, published needs a date.
begin;
select plan(8);

select throws_ok($$insert into public.vessels (slug, name, type) values ('luxury', 'X', 'motor')$$, '23514', null, 'facet slug "luxury" rejected');
select throws_ok($$insert into public.vessels (slug, name, type) values ('compare', 'X', 'motor')$$, '23514', null, 'facet slug "compare" rejected');
select throws_ok($$insert into public.vessels (slug, name, type) values ('7-nights', 'X', 'motor')$$, '23514', null, 'facet slug "7-nights" rejected');
select throws_ok($$insert into public.vessels (slug, name, type) values ('Bad Slug', 'X', 'motor')$$, '23514', null, 'malformed slug rejected');
select throws_ok($$insert into public.vessels (slug, name, type, visibility) values ('ok-slug', 'X', 'motor', 'published')$$,
  '23514', null, 'published vessel needs published_at');

select throws_ok($$insert into public.media (vessel_id, destination_id, storage_path, width, height) values
  ('00000000-0000-4000-c000-000000000001', '00000000-0000-4000-d000-000000000001',
   'vessels/00000000-0000-4000-c000-000000000001/a.jpg', 10, 10)$$, '23514', null, 'media with two parents rejected');
select throws_ok($$insert into public.media (storage_path, width, height) values ('vessels/00000000-0000-4000-c000-000000000001/a.jpg', 10, 10)$$,
  '23514', null, 'media with no parent rejected');
select lives_ok($$insert into public.media (vessel_id, storage_path, width, height) values
  ('00000000-0000-4000-c000-000000000001', 'vessels/00000000-0000-4000-c000-000000000001/a.jpg', 10, 10)$$,
  'media with one parent accepted');

select * from finish();
rollback;
