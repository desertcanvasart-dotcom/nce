-- Conventions for every table (DATA-001, DATA-002, CLAUDE.md §6).
-- * Money: bigint minor units + currency_code (ISO 4217). Never float or numeric for money.
-- * Time: timestamptz (stored in UTC). Never "timestamp without time zone".
-- * Helpers live in schema "app", which PostgREST does not expose.

create schema if not exists app;
grant usage on schema app to anon, authenticated, service_role;

create domain public.currency_code as char(3) check (value ~ '^[A-Z]{3}$');
create domain public.locale_code as text check (value in ('en', 'es', 'ja'));

create or replace function app.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;
