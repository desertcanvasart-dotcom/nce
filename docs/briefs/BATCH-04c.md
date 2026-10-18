# Batch 4c brief: Operator product and inventory

**Status:** awaiting Faris's go-ahead · **Branch:** `batch-04c-operator-product` (from `main`) · **Size:** L (largest so far)

**Goal:** an operator turns a vessel profile into something that can be reserved: cabins on decks, schedules, departures, rates in each plan, shared inventory and promotions. They enter it by hand, by pasting JSON or XML, through a feed Nilecruz pulls, or through our API. Admins see every connection's health. Once a vessel has cabin types and departures with rates, the readiness check from 4b can finally complete, so publishing becomes possible.

## Requirement IDs in scope (44)

- **Cabins and decks:** DASH-ADM-048, 049, 050, DASH-OPR-008, DATA-023 (occupancy)
- **Schedules and departures:** DASH-ADM-051, 052, DASH-OPR-009
- **Rates and inventory:** DASH-ADM-053, 054, 055, 056, DASH-OPR-010 (rate plans)
- **Prices around the rate:** DATA-015 (crew gratuity), DATA-019 (child pricing), DATA-022 (operator overrides)
- **Promotions:** DASH-ADM-074 to 085, DASH-OPR-012
- **Connections:** DASH-ADM-045, 046, 047, DASH-OPR-016, 024, 025, 026, 027
- **Overviews:** DASH-ADM-006 (connection errors), DASH-OPR-001, 004, 005
- **Security:** SEC-007 (feed fetching), SEC-008 (hashed, rotatable credentials), SEC-009 (signed, idempotent API)

## What I will build

**Product (operator workspace, also editable by catalogue admins):**
- **Cabin types:**
  - name, description (EN/ES/JA), photos, size in m², bed configuration, maximum occupancy 1–3, view, balcony, amenities, active or inactive;
  - each sits on a deck (Lower, Middle, Upper or a vessel-specific name);
  - the same category on two decks is two cabin types (DASH-ADM-050).
- **Schedules:**
  - directional route (Luxor → Aswan is not Aswan → Luxor), number of nights, weekly sailing days, operating date ranges, and the itinerary day by day;
  - a vessel can have several.
- **Departures:** generated from a schedule's sailing days within its date ranges; single departures can also be added or cancelled.
- **Rates:**
  - one row per departure × cabin type × occupancy × rate plan × currency: a price per person in minor units, entered for one departure or for every matching date of a schedule.
  - **Plans:** international, Egyptian citizen, foreign resident, trade (question 1).
- **Shared inventory:** the number of available cabins belongs to the departure and cabin type, not to the price. Two prices or currencies never create extra cabins (DASH-ADM-056). This is enforced in the database and tested with concurrent writes.
- **Freshness:** each inventory row records when it was last confirmed and by which source. "Scheduled" is kept apart from "confirmed and recent" (DASH-ADM-055; threshold in question 2).
- **Around the rate:**
  - the crew gratuity per vessel: US$ only, at least US$5 per person per night, ages 3 and over, never in the total (DATA-015, ADR-010);
  - child pricing bands: under 3 free, 3–5.99 at 25%, 6–11.99 at 50%, 12+ full, by age on the departure date (DATA-019). Admins can override the bands per operator; changes are audited and apply to new rates only (DATA-022).

  Both are unit-tested at every boundary.
- **Promotions:**
  - **Types:** percentage off, fixed amount off, an included extra service, a guaranteed upgrade.
  - **Limits:** a booking period, departure dates, selected rates; each has its own benefit text and terms (EN/ES/JA); it can be paused and resumed.
  - **Upgrades:** an upgrade must point to real inventory in the better cabin type and never creates stock.
  - **No stacking:** a promotion never applies on top of another promotional rate (DASH-ADM-084, 085).
  - **Rights:** only owners, or admins, manage promotions (DASH-OPR-012).

**Connections** (operator "Inventory connections", admin view per operator):
- **Manual:** the screens above.
- **Paste:** JSON or XML in the Nilecruz inventory format, validated with a row-by-row preview before anything changes (the same pattern as the 4b CSV import).
- **Feed:**
  - the operator enters a feed URL; it stays inactive until an admin approves it (DASH-ADM-047);
  - Nilecruz pulls it on a schedule (question 4);
  - SEC-007 protections:
    - only https, no private or internal network addresses (checked after DNS resolution and on every redirect);
    - a size limit and a time limit;
    - XML parsed with external entities and DTDs disabled.
- **API:**
  - the operator generates a key pair; only a hash of the secret is stored, and it is shown once;
  - two keys can be active at a time, so rotation needs no downtime (SEC-008);
  - every call is signed (HMAC with a timestamp) and carries an idempotency key, so a repeated call never applies twice;
  - outbound webhooks (used from 4e) are signed the same way (SEC-009).
- **Health:** the last success, the last error in plain words, the number of rows changed and the age of the data. Problems show on the operator overview, and admins get a counter and a list on theirs (DASH-ADM-006, 045; DASH-OPR-005, 027).

**Format:**
- I propose the "Nilecruz inventory format v1", based on the JSON/XML feed format already documented in your `nile-cruise-marketplace` repository (spec v3 §2.2).
- It adds what that format lacks: cabin-type codes, occupancy, rate plan and the time each availability was confirmed (question 3).
- It is published as a short document for operators.

## Tests I will add

- **Unit:**
  - departure generation (sailing days, date ranges, nights);
  - child bands at every boundary (2.99, 3, 5.99, 6, 11.99, 12, age on the departure date);
  - the gratuity minimum;
  - promotion maths (percentage, fixed, rounding in minor units) and no stacking;
  - format parsing (valid, invalid, XML entity attack, oversize);
  - request signatures (valid, expired, tampered, replayed);
  - private-address blocking (127.0.0.1, 10/8, 169.254.169.254, IPv6 loopback, DNS rebinding).
- **Database (pgTAP):**
  - operators only ever see and change their own product (DASH-OPR-001);
  - occupancy 1–3, and the gratuity rule;
  - two prices share one quantity;
  - an upgrade can't exceed real inventory;
  - only admins approve feeds;
  - credentials stored only as hashes.
- **Concurrency:** many parallel writes against one departure's inventory never take it below zero (the 4e "no oversell" test builds on this).
- **End-to-end:**
  - an operator builds a bookable sailing by hand: deck, cabin types, schedule, departures, rates, inventory;
  - the vessel's readiness turns complete and an admin publishes it;
  - the same by paste, and by API with a signed call;
  - a feed is approved and pulled from a local test server;
  - promotions are created, paused and checked for no stacking;
  - axe on every new screen in Day and Night.

## New dependencies

| Package | Why |
|---|---|
| `fast-xml-parser` | XML feeds and pastes, with entities and DTDs disabled. Already used by `nile-cruise-marketplace`. Server-only. |

Signatures use Node's built-in `crypto`; scheduling uses Supabase `pg_cron`, which is already part of the stack.

## Questions for Faris before I start

1. **Rate plans and eligibility (Q20).**
   - The plans themselves are built in 4c. Proof of eligibility is personal data, so it comes with bookings in 4e.
   - My recommendation:
     - the customer declares Egyptian citizenship or residence and uploads proof;
     - the operator verifies it before payment is due;
     - if the customer isn't eligible, the operator sends an updated offer at the right rate.
   - The wording customers read must come from you. Is this the right process?
2. **How fresh availability must be (Q21).** I recommend:
   - 2 hours for feed and API data, 24 hours for manual entry, both adjustable by an admin;
   - older data is shown as "to be confirmed" and can't be reserved.
3. **Inventory format.** Build on the format already documented in `nile-cruise-marketplace`, extended as described above. Agreed?
4. **How often feeds are pulled.** Hourly, as that format's spec says, run by Supabase's scheduler. Agreed?
5. **Rate currencies.** Which currencies may operators price in? I recommend US$, € and E£, with E£ only for the Egyptian-citizen and foreign-resident plans. The gratuity stays US$ regardless.
6. **Split into two pull requests.** This is the largest batch. I recommend two PRs inside the batch, each fully tested before review:
   - **4c-1:** cabins, schedules, departures, rates, inventory, gratuity, child pricing, promotions;
   - **4c-2:** paste, feed, API, health, security.

   The batch closes only when both are done.
