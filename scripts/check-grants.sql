-- Rows returned = privileges that differ from the intended set (ADR-061). Empty result means correct.
with intended(table_name, grantee, privileges) as (
  values
    ('vessels', 'anon', 'SELECT'), ('vessel_translations', 'anon', 'SELECT'), ('destinations', 'anon', 'SELECT'),
    ('destination_translations', 'anon', 'SELECT'), ('media', 'anon', 'SELECT'), ('media_translations', 'anon', 'SELECT'),
    ('audit_log', 'authenticated', 'SELECT'), ('audit_log', 'service_role', 'SELECT'),
    ('evaluations', 'anon', 'SELECT'), ('evaluation_translations', 'anon', 'SELECT'), ('external_ratings', 'anon', 'SELECT'),
    ('vessel_submission_events', 'authenticated', 'SELECT'), ('vessel_submission_events', 'service_role', 'SELECT'),
    ('cabin_types', 'anon', 'SELECT'), ('cabin_type_translations', 'anon', 'SELECT'), ('schedules', 'anon', 'SELECT'),
    ('schedule_periods', 'anon', 'SELECT'), ('schedule_days', 'anon', 'SELECT'), ('departures', 'anon', 'SELECT')
  union all
  select t, g, 'DELETE,INSERT,SELECT,UPDATE'
  from unnest(array['profiles', 'organisations', 'memberships', 'vessels', 'vessel_private', 'vessel_translations',
                    'destinations', 'destination_translations', 'media', 'media_translations',
                    'evaluations', 'evaluation_translations', 'external_ratings', 'safety_observations',
                    'org_invitations', 'vessel_submissions', 'vessel_import_batches',
                    'cabin_types', 'cabin_type_translations', 'schedules', 'schedule_periods', 'schedule_days', 'departures',
                    'inventory', 'rates', 'platform_settings', 'promotions', 'promotion_translations', 'promotion_rates']) t,
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
