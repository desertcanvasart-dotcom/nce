# Operator loop brief: one-tap requests, sheets in, the reservable rule

**Status:** Part 0 report and plan, waiting for Faris's decisions (below) · **Branch:** to be cut after PRs #32 and #33 merge · **Size:** L (three pull requests: A, C, B)

The task asks for a Part 0 report before any code, and to stop if the findings conflict with the task. Four of them do; they are the decisions at the end.

## Part 0: what the code does today

### 1. Reserving against manual data that is 5 days old

- **It is reservable, instantly.** Manual and pasted availability count as confirmed for 168 hours (ADR-095, `supabase/migrations/20261020000800_freshness_week.sql`; checked by `app.inventory_is_fresh` in `supabase/migrations/20261018000500_product.sql`). Feed and API data count for 2 hours.
- **`public.customer_reserve`** (current version in `supabase/migrations/20261020000700_agent_model.sql`):
  - takes the cabins at once (`inventory.available` goes down);
  - creates the reservation as `awaiting_payment` with `direct = true`;
  - posts a dashboard notice to the operator ("New booking …") and one to the customer.
- **The operator is not asked to confirm.** The booking stands unless it goes unpaid.
- **No payment is taken at reservation.** The customer then pays the full balance by card through Stripe Checkout (captured, not authorised: `src/app/[locale]/dashboard/journey/actions.ts`, `src/lib/payments/checkout.ts`) or by bank transfer, before the payment deadline (4f).
  - The reservation becomes `confirmed` only from the signed Stripe webhook or a finance admin recording a transfer.
  - Unpaid reservations are released by `app.release_unpaid()` (pg_cron, hourly; `supabase/migrations/20261018001100_payments.sql`).
- **Travel partners** reserve the same way (`partner_reserve`, 4h-2a).

### 2. Requests and bookings

- **`cruise_requests`** (`supabase/migrations/20261018001000_requests_offers.sql`) is an **open request for offers**: a route, a date window, nights, guests, cabins, budget. It goes to every approved operator with a matching sailing (`app.request_orgs`), never to one ship's cabin type.
  - States: `open`, `accepted`, `closed`.
  - Operators answer with priced **`offers`**: `sent`, `superseded`, `withdrawn`, `accepted`, `closed`; versions per thread; expiry 24 h to 14 days.
  - The customer accepts one, which creates a **`reservation`**.
- **`reservations`**: `awaiting_payment`, `confirmed`, `cancelled`.
  - Source is an offer, a buying company (partners) or `direct` (the vessel page).
  - Its cabins and passengers are in `reservation_cabins` and `passengers`.
- **Notices:** `public.notifications` (dashboard only), inserted inside the database functions:
  - `send_offer`, `accept_offer`, `customer_reserve`, `partner_reserve`;
  - payments and cancellations.
- **Response time:** there is no record of when an operator responded. The nearest thing is `offers.created_at` against `cruise_requests.created_at`, and that only exists when the operator sends an offer.
- **Not there:** a request for **one sailing and cabin type** that the operator confirms or declines. That is what Part A describes. BATCH-PLAN already has it in Batch 8 ("request-to-book from the vessel page").

### 3. Import pipeline

- **Parsing:** `src/lib/connections/format.ts` turns JSON or XML (format v1, ADR-080) into rows. It enforces size limits and refuses DOCTYPE and entities.
- **One write path:** `app.apply_inventory_rows(target_org, src, input, dry_run)` (`supabase/migrations/20261018000800_connections.sql`). It:
  - matches ship slug, sailing and cabin type, and never creates them;
  - applies the no-overwrite rule by each row's `confirmed_at`;
  - never deletes;
  - returns a result for every row.
- **Paste:** `public.preview_inventory_paste` stores a run as `previewed` with every row's result; `public.apply_inventory_paste(run)` checks again and applies.
  - `app.can_manage_connections` lets **catalogue admins** do this for any operator, so an admin can already confirm on an operator's behalf.
  - A preview expires after 2 hours. Sheet reviews need longer.
- **Programmatic:** `public.service_apply_inventory(target_org, src, input, …)` (service role) applies directly, but only for `feed` and `api`.
- **Source and as-of date:**
  - `inventory_source` is an enum: `manual`, `paste`, `feed`, `api`. `sheet` and `tap` need adding, with freshness 168 h and 2 h in `platform_settings.freshness_hours`.
  - The `as_of` date fits the existing per-row `confirmed_at`, so no new mechanism is needed.
  - Runs record a `label`, which can carry the channel and file.

### 4. Messaging and jobs

- **Email:** no sending service is set up (ADR-088: "Email waits until a sending service is chosen"; Q33). The only emails are Supabase Auth's sign-in, confirmation and reset messages. No inbound email exists.
- **WhatsApp:** nothing.
- **AI service for reading sheets:** no client or key exists. Reading xlsx or PDF in the app also needs new libraries; the Python reader for the tour sheet runs only on this Mac.
- **Scheduler:** pg_cron runs these jobs:
  - releasing unpaid reservations;
  - feed pulls every 5 minutes;
  - pruning connection records;
  - releasing tour holds.
  - Jobs that need the app call a signed internal endpoint through pg_net, with the secret in Vault (`app.request_feed_pull`). Reminders, escalations and the daily digest fit this pattern.

### 5. Operator contacts

- **No contacts table.** An operator's people are its team members (`memberships`: owner, reservations, finance, viewer). Their emails live in `auth.users`, and each one has a login.
- **No phone numbers** for operators. The application form keeps `registration` as JSON: country, registration number, website.
- **Several people per operator:** yes, but only as logins. A reservations manager who never logs in can't be a contact today.
- **Allotments** contracted to Nilecruz don't exist in the data model, so Part C's first row is skipped.

## Plan that fits

### Part A: one-tap request loop (first pull request)

- **`operator_contacts`:** name, email, WhatsApp number, and flags for *reservations* and *sheets*. No login needed. Owners and admins manage them. A WhatsApp opt-in date is recorded.
- **Booking requests:** a request for **one sailing, cabin type, number of cabins and guests** (nationality and count only shown to the operator).
  - States: `waiting`, `confirmed`, `declined`, `held`, `alternative_offered`, `expired`.
  - Each has `responded_at`, the action taken, and a snapshot of what our data showed and how old it was.
  - **Confirm** turns it into a reservation through the existing reservation path (awaiting payment, then the usual payment flow).
- **Signed links:** HMAC over request id, action and expiry, single use, valid 7 days.
  - A confirmation page with one button (no login) protects against mail scanners.
  - Used or expired links show the recorded answer.
  - "Offer other" opens a mobile form.
- **Availability:** answers write through `app.apply_inventory_rows` with source `tap`:
  - a decline sets that cabin type to 0 free;
  - a hold takes the cabins and gives them back at expiry, through a pg_cron job.
- **Reply time:**
  - a per-operator reply time, 6 hours by default, set by admins;
  - a reminder when it passes, and an admin alert (email and notice) at twice the reply time;
  - a 09:00 Cairo daily digest, skipped when empty.
  - All of these run through pg_cron and the signed internal endpoint.
- **Metrics:** median response time, share answered in time, and decline rate where our data showed space. They appear on the admin operator page and on the connection-health page, and give "confirmed within X hours".
- **Email:** through the chosen provider (decision 1).
- **WhatsApp:** Cloud API code and template text, behind a flag that is off by default.

### Part C: the reservable rule (second pull request, after A)

- **Feed, API or `tap` data no older than 2 hours:** booked instantly, as today.
- **Manual or sheet data no older than 7 days:** becomes a booking request (Part A). The customer can pay only after the operator confirms (decision 2).
- **Older data:** to be confirmed, as today.
- **Sold out:** suggests nearby dates on the same ship and similar ships.
- **Free counts:** exact counts are never shown for manual or sheet data. "Last few cabins" only for instant data with 2 or fewer free.
- **Allotments:** skipped (not in the data model).

### Part B: sheets in (third pull request)

- **`sheet_ingest`** records, with the raw files in private storage.
- **Intake:** an inbound email address (decision 1), WhatsApp media (behind the flag) and admin upload.
- **Reading:** spreadsheets are parsed in the app; PDF text is extracted; images and scans are read by an AI model with vision (decision 3), which must return format v1 checked by the existing validator. Sheet contents are treated as data only.
- **Name aliases:** a per-operator table that learns when an admin maps a name.
- **Preview:** the existing preview, kept for 48 hours instead of 2, with source `sheet` and the as-of date. It also shows:
  - the original file next to the rows;
  - changed values against current data;
  - rows the sheet no longer lists (flagged only, never deleted).
- **Auto-confirm:** a per-operator switch, with the checks in the task.
- **Acknowledgement:** an optional message to the sender after confirmation.
- **Operator pages:** a "No system? Send us your weekly sheet" section on the format page, and the last sheet received on the connection-health page.
- **Real test:** needs the sheets (decision 4).

### Unchanged

The three existing routes, operator webhooks (off), CSV for operators, and channel managers.

## Decisions for Faris

1. **Email provider (outbound and inbound).** Part A's email is "always on" and Part B needs an inbound address, but nothing sends email today.
   - Recommended: **Postmark**. It does reliable transactional email and inbound email with attachments delivered to a webhook. It can also send Supabase's sign-in emails.
   - Alternatives: Resend, or Amazon SES.
   - Whichever you choose, I need an account, the sending domain's DNS records (you or your web host add them), and an inbound address such as `sheets@nilecruz.com`.
2. **Payment timing (Part C).** Today a booking on manual data is made instantly and the customer can pay straight away. Part C makes it a request the customer can pay for only after the operator confirms. The task says to ask before changing when payment can be taken.
   - Recommended: **yes**. Customers pay only for cabins the operator has confirmed.
3. **Reading sheets with AI.** Photos and scanned PDFs need an AI model with vision.
   - Recommended: **Anthropic's Claude**. It needs an API key, and your OK to send operators' sheets to it. Sheets carry cabin counts, not guests' personal data.
4. **Real sheets for the test.** The last 8 weeks of vacancy sheets from 5 operators, to measure corrections and review time. Until they arrive, the tests use sample fixtures.

Also needed before WhatsApp can be switched on (it can be built now, behind the flag):
- a Meta Business account;
- a WhatsApp business number;
- Meta's approval of the two message templates (request, reminder);
- operators' opt-in to receive messages on that number.
