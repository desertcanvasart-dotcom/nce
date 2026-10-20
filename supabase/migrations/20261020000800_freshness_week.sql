-- ADR-095 (Faris, 20 Oct 2026): availability entered by hand or pasted counts as confirmed for 7 days (168 hours, the most
-- the admin setting allows). Feeds and the API stay at 2 hours. Admins can still change both on Admin → Settings.
update public.platform_settings
set value = value || '{"manual": 168, "paste": 168}'::jsonb
where key = 'freshness_hours';
