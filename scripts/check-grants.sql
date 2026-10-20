-- Rows returned = privileges that differ from the intended set (ADR-061). Empty result means correct.
with intended(table_name, grantee, privileges) as (
  values
    ('vessels', 'anon', 'SELECT'), ('vessel_translations', 'anon', 'SELECT'), ('destinations', 'anon', 'SELECT'),
    ('destination_translations', 'anon', 'SELECT'), ('media', 'anon', 'SELECT'), ('media_translations', 'anon', 'SELECT'),
    ('audit_log', 'authenticated', 'SELECT'), ('audit_log', 'service_role', 'SELECT'),
    ('evaluations', 'anon', 'SELECT'), ('evaluation_translations', 'anon', 'SELECT'), ('external_ratings', 'anon', 'SELECT'),
    ('vessel_submission_events', 'authenticated', 'SELECT'), ('vessel_submission_events', 'service_role', 'SELECT'),
    ('cabin_types', 'anon', 'SELECT'), ('cabin_type_translations', 'anon', 'SELECT'), ('schedules', 'anon', 'SELECT'),
    ('schedule_periods', 'anon', 'SELECT'), ('schedule_days', 'anon', 'SELECT'), ('departures', 'anon', 'SELECT'),
    -- Batch 4c-2: connections are read by people and changed only through functions or the service role.
    ('inventory_feeds', 'authenticated', 'SELECT'), ('api_keys', 'authenticated', 'SELECT'),
    ('inventory_runs', 'authenticated', 'SELECT'),
    -- Batch 4d: published tours, sessions (prices included, ADR-087) and programs are public; suppliers are not.
    ('tours', 'anon', 'SELECT'), ('tour_translations', 'anon', 'SELECT'), ('tour_schedules', 'anon', 'SELECT'),
    ('tour_sessions', 'anon', 'SELECT'), ('programs', 'anon', 'SELECT'), ('program_translations', 'anon', 'SELECT'),
    ('program_items', 'anon', 'SELECT'), ('program_schedules', 'anon', 'SELECT'),
    -- Batch 4e: people write requests, proofs and read marks directly; offers and reservations only through functions.
    ('cancellation_policies', 'anon', 'SELECT'), ('cancellation_policy_translations', 'anon', 'SELECT'),
    ('cruise_requests', 'authenticated', 'INSERT,SELECT,UPDATE'), ('offers', 'authenticated', 'SELECT'),
    ('offer_cabins', 'authenticated', 'SELECT'), ('reservations', 'authenticated', 'SELECT'),
    ('reservation_cabins', 'authenticated', 'SELECT'), ('passengers', 'authenticated', 'SELECT'),
    ('eligibility_proofs', 'authenticated', 'INSERT,SELECT'), ('notifications', 'authenticated', 'SELECT,UPDATE'),
    -- Batch 4f: money is read by people and written only through functions (ADR-089).
    ('payments', 'authenticated', 'SELECT'), ('commission_entries', 'authenticated', 'SELECT'), ('payouts', 'authenticated', 'SELECT'),
    -- Batch 4f-2: cancellations, refunds and tour orders likewise.
    ('cancellation_requests', 'authenticated', 'SELECT'), ('refunds', 'authenticated', 'SELECT'),
    ('tour_orders', 'authenticated', 'SELECT'), ('tour_payments', 'authenticated', 'SELECT'), ('tour_refunds', 'authenticated', 'SELECT'),
    -- Batch 4h-2: the agency's client reference and selling total; read by the agency, edited by its owner and reservations users.
    ('partner_booking_details', 'authenticated', 'SELECT,UPDATE'),
    -- Batch 7-1: Contact messages: anyone sends; admins read and file them (filing is a column grant, not listed here).
    ('contact_messages', 'anon', 'INSERT'), ('contact_messages', 'authenticated', 'INSERT,SELECT'),
    -- Batch 7-2: tour rates and seasons are public (prices, ADR-087); closed starts are read by the office and admins.
    ('tour_rates', 'anon', 'SELECT'), ('tour_seasons', 'anon', 'SELECT'), ('tour_slot_closures', 'authenticated', 'SELECT'),
    ('tour_slot_closures', 'service_role', 'DELETE,INSERT,SELECT,UPDATE'),
    -- Operator loop A: booking requests, their guests and messages are read by people, written through functions.
    ('booking_requests', 'authenticated', 'SELECT'), ('booking_request_guests', 'authenticated', 'SELECT'),
    ('outbound_messages', 'authenticated', 'SELECT'),
    ('used_action_tokens', 'service_role', 'DELETE,INSERT,SELECT,UPDATE'),
    -- Operator loop B: sheets are read by admins and the operator's team; catalogue admins update them (RLS).
    ('sheet_ingests', 'authenticated', 'SELECT,UPDATE'), ('sheet_ingests', 'service_role', 'DELETE,INSERT,SELECT,UPDATE'),
    ('inventory_feeds', 'service_role', 'DELETE,INSERT,SELECT,UPDATE'), ('api_keys', 'service_role', 'DELETE,INSERT,SELECT,UPDATE'),
    ('inventory_runs', 'service_role', 'DELETE,INSERT,SELECT,UPDATE'), ('api_idempotency', 'service_role', 'DELETE,INSERT,SELECT,UPDATE')
  union all
  select t, g, 'DELETE,INSERT,SELECT,UPDATE'
  from unnest(array['profiles', 'organisations', 'memberships', 'vessels', 'vessel_private', 'vessel_translations',
                    'destinations', 'destination_translations', 'media', 'media_translations',
                    'evaluations', 'evaluation_translations', 'external_ratings', 'safety_observations',
                    'org_invitations', 'vessel_submissions', 'vessel_import_batches',
                    'cabin_types', 'cabin_type_translations', 'schedules', 'schedule_periods', 'schedule_days', 'departures',
                    'inventory', 'rates', 'platform_settings', 'promotions', 'promotion_translations', 'promotion_rates',
                    'tour_suppliers', 'tours', 'tour_translations', 'tour_schedules', 'tour_sessions', 'programs',
                    'program_translations', 'program_items', 'program_schedules',
                    'cancellation_policies', 'cancellation_policy_translations', 'premium_periods',
                    'partner_rates', 'tour_rates', 'tour_seasons', 'operator_contacts', 'operator_settings', 'operator_aliases']) t,
       unnest(array['authenticated', 'service_role']) g
  union all
  select t, 'service_role', 'DELETE,INSERT,SELECT,UPDATE'
  from unnest(array['cruise_requests', 'offers', 'offer_cabins', 'reservations', 'reservation_cabins', 'passengers',
                    'eligibility_proofs', 'notifications', 'payments', 'commission_entries', 'payouts',
                    'cancellation_requests', 'refunds', 'tour_orders', 'tour_payments', 'tour_refunds',
                    'partner_booking_details', 'contact_messages', 'booking_requests', 'booking_request_guests',
                    'outbound_messages']) t
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
