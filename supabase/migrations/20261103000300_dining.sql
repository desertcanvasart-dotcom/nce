-- Food on board: a vessel's dining, in each language, and the diets its kitchen caters for. Shown as "Food and
-- dining" on the vessel page. Transfers and other paid extras are not described here: they are sold separately.
alter table public.vessel_translations
  add column dining text check (length(dining) <= 2000);

alter table public.vessels
  add column dietary_options text[] not null default '{}'
    check (dietary_options <@ array['halal', 'kosher', 'vegetarian', 'vegan', 'gluten_free', 'dairy_free']);
