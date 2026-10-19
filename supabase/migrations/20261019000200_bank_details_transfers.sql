-- Batch 4f-2b: bank-transfer details as a finance-admin setting (CONTENT-NEEDED #5), and airport transfers sold private only
-- (Faris, 19 Oct 2026).

-- The details customers use to pay by bank transfer. Kept out of the code: the repository is public, and finance admins
-- change them without a release. Empty until a finance admin enters them; the page then says to ask Nilecruz.
create or replace function public.save_bank_details(details jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  k text;
  allowed text[] := array['holder', 'bank', 'account_number', 'iban', 'swift', 'currency', 'note'];
begin
  if not app.is_finance_admin() then raise exception 'Only finance admins change the bank details' using errcode = '42501'; end if;
  if jsonb_typeof(details) <> 'object' then raise exception 'Bank details must be an object' using errcode = '22023'; end if;
  for k in select jsonb_object_keys(details) loop
    if not k = any (allowed) then raise exception 'Unknown field %', k using errcode = '22023'; end if;
    if jsonb_typeof(details -> k) <> 'string' or length(details ->> k) > 300 then
      raise exception 'Each field is text of at most 300 characters' using errcode = '22023';
    end if;
  end loop;
  if coalesce(length(trim(details ->> 'holder')), 0) < 2 or coalesce(length(trim(details ->> 'bank')), 0) < 2 then
    raise exception 'Give at least the account holder and the bank' using errcode = '22023';
  end if;
  insert into public.platform_settings (key, value) values ('bank_transfer', details)
  on conflict (key) do update set value = excluded.value;
end $$;
revoke execute on function public.save_bank_details(jsonb) from public, anon;
grant execute on function public.save_bank_details(jsonb) to authenticated;

-- Airport transfers are private only: one party per vehicle.
create or replace function app.transfer_sessions_private() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.kind <> 'private' and (select kind from public.tours where id = new.tour_id) = 'transfer' then
    raise exception 'Airport transfers are sold private only' using errcode = '23514';
  end if;
  return new;
end $$;
revoke execute on function app.transfer_sessions_private() from public, anon, authenticated;
create trigger tour_sessions_transfer_private before insert or update on public.tour_sessions
  for each row execute function app.transfer_sessions_private();
