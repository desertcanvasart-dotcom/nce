# Batch 4e brief: Requests, offers and reservations

**Status:** awaiting Faris's go-ahead · **Branch:** `batch-04e-requests-offers` (from `main`) · **Size:** L

**Goal:** a signed-in traveller describes the cruise they want; suitable operators answer with personal offers that name the exact sailing, cabins and deck; the traveller compares them and accepts one; acceptance re-checks availability and takes the cabins in one step, creating a reservation. Admins see and search everything. Payments, deadlines, cancellation charges and refunds come in 4f; until then a reservation is "awaiting payment".

**Exit criterion (BATCH-PLAN):** customer request → two offers → accept → reservation, with no oversell under concurrency (a database test).

## Requirement IDs in scope (27)

- **Requests (customer):** DASH-CUS-004 (track requests), 014 (what a request captures), 015 (request-for-offers wording), DATA-020 (each child's age)
- **Offers (operator):** DASH-OPR-002 (new requests on the overview), 003 (outstanding offers), 011 (prepare offers), 017 (sailing and cabin arrangement), 018 (price, inclusions, terms, expiry), 019 (eligibility conditions), 020 (an offer holds no inventory), 022 (records the deck), 023 (deck change = new offer to review)
- **Accepting (customer):** DASH-CUS-005 (compare offers), 006 (dates, route, cabins, price), 007 (read terms, accept a valid offer), DASH-OPR-021 (atomic re-check on acceptance)
- **Reservations:** DASH-ADM-057 (no fixed cabin limit, only inventory), DASH-BND-001 (bookable only when complete)
- **Admin supervision:** DASH-ADM-004 (bookings counter), 090, 091, 092 (all requests, offers, reservations), 093 (the booking record), 094 (incomplete transactions), 096 (search and filters)
- **Personal data:** SEC-013 (passenger data readable only by the booking's customer, operator and admins; partners join in 4h)

Not in this batch: payments, deadlines, cancellation and refunds (4f); My journey's overview and past trips (4g); travel partners' reservations (4h); direct "reserve now" from public vessel pages (Batch 5, which uses the reservation function built here); PROPOSED-016 (amendments) and PROPOSED-017 (messaging), still awaiting your decision.

## What I will build

**Requests** (My journey → Cruise requests):
- Route or "flexible", travel dates or a date window, latest finish date, number of nights, guests (adults, and each child's age on the travel date, DATA-020), cabin arrangement (how many cabins, who shares), optional budget, and notes.
- The page says plainly that this asks for offers: no bid and no lowest price is guaranteed (DASH-CUS-015).
- States: open → offers received → accepted (or closed by the customer, or expired after the latest travel date).

**Who sees a request** (question 1): operators see the trip (route, dates, guests' ages, cabins, budget), never the customer's name or contact details, until that customer accepts their offer.

**Personal offers** (operator → Requests and offers):
- **Contents:** the operator picks one of their departures and, for each cabin, a cabin type, so the deck is recorded, and who sleeps there.
- **Price:** pre-filled from their rates and child bands; they can change the price and must say why. Inclusions, terms, the eligibility conditions they confirm (family make-up, rate plan, ADR-078) and an expiry date complete the offer. The crew gratuity is shown separately, never in the total.
- **No hold:** sending an offer holds no cabins (DASH-OPR-020).
- **Versions:** changing the sailing, the cabins or the deck after sending creates version 2. Version 1 can no longer be accepted, and the customer is told to review the update (DASH-OPR-023).
- **Overview:** the operator overview lists new requests and outstanding offers (DASH-OPR-002, 003).

**Comparing and accepting** (customer):
- Offers appear side by side: departure dates, route, vessel, cabins and decks, price per person and total, inclusions, terms, expiry (DASH-CUS-005, 006).
- **Accepting needs:**
  - a current, unexpired version;
  - the terms ticked as read;
  - passenger names, plus for each child the date of birth that matches the age on the request (question 4).
- **One transaction** (`public.accept_offer`):
  - checks the version is still current and valid;
  - checks the sailing is still bookable (DASH-BND-001) and every cabin type still has cabins;
  - takes the cabins from inventory, creates the reservation with a reference (for example `NC-7K3QX9`), and closes the request's other offers.
  - If anything changed, nothing is taken and the customer is told why.
- **Concurrency:** many parallel acceptances against the last cabins never take availability below zero. This is a database concurrency test with 20 parallel sessions (the ADR-084 test moved here).

**Reservations:**
- Status "awaiting payment" (payment arrives in 4f).
- The record holds the sailing, guests, cabins and decks, the prices as accepted, and a copy of the terms and policy shown at acceptance. Later edits to the offer or rates never change it.
- No fixed cabin limit: only inventory and validation (DASH-ADM-057).

**Bookable gate** (DASH-BND-001): a departure is bookable only if it has active cabin types, scheduled status, rates, fresh availability (ADR-079) and a cancellation policy. Cruise cancellation policies don't exist yet, so this batch adds the record (question 3).

**Admin "Requests and bookings"** (DASH-ADM-090–096, 004):
- every request, offer and reservation, searchable by reference, operator, route and dates;
- the full booking record;
- "incomplete transactions": offers accepted but not completed, reservations awaiting payment, and requests with no offers after 72 hours;
- an overview counter of current and upcoming bookings.

**Passenger data** (SEC-013):
- names and dates of birth sit in a separate table;
- only the booking's customer, that operator's team and admins can read them; every access is through RLS, and changes are audited;
- operators never see a customer's contact details before acceptance.

## Tests I will add

- **Unit:**
  - offer price build-up (rates × occupancy, child bands by age on the departure date, gratuity kept separate);
  - expiry and version rules;
  - the bookable-gate rules;
  - request validation (date windows, latest finish date, ages).
- **Database (pgTAP):**
  - operators see only requests they may answer, never contact details;
  - only the current version can be accepted; expired offers can't be accepted;
  - acceptance takes cabins atomically and refuses when there aren't enough;
  - passenger data is readable only by the right people;
  - another operator can't read or change offers;
  - **concurrency:** 20 parallel acceptances for the last 3 cabins → exactly 3 reservations, availability 0, never negative.
- **End-to-end:**
  - a customer sends a request; two operators answer;
  - one operator changes the deck (version 2) and the old version can't be accepted;
  - the customer compares the offers and accepts one;
  - the reservation appears for the customer, the operator and the admin, and inventory goes down;
  - admin search finds it by reference;
  - a second customer can't accept once the cabins are gone;
  - axe on every new screen in Day and Night; screenshots at 375, 768 and 1440 px.

## New dependencies

None. The concurrency test runs in pgTAP-style SQL with parallel database sessions opened by the test script.

## Questions for Faris before I start

1. **Which operators see a request?** I recommend operators whose vessels sail the requested route (or any route if "flexible") within the date window. Requests nobody can serve are flagged for admins. Customer names and contact details stay hidden until acceptance. Agreed?
2. **Offer expiry.** I recommend a default of 72 hours, settable from 24 hours to 14 days, and never later than the departure's payment deadline once 4f exists. Agreed?
3. **Cruise cancellation policies.** The bookable gate needs one per cruise, but policies were planned for 4f. I recommend adding the record now: wording in EN/ES/JA plus percentage bands before departure, per vessel and optionally per schedule, entered by the operator or an admin. The charge calculation stays in 4f. Until you or the operators supply the policies, real departures stay unbookable (CONTENT-NEEDED #4). Agreed?
4. **Passenger details at acceptance.** I recommend full names and dates of birth for everyone, plus nationality for the lead passenger only, and no passport numbers. Passport details are government IDs; if operators need them for port lists, that is a separate, encrypted step later. Agreed?
5. **Eligibility proof (ADR-078).** For offers at the Egyptian-citizen or foreign-resident rate: the customer uploads proof at acceptance into a private store that only the operator and admins can open, and the operator confirms it before payment is due. The customer-facing wording is CONTENT-NEEDED #38. Shall I build the upload now, with placeholder wording marked "draft"?
6. **Notifications.** I recommend in-dashboard notices only in 4e (new request, new offer, offer updated, reservation made), with emails once a sending service is chosen. Supabase sends only the account emails today. Should email go in now, and if so through which provider (for example Resend or Postmark)?
