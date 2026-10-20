# Batch 7 brief: Destinations, tours and trust pages

**Status:** approved by Faris 20 Oct 2026 (ADR-097) · **Branch:** `batch-07-destinations-tours` (from `main`) · **Size:** L (recommend two pull requests, question 9)

**Goal:** the places along the river, the tours and extras sold around a cruise, and the pages that say who Nilecruz is and how it judges vessels. Tours move from fixed, pre-made sessions to what Faris asked for on 20 Oct: the customer picks a date on a calendar, chooses shared or private and the party size, sees the price at once and books.

**Exit criterion (BATCH-PLAN):** Phase 1 rows live; tour slugs reconciled.

## Requirement IDs in scope (16)

- **Destinations:** PAGE-074 `/destinations/`, 076 Luxor, 083 Edfu, 085 Kom Ombo, 086 Aswan, 090 Abu Simbel
- **Tours and extras:** PAGE-093 `/tours-extras/`, 094 Abu Simbel day trip, 095 hot-air balloon over Luxor, 099 airport and hotel transfers; DASH-PUB-006 (visitors browse tour pages); DASH-ADM-072 (each tour has its own page; cards don't carry the full itinerary); SEO-022 (tour slugs reconciled with live nilecruz.com URLs)
- **Trust and company:** PAGE-101 `/about/`, 102 `/how-we-choose-vessels/`, 106 `/contact/`
- **Carried over:** SEO-013 (vessel pages link to the destinations they stop at) and DATA-018 (vessel pages link to `/tours-extras/transfers/`) close here.

## What I will build

**Destinations** (6 pages), on the Batch 6 template and linking engine:
- the pillar with the stops in river order;
- each destination with its sights, the itinerary days that stop there, a gallery (illustrated scenes until photos), FAQs and the closing cruise row;
- TouristDestination and TouristAttraction data.
- Vessel pages then link to each built destination they stop at (SEO-013).

**Tours as pages** (DASH-PUB-006, DASH-ADM-072):
- Every published tour gets `/tours-extras/{slug}/`: what's included, the itinerary, the meeting point, the cancellation terms and the booking box.
- The hub lists tours as cards, without the full itinerary.
- The three Phase 1 rows use the workbook's URLs. Any live nilecruz.com tour URL redirects to its new page (SEO-022).

**Tour booking with a calendar** (Faris, 20 Oct; prices from `docs/imports/tour-rates-template.xlsx`):
- **Tours have rates, not sessions.** Each tour carries its office (Luxor or Aswan), the days it runs, its start times, and rates:
  - **Shared:** per person, child prices by age, up to **8 guests** per date and start time.
  - **Private:** per person by party size (1, 2, 3–4, 5–8, 9–14, 15+), child percentage. Parties of 9 or more always book private.
  - **Transfers:** private only, per vehicle (car, van or minibus by party size), one way.
  - **Meet and assist:** per party by size, arrival or departure.
  - **Seasons:** a percentage between two dates (optional).
- **Booking:** the customer picks a date on a calendar, a start time, shared or private, and the guests, sees the price at once, and pays by card (the 4f-2c tour orders, 60-minute hold, kept). A shared slot shows places left and closes at 8. A private booking takes its own guide, so it never fills a shared slot.
- **The offices** get their own dashboard (a "tour office" company type): their bookings by day, with guests and pickup details, and the right to cancel a slot they can't run.
- **Importing the rate sheet:** `pnpm import:tour-rates` reads your filled-in sheet and loads the rates (staging first, after a dry run).
- The fixed sessions from Batch 4d stay readable for orders already made, and are no longer created.

**About, how we choose vessels, Contact** (PAGE-101, 102, 106):
- **About:** the brand and how the marketplace and the booking agent work (ADR-094). The legal entity stays a placeholder until it's final (CONTENT-NEEDED #27).
- **How we choose vessels:** the evaluation method, with its seven weighted dimensions, from the code that scores vessels, and how vessels are checked.
- **Contact:** a form that saves messages to an admin inbox in the dashboard. Email notifications come in Batch 8, when transactional email is set up.
- AboutPage, ContactPage and Organization data.

## Tests I will add

- **Unit:** tour price for each basis (shared per person with children, private tiers, transfer by vehicle, meet and assist by party, season percentage); party-size rules (9+ private only, shared capacity 8); slot places left; the rate-sheet reader against the template.
- **Database (pgTAP):**
  - a shared slot never takes more than 8 guests, even with two bookings at once;
  - private bookings are separate;
  - prices are computed in the database as on the page;
  - offices see only their own tours' bookings;
  - visitors read published rates and nothing private.
- **End-to-end:**
  - a customer picks a date and time, books a shared tour for 2 and pays through the signed webhook;
  - a 9th guest is refused on a shared slot, and a party of 9 is offered private;
  - a private transfer is priced by vehicle;
  - the office sees the booking;
  - destination and trust pages pass the link check;
  - live tour URLs redirect;
  - axe in Day and Night; screenshots.

## Questions for Faris

1. **Booking confirmation** (Questions tab of the rate sheet). Recommended: a paid booking is **confirmed at once**, and the office sees it in its dashboard. Or should the office confirm each booking within 24 hours?
2. **A shared tour below its minimum.** Recommended: **offer the private tour at the shared price** (no cancellation for the customer). Or run it anyway, or cancel and refund in full?
3. **Office logins.** Recommended: **yes**, one login per office (Luxor, Aswan), seeing only its own tours' bookings. Or Nilecruz admins only?
4. **Tour cancellation.** Recommended: one standard rule for all tours, **free until 48 hours before, then 100 %**, unless a tour sets its own. Or set it per tour?
5. **Booking window.** Recommended: up to **12 months** ahead, and at least **24 hours** before the start, unless a tour says otherwise.
6. **Tours without a cruise.** Recommended: **yes**, anyone signed in can book a tour; the calendar suggests the days a booked cruise is moored nearby.
7. **The hot-air balloon** (PAGE-095) isn't among the tours on nilecruz.com and isn't run by your offices. Recommended: build its page as **information only** until you name a supplier and a price. Or drop it from Phase 1?
8. **Before the rate sheet comes back.** Recommended: build the calendar and pricing now, with tours showing "Prices coming soon" (information only) until your rates are imported. Nothing is bookable with made-up prices.
9. **Two pull requests.** Recommended: **7-1** for destinations, tour pages (information), About, how we choose vessels, Contact and the slug redirects; **7-2** for calendar booking, rates, the offices' dashboard and the rate-sheet import.
