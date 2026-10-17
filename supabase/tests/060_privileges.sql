-- ADR-061: table privileges are exactly the intended set (no TRUNCATE, REFERENCES or TRIGGER for API roles).
begin;
select plan(2);

select is_empty($$
  select 1 from information_schema.role_table_grants
  where table_schema = 'public' and grantee in ('anon', 'authenticated', 'service_role')
    and privilege_type in ('TRUNCATE', 'REFERENCES', 'TRIGGER')
$$, 'API roles have no TRUNCATE, REFERENCES or TRIGGER on any public table');

select is(
  (select array_agg(table_name::text order by table_name) from information_schema.role_table_grants
   where table_schema = 'public' and grantee = 'anon' and privilege_type <> 'SELECT'),
  null, 'anonymous visitors can only read');

select * from finish();
rollback;
