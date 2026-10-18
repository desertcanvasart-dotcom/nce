-- Batch 4b: categories, "Best for" labels, showcase exceptions, sub-role rights (ADR-071, 072, 075, DATA-024).

-- ADR-071: five categories, set by admins. Replaces the Batch 3 two-value type ('value' maps to Standard).
alter table public.vessels alter column category type text using category::text;
drop type public.vessel_category;
create type public.vessel_category as enum ('basic', 'standard', 'superior', 'deluxe', 'luxury');
update public.vessels set category = 'standard' where category = 'value';
alter table public.vessels alter column category type public.vessel_category using category::public.vessel_category;

-- ADR-072: editorial "Best for" labels, chosen by admins, never derived from scores.
create type public.best_for_label as enum (
  'first_time_visitors', 'cabins', 'quiet_stays', 'food_lovers', 'families',
  'couples', 'luxury_travellers', 'value', 'traditional_character', 'contemporary_design'
);
alter table public.vessels add column best_for public.best_for_label[] not null default '{}';

-- DATA-024: a showcase exception is dated and explained; it never makes a vessel bookable.
alter table public.vessels
  add column showcase_until date,
  add column showcase_reason text,
  add constraint showcase_is_dated check (
    visibility <> 'showcase' or (showcase_until is not null and length(trim(coalesce(showcase_reason, ''))) > 0)
  );
-- Existing showcase rows (seed only) get a reason so the new rule holds.
update public.vessels set showcase_until = date '2027-12-31', showcase_reason = 'Sample data'
  where visibility = 'showcase' and showcase_until is null;

-- A vessel is publicly visible when published, or showcased and not yet expired.
create or replace function app.vessel_visible(v public.vessels) returns boolean
language sql stable as $$
  select v.visibility = 'published' or (v.visibility = 'showcase' and v.showcase_until >= current_date);
$$;

create or replace function app.vessel_is_public(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.vessels v where v.id = target and app.vessel_visible(v));
$$;

create or replace function app.can_read_vessel(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select app.is_admin() or exists (
    select 1 from public.vessels v
    where v.id = target and (app.vessel_visible(v) or v.operator_org_id in (select app.my_org_ids()))
  );
$$;

drop policy "vessels: public reads visible" on public.vessels;
create policy "vessels: public reads visible" on public.vessels for select to anon, authenticated
  using (app.vessel_visible(vessels));

-- ADR-075: catalogue writes by super and catalogue admins; content admins edit texts only.
create or replace function app.is_catalogue_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select app.has_admin_role(array['super', 'catalogue']::public.admin_role[]);
$$;
grant execute on function app.vessel_visible(public.vessels), app.is_catalogue_admin() to anon, authenticated, service_role;

drop policy "vessels: admin manages" on public.vessels;
create policy "vessels: admins read" on public.vessels for select to authenticated using (app.is_admin());
create policy "vessels: catalogue admins write" on public.vessels for all to authenticated
  using (app.is_catalogue_admin()) with check (app.is_catalogue_admin());

drop policy "vessel_private: admin only" on public.vessel_private;
create policy "vessel_private: admins read" on public.vessel_private for select to authenticated using (app.is_admin());
create policy "vessel_private: catalogue admins write" on public.vessel_private for all to authenticated
  using (app.is_catalogue_admin()) with check (app.is_catalogue_admin());

create or replace function app.can_edit_vessel(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select app.is_catalogue_admin() or exists (
    select 1 from public.vessels v
    where v.id = target and app.has_org_role(v.operator_org_id, array['owner', 'reservations']::public.team_role[])
  );
$$;

-- Content admins may write translated texts (descriptions, photo descriptions).
create or replace function app.can_edit_vessel_text(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select app.can_edit_vessel(target) or app.has_admin_role(array['content']::public.admin_role[]);
$$;
grant execute on function app.can_edit_vessel_text(uuid) to authenticated, service_role;

drop policy "vessel_translations: editors write" on public.vessel_translations;
create policy "vessel_translations: editors write" on public.vessel_translations for all to authenticated
  using (app.can_edit_vessel_text(vessel_id)) with check (app.can_edit_vessel_text(vessel_id));

-- The guard on admin-only vessel fields now covers category, labels and showcase details too.
create or replace function app.guard_vessel_admin_fields() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if app.is_catalogue_admin() or auth.uid() is null or current_setting('app.applying_submission', true) = 'on' then
    return new;
  end if;
  if new.visibility is distinct from old.visibility
     or new.operator_org_id is distinct from old.operator_org_id
     or new.slug is distinct from old.slug
     or new.source_ref is distinct from old.source_ref
     or new.is_sample is distinct from old.is_sample
     or new.published_at is distinct from old.published_at
     or new.category is distinct from old.category
     or new.best_for is distinct from old.best_for
     or new.showcase_until is distinct from old.showcase_until
     or new.showcase_reason is distinct from old.showcase_reason then
    raise exception 'Only Nilecruz catalogue admins can change visibility, operator, slug, source, category, labels or sample flag'
      using errcode = '42501';
  end if;
  return new;
end $$;

-- Operator applications record why a status changed.
alter table public.organisations add column status_reason text;
