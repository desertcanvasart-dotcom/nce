-- Batch 8-2a (ADR-101): rate limits, emails from dashboard notices, payment deadline reminders.

-- ── Rate limits (SEC-006) ────────────────────────────────────────────────────────────────────────────────────
-- Counted per bucket ("sign-in:<hashed address>", "contact:<hashed address>", …) in fixed windows. The app hashes the
-- address with a server secret before it gets here, so no address is stored and no one can guess another's bucket.
create table public.rate_limit_hits (
  bucket text not null check (length(bucket) between 3 and 200),
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (bucket, window_start)
);
alter table public.rate_limit_hits enable row level security;
create policy "rate_limit_hits: admins read" on public.rate_limit_hits for select to authenticated using (app.is_admin());
grant select, insert, update, delete on public.rate_limit_hits to service_role;

-- One more try in this bucket (or, with add false, just look). Returns 0 when allowed, else the seconds until the
-- window ends.
create or replace function public.service_rate_limit(bucket text, max_hits integer, window_seconds integer, add boolean default true)
returns integer
language plpgsql security definer set search_path = '' as $$
declare
  start timestamptz := to_timestamp(floor(extract(epoch from now()) / window_seconds) * window_seconds);
  n integer;
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception 'Service role only' using errcode = '42501'; end if;
  if max_hits < 1 or window_seconds < 10 or window_seconds > 86400 then raise exception 'Bad limit' using errcode = '22023'; end if;
  if add then
    insert into public.rate_limit_hits as h (bucket, window_start, hits) values (service_rate_limit.bucket, start, 1)
    on conflict on constraint rate_limit_hits_pkey do update set hits = h.hits + 1
    returning hits into n;
  else
    select coalesce((select hits from public.rate_limit_hits h where h.bucket = service_rate_limit.bucket and h.window_start = start), 0) into n;
    n := n + 1; -- would this try be over?
  end if;
  return case when n <= max_hits then 0 else ceil(extract(epoch from (start + make_interval(secs => window_seconds) - now())))::int end;
end $$;
revoke execute on function public.service_rate_limit(text, integer, integer, boolean) from public, anon, authenticated;
grant execute on function public.service_rate_limit(text, integer, integer, boolean) to service_role;

create or replace function app.prune_rate_limits() returns void
language sql security definer set search_path = '' as $$
  delete from public.rate_limit_hits where window_start < now() - interval '1 day';
$$;
revoke execute on function app.prune_rate_limits() from public, anon, authenticated;
select cron.schedule('nilecruz-prune-rate-limits', '23 * * * *', 'select app.prune_rate_limits()');

-- ── Emails from notices (PROPOSED-005, DASH-BND-007) ───────────────────────────────────────────────────────
-- Every notice also goes by email: "pending" until the app sends it, then sent / skipped (no sender configured, or the
-- person turned optional emails off) / failed (retried up to 3 times). Notices from before this batch aren't emailed.
alter table public.notifications add column email_status text not null default 'pending'
  check (email_status in ('pending', 'sent', 'skipped', 'failed', 'none'));
alter table public.notifications add column email_attempts smallint not null default 0;
alter table public.notifications add column emailed_at timestamptz;
update public.notifications set email_status = 'none';
create index notifications_email_due_idx on public.notifications (created_at) where email_status in ('pending', 'failed');

-- Optional emails (offer updates, holds) can be turned off; bookings, payments, cancellations and reminders can't.
alter table public.profiles add column optional_emails boolean not null default true;

-- The app marks what it sent (service role).
create or replace function public.service_mark_notice_email(notice uuid, outcome text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception 'Service role only' using errcode = '42501'; end if;
  if outcome not in ('sent', 'skipped', 'failed', 'none') then raise exception 'Unknown outcome' using errcode = '22023'; end if;
  update public.notifications set email_status = outcome, email_attempts = email_attempts + 1,
    emailed_at = case when outcome = 'sent' then now() else emailed_at end
  where id = notice;
end $$;
revoke execute on function public.service_mark_notice_email(uuid, text) from public, anon, authenticated;
grant execute on function public.service_mark_notice_email(uuid, text) to service_role;

-- A Contact message tells Nilecruz's admins (PAGE-106; the inbox already exists).
create or replace function app.notify_contact_message() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.notifications (org_id, kind, title, link)
  select o.id, 'contact.new', 'New Contact message: ' || left(new.name, 80), '/dashboard/admin/messages/'
  from public.organisations o where o.kind = 'nilecruz' limit 1;
  return new;
end $$;
create trigger contact_messages_notify after insert on public.contact_messages for each row execute function app.notify_contact_message();

-- ── Payment deadline reminders (ADR-101: 3 days and 1 day before, and on the day) ──────────────────────────
create table public.reservation_reminders (
  reservation_id uuid not null references public.reservations (id) on delete cascade,
  which text not null check (which in ('3d', '1d', 'day')),
  sent_at timestamptz not null default now(),
  primary key (reservation_id, which)
);
alter table public.reservation_reminders enable row level security;
create policy "reservation_reminders: admins read" on public.reservation_reminders for select to authenticated using (app.is_admin());
grant select, insert on public.reservation_reminders to service_role;

create or replace function app.payment_deadline_reminders() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  r record;
  n integer := 0;
  today date := (now() at time zone 'Africa/Cairo')::date;
begin
  for r in
    select x.id, x.reference, x.customer_id, x.buyer_org_id, w.which,
      (x.payment_due_at at time zone 'Africa/Cairo')::date as due
    from public.reservations x
    cross join lateral (values ('3d', 3), ('1d', 1), ('day', 0)) w(which, days)
    where x.status = 'awaiting_payment' and x.payment_due_at > now()
      and (x.payment_due_at at time zone 'Africa/Cairo')::date - today = w.days
      and not exists (select 1 from public.reservation_reminders m where m.reservation_id = x.id and m.which = w.which)
  loop
    insert into public.reservation_reminders (reservation_id, which) values (r.id, r.which) on conflict do nothing;
    if r.buyer_org_id is not null then
      insert into public.notifications (org_id, kind, title, link)
      values (r.buyer_org_id, 'payment.deadline', 'Payment for ' || r.reference || ' is due '
        || case r.which when 'day' then 'today' when '1d' then 'tomorrow' else 'in 3 days' end,
        '/dashboard/partner/' || r.buyer_org_id || '/bookings/' || r.id || '/');
    else
      insert into public.notifications (user_id, kind, title, link)
      values (r.customer_id, 'payment.deadline', 'Payment for ' || r.reference || ' is due '
        || case r.which when 'day' then 'today' when '1d' then 'tomorrow' else 'in 3 days' end,
        '/dashboard/journey/reservations/' || r.id || '/');
    end if;
    n := n + 1;
  end loop;
  return n;
end $$;
revoke execute on function app.payment_deadline_reminders() from public, anon, authenticated;
select cron.schedule('nilecruz-payment-deadline-reminders', '5 * * * *', 'select app.payment_deadline_reminders()');

-- ── The tick also sends waiting emails (every minute, only when something is due) ──────────────────────────
create or replace function app.request_booking_tick() returns text
language plpgsql security definer set search_path = '' as $$
declare
  target text;
  secret text;
  ts text := extract(epoch from now())::bigint::text;
  digest boolean := extract(hour from now() at time zone 'Africa/Cairo') = 9 and extract(minute from now() at time zone 'Africa/Cairo') < 1;
begin
  select decrypted_secret into target from vault.decrypted_secrets where name = 'requests_tick_url';
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'feed_pull_secret';
  if target is null or secret is null then return 'not configured'; end if;
  if not digest and not exists (select 1 from public.service_due_booking_requests_internal())
     and not exists (select 1 from public.notifications where email_status = 'pending'
                     or (email_status = 'failed' and email_attempts < 3 and created_at > now() - interval '1 day')) then
    return 'nothing due';
  end if;
  perform net.http_post(
    url := target,
    body := jsonb_build_object('digest', digest),
    headers := jsonb_build_object('Content-Type', 'application/json', 'Nilecruz-Timestamp', ts,
      'Nilecruz-Signature', encode(extensions.hmac('requests-tick.' || ts, secret, 'sha256'), 'hex')),
    timeout_milliseconds := 55000);
  return 'requested';
end $$;
select cron.unschedule('nilecruz-booking-request-tick');
select cron.schedule('nilecruz-booking-request-tick', '* * * * *', 'select app.request_booking_tick()');
