# Batch 9 brief: signature interactions

**Status:** approved by Faris 21 Oct 2026 with the recommended answers · **Branch:** `batch-09-1-…`, `batch-09-2-…` · **Size:** M (two pull requests)

**Goal:** a handful of interactions that teach travellers something they'd otherwise get wrong, each built to its EXPERIENCE.md spec. Each must work without JavaScript and with reduced motion, and stay within the performance budget.

**Exit criterion (BATCH-PLAN):** each approved item meets its spec, its budget and its fallbacks.

## What I recommend building (EXP-001–007, 009) and skipping (EXP-008, 010)

### 9-1: low cost, high teaching

| ID | What the traveller gets | Where |
|---|---|---|
| **EXP-001** Live price build-up | Tap any price to see what it's made of: who shares, cabin size, guiding, dining, mooring, logistics, what's included and excluded, with the total counting up. | Cards, the reserve page, the booking summary; the full version on the prices pages |
| **EXP-004** Compare tray | Tick "Compare" on up to three cruises. A tray collects them and opens the side-by-side page, which already exists. | Every listing and vessel page |
| **EXP-006** Season and deadline calendar | Hover a date to see its season and the payment deadline you'd face: "Book on 1 Mar for 25 Mar → pay by 4 Mar". It uses the same rules as booking. | When to go, seasonal prices, the reserve page's dates |
| **EXP-009** Evaluation radar | Nilecruz's score unfolds into its seven dimensions, with what each measures. | Vessel pages, How we choose vessels |
| **EXP-007** Card to vessel page transition | The card's picture and name become the vessel page's heading, so you keep your place. It costs nothing where browsers support it. | Listings to vessel pages |

### 9-2: the deck plan, the voyage, mooring

**EXP-002, the interactive deck plan.** This is the interactive cabin plan Faris asked about, at cabin-type level.
- **Showing it:**
  - each vessel page shows its real deck plans, deck by deck;
  - tap a cabin to see its type: photos, size, beds, view or balcony, how many it sleeps, and its price for the chosen sailing;
  - then book that cabin type, or see nearby dates and similar ships.
- **Colours:** cabins are coloured by how their type books on the chosen sailing (instant, confirmed by the operator, or sold out). Exact numbers show only from instant data, as everywhere else (ADR-099).
- **Shared spaces:** the sun deck, pool and dining room show how many guests share them, the honest size signal.
- **No cabin numbers:** cabins aren't numbered or marked booked one by one (DASH-BND-003). Operators share availability by cabin type, and they assign the cabin numbers.
- **Admin:**
  - upload each deck plan (from the operator's brochure);
  - click each cabin on it and say its type;
  - the page checks every cabin type on the ship is placed.
- **Fallbacks:**
  - until a plan is uploaded, a clear schematic built from the cabin types and decks;
  - with no JavaScript, or on a screen reader, a plain list of decks and cabin types.

**EXP-003, the scroll-driven voyage.**
- Scroll down a route guide or a vessel's itinerary and a small boat moves along the Nile, day by day: which temple when, sailing versus moored, the Esna lock.
- With reduced motion, the boat jumps between stops.

**EXP-005, the mooring explainer.**
- A two-state toggle: "rafted six abreast" (your balcony faces the next ship) versus "a private riverbank".
- On vessel pages it shows that vessel's practice.

**Skipped, unless you'd like them:**
- **EXP-008:** the theme follows Egypt's time of day. It's mood only, and it risks surprising theme changes.
- **EXP-010:** an ambient river sound. It teaches nothing and adds 200–400 KB.

## Data and content this needs

| Item | What | From |
|---|---|---|
| EXP-002 | Each vessel's deck plan image (PDF or picture) | Operators' brochures, through Faris or the operator dashboard |
| EXP-005 | Each vessel's mooring practice: private bank, rafted, or varies | A vessel field the admin or operator sets |
| EXP-001 | Price factors | The maintained factors from Batch 6-2, marked sample until real rates are enough (DATA-008) |

## Tests

- **Unit:**
  - the price build-up's segments add up to the total;
  - the deadline tooltip for fixed dates matches the booking rules;
  - the deck plan: every cabin type placed, and colours from booking modes;
  - the radar's values match the database.
- **End-to-end:**
  - open the build-up from a card;
  - fill the compare tray to its limit, with the keyboard;
  - the deck plan with the keyboard only (tap a cabin, see its type, go to book), and an admin placing cabins;
  - the voyage with reduced motion;
  - the mooring toggle;
  - axe in Day and Night;
  - Lighthouse: CLS stays 0 and LCP doesn't change.
- **Screenshots:** every state, at 375, 768 and 1440, in Day and Night.

## Questions for Faris

1. **Which items?** Recommended: **EXP-001, 002, 003, 004, 005, 006, 007, 009**; skip 008 and 010.
2. **Deck plans.** Can you collect each vessel's deck plan from the operators (their brochures are fine)? Recommended: **yes**, with the schematic shown until a vessel's plan arrives.
3. **Deck plan colours.** Recommended: **by how each cabin type books on the chosen sailing** (instant, confirmed by the operator, sold out). There are no per-cabin "booked" marks; that needs operators to manage cabin numbers, which we can add later for vessels that do (likely some dahabiyas).
4. **Mooring.** Who knows each vessel's practice? Recommended: **the operator sets it** in their vessel profile, and admins check it.
5. **Order.** Recommended: **9-1 first** (quick wins on every page), then 9-2 as deck plans arrive.
