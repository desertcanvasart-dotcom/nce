# Architecture

**Batch 0 proposal · 17 Oct 2026 · awaiting Faris's approval.** Nothing here is built yet.

## 1. Repository and existing code

Faris (17 Oct): *"I don't mind using either of the two dashboards on GitHub, if the work is fine and we can adapt it."* So I assessed both as a possible base, not just as reference. All work was read-only: no install, build or run.

### 1.1 What exists

| | `nilecrz` (GitHub) | `nile-cruise-marketplace` | Live nilecruz.com |
|---|---|---|---|
| Last push | 6 Sep 2026 (4 commits) | 9 Oct 2026 (69 commits) | Running today |
| Framework | **vinext 1.0 beta** (Vite re-implementation of the Next App Router), React 19, RSC | **Next.js 16.3** App Router, React 19 | vinext, on Railway |
| Hosting | Cloudflare Workers via OpenAI Sites | Vercel (crons in `vercel.json`) | Railway |
| Data | Supabase. Raw `fetch` to PostgREST. **Every write goes through SECURITY DEFINER RPCs.** RLS on all 18 tables. | Supabase (`@supabase/ssr`), server actions, RLS on all tables. Write-guard triggers were added late (migration 0012). | — |
| Roles | traveler / operator / admin | traveler / operator (+ staff: manager, reservations, viewer) / admin | — |
| Matches the dashboard guide | **Closely.** Same tab names ("My journey", "Deposits & commission", "Catalogue & evaluations"), criteria scored 0–5, deposit verification, refunds, commission ledger, manual/feed/API inventory with SSRF/XXE guards, signed idempotent API, key rotation | Partly. Approval queue, cabins with deck, revisions, tours (simple), Stripe full payment, CSV export, audit log, FX | Its routes (`/tours`, `/match`, `/partners`, `/mcp`) suggest it is **newer than both repos** |
| Missing vs guide | Rate plans, schedules, cabin types/decks, tours, promotions, B2B, premium calendar, cancellation bands, submission states, MCP, ES/JA | Rate plans, promotions, B2B, personal offers, deadlines, cancellation bands, safety observations, sessions/programs, My journey, MCP, real i18n | Unknown: code not in GitHub |
| Tests | `node:test` domain tests + SQL RLS/booking tests | **None** | — |
| Design | Generic shadcn (Geist, teal) | Own "Flood Almanac" style (Inter, Zilla Slab) | — |
| Size | ~4.5k lines + generated edge bundle | ~1.2 MB TypeScript | — |

Neither repo uses the nilecrz design system. The **public site has to be built new in either case**: no silo URL exists in either repo.

### 1.2 Assessment

- **`nilecrz` is the better dashboard foundation.**
  - Its data rules are written where they can't be bypassed: database functions that check the role and lock inventory atomically.
  - It has tests for exactly the things that cost money: commission, refunds, capacity, and isolation between accounts.
  - The guide describes its evolution.
  - Its weakness is the platform. vinext is a **beta** re-implementation of Next.js tied to OpenAI Sites and Cloudflare. That is a real risk for a production marketplace: framework bugs, ecosystem gaps (next-intl, `next/image`, Playwright recipes), and one maintainer.
- **`nile-cruise-marketplace` has more screens but a weaker core.**
  - It has no tests.
  - Its RLS was found to let users write commission and verification columns until a late fix. Migrations are pasted into the SQL editor by hand, so the live database may differ from the files.
  - Stripe full payment contradicts the guide.
  - Pieces worth reusing:
    - `org_staff` team model;
    - `vessel_cabins` with deck;
    - the revision workflow;
    - operator onboarding with document verification;
    - the 609-vessel directory (as private drafts only, Q26);
    - the admin search and CSV export.

### 1.3 Decision (ADR-023, Faris 17 Oct 2026)

Faris confirmed that the two GitHub repos are all the code there is, and that I decide what to keep. **We build in the empty `nce` repository on Next.js 16 and port, piece by piece, what passes review.**

| Keep from `nilecrz` | Keep from `nile-cruise-marketplace` | Leave behind |
|---|---|---|
| Schema design with RLS on every table and SECURITY DEFINER RPCs for every write | Stripe Checkout + webhook (`src/lib/stripe.ts`, `api/stripe/webhook`), reworked for deadlines and admin-approved refunds | Both UIs, all styles ("Flood Almanac", generic shadcn) |
| Evaluation method `lib/methodology.ts` (7 × 4 criteria, 0–5, weights) | Organisation staff and invites (`org_staff`, `operator_invites`) | vinext, OpenAI Sites, Cloudflare Workers config |
| `accept_bid`, `reserve_departure`, deposit/refund/commission RPCs (atomic re-checks) | `vessel_cabins` with deck; `vessel_revisions` workflow | Hand-rolled PostgREST `fetch` client |
| Integrations: feed pull with SSRF/XXE guards, JSON/XML parity, signed idempotent API, hashed key rotation, signed webhooks | Operator onboarding documents/verification | Early RLS that let users write commission/verification columns (pre-0012) |
| `node:test` domain tests and SQL RLS/booking tests (moved to Vitest + pgTAP) | Admin search, CSV export, audit log, notification preferences | Full refund on every cancellation; anonymous requests |
| Account email templates | Resend wiring; 609-vessel directory (private drafts, ADR-013) | Seeded scores and prices as public facts |

Each piece is re-read, typed, tested and logged in the batch that ports it. Nothing is copied wholesale.

**Migration risk:**
- *Low* for the database: plain Postgres, re-expressed as new migrations.
- *Low* for logic: small, tested functions.
- *None* for UI: it is rebuilt with the design system anyway.

**Still unknown:** whether the live nilecruz.com database holds real customers, bookings or money records (Q52). If it does, Batch 3 adds a dry-run migration with a count report (DATA-014).

The Batch 0 docs are committed locally on branch `batch-00-discovery`. **Nothing is pushed to `nce` until you approve.**

## 2. Stack

| Concern | Choice | Why / change from CLAUDE.md §6 default |
|---|---|---|
| Framework | **Next.js 16 App Router + TypeScript strict** | Default confirmed. Real Next over vinext beta (§1.2). |
| Database, auth, storage | **Supabase** (Postgres 15+, Auth, Storage, RLS, pg_cron) | Default confirmed; both repos already use it. |
| Data access | **Server actions + route handlers, zod-validated, calling Postgres RPCs for every state change** | Drops tRPC. Server actions are typed end to end already. RPCs keep the money and inventory rules in the database, where `nilecrz` proved them with SQL tests. |
| Editorial CMS | **Sanity** for guide articles, explainers, destinations, site guides, trust pages, Egyptologists, FAQs and PriceAnatomy/VesselCompare editorial data, with document-level i18n for EN/ES/JA | Default confirmed. The dashboards don't cover editorial content, and Sanity's Studio fits translation workflow. Commercial data (vessels, cabins, rates, tours, bookings) stays in Supabase. |
| i18n | **next-intl** (UI strings, locale routing, translated pathnames) | Default. |
| Styling | **Generated CSS custom properties + CSS Modules**; **no Tailwind** | The design system is plain CSS with token variables. Porting `bundle.css` into per-component CSS Modules keeps parity and is the lowest-risk route. Tailwind adds a second vocabulary. |
| Motion | **CSS first**; **Motion** only for View Transitions fallbacks and the scroll-driven voyage (EXP) | Default. Most signature moves are already CSS. |
| Email | **Resend** + React Email templates | Already used in one repo (Q27). |
| Payments | **Stripe**, one Nilecruz account as merchant of record (no Connect); Checkout or Payment Element, webhooks, refunds; test mode outside production | ADR-020, ADR-026. Card data stays with Stripe (PCI SAQ-A). Operator payouts are recorded, not automated. |
| Tests | **Vitest** (unit), **pgTAP/SQL tests** (RLS and RPCs), **Playwright** + **@axe-core/playwright** (e2e, accessibility, screenshots) | Default, plus database tests. |
| Quality | ESLint (with `jsx-a11y`, no-hardcoded-token rule) + Prettier + `tsc --noEmit`; Lighthouse CI; size-limit | Default. |
| Package manager | **pnpm** | Default. |
| Hosting | **Vercel** (app), **Supabase Cloud** (data, one project per environment), **Sanity** (content) | Q28. |
| Monitoring | **Sentry** (errors, releases), Vercel Analytics/Speed Insights (consent-gated, PROPOSED-014) | New. |

**New dependencies, each to be justified again in its batch brief:**
- `@supabase/ssr`, `@supabase/supabase-js`: data.
- `next-intl`: i18n.
- `zod`: validation.
- `next-sanity` + `@portabletext/react`: content.
- `resend` + `@react-email/components`: email.
- `fast-xml-parser`: XML feeds, already in both repos.
- `motion`: two EXP items only.
- `@sentry/nextjs`: errors.
- Dev only: `vitest`, `@playwright/test`, `@axe-core/playwright`, `@lhci/cli`, `size-limit`.

## 3. Data model

Mermaid ERD of the proposed schema in Supabase. Translatable text is stored in `*_i18n` tables keyed by `(id, locale)`. Money is always `amount_minor bigint` + `currency char(3)`. Every timestamp is `timestamptz` in UTC.

```mermaid
erDiagram
  ORGANISATION ||--o{ MEMBERSHIP : has
  USER_PROFILE ||--o{ MEMBERSHIP : holds
  ORGANISATION {
    uuid id PK
    text kind "operator | partner | nilecruz"
    text status "applied | approved | paused | rejected"
    text legal_name
    jsonb registration
    numeric commission_rate
  }
  MEMBERSHIP { uuid org_id FK
    uuid user_id FK
    text team_role "owner | reservations | finance | viewer" }
  USER_PROFILE { uuid id PK
    text platform_role "customer | admin"
    text admin_role "super | catalogue | finance | content"
    text locale }

  VESSEL_TYPE ||--o{ VESSEL : classifies
  ORGANISATION ||--o{ VESSEL : operates
  VESSEL {
    uuid id PK
    text slug UK
    text source_ref UK
    text category "star band"
    text visibility "private | showcase | published"
    bool bookable "derived"
    int cabin_count
    bigint gratuity_usd_pp_night_cents "≥ 500, paid on board, ADR-017"
    bool sample_data
  }
  VESSEL ||--o{ VESSEL_I18N : translates
  VESSEL ||--o{ SUBMISSION : reviewed_by
  SUBMISSION ||--o{ SUBMISSION_EVENT : history
  SUBMISSION { text state "draft | submitted | changes_requested | approved | rejected"
    jsonb snapshot }
  VESSEL ||--o{ EVALUATION : scored_by
  EVALUATION ||--o{ EVALUATION_SCORE : criteria
  EVALUATION { date assessed_on
    text evaluator
    text verdict
    numeric total_100
    bool published }
  VESSEL ||--o{ SAFETY_OBSERVATION : internal
  VESSEL ||--o{ EXTERNAL_RATING : separate
  VESSEL ||--o{ DECK : has
  DECK ||--o{ CABIN_TYPE : located_on
  CABIN_TYPE { text name
    int size_m2
    text bed
    int max_occupancy "1-3, ADR-018"
    text view
    bool balcony
    int physical_count
    bool active }
  VESSEL ||--o{ VESSEL_AMENITY : offers
  AMENITY ||--o{ VESSEL_AMENITY : is
  VESSEL_AMENITY { text status "included | request | none"
    text note }
  CABIN_TYPE ||--o{ CABIN_AMENITY : offers

  ROUTE ||--o{ SCHEDULE : follows
  VESSEL ||--o{ SCHEDULE : sails
  ROUTE ||--o{ ROUTE_STOP : stops_at
  DESTINATION ||--o{ ROUTE_STOP : is
  SCHEDULE { int nights
    int[] weekdays
    daterange operating
    text direction }
  SCHEDULE ||--o{ DEPARTURE : generates
  DEPARTURE ||--o{ INVENTORY : holds
  CABIN_TYPE ||--o{ INVENTORY : of
  INVENTORY { int available
    int held
    timestamptz confirmed_at
    text source "manual | feed | api" }
  INVENTORY ||--o{ RATE : priced_by
  RATE_PLAN ||--o{ RATE : under
  RATE_PLAN { text market "international | egyptian | resident | trade"
    uuid restricted_org_id }
  RATE { int occupancy
    bigint amount_minor
    char currency }
  PROMOTION ||--o{ PROMOTION_RATE : applies_to
  RATE ||--o{ PROMOTION_RATE : targets
  PROMOTION { text kind "percent | fixed | extra | upgrade"
    daterange booking_window
    daterange departure_window
    bool paused }
  VESSEL ||--o{ CANCELLATION_POLICY : uses
  CANCELLATION_POLICY ||--o{ CANCELLATION_BAND : bands
  CHILD_POLICY { uuid operator_id "null = platform default"
    jsonb bands "0-2.99 free, 3-5.99 25%, 6-11.99 50%"
    timestamptz effective_from }
  ORGANISATION ||--o| CHILD_POLICY : override
  PREMIUM_PERIOD { daterange period
    text label }

  SUPPLIER ||--o{ TOUR : supplies
  TOUR ||--o{ TOUR_SESSION : runs
  TOUR_SESSION { tstzrange time
    int capacity
    text arrangement "shared | private"
    text pricing "per_guest | per_group"
    bigint amount_minor }
  PROGRAM ||--o{ PROGRAM_SESSION : includes
  TOUR_SESSION ||--o{ PROGRAM_SESSION : in
  SCHEDULE ||--o{ PROGRAM : offered_with
  TOUR ||--o{ TOUR_CRUISE : assigned
  VESSEL ||--o{ TOUR_CRUISE : to

  USER_PROFILE ||--o{ TRIP_REQUEST : submits
  ORGANISATION ||--o{ TRIP_REQUEST : company_request
  TRIP_REQUEST ||--o{ OFFER : receives
  OFFER ||--o{ OFFER_VERSION : revisions
  OFFER_VERSION { uuid departure_id
    uuid cabin_type_id
    text deck
    bigint amount_minor
    jsonb inclusions
    text terms
    timestamptz expires_at }
  OFFER_VERSION ||--o| BOOKING : accepted_as
  INVENTORY ||--o{ BOOKING_CABIN : reserves
  BOOKING ||--o{ BOOKING_CABIN : includes
  BOOKING ||--o{ PASSENGER : travels
  PASSENGER { date birth_date
    text age_band "infant | child_25 | child_50 | adult, ADR-012" }
  BOOKING { text ref UK
    text status
    date pay_by
    jsonb terms_snapshot
    bigint total_minor
    bigint agency_sell_minor }
  BOOKING ||--o{ PAYMENT : settled_by
  PAYMENT { text kind "request | reported | receipt | refund"
    text stripe_payment_intent
    text stripe_refund
    text status }
  BOOKING ||--o{ CANCELLATION : may_have
  BOOKING ||--o{ COMMISSION_ENTRY : earns
  PAYMENT ||--o| OPERATOR_PAYABLE : creates
  ORGANISATION ||--o{ OPERATOR_PAYOUT : receives
  OPERATOR_PAYABLE { bigint amount_minor "payment less 10%"
    char currency }
  OPERATOR_PAYOUT { bigint amount_minor
    date paid_on
    text reference }
  TOUR_ORDER ||--o{ TOUR_PAYMENT : settled_by
  TOUR_SESSION ||--o{ TOUR_ORDER : booked
  ORGANISATION ||--o{ INTEGRATION : connects
  INTEGRATION ||--o{ INTEGRATION_LOG : logs
  INTEGRATION { text mode "manual | feed | api"
    text feed_url
    bool feed_approved
    text key_hash }
  AUDIT_LOG { uuid actor
    text action
    text entity
    jsonb diff
    timestamptz at }
  MEDIA_ASSET }o--|| VESSEL : of
  DESTINATION ||--o{ DESTINATION_I18N : translates
```

**Notes:**
- `TOUR_ORDER` is separate from `BOOKING`. A tour payment can never settle a cruise balance (DASH-PAY-014).
- `BOOKING.terms_snapshot` freezes the deadline and cancellation bands agreed at booking (DASH-PAY-010).
- `INVENTORY` is shared by every rate and currency for the same cabin type and departure (DASH-ADM-056).
- Pricing is one tested function, `price_booking(rate, passengers, gratuity)`, with three parts:
  - child bands per ADR-012/018: age on the departure date, a share of the adult per-person rate, operator override chosen by admin;
  - the gratuity as a separate, display-only line paid on board in US$ (never charged), per ADR-017;
  - no extras inside the cruise total, per ADR-011.
- There is no felucca vessel type (ADR-008).
- `OFFER_VERSION` makes a deck change produce a new version that the customer must accept (DASH-OPR-023).

**Content in Sanity, not Supabase:**
- guide and explainer articles, route guides, destination and site guides;
- FAQ blocks;
- trust pages and Egyptologist profiles;
- PriceAnatomy factor sets and VesselCompare type profiles;
- homepage sections.

Destinations live in **both**: an identity row in Supabase (for route stops) and editorial content in Sanity, joined by slug.

## 4. Roles and permissions

`A` = allowed. `own` = only rows of the caller's own organisation or account. `—` = denied. Every cell is enforced twice: RLS on the table, and a role check in the RPC or server action. Team roles apply inside an organisation.

| Action | Admin | Operator owner | Operator staff (PROPOSED-002) | Customer | Partner owner | Partner reservations | Partner finance | Visitor |
|---|---|---|---|---|---|---|---|---|
| View admin overview queues and activity history | A | — | — | — | — | — | — | — |
| Create/edit vessel, assign operator, approve publication | A | — | — | — | — | — | — | — |
| CSV import vessel drafts | A | — | — | — | — | — | — | — |
| Enter/publish evaluations; safety observations | A | — | — | — | — | — | — | — |
| Create draft, submit, respond to changes | A | own | own (reservations) | — | — | — | — | — |
| Approve/reject submission | A | — | — | — | — | — | — | — |
| Approve operators and partners; pause access | A | — | — | — | — | — | — | — |
| Cabins, decks, schedules, departures, rates | A | own | own | — | — | — | — | — |
| Rate plans (incl. trade, company-restricted) | A | own | — | — | — | — | — | — |
| Promotions and upgrades | A | own, if authorised | — | — | — | — | — | — |
| Inventory connections; API key rotate | A (approve feed) | own | — | — | — | — | — | — |
| Tours, sessions, programs, suppliers (Q11) | A | read assigned | — | — | — | — | — | — |
| Create trip request | — | — | — | own | own company | own company | — | draft only |
| Send personal offer | — | own | own | — | — | — | — | — |
| Accept offer / reserve departure | — | — | — | own | own company | own company | — | — |
| Record passengers, client ref, agency sell total | — | — | — | own | own | own | — | — |
| Report payment | — | — | — | own | own | — | own | — |
| Request payment; record receipt | A | own (finance permission) | own (finance) | — | — | — | — | — |
| Verify payment | A | — | — | — | — | — | — | — |
| Request cancellation | A | own | own | own | own | own | — | — |
| Approve refund; record refund | A | own (record) | — | — | — | — | — | — |
| Commission entries and reversals | A (read/write via RPC only) | read own | — | — | — | — | — | — |
| Record operator payouts; see all payables | A | read own balance | read own (finance) | — | — | — | — | — |
| Premium periods | A | — | — | — | — | — | — | — |
| Invite team, set permissions | A | own | — | — | own | — | — | — |
| See exact departure rates | A | own | own | A | trade rates | trade rates | — | from-price only |
| Read published vessels, evaluations, tours | A | A | A | A | A | A | A | A |
| MCP read | A | A | A | A | A | A | A | public data |

## 5. Content strategy

| Content | Lives in | Who updates it | How |
|---|---|---|---|
| Vessels, cabins, decks, amenities, schedules, departures, rates, inventory, promotions | Supabase | Operators (own), admins | Dashboards; feed/API for inventory |
| Evaluations, safety, external ratings | Supabase | Admins | Catalogue editor |
| Tours, sessions, programs, suppliers | Supabase | Admins | Dashboards |
| Requests, offers, bookings, payments | Supabase | Customers, partners, operators, admins | Dashboards and flows |
| Articles, explainers, route/destination/site guides, FAQs, trust pages, Egyptologists | Sanity | Content editors (Faris's team) | Sanity Studio at `/studio` (admin-only), draft preview, scheduled publishing |
| PriceAnatomy factor sets, VesselCompare type profiles | Sanity | Content editors | Studio, with a "sample data" toggle that renders the flag |
| UI strings (buttons, labels, errors) | `messages/{en,es,ja}.json` in the repo | Developers, translators via PR | next-intl |
| Translations of content | Sanity document i18n; `*_i18n` tables | Translators | Translation status visible in Studio and dashboards |

Vessel pages are server-rendered from Supabase, plus Sanity for any editorial "story" block keyed by vessel slug.

## 6. Routing

- **Tree:** the 106 silo rows (`PAGE-*`) minus the 3 felucca rows deferred by ADR-008/015, so 103 live routes. The felucca tour page stays as a reference.
  - Static rows map to routes under `app/[locale]/(public)/…`.
  - Templates:
    - `/cruises/[vessel]/` (Supabase);
    - `/tours-extras/[tour]/` (Supabase, with the 7 silo slugs as the initial set; Q11);
    - guide, destination and explainer pages from Sanity, with routes fixed by the silo. Editors cannot invent URLs; new URLs are a silo change.
- **Locales:**
  - `en` has no prefix; `es` uses `/es/` with translated pathnames; `ja` uses `/ja/` (slug question Q5).
  - next-intl `pathnames` map each English route to its translation.
  - Reciprocal hreflang `en`, `es`, `ja` and `x-default` (→ en).
  - A page without a translation is not linked or listed in that locale's sitemap; it returns 404 there instead of falling back.
- **Facets:**
  - The indexable facet pages are the 11 listed under `/cruises/`.
  - Everything else is a query parameter (`?from=2027-02&guests=2&sort=price&max=3000`): rendered, but with `<link rel=canonical>` to the clean URL and `noindex,follow`.
  - Vessel slugs are checked against a reserved list (SEO-030).
- **Trailing slash:** on (`trailingSlash: true`); no-slash URLs get a 308.
- **Canonical:** self-referencing on every indexable page.
- **Noindex:** dashboards, account, `/dev/*`, `/studio`, parameterised listings and `/cruises/compare/?…` states.
- **Sitemaps:** a sitemap index with one sitemap per locale, built from the silo route table, Supabase vessels/tours with `visibility='published'`, and Sanity documents with `published && translated`.
- **robots.txt:** disallows `/dashboard`, `/account`, `/api`, `/mcp`, `/dev`, `/studio`.
- **Redirects:** a 301 map from the live nilecruz.com URLs (Q5), kept in `redirects.ts` and tested.
- **Dashboards:**
  - `/dashboard/…` with role-scoped sections: `admin/*`, `operator/*`, `journey/*` (customer "My journey"), `partner/*`.
  - They stay in English (DASH-BND-006).
  - Cairo time display (DATA-003).

## 7. Design-system port

**Tokens:**
- `scripts/tokens.ts` reads `vendor/design-system/tokens/tokens.json` (a copy of the source, never edited) plus `tokens/motion.json` (Q14).
- It writes:
  - `src/styles/tokens.css`: Day on `:root`, Night on `[data-theme=dark]`, palette, spacing, radius, shadow, layout, motion, and type classes;
  - `src/styles/tokens.ts`: typed names for TS and lint.
- CI regenerates them and fails on any diff (TOK-PIPELINE).
- A Stylelint rule rejects raw hex, px font sizes and shadows outside the token list (TOK-NO-HARDCODE).

**Components:**
- One folder per component:
  ```
  src/components/ds/<Name>/
    <Name>.tsx
    <Name>.module.css
    README.md
    <Name>.stories.ts
    <Name>.test.tsx
  ```
  - `<Name>.module.css` is ported from bundle.css.
  - `README.md` is carried over verbatim, plus a "Changes from the design system" section.
  - `<Name>.stories.ts` is a states list used by `/dev/components`.
- Server components by default. Interactive ones (CruiseSearch, PriceAnatomy, VesselCompare, ItineraryTimeline, Gallery, CabinPicker, BookingSummary, NavBar menu, Stepper, TextField) are client islands with server-rendered initial HTML.
- The felucca variants of `VesselArt` and `Scene` are not ported (ADR-008).
- `BookingSummary` is rebuilt around real data (ADR-007).
- Japanese keeps the bundle's `:lang(ja)` tracking (ADR-014).
- All three are logged in `docs/DS-DIFFS.md`.
- Illustrative defaults are moved to `src/components/ds/__samples__/` and used only in `/dev/components`.

**Parity check:**
- Playwright opens each `preview.html` (served from `vendor/design-system`) and the matching `/dev/components/<Name>` story with the same props.
- It screenshots both in Day and Night at 1440 px, and diffs them with a 1% pixel tolerance.
- Differences are fixed or logged in `docs/DS-DIFFS.md` (ENG-009).

## 8. Testing, CI, environments, deployment, secrets, monitoring, backups

- **Tests:**
  - **Unit** (Vitest): money formatting, deadline calculation, cancellation bands, promotion rules, evaluation scoring, slug rules.
  - **Database** (SQL tests on a throwaway Postgres in CI): RLS isolation for every role, RPC authorisation, atomic reserve and accept, no overselling, commission reversal.
  - **E2E** (Playwright): every user flow touched in a batch, with axe on each page, screenshots at 375/768/1440 in both themes, and the visual parity suite.
- **CI** (GitHub Actions) on every PR:
  - install;
  - token regeneration diff;
  - typecheck, lint, format:check;
  - unit and database tests;
  - build, size-limit;
  - Playwright against the Vercel preview with a seeded Supabase branch;
  - Lighthouse CI on key templates (home, a pillar, a listing, a vessel page, an article).
- **Environments:**
  - `local`: Supabase CLI in Docker.
  - `preview`: Vercel preview per PR plus a Supabase branch.
  - `production`.
  - Sanity datasets: `development`, `production`.
- **Deployment:**
  - Merging to `main` deploys production.
  - Database migrations are applied by CI with `supabase db push` from version-controlled files only. No editing in the SQL editor.
- **Secrets:**
  - Stored in Vercel and GitHub encrypted environments; `.env.example` lists names only.
  - The service-role key is used only in server code (lint rule plus CI check that `NEXT_PUBLIC_` never carries a secret).
  - Gitleaks runs in CI.
- **Monitoring:**
  - Sentry for errors and performance, with release tags.
  - Supabase logs.
  - An uptime check on `/api/health`.
  - Cron failure alerts for feed pulls and deadline jobs.
- **Backups:**
  - Supabase daily backups plus PITR on production.
  - Sanity dataset export nightly to storage.
  - A restore rehearsal before launch (ENG-015).
- **Scheduled jobs** (pg_cron, or Vercel cron calling signed endpoints):
  - feed pulls (hourly);
  - deadline checks and cabin-release queue (every 15 min);
  - offer expiry;
  - inventory freshness flags.
