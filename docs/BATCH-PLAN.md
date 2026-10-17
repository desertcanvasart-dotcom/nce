# Batch plan

**Batch 0 proposal · 17 Oct 2026.** Batches run strictly one at a time. Each starts with a brief and ends with the Definition of Done (CLAUDE.md §5) and Faris's go-ahead.

**Changes from the KICKOFF shape, and why:**
- **Dashboards (4a–4h) come before the public marketplace.**
  - The public site reads the vessels, cabins, schedules and rates that the dashboards create. Building listings first would mean seeding fake commerce data twice.
  - If Q1 delivers the newer code, 4b–4f shrink to "port, re-skin, fill gaps".
- **Batch 3 is smaller than suggested.**
  - It lays down the shared foundation: identity, organisations, vessels, audit, i18n tables, seeding and the RLS test harness.
  - Each dashboard batch adds its own tables with its own RLS tests. This keeps every batch end to end ("data, permissions, screens, tests"), as KICKOFF asks.
- **The enquiry and booking engine moves into 4e/4f**, because offers, reservations, deadlines and payments are dashboard features in the guide.
  - Batch 8 keeps the public conversion layer: the account gate, request-to-book from the vessel page, `/plan-my-cruise/`, emails, rate limiting and the MCP layer.
- **Two post-launch batches** take the silo's Phase 2 (12) and Phase 3 (13) pages, matching its launch order.
  - Batches 5–7 build every page *template*, plus the Phase 1 rows.
  - 12 and 13 are therefore mostly content, linking and translation.

| # | Batch | Goal | Depends on | Exit criteria (plus the DoD) | Size |
|---|---|---|---|---|---|
| 0 | Discovery & architecture | These documents | — | Faris approves docs; Q1–Q5 answered | S |
| 1 | Foundation | `nce` Next.js repo, pnpm, CI (typecheck/lint/format/unit/e2e/axe/size/Lighthouse), Vercel + Supabase envs, token pipeline, fonts, next-intl locale routing, app shell (nav, footer, theme, language switch, skip link), 404/500, robots, metadata/canonical helpers, screenshot script, copy lint, Sentry | 0 | Empty shell deployed to preview in EN/ES/JA, both themes, all gates green | M |
| 2 | Design-system port | All 22 components as typed modules, `/dev/components` gallery, parity suite, reduced-motion fixes, a11y patterns, data-view state patterns | 1 | 22 components at parity (or logged differences) in Day/Night, keyboard and axe clean | L |
| 3 | Data foundation | Supabase project, migrations-as-code, users/profiles/organisations/memberships, vessels + i18n + media, audit log, reserved slugs, RLS test harness, seed fixtures (flagged sample), migration dry-run (Q1/Q26), Sanity project + base schemas | 1 | Every table has RLS with tests; seed builds every role; migration report signed off | M |
| 4a | Accounts & roles | Sign-up/in/out, sessions, role-aware dashboard shell, account security, server-side authorisation helpers, Cairo time display | 3 | Each role lands in its own workspace; cross-role access attempts fail in tests | M |
| 4b | Admin catalogue & quality | Overview queues, activity history, vessel directory/editor, readiness checks, CSV import, evaluations (7×criteria → /100), safety, external ratings, submission workflow, operator applications | 4a | Admin can take a CSV to a published, evaluated vessel; operator can submit and resubmit | L |
| 4c | Operator product & inventory | Cabin types/decks/amenities, routes/schedules/departures, rates and plans, shared inventory and freshness, promotions/upgrades, manual/feed/API connections and health | 4b | Operator builds a bookable sailing by hand, feed and API; promotion rules are unit-tested | L |
| 4d | Tours & sightseeing | Tours, suppliers, sessions (shared/private, per guest/group), programs, information-only tours | 4c | Admin publishes a tour with sessions and a program linked to a schedule | M |
| 4e | Requests, offers & bookings | Request journey, personal offers with versions/deck, acceptance re-check, reservations, bookable gate, admin supervision and search | 4c | Customer request → two offers → accept → reservation, with no oversell under concurrency (DB test) | L |
| 4f | Payments, deadlines, cancellation, commission | Deadline engine and premium calendar, payment requests/reports/verification/receipts, balances, cancellation bands and calculation, refunds, commission ledger, separate tour orders | 4e, 4d | Deadline and cancellation maths fully unit-tested; finance flows end to end | L |
| 4g | My journey | Customer overview, actions due, tours section, past trips | 4f | Customer sees exactly their own state for every seeded scenario | S |
| 4h | Travel partners | Partner approval/pause, trade and company rates, company requests/reservations, passengers/client refs, agency sell total, client record, team roles | 4f | Partner team of three roles completes a client booking | M |
| 5 | Marketplace | `/cruises/` hub, Phase 1 facets, vessel page template (itinerary, cabins, deck selector, evaluations, ratings), CruiseSearch wired, info-only state, caching | 4c–4f | Phase 1 Cruises rows meet SEO DoD; listing → vessel → sign-in → reserve works | L |
| 6 | Education silos | Home, Vessels, Prices Explained (PriceAnatomy/VesselCompare on maintained data), Guide: Phase 1 rows and all templates, linking engine (up/down/across/bridges/money row) | 5, 3 (Sanity) | Phase 1 rows live with link checks passing against the workbook | L |
| 7 | Destinations, Tours & Extras, Trust | Phase 1 destination hubs, tour pages, about/how-we-choose/contact | 6, 4d | Phase 1 rows live; tour slugs reconciled | M |
| 8 | Conversion layer | Account gate for exact rates, request-to-book from vessel page, `/plan-my-cruise/`, transactional email, rate limiting, read-only MCP | 5–7 | Anonymous visitor → plan → account → request → offer email | M |
| 9 | Signature interactions | Approved `EXP-*` items | 5–8 | Each meets its spec, budget and fallbacks | M |
| 10 | SEO & languages | ES/JA translated routing and content plumbing, hreflang, sitemaps, schema validation, crawl checks, redirects from live site | 5–8 | Crawl: no orphans, depth ≤3, valid schema; redirects tested | M |
| 11 | Hardening & launch | Accessibility, performance and security audits, backups rehearsal, content check vs CONTENT-NEEDED, launch checklist | 1–10 | All launch rows Verified; Faris signs off | M |
| 12 | Phase 2 pages (post-launch) | 46 Phase 2 silo rows (47 less the deferred felucca tour) + compare tool + reviews page | 11 | Rows Verified | L |
| 13 | Phase 3 pages (post-launch) | 11 Phase 3 silo rows (13 less 2 deferred felucca pages) | 12 | Rows Verified | M |

## Coverage proof

Generated by `scripts/ledger.py` from the same table that writes `REQUIREMENTS.md`. The script asserts three things:
- every ID is unique;
- every ID has exactly one batch code;
- every batch code is one of the 21 above.

Deferred rows keep their batch but are not built (CLAUDE.md §3: nothing is removed).

The sum of the batch counts equals the ledger total. `PROPOSED-*` rows are excluded until approved.

| Batch | IDs | of which Deferred |
|---|---:|---:|
| 0 | 2 | 0 |
| 1 | 45 | 0 |
| 2 | 55 | 0 |
| 3 | 15 | 0 |
| 4a | 10 | 0 |
| 4b | 45 | 0 |
| 4c | 42 | 0 |
| 4d | 15 | 0 |
| 4e | 26 | 0 |
| 4f | 35 | 0 |
| 4g | 5 | 0 |
| 4h | 17 | 0 |
| 5 | 28 | 0 |
| 6 | 37 | 1 |
| 7 | 16 | 0 |
| 8 | 11 | 0 |
| 9 | 11 | 0 |
| 10 | 13 | 0 |
| 11 | 7 | 0 |
| 12 | 49 | 1 |
| 13 | 13 | 2 |
| **Sum** | **497** | **4** |
| **Ledger total** | **497** | |
| **Distinct IDs** | **497** | |

| Batch | Breakdown |
|---|---|
| 0 | DATA 1, ENG 1 |
| 1 | A11Y 2, BRAND 3, ENG 14, I18N 3, PERF 4, SEC 2, SEO 5, TOK 12 |
| 2 | A11Y 8, BRAND 18, COMP 22, DATA 1, ENG 2, I18N 3, PERF 1 |
| 3 | BRAND 3, DATA 6, I18N 1, SEC 4, SEO 1 |
| 4a | DASH-CUS 1, DASH-ROLE 6, DATA 1, SEC 2 |
| 4b | DASH-ADM 40, DASH-BND 2, DASH-OPR 2, DATA 1 |
| 4c | DASH-ADM 25, DASH-OPR 12, DATA 2, SEC 3 |
| 4d | DASH-ADM 15 |
| 4e | DASH-ADM 8, DASH-BND 1, DASH-CUS 6, DASH-OPR 10, DATA 1 |
| 4f | DASH-ADM 14, DASH-BND 1, DASH-CUS 3, DASH-OPR 3, DASH-PAY 14 |
| 4g | DASH-CUS 5 |
| 4h | DASH-ADM 4, DASH-B2B 13 |
| 5 | BRAND 3, DASH-BND 2, DASH-CUS 2, DASH-PUB 6, DATA 3, PAGE 7, PERF 1, SEO 4 |
| 6 | DATA 2, PAGE 25, SEO 10 |
| 7 | DASH-ADM 1, DASH-PUB 1, PAGE 13, SEO 1 |
| 8 | DASH-BND 1, DASH-PUB 5, DATA 3, PAGE 1, SEC 1 |
| 9 | EXP 10, PERF 1 |
| 10 | DASH-BND 1, I18N 5, SEO 7 |
| 11 | A11Y 1, BRAND 1, ENG 1, PERF 3, SEC 1 |
| 12 | PAGE 47, SEO 2 |
| 13 | PAGE 13 |

Batch 0 owns two ongoing rows: ENG-013 (records kept current) and DATA-007 (no invented facts, CONTENT-NEEDED.md). Both were established in this batch.

## Requirement IDs per batch

The full list of IDs for each batch is the "Batch" column of `REQUIREMENTS.md`. To list one batch, filter that column, for example: `grep '| 4c |' docs/REQUIREMENTS.md`.
