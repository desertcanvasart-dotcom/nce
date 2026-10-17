-- DATA-001 / DATA-002: no float or numeric money, no timestamps without time zone.
begin;
select plan(3);

select is(
  (select array_agg(table_name || '.' || column_name) from information_schema.columns
   where table_schema = 'public' and data_type in ('real', 'double precision', 'money')),
  null, 'no float or money columns in public');

select is(
  (select array_agg(table_name || '.' || column_name) from information_schema.columns
   where table_schema = 'public' and data_type = 'timestamp without time zone'),
  null, 'every timestamp has a time zone');

select is(
  (select array_agg(table_name || '.' || column_name) from information_schema.columns
   where table_schema = 'public' and (column_name ~ '(amount|price|total|fee)' ) and data_type <> 'bigint'),
  null, 'money-like columns are bigint minor units');

select * from finish();
rollback;
