-- Vessel evaluations, method version 1 (ADR-070, ADR-074, DASH-ADM-026–034, DASH-BND-005).

create type public.evaluation_verdict as enum ('recommended', 'recommended_with_reservations', 'not_recommended');

-- Method v1: dimension weights (sum 100), four criteria each scored 0–5. Kept in one SQL function so the
-- database is the single source of truth; src/lib/evaluation/method.ts mirrors it for the live preview.
create or replace function app.evaluation_weights(method smallint) returns jsonb
language sql immutable as $$
  select case method when 1 then
    '{"hygiene":15,"service":20,"food":15,"amenities":10,"management":10,"cabin_vessel":20,"cruise_experience":10}'::jsonb
  end;
$$;

-- Returns the dimension results ((sum ÷ 20) × weight, 2 decimals), or raises if the scores are malformed.
create or replace function app.evaluation_results(method smallint, scores jsonb) returns jsonb
language plpgsql immutable as $$
declare
  weights jsonb := app.evaluation_weights(method);
  dim text;
  w numeric;
  points jsonb;
  total numeric;
  p jsonb;
  out jsonb := '{}'::jsonb;
begin
  if weights is null then raise exception 'Unknown evaluation method %', method using errcode = '22023'; end if;
  if jsonb_typeof(scores) <> 'object' then raise exception 'Scores must be an object' using errcode = '22023'; end if;
  if exists (select 1 from jsonb_object_keys(scores) k where not weights ? k) then
    raise exception 'Unknown dimension in scores' using errcode = '22023';
  end if;
  for dim, w in select key, value::numeric from jsonb_each_text(weights) loop
    points := scores -> dim;
    if points is null or jsonb_typeof(points) <> 'array' or jsonb_array_length(points) <> 4 then
      raise exception 'Dimension % needs four criterion scores', dim using errcode = '22023';
    end if;
    total := 0;
    for p in select * from jsonb_array_elements(points) loop
      if jsonb_typeof(p) <> 'number' or (p::text)::numeric < 0 or (p::text)::numeric > 5 then
        raise exception 'Criterion scores in % must be numbers from 0 to 5', dim using errcode = '22023';
      end if;
      total := total + (p::text)::numeric;
    end loop;
    out := out || jsonb_build_object(dim, round(total / 20 * w, 2));
  end loop;
  return out;
end $$;

create table public.evaluations (
  id uuid primary key default gen_random_uuid(),
  vessel_id uuid not null references public.vessels (id) on delete cascade,
  method_version smallint not null default 1,
  assessed_on date not null,
  evaluator text not null check (length(trim(evaluator)) > 0),
  verdict public.evaluation_verdict not null,
  scores jsonb not null,
  dimension_results jsonb not null default '{}'::jsonb,
  overall_score numeric(5, 2) not null default 0 check (overall_score between 0 and 100),
  published boolean not null default false,
  published_at timestamptz,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint published_has_date check (not published or published_at is not null)
);
create index evaluations_vessel_idx on public.evaluations (vessel_id);
create trigger evaluations_updated_at before update on public.evaluations for each row execute function app.set_updated_at();

create or replace function app.compute_evaluation() returns trigger
language plpgsql as $$
begin
  new.dimension_results := app.evaluation_results(new.method_version, new.scores);
  new.overall_score := (select round(sum(value::numeric), 2) from jsonb_each_text(new.dimension_results));
  return new;
end $$;
create trigger evaluations_compute before insert or update of scores, method_version on public.evaluations
  for each row execute function app.compute_evaluation();

create table public.evaluation_translations (
  evaluation_id uuid not null references public.evaluations (id) on delete cascade,
  locale public.locale_code not null,
  notes text check (length(notes) <= 4000),
  primary key (evaluation_id, locale)
);

-- DASH-ADM-033 / DASH-BND-005: third-party ratings, entered by hand with source and date; never a score of ours.
create table public.external_ratings (
  id uuid primary key default gen_random_uuid(),
  vessel_id uuid not null references public.vessels (id) on delete cascade,
  source_name text not null check (length(trim(source_name)) > 0),
  rating numeric(5, 2) not null check (rating >= 0),
  scale numeric(5, 2) not null check (scale > 0),
  review_count integer check (review_count >= 0),
  url text check (url ~ '^https://'),
  retrieved_on date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rating_within_scale check (rating <= scale)
);
create index external_ratings_vessel_idx on public.external_ratings (vessel_id);
create trigger external_ratings_updated_at before update on public.external_ratings for each row execute function app.set_updated_at();

-- DASH-ADM-034: internal safety observations; never public, never scored.
create type public.safety_status as enum ('open', 'under_review', 'resolved');
create table public.safety_observations (
  id uuid primary key default gen_random_uuid(),
  vessel_id uuid not null references public.vessels (id) on delete cascade,
  observed_on date not null,
  status public.safety_status not null default 'open',
  notes text not null check (length(trim(notes)) > 0),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index safety_observations_vessel_idx on public.safety_observations (vessel_id);
create trigger safety_observations_updated_at before update on public.safety_observations for each row execute function app.set_updated_at();

alter table public.evaluations enable row level security;
alter table public.evaluation_translations enable row level security;
alter table public.external_ratings enable row level security;
alter table public.safety_observations enable row level security;

create or replace function app.evaluation_is_public(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.evaluations e where e.id = target and e.published and app.vessel_is_public(e.vessel_id));
$$;
grant execute on function app.evaluation_is_public(uuid) to anon, authenticated, service_role;

-- Public and operators: published evaluations of visible vessels only. Admins: all. Writes: catalogue admins.
create policy "evaluations: published and public" on public.evaluations for select to anon, authenticated
  using (published and app.vessel_is_public(vessel_id));
create policy "evaluations: admins read" on public.evaluations for select to authenticated using (app.is_admin());
create policy "evaluations: catalogue admins write" on public.evaluations for all to authenticated
  using (app.is_catalogue_admin()) with check (app.is_catalogue_admin());

create policy "evaluation_translations: with evaluation" on public.evaluation_translations for select to anon, authenticated
  using (app.evaluation_is_public(evaluation_id) or app.is_admin());
create policy "evaluation_translations: editors write" on public.evaluation_translations for all to authenticated
  using (app.is_catalogue_admin() or app.has_admin_role(array['content']::public.admin_role[]))
  with check (app.is_catalogue_admin() or app.has_admin_role(array['content']::public.admin_role[]));

create policy "external_ratings: public with vessel" on public.external_ratings for select to anon, authenticated
  using (app.vessel_is_public(vessel_id) or app.is_admin());
create policy "external_ratings: catalogue admins write" on public.external_ratings for all to authenticated
  using (app.is_catalogue_admin()) with check (app.is_catalogue_admin());

create policy "safety_observations: admins read" on public.safety_observations for select to authenticated using (app.is_admin());
create policy "safety_observations: catalogue admins write" on public.safety_observations for all to authenticated
  using (app.is_catalogue_admin()) with check (app.is_catalogue_admin());

grant select on public.evaluations, public.evaluation_translations, public.external_ratings to anon;
grant select, insert, update, delete on public.evaluations, public.evaluation_translations, public.external_ratings,
  public.safety_observations to authenticated, service_role;

create trigger audit_evaluations after insert or update or delete on public.evaluations for each row execute function app.audit_row();
create trigger audit_external_ratings after insert or update or delete on public.external_ratings for each row execute function app.audit_row();
create trigger audit_safety_observations after insert or update or delete on public.safety_observations for each row execute function app.audit_row();
