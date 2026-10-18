# Batch 4d brief: Tours and sightseeing

**Status:** awaiting Faris's go-ahead · **Branch:** `batch-04d-tours` (from `main`) · **Size:** M

**Goal:** Nilecruz admins build and publish the tours and extras that sit around a cruise (museum visits, evening tours, excursions, transfers) and multi-night sightseeing programs tied to cruise schedules. A tour can be published as information first and becomes bookable once it has sessions and prices. Tours belong to Nilecruz: operators have no access (ADR-030). The public tour pages come in Batch 7, and tour orders and payments in 4f. This batch builds the product those batches sell.

**Exit criterion (BATCH-PLAN):** an admin publishes a tour with sessions, and a program linked to a schedule.

## Requirement IDs in scope (16)

- **Tours:** DASH-ADM-058 (independent products), 059 (name, location, duration), 060 (description, itinerary), 061 (photos), 062 (inclusions, exclusions), 063 (meeting point or pickup), 064 (supplier), 065 (cancellation wording and bands), 066 (standalone or assigned to cruises)
- **Sessions:** DASH-ADM-067 (times, capacity, currency, price), 068 (shared or private), 069 (per guest or per group)
- **Programs:** DASH-ADM-070 (linked to schedules and departures), 071 (included sessions, availability check)
- **Information-only:** DASH-ADM-073
- **Rights:** DATA-042 (admins only; operators have no access)

Not in this batch, by plan: tour detail pages (DASH-ADM-072, PAGE-093–100: Batch 7); tour orders, payments and the cancellation calculation (4f); customers' tours in My journey (4g).

## What I will build

**Suppliers** (DASH-ADM-064):
- The companies that run each tour: name, contact person, email, phone, licence or registration number, notes.
- Private to admins and never shown publicly. Suppliers don't sign in.

**Tours** (admin "Tours and sightseeing"):
- **Kind:** museum visit, excursion, evening tour, transfer, other (DASH-ADM-058).
- **Basics:** name, location (linked to a destination where one exists), duration.
- **Text in EN/ES/JA:** description, itinerary (step by step), inclusions, exclusions, and meeting-point or pickup instructions.
- **Photos:** the same uploads, credits and alt text as vessels.
- **Supplier:** one per tour.
- **Cancellation:** wording (EN/ES/JA) plus calculation bands ("from N days before: X % charged"). The bands are checked: no gaps, no overlaps, 0–100 %. The calculation itself runs in 4f.
- **Availability:** standalone, assigned to cruise schedules (for example Abu Simbel to schedules that call at Aswan), or both (DASH-ADM-066).
- **Visibility:** private draft → published, with sample data visibly flagged, as for vessels.
- **Readiness:** a published tour is *information-only* until it has a supplier, cancellation bands and at least one future session with a price. It then becomes *bookable* automatically (DASH-ADM-073). The editor shows what is missing, as the vessel readiness check does.

**Sessions** (DASH-ADM-067–069):
- Each session has a start and end (entered in Cairo time, stored in UTC), guest capacity, currency and price in minor units.
- **Shared** sessions: guests from different bookings join, priced per guest; capacity is the number of seats.
- **Private** sessions: one party per session, priced per guest or per group, with a maximum group size.
- One tour can offer both, so the same experience has different commercial options.
- **Bulk creation:** a date range, weekdays and start times create many sessions at once; running it again adds nothing new. A single session can be cancelled.
- How many places are taken arrives with tour orders in 4f. Until then, a session shows its capacity, and the availability check counts capacity.

**Programs** (DASH-ADM-070, 071):
- A multi-night sightseeing program has a name, description (EN/ES/JA) and an ordered list of days, each including one or more tours (for example day 1 Karnak, day 3 Edfu, day 4 Abu Simbel).
- It is linked to one or more cruise schedules. Day N falls on the departure date + N − 1.
- **Availability check:** for every upcoming departure of a linked schedule, each included tour must have a session on its day with capacity left. The admin sees a grid: departure × day, with ✓ or what is missing ("no Edfu session on 14 Mar"). A program is offered only on departures that pass.

**Rights** (DATA-042):
- Only admins with the catalogue or content role reach "Tours and sightseeing" (already in the menu since 4a).
- My recommendation: catalogue admins manage everything; content admins edit text and photos only (no prices, sessions, suppliers or bands); super admins do everything.
- Operators and travel partners have no access at all. RLS and server checks enforce this; the public can read published tours only.

## Tests I will add

- **Unit:**
  - session generation (date ranges, weekdays, several start times, Cairo time across the change to and from summer time, no duplicates);
  - cancellation band validation (gaps, overlaps, 0–100 %);
  - per-guest and per-group price maths for shared and private sessions;
  - the program day-to-date mapping and the availability check;
  - the readiness rules (information-only → bookable).
- **Database (pgTAP):**
  - operators, partners and customers can't read or change tours, suppliers, sessions or programs;
  - the public reads published tours only, and never suppliers;
  - content admins can't change prices or bands;
  - capacity and price checks; no duplicate sessions;
  - information-only tours have no bookable sessions.
- **End-to-end:**
  - an admin adds a supplier, builds a tour (text in three languages, photo, inclusions, meeting point, bands), publishes it as information-only, adds shared and private sessions in bulk, and sees it become bookable;
  - assigns it to a schedule;
  - builds a program linked to that schedule and sees the availability grid (one departure complete, one missing a session);
  - an operator gets 403;
  - axe on every new screen in Day and Night; screenshots at 375, 768 and 1440 px.

## New dependencies

None.

## Questions for Faris before I start

1. **Who edits tours.** Is my recommendation above right? (Catalogue admins manage everything; content admins edit text and photos only.)
2. **Tour currencies.** Like cruises (US$ and €, with E£ allowed only for Egyptian citizens and foreign residents), or just US$ and €? Tours have no rate plans in the guide, so I recommend **US$ and €**, with E£ added later if you want local pricing.
3. **Children on tours.** The guide doesn't mention child prices for tours. I recommend that a per-guest price applies to every guest aged 3 and over and under-3s go free, using the cruise age rule. A tour can also be marked "adults only" (for example the balloon flight, where suppliers set a minimum age). Agreed, or should tours use the cruise child bands?
4. **Do tour prices need a sign-in?** Cruise prices show only after sign-in (ADR-025). Should tour prices be public on the tour pages (Batch 7), or behind sign-in too? I recommend **public**: they are fixed prices without the negotiation that cruise offers have. This only affects who can read sessions; the screens are the same.
5. **Supplier cost.** Should admins record what Nilecruz pays the supplier per session, to see the margin? The guide doesn't ask for it, so it is not in scope. Say if you want it (it would be PROPOSED-019).
6. **Content.** Real tours, suppliers, prices and cancellation wording come from you (CONTENT-NEEDED #39–#41). Tests use flagged sample tours only.
