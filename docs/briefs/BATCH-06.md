# Batch 6 brief: Education silos

**Status:** approved by Faris 20 Oct 2026 (ADR-096) · **Branch:** `batch-06-education` (from `main`) · **Size:** L (recommend two pull requests, question 7)

**Goal:** the pages that explain Nile cruises before anyone books: the home page, the Vessels silo (dahabiya, motor ship, paddle steamer, and how they compare), Prices Explained (why one "five-star" cruise costs ten times another, with a price calculator) and the Guide (routes, when to go, planning). Every page is linked into the silo exactly as the workbook says, and ends by sending readers to the matching cruises.

**Exit criterion (BATCH-PLAN):** Phase 1 rows are live, with link checks passing against the workbook.

## Requirement IDs in scope (36 + 1 deferred)

- **Pages (Phase 1 rows of the silo workbook):**
  - Home: PAGE-001 `/`
  - Guide: PAGE-002 `/nile-cruise-guide/`, 003 routes hub, 004 Luxor → Aswan, 005 Aswan → Luxor, 007 Esna → Aswan, 010 when to go, 016 planning hub, 017 how many nights, 018 cruise or land tour, 019 tipping
  - Vessels: PAGE-026 `/vessels/`, 027 dahabiya, 030 a day on a dahabiya, 032 motor cruise ships, 033 a day on a cruise ship, 036 paddle steamers, 041 compare hub, 042 dahabiya or cruise ship
  - Prices: PAGE-049 `/nile-cruise-prices/`, 050 star ratings explained, 051 what's included, 057 budget or luxury, 059 price calculator
  - **Deferred:** PAGE-039 `/vessels/felucca/` (felucca removed from the site, ADR-008)
- **Linking engine:** SEO-008 (breadcrumb + one link up in the intro), 009 (hubs link every child by its keyword), 010 ("Keep reading": two or three siblings), 011 (bridges only where the workbook lists them, checked in CI), 012 (every informational page ends with a filtered CruiseCard row), 014 (keyword anchors, never "click here")
- **Content rules:** SEO-023 (route guides carry no price grid; listings carry no long itinerary text), 024 (a vessel-type hub shows at most three cruise cards), 028 (home emits Organization and WebSite with SearchAction), 029 (primary keywords validated before copy is written)
- **Honest data:** DATA-008 (PriceAnatomy from maintained data with an honest footnote), DATA-009 (VesselCompare and VesselTypeCard from maintained data)

## What I will build

**Content in Sanity** (ARCHITECTURE: editorial content lives in Sanity, commercial data in Supabase):
- One `article` document per page, holding the H1, intro, body sections, FAQs and meta. The page templates render them by slug, so editors change words without a release. FAQs feed FAQPage schema.
- `vessel-type-profile` documents (sail, motor, steam) feed VesselTypeCard and VesselCompare. `price-factor-set` documents feed PriceAnatomy and the calculator. Wherever a figure isn't real yet, the "sample data" flag shows on the page (DATA-008, 009).
- Pages are static and refresh when Sanity content is published (a signed webhook from Sanity to the existing refresh route) or when the catalogue changes.

**Templates** (one per row type in the workbook): homepage, pillar, hub, route guide, guide article, vessel-type hub, comparison, explainer, tool. Each one has:
- the H1 from its silo row, breadcrumbs, the intro with one link up (SEO-008);
- the components listed for its row (Hero, VesselTypeCard, VesselCompare, PriceAnatomy, ItineraryTimeline, AmenityGrid, Gallery, CruiseCard);
- its structured data: Article, FAQPage and BreadcrumbList; CollectionPage and ItemList on hubs; WebApplication on the calculator; Organization and WebSite with SearchAction on home.

**The linking engine** (SEO-008–014):
- A script reads the silo workbook and writes a committed link map: each page's parent, pillar, children, siblings and bridge links, with each target's primary keyword as its anchor.
- Templates draw every link from the map: hub card grids, "Keep reading", bridges, and the closing CruiseCard row filtered to the matching listing (for example the dahabiya hub → `/cruises/dahabiyas/`).
- **A CI check** compares the rendered links with the workbook: no missing children or extra bridges, keyword anchors, and links only to pages that exist (ADR-093). The vessel page's links to its type hub (SEO-013) switch on here.

**Home** (PAGE-001): Hero with CruiseSearch; the three vessel types; VesselCompare; PriceAnatomy; a few live cruises from the marketplace; an itinerary taster; the gallery.

**The price calculator** (PAGE-059): PriceAnatomy as a full-page tool. Visitors choose vessel type, route, nights, season and cabin, and see how the factors build the price, as a range. It shows maintained factors, never a bookable quote, and links to `/cruises/` for real prices.

**Copy** (question 1): I draft every page from the workbook (H1, primary keyword, intent) and facts we hold: our evaluation method, the catalogue, the ADRs (gratuities, check-in to check-out, cancellation bands) and the brand book's voice. Drafts go into Sanity marked "Draft for review". No invented statistics: any figure without a source is left out or flagged.

## Tests I will add

- **Unit:** the link map built from the workbook (children, siblings, bridges, anchors); the anchor rules; the "at most three cards" and "no price grid on route guides" rules; the JSON-LD builders per template.
- **Link check (CI):** every rendered Phase 1 page matches its workbook row (H1, parent, children, siblings, bridges, closing listing link, keyword anchors), and no link points to a missing page.
- **End-to-end:** each template renders from Sanity content (a test dataset); breadcrumbs; FAQ schema; the calculator's range changes with the inputs; the closing cruise row shows real cards; "Sample data" flags appear where figures are samples. Axe in Day and Night; Lighthouse on home, a pillar and the calculator; screenshots.

## Questions for Faris

1. **Who writes the copy?** Recommended: I draft every Phase 1 page in your brand voice from the workbook and our facts, marked "Draft for review" in Sanity, and your team edits and publishes. Or will your team (or a writer) supply the copy, with me building templates and loading it?
2. **Keyword check (SEO-029).** The workbook names a primary keyword for each row. Recommended: treat those as approved for now, and validate them in a keyword tool (Ahrefs or Semrush, connected here) before launch. Or should validation come first?
3. **Price figures** (PriceAnatomy, the calculator, "US$800 or US$8,000"). Recommended: build them from real rates in the catalogue as operators join, flagged "Sample data" until there are enough. Or will you supply typical price ranges per vessel type and season to use now?
4. **Photography.** The vessel-type pages and home want real photographs (BRAND-013). Recommended: illustrated scenes (already built) until you supply photos, never stock images of other ships. Do you have photos we can use?
5. **Egyptologists and trust links:** the Guide mentions guided visits. Should pages link to "Our Egyptologists" once that page exists (Batch 7)? Recommended: yes, through the linking engine as soon as it's built.
6. **The felucca** stays out (ADR-008): `/vessels/felucca/` isn't built, and the workbook's links to it are dropped. Agreed?
7. **Two pull requests.** Recommended: **6-1** for the Sanity templates, linking engine and CI link check, home and the Vessels silo; **6-2** for Prices Explained (with the calculator) and the Guide.
