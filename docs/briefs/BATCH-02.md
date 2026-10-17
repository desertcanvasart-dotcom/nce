# Batch 2 brief: Design-system port

**Status:** awaiting Faris's go-ahead · **Branch:** `batch-02-design-system` (from `main`) · **Size:** L

**Goal:** all 22 design-system components become typed React modules that look, move and behave like their `preview.html`. Each one:
- is server-rendered where possible;
- has keyboard, reduced-motion and no-JS behaviour;
- takes real data through props, never built-in invented facts;
- appears in a private `/dev/components` gallery in every state, in Day and Night.

No pages are built in this batch. Pages start in Batch 5.

## Requirement IDs in scope (55)

- **Components (22):**
  - **Primitives:** COMP-Icon, COMP-Button, COMP-Badge, COMP-Rating, COMP-Stepper, COMP-TextField.
  - **Frame:** COMP-NavBar, COMP-Hero, COMP-SectionHeading, COMP-Scene, COMP-VesselArt.
  - **Discovery:** COMP-CruiseCard, COMP-ExperienceCard, COMP-ItineraryTimeline, COMP-Gallery.
  - **Booking:** COMP-CruiseSearch, COMP-CabinPicker, COMP-BookingSummary.
  - **Education:** COMP-VesselTypeCard, COMP-VesselCompare, COMP-PriceAnatomy, COMP-AmenityGrid.
- **Brand (18):** BRAND-004, 005, 006, 007, 011, 012, 013, 015, 016, 017, 018, 019, 020, 021, 022, 023, 024, 027
- **Engineering (2):** ENG-007 (gallery), ENG-009 (visual parity)
- **Accessibility (8):** A11Y-002, 003, 004, 005, 007, 008, 009, 010
- **Performance, languages, data (5):** PERF-005, I18N-007, I18N-008, I18N-010, DATA-010

## How each component is built

**Folder layout:**
```
src/components/ds/<Name>/
  <Name>.tsx          typed props (from index.d.ts, extended where decisions require)
  <Name>.module.css   ported from bundle.css, tokens only
  README.md           the design-system guideline, verbatim, plus "Changes in the build"
  <Name>.stories.ts   every state, rendered by the gallery and the tests
  <Name>.test.tsx     behaviour tests
```

**Rules for every component:**
- **Server vs client:** server components by default. Client islands only where interaction needs them: NavBar menu, Stepper, TextField, CruiseSearch, CabinPicker, BookingSummary, VesselCompare, PriceAnatomy, AmenityGrid filters, ItineraryTimeline, Gallery, Scene parallax, CruiseCard save/compare. Each island renders full HTML on the server first.
- **No invented data:** the bundle's illustrative defaults (cabins, routes, stops, price factors, vessel ranges, preview vessel names) move to `__samples__/`. Only the gallery uses them, and it shows a visible "Sample data" flag there.
- **Shared helpers:**
  - `formatMoney`, `formatDate`, `formatNights` (US$1,240 · 12 Feb 2027 · 4 nights in English, locale-aware in ES and JA), unit-tested.
  - `useReducedMotion`.
  - `useCountUp`, which jumps straight to the value under reduced motion.
  - `Media`, which uses `next/image` with explicit sizes when a photo exists and falls back to Scene otherwise.
  - `StateView`: loading, empty, error and permission-denied in the brand voice (DATA-010).

## Changes from the design system, already decided

All of these are logged in `DS-DIFFS.md`.

| Component | Change | Source |
|---|---|---|
| VesselArt, Scene, ExperienceCard | No felucca variant; ExperienceCard's default boat becomes none | ADR-008/015, BRAND-027 |
| CruiseCard | `price` optional, with a "Prices in preparation" state for information-only listings; shows "NN/100 · Nilecruz evaluation" when given; stars only from verified reviews; save/compare are callbacks (no fake persistence) | ADR-009, ADR-019, ADR-025 |
| CabinPicker | Prices optional: when hidden it shows cabin facts and "Sign in to see prices and dates"; decks are free text (Lower/Middle/Upper or vessel-specific) | ADR-025, guide |
| BookingSummary | Rebuilt around data: fare lines from props; gratuity as its own "paid on board at check-out" line, never in the total; no flights, fees or invented "free cancellation"; the policy note and the "Request to book" action come from the caller | ADR-007, 010, 011, 017 |
| CruiseSearch | Routes, sailing dates and the match count come from props (no fake count); the calendar takes real departure dates; children enter an age each, for the child-price rule | ADR-012/018 |
| PriceAnatomy, VesselCompare, VesselTypeCard | Data only through props; the gallery uses samples flagged "Sample data" | CLAUDE.md §6, Q25 |
| NavBar | Full port with the sliding brass underline. It replaces the Batch 1 shell header and keeps the Day/Night control, the no-JS phone menu and the phone language switch | ADR-037 |
| All | Global focus ring; no Japanese letter-spacing; JS motion (count-up, gallery tilt, parallax, autoplay, smooth scroll) stops under reduced motion | A11Y-003/004, I18N-008 |

## The gallery (ENG-007)

- **Routes:** `/dev/components/` (index) and `/dev/components/<name>/`. Each page shows every story, with a Day/Night switch and a reduced-motion switch.
- **Access:** available only when `ENABLE_DEV_ROUTES=true`. Never on in production; `noindex` and blocked in robots.
- **Out of budget:** the gallery is excluded from the JS budget as a dev-only route; this is logged.

## Tests I will add

- **Unit (Vitest):**
  - formatting;
  - count-up (including reduced motion);
  - PriceAnatomy totals and keys;
  - AmenityGrid filter counts;
  - Stepper limits;
  - CruiseSearch: only sailing dates can be picked;
  - BookingSummary: the gratuity never enters the total;
  - CabinPicker: hidden-price state.
- **Component tests** (Testing Library + jsdom): keyboard behaviour of the tabs (VesselCompare), radio groups (CabinPicker, PriceAnatomy chips, AmenityGrid filters), carousel (Gallery), timeline (ItineraryTimeline), popovers (CruiseSearch: Escape and outside click) and Stepper.
- **End-to-end (Playwright, on the gallery):**
  - axe on every component page in Day and Night, including text on photographs (A11Y-001/005);
  - a keyboard-only walkthrough;
  - reduced-motion emulation, asserting no running animations;
  - no-JS rendering of server components.
- **Visual parity (ENG-009):** Playwright opens each vendored `preview.html` and the matching gallery story with the same props, screenshots both in Day and Night at 1440 px, and diffs them. Over 1% of pixels different means the difference is fixed or logged with a reason.
- **Screenshots:** every gallery page at 375, 768 and 1440 px, Day and Night, in `docs/screenshots/batch-02/`.

## New dependencies

All development-only; nothing added to what visitors download.

| Package | Why |
|---|---|
| `@testing-library/react`, `@testing-library/user-event`, `jsdom` | Component and keyboard tests |
| `pixelmatch`, `pngjs` | Pixel comparison for the parity check |

No animation library: the design system's motion is CSS plus two small hooks.

## Order of work

Committed group by group, so progress is visible:
1. shared helpers and the gallery shell;
2. primitives;
3. frame (NavBar replaces the Batch 1 header);
4. discovery;
5. booking;
6. education;
7. parity, screenshots and records.

## Questions for Faris before I start

1. **Gallery on staging:** may I set `ENABLE_DEV_ROUTES=true` on the Railway staging service, so you can review the components at `…railway.app/dev/components/`? Staging is already hidden from search engines. Production never gets it.
2. **Child ages in search:** your rule needs each child's age. Shall I build CruiseSearch with an age field per child now? I recommend yes; otherwise it waits for Batch 4e and the component changes twice.
