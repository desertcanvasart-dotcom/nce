-- Rows returned = privileges that differ from the intended set (ADR-061). Empty result means correct.
with intended(table_name, grantee, privileges) as (
  values
    ('vessels', 'anon', 'SELECT'), ('vessel_translations', 'anon', 'SELECT'), ('destinations', 'anon', 'SELECT'),
    ('destination_translations', 'anon', 'SELECT'), ('media', 'anon', 'SELECT'), ('media_translations', 'anon', 'SELECT'),
    ('audit_log', 'authenticated', 'SELECT'), ('audit_log', 'service_role', 'SELECT')
  union all
  select t, g, 'DELETE,INSERT,SELECT,UPDATE'
  from unnest(array['profiles', 'organisations', 'memberships', 'vessels', 'vessel_private', 'vessel_translations',
                    'destinations', 'destination_translations', 'media', 'media_translations']) t,
       unnest(array['authenticated', 'service_role']) g
),
actual as (
  select table_name::text, grantee::text, string_agg(privilege_type, ',' order by privilege_type) as privileges
  from information_schema.role_table_grants
  where table_schema = 'public' and grantee in ('anon', 'authenticated', 'service_role')
  group by 1, 2
)
select coalesce(a.table_name, i.table_name) as table_name, coalesce(a.grantee, i.grantee) as grantee,
       i.privileges as intended, a.privileges as actual
from actual a full join intended i using (table_name, grantee)
where a.privileges is distinct from i.privileges
order by 1, 2;
