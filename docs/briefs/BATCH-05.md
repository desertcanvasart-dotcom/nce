# Batch 5 brief: Marketplace

**Status:** approved by Faris 20 Oct 2026 (ADR-093) · **Branch:** `batch-05-marketplace` (stacked on PR #24) · **Size:** L (recommend two pull requests, question 8)

**Goal:** the public can browse Nile cruises. The `/cruises/` hub and its Phase 1 filtered pages list real, published vessels on cards with the Nilecruz evaluation and one honest "from" price. Each vessel page shows its itineraries, cabins, decks, evaluation and external ratings. A signed-in customer can pick a departure, deck and cabin type and reserve.

**Exit criterion (BATCH-PLAN):** Phase 1 Cruises rows meet the SEO definition of done; listing → vessel → sign-in → reserve works.

## Requirement IDs in scope (31)

- **Pages (Phase 1 Cruises rows):** PAGE-060 `/cruises/`, 061 `/cruises/dahabiyas/`, 062 `/cruises/motor-ships/`, 064 `/cruises/luxury/`, 066 `/cruises/luxor-to-aswan/`, 067 `/cruises/aswan-to-luxor/`, 072 `/cruises/{vessel-slug}/`
- **Public:** DASH-PUB-001 (browse vessels), 002 (Nilecruz evaluations), 003 (external reviews by source), 004 (comparison), 005 ("from" prices where supplied), 010 (information-only listings)
- **Deck selector:** DASH-CUS-016 (choose deck and cabin type), 017 (labelled schematic, never a numbered cabin), DASH-BND-002 (honest empty state), 003 (no numbered cabins or verified floor plans)
- **Honesty:** BRAND-003 (urgency only from real inventory), 026 (ratings only from real reviews; cards show the maximum guests), 028 (NN/100 on cards; stars only for verified reviews; external ratings only on the vessel page)
- **Data:**
  - DATA-004 (dates in the visitor's locale), 012 (CruiseSearch from real schedules and departures), 018 (check-in to check-out; transfers separate);
  - 031 (one page per vessel, itinerary as a canonical parameter), 032 (one "from" price per vessel), 034 (Offer schema uses the "from" price only)
- **SEO and speed:** SEO-004 (breadcrumbs and BreadcrumbList), 013 (vessel page links to its type hub and its destinations), 016 (only listed facets indexable; parameters canonical and noindex), 026 (AggregateRating only from verified reviews), PERF-010 (static or cached, revalidated on change)

## What I will build

**Public data, read safely** (PERF-010, DATA-012, 032):
- One public read path through the database: published vessels (and showcase ones, marked as such), their schedules, bookable departures, cabin types, amenities, media and published evaluations. Drafts, rates by plan, trade and company rates and inventory counts stay private.
- `public.vessel_from_price(vessel)`: the lowest **international** per-person price in a double over bookable departures in the next 12 months, in the rate's own currency, with what it includes (question 2). No rate means no price.
- Pages are generated statically and revalidated by tag when an operator or admin changes a vessel, a rate, inventory or an evaluation. Sample vessels never appear in production (`is_sample`); on staging they carry the sample flag.

**Listing hub and filtered pages** (PAGE-060–067, DASH-PUB-001, 005, BRAND-026, 028):
- `/cruises/`: H1 "Compare Nile cruises", CruiseSearch, vessel-type cards (dahabiya, motor ship) and a CruiseCard grid.
- Filtered pages:
  - `/cruises/dahabiyas/` (sail) and `/cruises/motor-ships/` (motor);
  - `/cruises/luxury/` (category luxury, question 4);
  - `/cruises/luxor-to-aswan/` and `/cruises/aswan-to-luxor/` (schedules with that origin and destination).
- **CruiseCard** shows the photo, name, type, route and nights, **maximum guests**, "NN/100 · Nilecruz evaluation" when published, and the "from" price with "per person" and currency, or "Prices on request".
- No stars anywhere until verified reviews exist (PROPOSED-006). Scarcity ("2 cabins left") only when computed from fresh inventory.
- **Information-only vessels** (DASH-PUB-010) stay listed with no price, no availability and no reserve button, labelled "Information only".
- **CruiseSearch** routes, sailing days and match counts come from real schedules and departures (DATA-012). Its query goes into parameters (`?route=&date=&guests=`) that canonicalise to the clean URL with `noindex` (SEO-016).

**Vessel page** `/cruises/{slug}/` (PAGE-072, DATA-031, 018, DASH-PUB-002, 003):
- H1 "{Vessel name} — {route}, {nights} nights" for the selected itinerary.
- An itinerary selector (a parameter, canonical to the vessel URL), with the ItineraryTimeline from check-in to check-out and the morning, noon or evening sailing time (for a morning sailing from Aswan, guests arrive the day before).
- Gallery, AmenityGrid, the published evaluation (score and the seven criteria), and external ratings with source and date (vessel page only).
- "Transfers not included", linked to `/tours-extras/transfers/` unless the package includes them.
- CabinPicker with cabin facts (size, deck, bed, occupancy) and **no prices for visitors**. The one public price is the "from" price, plus a "Sign in to see prices and dates" prompt.
- **Deck selector** (DASH-CUS-016, 017, BND-002, 003): decks as the vessel names them, with the cabin types on each, labelled "Schematic: not a floor plan; your cabin number is assigned by the operator". It shows an honest empty state when a vessel has no structured cabin types.
- **Signed in** (question 1): prices for each cabin type and departure at the public rate, places left from fresh inventory, then **Reserve**: name every guest, accept the terms and policy, and the booking appears in My journey with its payment deadline (the 4f flows). Where a departure isn't bookable, "Ask for an offer" opens a request prefilled with the vessel, route and dates.
- Links: up to `/cruises/` and its type hub, across to the destinations it stops at (SEO-013; pages still to be built are left unlinked until they exist, question 6).

**Comparison** (DASH-PUB-004): a "Compare" tick on cards (up to 3) opens `/cruises/compare/?v=…` (noindex) with VesselCompare: type, guests, cabins, evaluation, "from" price and routes. The animated compare tray is EXP-004 in Batch 9 (question 5).

**SEO** (SEO-004, 016, 026, DATA-034):
- Breadcrumbs with BreadcrumbList on every page.
- CollectionPage and ItemList on listings. TouristTrip and Offer (AggregateOffer `lowPrice` and `priceCurrency` from the "from" price only) on vessel pages. AggregateRating never, until verified reviews exist.
- Titles, descriptions and canonicals per row. Only the five listed facets are indexable.
- Dates in the visitor's locale (DATA-004).

**Languages:** English pages now. `/es/` and `/ja/` routes render the same pages with the English slugs for Japanese (ADR-022); translated copy and Spanish slugs come in Batch 10 (question 7).

## Tests I will add

- **Unit:** the "from" price choice (lowest category, per person, plan and currency rules, no rate → none); the facet filters; canonical and noindex rules for parameters; breadcrumb and JSON-LD builders (no AggregateRating; Offer only from the "from" price); scarcity text only from fresh inventory.
- **Database (pgTAP):**
  - the public read path returns only published and showcase vessels, never drafts, other plans' rates, trade or company rates, or inventory numbers;
  - `vessel_from_price` returns the lowest international per-person price and nothing without rates;
  - the public reserve function takes cabins without overbooking at the public rate, needs a signed-in customer, and refuses information-only vessels.
- **End-to-end (the exit criterion):** `/cruises/` lists the sample vessels with "NN/100 · Nilecruz evaluation" and "from" prices. A filtered page and CruiseSearch narrow the list. The vessel page switches itineraries (the canonical stays put) and hides category prices from visitors. Sign in → prices appear → choose a departure, deck and cabin → reserve → the booking is in My journey. Information-only vessels show no price. JSON-LD validated against the rules. Axe in Day and Night; Lighthouse on `/cruises/` and a vessel page; screenshots.

## Questions for Faris

1. **Reserving from the vessel page.** The exit criterion says "reserve". Recommended: signed-in customers reserve directly at the public (international) rate on bookable departures, using the same engine as partner bookings. Where a departure isn't bookable, they send a prefilled request for offers. This brings DATA-033, DASH-PUB-008 and 009 (prices after sign-in; reserving needs an account) forward from Batch 8. Or should Batch 5 only send a prefilled request, with direct booking left for Batch 8?
2. **The "from" price.** Recommended: the lowest international per-person price for two sharing a cabin, over bookable departures in the next 12 months, in the rate's own currency, shown as "from US$700 per person". Gratuities appear as their own line, never in the price.
3. **Currency (Q23).** Recommended: show each price in its rate's own currency, with no conversion for now. An optional "approx." conversion can come later (PROPOSED-010), and a converted amount is never charged.
4. **`/cruises/luxury/`.** Recommended: vessels whose category is **luxury**. Should **deluxe** be included too?
5. **Comparison.** Recommended: a simple compare page for up to 3 vessels now, and the animated compare tray later (EXP-004, Batch 9).
6. **Links to pages not built yet** (vessel types, destinations, Guide: Batches 6 and 7). Recommended: render those links only once the target page exists, so there are no broken or orphan links. The linking engine in Batch 6 fills them in.
7. **Languages.** Recommended: English content now. `/es/` and `/ja/` show the same pages and become fully translated in Batch 10.
8. **Two pull requests.** Recommended: **5-1** for the public read path and "from" price, `/cruises/` and the five filtered pages, CruiseCard, CruiseSearch, comparison, SEO and caching; **5-2** for the vessel page, itineraries, the deck selector, prices after sign-in and reserving. The batch closes when both are merged.
