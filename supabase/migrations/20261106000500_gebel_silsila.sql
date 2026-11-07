-- "Gebel Silsila" is the site's spelling (BRAND-BOOK, ADR-108). The Nour El Nil itineraries were imported with
-- "Gebel Silsileh" before the fleet data was corrected; this fixes the stored text in every language (Islam's review,
-- 6 Nov 2026). Search still finds the old spelling through the stop's aliases (src/content/river-stops.ts).
-- Idempotent: once run, nothing matches.
update public.schedule_days
set title = replace(title, 'Silsileh', 'Silsila'), description = replace(description, 'Silsileh', 'Silsila')
where title like '%Silsileh%' or description like '%Silsileh%';

update public.vessel_translations
set summary = replace(summary, 'Silsileh', 'Silsila'), description = replace(description, 'Silsileh', 'Silsila')
where summary like '%Silsileh%' or description like '%Silsileh%';
