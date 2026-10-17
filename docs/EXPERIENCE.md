# Signature interactions (EXP-*)

**Batch 0 proposal, ranked by impact.**
- **Impact** means how much an item teaches or moves a booking decision, weighed against its cost.
- **Choosing:** pick the items you want and I'll schedule them in Batch 9. Unchosen items become `Deferred` with your OK.
- **Motion:** every item uses the brand motion language: `--ease-river` at 160/320/640 ms, fills from the left, redrawn underlines, rising copy, bobbing boats, billowing sails, steam puffs, count-ups.
- **Fallbacks:** every item works without JavaScript and under `prefers-reduced-motion`.

| Rank | ID | Interaction | Teaches / decides | Cost |
|---|---|---|---|---|
| 1 | EXP-001 | Live price build-up from every price | Why this price | Low |
| 2 | EXP-002 | Vessel cutaway, deck by deck | Who shares what | Medium |
| 3 | EXP-004 | Compare tray | Side-by-side decision | Low |
| 4 | EXP-005 | Mooring explainer | Rafted vs private | Low |
| 5 | EXP-006 | Season and deadline calendar | When to go, when to pay | Low |
| 6 | EXP-003 | Scroll-driven voyage Luxor → Aswan | What each day looks like | Medium |
| 7 | EXP-009 | Evaluation radar unfolding | What the score means | Low |
| 8 | EXP-007 | View Transitions card → vessel | Continuity, orientation | Low |
| 9 | EXP-008 | Theme follows Egypt time | Atmosphere (weak teaching) | Low |
| 10 | EXP-010 | Ambient river sound | Atmosphere only | Medium |

My recommendation: build 1–7 and skip 9 and 10. EXP-008 and EXP-010 mostly decorate, which CLAUDE.md §7 discourages.

---

### EXP-001 Live price build-up, linked from every price
- **Teaches:** what a specific price is made of. It answers "why US$X?" in place.
- **Pages:** every price on CruiseCard, CabinPicker, BookingSummary and listings; the full version on `/nile-cruise-prices/` and `/nile-cruise-prices/price-calculator/`.
- **Trigger:** clicking or tapping a price (it is a `<button>` showing the price), or pressing Enter.
- **States:**
  - closed;
  - open: a popover on desktop or a bottom sheet on mobile showing a PriceAnatomy-style stacked bar for *this* rate (who shares, cabin size, guiding, dining, mooring, logistics, with what is included and excluded) and a count-up total;
  - loading;
  - "build-up not available for this vessel yet", which shows the generic explainer link.
- **Reduced motion:** no count-up or bar growth; final values shown at once.
- **No JS:** the price is a link to `/nile-cruise-prices/?vessel=…` with the same breakdown rendered on the server.
- **Performance:** a shared island of about 6 KB gzipped, data fetched on open (no layout shift; the popover is anchored).
- **Test:**
  - e2e opens it from a card, checks the segment labels sum to the shown total, and runs axe on the dialog;
  - a unit test covers the breakdown maths.
- **Depends on:** Q25 (factor data).

### EXP-002 Vessel cutaway: who shares what, deck by deck
- **Teaches:** how many guests share the sun deck, the pool and the dining room, and where your cabin sits. This is the honest size signal the brand asks for.
- **Pages:** the vessel page (signed-in deck selector, DASH-CUS-016); vessel-type hubs (generic version); `/vessels/motor-cruise-ships/deck-plans-explained/`.
- **Trigger:** choosing a deck tab or cabin type, or arrow keys.
- **States:**
  - each deck highlighted, with cabin types listed and guest counts for shared spaces;
  - "no structured cabin types yet" (DASH-BND-002).
- **Schematic only:** it is always labelled schematic, and never shows numbered cabins (DASH-BND-003).
- **Reduced motion:** decks swap without sliding.
- **No JS:** a static list of decks with cabin types and shared spaces.
- **Performance:** SVG built from VesselArt shapes, about 8 KB.
- **Test:**
  - e2e with keyboard only;
  - a check that deck and cabin counts match the database seed;
  - axe.

### EXP-003 Scroll-driven voyage Luxor → Aswan
- **Teaches:** the rhythm of a cruise: which temple on which day, sailing versus moored time, where the Esna lock sits.
- **Pages:** the route guides (`/nile-cruise-guide/routes/*`) and the vessel page itinerary.
- **Trigger:** scroll. The boat advances along the ItineraryTimeline river as each day's section enters the viewport. Play and stop buttons remain.
- **States:** one per day, with the current stop highlighted.
- **Reduced motion:** the boat jumps between stops with no tween; there is no scroll-scrubbing.
- **No JS:** the timeline renders as an ordered list of days.
- **Performance:** CSS `animation-timeline: view()` where supported, falling back to IntersectionObserver; no Motion dependency unless needed. INP is unaffected.
- **Test:** e2e scrolls and checks the active day; the reduced-motion snapshot; CLS = 0 in Lighthouse.

### EXP-004 Compare tray
- **Teaches:** it lets you weigh 2–3 cruises on guests, crew ratio, mooring, cabin size and price per night.
- **Pages:** all listings and vessel pages; opens `/cruises/compare/`.
- **Trigger:** the CruiseCard "Compare" checkbox. A tray slides up from the bottom with mini cards (maximum three).
- **States:**
  - empty (hidden);
  - 1 item: "add one more";
  - 2–3 items: "Compare";
  - full: the fourth checkbox is disabled with an explanation.
- **Persistence:** `localStorage`, plus the URL parameters on the compare page.
- **Reduced motion:** the tray appears without sliding.
- **No JS:** the checkbox is a link that adds the vessel to `/cruises/compare/?v=…`.
- **Performance:** about 3 KB.
- **Test:** e2e add/remove/limit, keyboard, and that the compare page has a canonical tag and noindex for its parameterised states.

### EXP-005 Mooring explainer: rafted six abreast versus a private riverbank
- **Teaches:** the one fact most travellers miss (BRAND-BOOK: "what 'rafted six abreast' means").
- **Pages:** `/vessels/mooring-explained/`, PriceAnatomy's mooring row, vessel pages (with that vessel's mooring practice).
- **Trigger:** a two-state toggle, or arrow keys.
- **States:**
  - rafted: a Scene with six hulls and your balcony facing a neighbour's;
  - private bank: palms and water.
- **Reduced motion:** a crossfade at 1 ms (an instant swap).
- **No JS:** both states shown as two figures.
- **Performance:** inline SVG from Scene/VesselArt, about 4 KB.
- **Test:** visual snapshot for both states, contrast and axe.

### EXP-006 Season and deadline calendar
- **Teaches:** the price seasons and the **payment deadline you'll face**, from the real rules (3/7/14 days, premium periods).
- **Pages:** `/nile-cruise-guide/when-to-go/`, `/nile-cruise-prices/seasonal-pricing/`, the vessel page date picker.
- **Trigger:** hovering or focusing a month or date.
- **States:** high/shoulder/summer shading; the premium periods from the database; the tooltip "Book on 1 Mar for 25 Mar → pay in full by 4 Mar".
- **Reduced motion:** no fades.
- **No JS:** a static table of seasons and deadlines.
- **Performance:** about 3 KB; the rules are shared with the server so the dates are identical.
- **Test:** unit tests on the deadline function (shared with 4f); e2e tooltip text for fixed dates.

### EXP-007 View Transitions from a card into the vessel page
- **Teaches:** orientation. The card's image and name become the hero, so the user keeps their place.
- **Pages:** listings → vessel page.
- **Trigger:** navigation.
- **States:** the transition runs only where the browser supports it; otherwise it is a normal navigation.
- **Reduced motion:** disabled.
- **No JS:** a normal link.
- **Performance:** about 0 KB using the native API; check that it doesn't delay LCP.
- **Test:** e2e navigation still works with the feature disabled; Lighthouse LCP unchanged.

### EXP-008 Day/Night theme following the time in Egypt
- **Teaches:** little: it sets a mood ("it's dusk on the river now").
- **Behaviour:** a first visit with no saved choice uses Night between Cairo sunset and sunrise; the user's choice always wins.
- **Risk:** surprising theme changes, and a flash of the wrong theme unless it is resolved on the server from Cairo time.
- **Fallbacks:** the default Day theme.
- **Cost:** about 1 KB.
- **Test:** server-rendered theme for fixed clock times.
- **Recommendation:** optional.

### EXP-009 Evaluation radar that unfolds per dimension
- **Teaches:** what an 86/100 is made of across the seven dimensions, and what each criterion measures.
- **Pages:** the vessel page and `/how-we-choose-vessels/`.
- **Trigger:** entering the viewport, or focusing a dimension.
- **States:** published score; "not yet evaluated".
- **Reduced motion:** static.
- **No JS:** a table of dimensions and weights.
- **Cost:** about 4 KB SVG.
- **Test:** values match the database; axe.

### EXP-010 Ambient river sound (off by default)
- **Teaches:** nothing factual.
- **Behaviour:** a muted toggle in the hero plays a 30 s loop.
- **Costs and risks:** a 200–400 KB audio file loaded on demand; autoplay rules; accessibility (WCAG 1.4.2 is met because it is off by default).
- **Recommendation:** skip.
