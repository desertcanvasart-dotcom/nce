-- Money settles in euros (Islam, 6 Nov 2026; ADR-110, replacing ADR-094's "the bank account's currency is USD").
-- Prices are never converted (ADR-093, ADR-109), so settling in euros means new bookings at the published or trade
-- rate are made, and paid, in euros only. Rates entered in US dollars stay stored but can no longer be booked; the
-- operator enters euro rates instead. Reservations already made keep their own currency until settled.
-- Idempotent: functions are replaced as a whole.

create or replace function app.check_direct_booking(d public.departures, cur text, cabins jsonb, guests jsonb)
returns bigint
language plpgsql stable security definer set search_path = '' as $$
declare
  c jsonb;
  g jsonb;
  ages integer[];
  all_ages integer[] := '{}';
  guest_ages integer[] := '{}';
  priced record;
  total bigint := 0;
  pkg text;
begin
  if cur <> 'EUR' then raise exception 'Bookings at the published rate are in €' using errcode = '22023'; end if;
  if jsonb_typeof(cabins) <> 'array' or jsonb_array_length(cabins) = 0 or jsonb_array_length(cabins) > 5 then
    raise exception 'Choose 1 to 5 cabins; for more, send a request for offers' using errcode = '22023';
  end if;
  pkg := app.booking_package(cabins);
  if pkg = 'with_programme' then
    if (app.programme_rate_for(d)).id is null then
      raise exception 'There is no Nilecruz sightseeing programme for this sailing' using errcode = '22023';
    end if;
    if cur <> (app.programme_rate_for(d)).currency::text then
      raise exception 'The sightseeing programme is priced in %; book the cruise in % to add it',
        (app.programme_rate_for(d)).currency, (app.programme_rate_for(d)).currency using errcode = '22023';
    end if;
  end if;
  for c in select value from jsonb_array_elements(cabins) loop
    if not exists (select 1 from public.cabin_types ct where ct.id = (c ->> 'cabin_type_id')::uuid and ct.vessel_id = d.vessel_id and ct.active) then
      raise exception 'That cabin type isn''t on this ship' using errcode = '22023';
    end if;
    ages := array(select (x)::int from jsonb_array_elements_text(c -> 'ages') x);
    select * into priced from app.public_cabin_price(d.id, (c ->> 'cabin_type_id')::uuid, cur, ages,
      case when pkg = 'with_sightseeing' then pkg else 'cruise' end);
    total := total + priced.amount_minor;
    all_ages := all_ages || ages;
  end loop;
  if jsonb_typeof(guests) <> 'array' or jsonb_array_length(guests) <> cardinality(all_ages) then
    raise exception 'Give the name and date of birth of all % guests', cardinality(all_ages) using errcode = '22023';
  end if;
  for g in select value from jsonb_array_elements(guests) loop
    if g ->> 'date_of_birth' is null or g ->> 'date_of_birth' !~ '^\d{4}-\d{2}-\d{2}$' or coalesce(length(trim(g ->> 'full_name')), 0) < 2 then
      raise exception 'Every guest needs a full name and a date of birth' using errcode = '22023';
    end if;
    guest_ages := guest_ages || extract(year from age(d.departs_on, (g ->> 'date_of_birth')::date))::int;
  end loop;
  if (select count(*) from unnest(guest_ages) x where x >= 18) <> (select count(*) from unnest(all_ages) x where x >= 18)
     or (select array_agg(x order by x) from unnest(guest_ages) x where x < 18) is distinct from
        (select array_agg(x order by x) from unnest(all_ages) x where x < 18) then
    raise exception 'The guests'' ages on the departure date don''t match the cabins' using errcode = '22023';
  end if;
  return total;
end $$;

create or replace function app.check_partner_booking(org uuid, d public.departures, cur text, cabins jsonb, guests jsonb,
  out total bigint, out any_trade boolean)
language plpgsql stable security definer set search_path = '' as $$
declare
  c jsonb;
  g jsonb;
  ages integer[];
  all_ages integer[] := '{}';
  guest_ages integer[] := '{}';
  priced record;
begin
  total := 0;
  any_trade := false;
  if cur <> 'EUR' then raise exception 'Trade bookings are in €' using errcode = '22023'; end if;
  if jsonb_typeof(cabins) <> 'array' or jsonb_array_length(cabins) = 0 or jsonb_array_length(cabins) > 20 then
    raise exception 'Choose 1 to 20 cabins' using errcode = '22023';
  end if;
  for c in select value from jsonb_array_elements(cabins) loop
    if not exists (select 1 from public.cabin_types ct where ct.id = (c ->> 'cabin_type_id')::uuid and ct.vessel_id = d.vessel_id and ct.active) then
      raise exception 'That cabin type isn''t on this ship' using errcode = '22023';
    end if;
    ages := array(select (x)::int from jsonb_array_elements_text(c -> 'ages') x);
    select * into priced from app.partner_cabin_price(org, d.id, (c ->> 'cabin_type_id')::uuid, cur, ages);
    total := total + priced.amount_minor;
    any_trade := any_trade or priced.tier in ('company', 'trade');
    all_ages := all_ages || ages;
  end loop;
  if jsonb_typeof(guests) <> 'array' or jsonb_array_length(guests) <> cardinality(all_ages) then
    raise exception 'Give the name and date of birth of all % guests', cardinality(all_ages) using errcode = '22023';
  end if;
  for g in select value from jsonb_array_elements(guests) loop
    if g ->> 'date_of_birth' is null or g ->> 'date_of_birth' !~ '^\d{4}-\d{2}-\d{2}$' or coalesce(length(trim(g ->> 'full_name')), 0) < 2 then
      raise exception 'Every guest needs a full name and a date of birth' using errcode = '22023';
    end if;
    guest_ages := guest_ages || extract(year from age(d.departs_on, (g ->> 'date_of_birth')::date))::int;
  end loop;
  if (select count(*) from unnest(guest_ages) x where x >= 18) <> (select count(*) from unnest(all_ages) x where x >= 18)
     or (select array_agg(x order by x) from unnest(guest_ages) x where x < 18) is distinct from
        (select array_agg(x order by x) from unnest(all_ages) x where x < 18) then
    raise exception 'The guests'' ages on the departure date don''t match the cabins' using errcode = '22023';
  end if;
end $$;

-- Nilecruz's tours and sightseeing programmes may be priced in euros too, so the programme can go with a cruise booked
-- in euros. New rates still default to US$ until the office supplies euro rates; US$ rates stay as they are.
alter table public.tour_rates drop constraint if exists tour_rates_currency_check;
alter table public.tour_rates add constraint tour_rates_currency_check check (currency in ('USD', 'EUR'));
