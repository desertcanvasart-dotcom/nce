-- Deterministic fixtures for local development and CI only. Never applied to staging or production.
-- Every vessel and destination here is SAMPLE DATA (is_sample = true): the names are invented placeholders.
-- Test password for every user: see supabase/seed-users.md (local only, never a real password).

do $$
declare
  pw text := crypt('nilecruz-local-only', gen_salt('bf'));
  u record;
begin
  for u in select * from (values
    ('00000000-0000-4000-a000-000000000001'::uuid, 'admin@nilecruz.test',        'Sample Admin'),
    ('00000000-0000-4000-a000-000000000002'::uuid, 'catalogue@nilecruz.test',    'Sample Catalogue Admin'),
    ('00000000-0000-4000-a000-000000000003'::uuid, 'editor@nilecruz.test',       'Sample Editor Admin'),
    ('00000000-0000-4000-a000-000000000004'::uuid, 'product@nilecruz.test',      'Sample Product Admin'),
    ('00000000-0000-4000-a000-000000000005'::uuid, 'connections@nilecruz.test',  'Sample Connections Admin'),
    ('00000000-0000-4000-a000-000000000010'::uuid, 'owner@operator-a.test',      'Sample Operator A Owner'),
    ('00000000-0000-4000-a000-000000000011'::uuid, 'reservations@operator-a.test','Sample Operator A Reservations'),
    ('00000000-0000-4000-a000-000000000012'::uuid, 'finance@operator-a.test',    'Sample Operator A Finance'),
    ('00000000-0000-4000-a000-000000000013'::uuid, 'viewer@operator-a.test',     'Sample Operator A Viewer'),
    ('00000000-0000-4000-a000-000000000020'::uuid, 'owner@operator-b.test',      'Sample Operator B Owner'),
    ('00000000-0000-4000-a000-000000000030'::uuid, 'owner@partner.test',         'Sample Partner Owner'),
    ('00000000-0000-4000-a000-000000000031'::uuid, 'reservations@partner.test',  'Sample Partner Reservations'),
    ('00000000-0000-4000-a000-000000000032'::uuid, 'finance@partner.test',       'Sample Partner Finance'),
    ('00000000-0000-4000-a000-000000000040'::uuid, 'customer@example.test',      'Sample Customer')
  ) as t(id, email, full_name) loop
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token,
      email_change, email_change_token_new)
    values ('00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email, pw, now(),
      '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name', u.full_name), now(), now(), '', '', '', '');
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), u.id, u.id::text, jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
      'email', now(), now(), now());
  end loop;
end $$;

update public.profiles set platform_role = 'admin', admin_role = 'super' where id = '00000000-0000-4000-a000-000000000001';
update public.profiles set platform_role = 'admin', admin_role = 'catalogue' where id = '00000000-0000-4000-a000-000000000002';
update public.profiles set platform_role = 'admin', admin_role = 'super' where id = '00000000-0000-4000-a000-000000000003';
update public.profiles set platform_role = 'admin', admin_role = 'catalogue' where id = '00000000-0000-4000-a000-000000000004';
update public.profiles set platform_role = 'admin', admin_role = 'catalogue' where id = '00000000-0000-4000-a000-000000000005';

insert into public.organisations (id, kind, status, display_name) values
  ('00000000-0000-4000-b000-000000000001', 'nilecruz', 'approved', 'Nilecruz'),
  ('00000000-0000-4000-b000-00000000000a', 'operator', 'approved', 'Sample Operator A'),
  ('00000000-0000-4000-b000-00000000000b', 'operator', 'applied', 'Sample Operator B'),
  ('00000000-0000-4000-b000-0000000000c1', 'partner', 'approved', 'Sample Partner');

insert into public.memberships (org_id, user_id, team_role) values
  ('00000000-0000-4000-b000-00000000000a', '00000000-0000-4000-a000-000000000010', 'owner'),
  ('00000000-0000-4000-b000-00000000000a', '00000000-0000-4000-a000-000000000011', 'reservations'),
  ('00000000-0000-4000-b000-00000000000a', '00000000-0000-4000-a000-000000000012', 'finance'),
  ('00000000-0000-4000-b000-00000000000a', '00000000-0000-4000-a000-000000000013', 'viewer'),
  ('00000000-0000-4000-b000-00000000000b', '00000000-0000-4000-a000-000000000020', 'owner'),
  ('00000000-0000-4000-b000-0000000000c1', '00000000-0000-4000-a000-000000000030', 'owner'),
  ('00000000-0000-4000-b000-0000000000c1', '00000000-0000-4000-a000-000000000031', 'reservations'),
  ('00000000-0000-4000-b000-0000000000c1', '00000000-0000-4000-a000-000000000032', 'finance');

-- Destinations use the common English names (BRAND-009); they are real places, flagged sample until copy is written.
insert into public.destinations (id, slug, name, visibility, is_sample) values
  ('00000000-0000-4000-9000-000000000001', 'luxor', 'Luxor', 'published', true),
  ('00000000-0000-4000-9000-000000000002', 'aswan', 'Aswan', 'published', true),
  ('00000000-0000-4000-9000-000000000003', 'edfu', 'Edfu', 'private', true);

insert into public.vessels (id, slug, source_ref, name, type, visibility, operator_org_id, category, cabin_count, max_guests,
  deck_count, route_text, is_sample, published_at, showcase_until, showcase_reason) values
  ('00000000-0000-4000-8000-000000000001', 'sample-sail-one', 'seed:1', 'Sample Dahabiya One', 'sail', 'published',
   '00000000-0000-4000-b000-00000000000a', 'luxury', 6, 12, 2, 'Luxor–Aswan', true, now(), null, null),
  ('00000000-0000-4000-8000-000000000002', 'sample-motor-one', 'seed:2', 'Sample Motor Ship One', 'motor', 'showcase',
   '00000000-0000-4000-b000-00000000000a', 'standard', 40, 80, 4, 'Luxor–Aswan', true, null, date '2027-12-31', 'Sample showcase for tests'),
  ('00000000-0000-4000-8000-000000000003', 'sample-steam-one', 'seed:3', 'Sample Steamer One', 'steam', 'private',
   '00000000-0000-4000-b000-00000000000a', null, 20, 40, 3, 'Luxor–Aswan', true, null, null, null),
  ('00000000-0000-4000-8000-000000000004', 'sample-motor-two', 'seed:4', 'Sample Motor Ship Two', 'motor', 'private',
   '00000000-0000-4000-b000-00000000000b', null, 30, 60, 3, 'Esna–Aswan', true, null, null, null);

insert into public.vessel_private (vessel_id, verification_note) values
  ('00000000-0000-4000-8000-000000000001', 'Sample record: not verified'),
  ('00000000-0000-4000-8000-000000000004', 'Sample record: not verified');

insert into public.vessel_translations (vessel_id, locale, summary) values
  ('00000000-0000-4000-8000-000000000001', 'en', 'Sample summary for the gallery and tests.'),
  ('00000000-0000-4000-8000-000000000003', 'en', 'Sample summary of a private draft.');

-- Two-step sign-in for the seeded admins (ADR-064). LOCAL TEST SECRET ONLY: tests compute codes from it.
insert into auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at, secret)
values
  ('00000000-0000-4000-a100-000000000001', '00000000-0000-4000-a000-000000000001', 'Test authenticator', 'totp', 'verified', now(), now(), 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP'),
  ('00000000-0000-4000-a100-000000000002', '00000000-0000-4000-a000-000000000002', 'Test authenticator', 'totp', 'verified', now(), now(), 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP'),
  ('00000000-0000-4000-a100-000000000003', '00000000-0000-4000-a000-000000000003', 'Test authenticator', 'totp', 'verified', now(), now(), 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP'),
  ('00000000-0000-4000-a100-000000000004', '00000000-0000-4000-a000-000000000004', 'Test authenticator', 'totp', 'verified', now(), now(), 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP'),
  ('00000000-0000-4000-a100-000000000005', '00000000-0000-4000-a000-000000000005', 'Test authenticator', 'totp', 'verified', now(), now(), 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP');

