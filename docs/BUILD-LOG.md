# Build log

## 17 Oct 2026 · Batch 0 · Discovery and architecture

**Built** (documents only; no application code):
- `INVENTORY.md`
- `REQUIREMENTS.md`: 488 IDs plus 17 PROPOSED
- `QUESTIONS.md`: 45 questions
- `ARCHITECTURE.md`
- `EXPERIENCE.md`: 10 EXP proposals
- `BATCH-PLAN.md`: 21 batches with a coverage proof
- `DECISIONS.md`
- `CONTENT-NEEDED.md`
- `scripts/ledger.py`

**Verified, and how:**
- Every source file was read in full:
  - the docx text was checked against its XML (184 paragraphs);
  - every sheet of the xlsx was dumped, and the silo counts were recomputed (106 = 46/47/13);
  - the design-system zip was extracted, and all 58 files were read, except the vendored minified React, whose version was checked.
- Ledger coverage was proved twice: by the generator's assertions, and by an independent regex re-parse of `REQUIREMENTS.md` (488 rows, 488 distinct, batch counts identical).
- The two existing repos were assessed read-only (no install or run). The live nilecruz.com headers and sitemap were checked.

**Completeness pass:**
- Each source was re-opened after the first draft. That pass added BRAND-021…026 (layout rhythm, spacing, states, figures, nav limit, ratings and guest count).
- Totals per source:
  - Dashboard guide: 204 (ROLE 6, ADM 107, OPR 27, CUS 17, B2B 13, PAY 14, PUB 12, BND 8)
  - Silo: 106 PAGE
  - Design system: 22 COMP, 12 TOK, 26 BRAND
  - CLAUDE.md and cross-cutting: ENG 18, A11Y 11, PERF 10, SEC 13, SEO 30, I18N 12, DATA 14
  - EXP: 10

**Deferred:** nothing.

**Known issues:**
- The code behind the live site (and behind the dashboard guide) is not in GitHub (Q1).
- The ledger's DASH batch assignments for 4b–4f will shrink if that code arrives.

**Where I stopped:** all Batch 0 documents are written and committed locally on `batch-00-discovery` in `/Users/islamhussein/nce-repo`. Nothing is pushed.

**Next:** Faris answers Q1–Q5 and approves the docs, then the Batch 1 brief.

## 17 Oct 2026 · Batch 0, update after Faris's first answers

- **Recorded:** ADR-007 to ADR-014. These cover BookingSummary, felucca removal, score-not-stars, obligatory separate gratuities (min US$5 pp/night), no flights in the cruise total, check-in to check-out, child pricing, private drafts until complete, and Japanese tracking.
- **Ledger:** 497 IDs (488 + BRAND-027/028 + DATA-015…021). I18N-008 was rewritten. 4 felucca PAGE rows are `Deferred` with Faris's OK. PROPOSED-009 is approved and now covered by DATA-019/020.
- **Re-verified:** the generator assertions passed, and an independent re-parse found 497 rows, 497 distinct and 4 deferred.
- **Still open before Batch 1:** Q1–Q5 (codebase, payment model, price visibility, vessel vs sailing page, name/slugs/redirects). Follow-ups Q46–Q50 are new.

## 17 Oct 2026 · Batch 0, update after Faris's second answers

- **Recorded:** ADR-015 to ADR-023.
  - The felucca tour page is kept as a reference.
  - Motion tokens are added to the design-system tokens, and Japanese is not letter-spaced (ADR-014 reverted).
  - Gratuities are paid on board in US$ from age 3, with no commission.
  - Child pricing: age on the departure date, from the adult rate, with per-operator overrides set by admin; occupancy is 3 at most.
  - "Complete" includes rates, with temporary showcase exceptions.
  - Payment is by Stripe.
  - One page per vessel.
  - The brand is Nilecruz, and Japanese uses English-letter slugs.
  - Codebase: build in `nce`, reusing reviewed parts of both repos.
- **Ledger:** 507 IDs, with DATA-022…031 added. PAGE-097 is back to Planned; 3 rows are Deferred. PROPOSED-004 (Stripe) is approved.
- **Bug caught and fixed:**
  - An insertion briefly renumbered DATA-021. I caught it by diffing IDs against the previous commit and fixed it before committing.
  - `scripts/ledger.py` now refuses to run if any previously issued ID disappears (`scripts/ledger-ids.txt`).
- **Re-verified:** the generator's assertions passed, and an independent re-parse found 507 rows, 507 distinct, 3 deferred, with every ID in exactly one batch.
- **Still open before Batch 1 can start:** Q3 (public price visibility), Q51 (Stripe: when, how much, to whom), Q52 (live data and redirects). Batch 1 itself doesn't depend on Q3 or Q51, so approval of the docs plus Q52 is enough to start.

## 17 Oct 2026 · Batch 0 closed

- **Approved:** Faris approved the Batch 0 documents (ADR-024).
- **Ledger:** the Batch 0 rows (ENG-013, DATA-007) are now Verified. The branch `batch-00-discovery` is pushed to `github.com/desertcanvasart-dotcom/nce`.
- **Next:** the Batch 1 brief (Foundation), in `docs/briefs/BATCH-01.md`, awaiting Faris's go-ahead.

## 17 Oct 2026 · Faris's third answers (between Batch 0 and Batch 1)

- **Recorded:** ADR-025 to ADR-028.
  - **Public prices:** one "from" price per vessel; everything else after sign-in.
  - **Payments:** Nilecruz is merchant of record and keeps 10%, with operator payables and recorded payouts.
  - **Deadlines:** confirmed from the booking date, with automatic cancellation.
  - **Live site:** no live data to migrate, and redirects are approved.
- **Ledger:** 516 IDs (DATA-032…040 added). The ID guard passed, and an independent re-parse matched. PROPOSED-013 is approved.
- **New questions:** Q54 (commission on tours), Q55 (manual payments), Q56 (footer legal pages, needed for Batch 1).
- **Batch 1:** still waiting for the five items in its brief.

## 17 Oct 2026 · Faris's fourth answers; Batch 1 preparation

- **Done on Faris's instruction:**
  - `main` created from `batch-00-discovery` and set as the GitHub default.
  - Node 22.23.3 installed through nvm and made the default.
  - `.nvmrc` pinned.
  - `.gitignore` added.
  - `.env.local` created (git-ignored, permissions 600) with labelled staging and production Supabase slots.
- **Recorded:** ADR-029 to ADR-032.
  - **Railway:** hosting moves to Railway.
  - **Sentry:** moves to Batch 11.
  - **Tours:** Nilecruz-only, with no commission split.
  - **Payments:** manual payment fallback.
  - **Legal:** draft terms and privacy pages; `/independence` redirect.
  - **Translations:** I draft ES/JA strings for review.
- **Ledger:** 520 IDs.
  - Added: ENG-019, DATA-041…043.
  - ENG-014 moved to Batch 11.
  - ENG-006 and ENG-011 reworded for Railway.
  - The ID guard and an independent re-parse both passed.
- **Next:** Faris's go-ahead on the revised Batch 1 brief.

**Correction (17 Oct 2026, Batch 1):** the design-system zip has **57** files, not 58, and 23 component READMEs (22 components + LandingPage), not 21. I found this while vendoring the zip and counting it file by file. INVENTORY.md is corrected. No ledger row changes.

## 17 Oct 2026 · Batch 1 · Foundation

**Built** (branch `batch-01-foundation`):
- **Platform:** Next.js 16.4.2 with TypeScript (strict), pnpm 10 and Node 22.23.3.
- **Design system:**
  - an untouched vendored copy, verified identical to the zip;
  - the token generator with `--check`;
  - motion tokens;
  - self-hosted Latin fonts.
- **Languages:** next-intl routing (EN unprefixed, `/es/`, `/ja/`), with messages in three languages (47 keys; ES and JA drafted for translator review).
- **Shell:**
  - an early NavBar port with a no-JS phone menu;
  - footer;
  - Day/Night with no flash;
  - language switch and skip link.
- **Pages:**
  - placeholder home;
  - branded 404 and 500 in three languages;
  - draft Terms and Privacy.
- **Plumbing:**
  - robots.txt (staging blocks all, plus `X-Robots-Tag`);
  - metadata and canonical helper;
  - live-site 301 map;
  - security headers;
  - `/api/health`.
- **Tooling:**
  - ESLint (jsx-a11y strict, reasons required for suppressions);
  - Stylelint with a token-enforcement plugin;
  - copy lint;
  - Prettier;
  - Vitest;
  - Playwright + axe;
  - screenshot script;
  - bundle budget;
  - Lighthouse CI;
  - GitHub Actions CI (with gitleaks);
  - `railway.json`;
  - `.env.example`;
  - `supabase/config.toml`.

**Verified, and how:**
- **Static checks:** `pnpm verify` is clean (tokens, types, ESLint, Stylelint, copy, Prettier, 27 unit tests).
- **Build:** clean. The largest route ships 154.2 KB of gzipped JS (budget 200).
- **End-to-end:** 27 tests pass on a production build in production settings, and the 500-page test passes with dev routes on. axe finds 0 serious or critical issues in both themes.
- **Visual check:** 42 screenshots in `docs/screenshots/batch-01/` (7 routes × 3 widths × 2 themes). I opened a sample of them myself, and an automated pixel check confirmed every Night screenshot uses the Night surface.

**Problems found and fixed during the batch** (all by tests or by looking at screenshots):
- Accessible names didn't match visible labels (axe).
- The Spanish header collided at 768 px, and the phone strapline wrapped (screenshots).
- The 500 page lost the Night theme (screenshots, now covered by a regression test).
- About 200 KB of Japanese `@font-face` CSS was render-blocking every page (Lighthouse).
- The bundle budget counted the legacy polyfill.
- A stale server made one test run misleading. Playwright now never reuses a server.
- Inventory file counts corrected (57 files).

**Not done, or not yet verified:**
- **ENG-011 (In progress, carried over):** the Railway staging and production services and the Supabase connection need Faris's values (`.env.local`, the Railway project). The app has no tables yet, so nothing else depends on it in this batch.
- **CI's first run:** ENG-005, ENG-006, ENG-012, PERF-007 and SEC-003 are "Built". They pass locally and wait for the first CI run on the PR. Gitleaks couldn't run locally because Docker isn't running.
- **Lighthouse mobile LCP:** under the default simulated method it is 2.0 s on home but 2.7–2.8 s on ES, JA and Terms. Under applied throttling it is 0.8–2.1 s. LCP is a CI warning until Faris decides (Q58, ADR-036). CLS is 0 everywhere.

**Decisions:** ADR-033 to ADR-039; design-system differences in `docs/DS-DIFFS.md`.

**Next:** Faris reviews; answers Q58 (and Q57 when convenient); supplies the Supabase and Railway values. Then the Batch 2 brief (design-system port).

### 17 Oct 2026 · Batch 1 update: CI and Supabase

- **CI:** the first run on PR #1 is green (4/4 jobs). ENG-005, ENG-006, ENG-012, PERF-007 and SEC-003 are now Verified.
- **Lighthouse:**
  - On GitHub's runner the mobile run printed no assertion warnings, so LCP stayed within 2.5 s even under the simulated method. The slow results on this Mac look machine-specific.
  - The report artifact was empty, because upload-artifact skips the hidden `.lighthouseci` folder. Fixed (`include-hidden-files`).
  - Actions were bumped to current majors after CI warned that Node 20 actions are deprecated.
- **Supabase (ENG-011):**
  - Staging and production both respond, the URLs match their project refs, and both publishable keys work (auth health 200).
  - Both "secret key" entries in `.env.local` are the **anon** key, not the secret/service-role key. Faris to replace them. They aren't needed until Batch 3.
  - The database password is untested; it will be tested when Batch 3 links the CLI.
- **Still open:** the Railway project, the correct secret keys, Q58.

### 17 Oct 2026 · Batch 1 update: gate, keys, Railway

- **Q58 answered:** the strict simulated Lighthouse test is the gate (ADR-040). LCP is an error again in `lighthouserc.json`.
- **Supabase:** the staging and production secret keys are `service_role` keys and authenticate (REST 200).
- **Railway:**
  - Faris linked the repo to project "tranquil-gratitude", environment "production".
  - Its first deploy built `main` at the Batch 0 docs commit and failed as expected, because `main` has no app until PR #1 is merged.
  - Variables still need setting in Railway before the first real build, because `NEXT_PUBLIC_*` values are baked in at build time.
- **Status:** ENG-011 stays In progress until a Railway deploy serves `/api/health`.

### 17 Oct 2026 · Batch 1: merge held, Lighthouse gate is unstable on localhost

- **Merge held:** Faris approved Batch 1 and asked for PR #1 to merge once CI is green. CI on `03018ae` was **not** green: the Lighthouse job failed (simulated mobile LCP: `/` 2.69 s, `/es/` 2.83 s). The same gate passed one commit earlier. Not merged.
- **Evidence:**
  - Across 12 CI runs, simulated LCP is bimodal: about 2.0–2.1 s or 2.7–2.9 s for the same page. In 6 local runs of `/es/` it is 2.2 s or 2.7 s.
  - The difference is whether Next's ~30 ms startup script task runs before the text's first paint in the *unthrottled localhost* trace. When it does, the simulation charges the whole ~150 KB JS download to LCP.
  - Removing the web fonts did not change it (tested and reverted).
  - Real-throttling LCP is 0.8–2.1 s.
- **Conclusion:** the simulated gate is valid, but a localhost trace is not a fair input to it. It needs a trace from a real network (the Railway deployment).
- **Waiting on Faris:** the decision on where the Lighthouse gate runs (Q59).

### 17 Oct 2026 · Batch 1 closed

- **Merged:** PR #1 (Batch 1, merge `4cf086b`) and PR #2 (Railway deploy fix, merge `d5dd427`), both approved by Faris with green CI.
- **Railway staging:** `https://nce-production-da4c.up.railway.app`, EU West (Amsterdam).
  - Deploys automatically from `main`.
  - Serves the pages in three languages, with the canonical URL on its own domain, `noindex` (header and `robots.txt: Disallow: /`) and `/api/health/` returning 200.
- **Deploy fix (PR #2):** three causes were found by reproducing a Railway-style build:
  - a bare domain in `NEXT_PUBLIC_SITE_URL` broke the build;
  - the start command needed a shell;
  - the health check got a 308 redirect.
- **Strict Lighthouse gate on the deployment (ADR-041):** passed in two runs after the region move (ADR-042):
  - median LCP 1.36–2.42 s;
  - CLS ≤ 0.012;
  - TBT ≤ 95 ms;
  - accessibility 100 on every page.

  Before the move, `/es/` failed by 5 ms because of server time.
- **Ledger, Batch 1 (45 IDs):** 44 Verified. ENG-011 is carried over to Batch 11 for its production part (the separate Railway production environment is created at launch); local and staging are verified.
- **Known issues:**
  - From Faris's Mac network, about 3 in 10 connections to Railway's edge address `69.46.46.40` fail before connecting, while the live site's address (`.71`) never does, and GitHub's runners connect every time. It's a local network-path issue, not the app. If Faris sees pages hang in his browser, this is why; Railway support can move the domain to another edge address.
  - `/terms/` has the thinnest LCP margin (2.42 s in one run).
  - The Railway environment is named "production" although it serves staging (Railway → environment settings).
- **Next:** the Batch 2 brief (design-system port), on Faris's go-ahead.

## 17 Oct 2026 · Batch 2 · Design-system port

**Built** (branch `batch-02-design-system`):
- **Components:** all 22 design-system components as typed React modules in `src/components/ds/<Name>/`. Each folder has a component, a CSS Module (tokens only), stories, and a README (the guideline verbatim plus the build's changes).
- **Shared helpers:** formatting (money, dates, nights), reduced-motion hook, count-up, Media (next/image or Scene), StateView (loading, empty, error, denied), Sample data flag.
- **Gallery:** `/dev/components/` (index + 23 pages, every state, Day/Night), gated by `ENABLE_DEV_ROUTES`. Plus a bare parity frame, `/dev-parity/<name>/`.
- **NavBar:** the full port now drives the site header (sliding brass underline, no-JS phone menu).
- **Labels:** about 120 component labels in EN/ES/JA (ES and JA drafted for review).
- **Data stays out of components:** illustrative data lives only in `__samples__/` and is flagged "Sample data". It is not public (dev routes only).

**Verified, and how:**
- **Static checks:** `pnpm verify` is clean (tokens, types, ESLint, Stylelint, copy lint, Prettier, 48 unit and component tests).
- **End-to-end:** with dev routes on, 125 pass (1 skipped by design); with production settings, 29 pass and the 96 dev-only tests skip.
- **Accessibility:**
  - axe finds 0 serious or critical issues on all 23 gallery pages in Day and Night;
  - a keyboard walk shows a 2 px focus ring on every control;
  - reduced motion leaves 0 running animations;
  - no gallery page scrolls sideways at 375 px.
- **Visual parity:** 22 components measured. 11 are under 1% in both themes; the rest differ only by decisions recorded in the allowlist, confirmed by inspecting diff images.
- **Screenshots:** 180 in `docs/screenshots/batch-02/` (30 routes × 3 widths × 2 themes), plus parity images. I checked phone and Night views myself.
- **Bundle:** the largest public route ships 154.7 KB of gzipped JS (budget 200).

**Problems found and fixed during the batch:**
- At 375 px:
  - fixed three-column story grids overlapped;
  - long Spanish button labels overflowed (buttons now wrap, ADR-046);
  - long gallery titles overflowed (headings now wrap).
- Hero copy sat over the cropped boat on phones (stronger scrim).
- Search values were cut off on phones (one column).
- Old-style figures in prices (lining figures now, BRAND-024).
- Reduced motion left delayed animations running (ADR-048).
- `upgrade-insecure-requests` broke plain-HTTP local runs (ADR-049).
- Waits for an idle network were flaky after nav prefetching (replaced).
- The parity report dropped results on partial runs (now merges).

**Carried over:** BRAND-021 (section spacing and bands) to Batch 6, because it is page composition, first applied on the homepage.

**Known issues:**
- The screenshots add about 37 MB to the repository. Consider storing future batches' screenshots as CI artifacts only.
- The gallery on staging needs `ENABLE_DEV_ROUTES=true` set on the Railway service (Faris approved this; it has to be set in Railway).

**Next:** Faris reviews the gallery, then the Batch 3 brief (data foundation).

### 17 Oct 2026 · Batch 2 update: CI

- **First two CI runs failed on visual parity only.**
  - The design system's previews fetch fonts from Google, which sends hinted font files to Linux and unhinted files to macOS. On GitHub's Linux runner, text was a few pixels wider than the build's self-hosted fonts (SectionHeading 1.8% vs 0.09% on macOS; AmenityGrid 1.1%).
  - In the first run, the parity tests also ran in sequence, so one failure skipped the rest.
- **Fixed in the test, not the threshold:**
  - every font family and weight the page uses is loaded before each screenshot;
  - the previews get the build's own font files;
  - the tests are independent;
  - each result is its own file, merged into `report.json`.
- **CI on `5a652d5` is green** (4/4 jobs). CI parity now matches macOS within about 0.3 points, apart from components already allowlisted for intended differences.

## 17 Oct 2026 · Batch 3 · Data foundation

**Built** (branch `batch-03-data-foundation`, PR #5):
- **Database** (`supabase/migrations/`, 5 files):
  - conventions: currency and locale domains, `updated_at` trigger, helpers in a private `app` schema;
  - identity: profiles (platform and admin roles), organisations (operator, partner, Nilecruz; four statuses), memberships (four team roles), a profile created for every sign-up;
  - catalogue: vessels (sail, motor, steam; private, showcase, published; reserved-slug guard), admin-only vessel facts, translations (EN/ES/JA), destinations, media with exactly one parent, a private storage bucket;
  - audit: append-only `audit_log`, written by triggers and `app.log_event()` only;
  - explicit grants, then RLS on every table (ADR-056).
- **Seed** (local and CI only): 11 users covering every role, 4 organisations, 3 destinations, 4 sample vessels in every visibility (`supabase/seed-users.md`).
- **Server layer:** request client (`getDb`, RLS applies) and admin client (`getAdminDb`, server-only, guarded by ESLint and the build), generated types, zod schemas for every table input, `parseInput`/`withInput`, English-fallback translation helper, sample-flag mapper, server-only Sanity client.
- **Sanity:** project "Nilecruz" (`auho5414`), private datasets `production` and `development`, standalone Studio in `studio/` with six types: article, FAQ, destination story, vessel-type profile, price explainer, Egyptologist (ADR-057).
- **Vessel import:** `scripts/import-vessels.ts`, dry run by default; `--apply` only to local or staging (ADR-058).
- **CI:** database job (migrations from scratch, pgTAP, API tests, types up to date), Studio check, client-bundle secret scan; `deploy-data.yml` applies migrations to staging and deploys the Studio on merge (ADR-059).

**Verified, and how:**
- **Static checks:** `pnpm verify` clean; 93 unit tests; `pnpm studio:check` (types and schema: 0 errors, 0 warnings).
- **Database:** 5 pgTAP files, 50+ checks, pass locally and in CI (RLS on every table; isolation for anonymous, customer, operator owner, viewer and admin; audit log refuses update, delete and truncate even for the owner and service role; reserved slugs; formats; media parent).
- **Through the API:** 6 tests sign in as seed users through Auth and PostgREST and confirm the same rules.
- **Secrets:** gitleaks clean; the bundle scan finds nothing, and catches a planted key when one is added (checked by hand).
- **Import:** dry run 609 read, 608 mapped (237 sail, 371 motor), 1 skipped with its reason; applied to the local database: 608 private drafts, a second run inserts 0, production refused, anonymous visitors see none of them.
- **Visual check:** not applicable; no screens in this batch.

**Problems found and fixed:**
- Port 54321 is taken by CleanMyMac on this Mac (ADR-055).
- Supabase no longer grants table access by default (ADR-056).
- A column-level lock on profile roles would also have blocked admins; replaced by a trigger.
- Fixture IDs were not valid RFC 4122 UUIDs for zod; fixed.
- The source data has Cyrillic look-alike letters in 6 names, a bundled list record and near-duplicate names; handled and reported (ADR-058).

**Faris's answers (17 Oct 2026), then done:**
- **Import approved:** the Sudan is the only steamer, and the 14 unverified names became separate drafts (ADR-060). New dry run: 609 source records → 622 vessels, 0 skipped.
- **Staging migrations:** the six migrations were applied once from this Mac with the Supabase CLI (ADR-059 amendment); the seed is never pushed.
- **Found on staging:** hosted Supabase had given anonymous and signed-in roles every table privilege, TRUNCATE included. RLS blocked every row, so nothing was exposed. Fixed by `*_exact_grants.sql`; the grant check is empty on staging and now runs after every deploy (ADR-061).
- **Staging import:** 622 private drafts (368 motor, 251 sail, 3 steam), 622 private-facts rows, 1,244 audit entries; a second run inserts 0. Through the public API, anonymous visitors see 0 vessels and are refused on private tables.

**Not done, and why:**
- **Hosted Studio and schema deploy:** need a Sanity token with the Developer role (`SANITY_DEPLOY_TOKEN`).
- **GitHub secrets** `SUPABASE_ACCESS_TOKEN`, `SUPABASE_STAGING_DB_PASSWORD`, `SANITY_DEPLOY_TOKEN`: until they are set, `deploy-data.yml` fails on `main` with a "missing secret" message. Staging is already up to date, so nothing is lost meanwhile.

**Staging gallery:** Faris set `ENABLE_DEV_ROUTES=true` on Railway. Checked 17 Oct 2026: `/dev/components/` and its component pages answer 200 in EN, ES and JA, render with the "Sample data" flag, and stay `noindex, nofollow` (header and meta); `/dev/error-preview/` returns its intended 500.

**Next:** Faris adds the three secrets. Then the Batch 4a brief (sign-in).

## 17 Oct 2026 · Batch 3 follow-up · Hosted Studio

- **Deployed:** Sanity Studio at https://nilecruz.sanity.studio, with Production and Development workspaces (ADR-062); the schema is deployed to both datasets (`sanity schema deploy`: 2/2). Sanity lists the Studio for project `auho5414`.
- **Verified:** both workspace URLs redirect into Sanity's dashboard for sign-in; `pnpm studio:check` validates both workspaces (0 errors, 0 warnings).
- **Still open:** GitHub has no secrets yet (0 repository, 0 `staging` environment). `deploy-data.yml` keeps failing on `main` until `SUPABASE_ACCESS_TOKEN`, `SUPABASE_STAGING_DB_PASSWORD` and `SANITY_DEPLOY_TOKEN` are added. Staging and the Studio are already up to date.

## 17 Oct 2026 · Batch 4a · Accounts and roles

**Built** (branch `batch-04a-accounts`):
- **Account pages** in EN/ES/JA: sign up, sign in, email confirmation, password reset, two-step code, account security (change email, change password, two-step on/off, sign out everywhere). All forms are server actions and work without JavaScript; `noindex`, outside the sitemap.
- **Sessions:** Supabase Auth through `@supabase/ssr`; httpOnly, SameSite=Lax (Secure on https) cookies; the proxy refreshes sessions only for visitors with a session cookie; sign-out is a same-site POST that ends the session on the server.
- **Authorisation:** `requireUser`, `requireAdmin(subRoles)`, `requireOrgRole(org, roles)` in every dashboard page and action; an ESLint rule fails any server action without a guard; database RLS stays the second wall.
- **Admins:** two-step sign-in required in the app and in the database (`app.is_admin()` needs aal2); only super admins change roles (ADR-064); `scripts/grant-role.ts` for staging, audited.
- **Dashboard shell** (`/dashboard/`, English): landing per role, workspace switcher, sidebars named from the guide with the batch that builds each section, company status pages (applied, paused, rejected), real HTTP 403 pages for another role's workspace, Cairo time.
- **Auth settings as code** (`supabase/config.toml` + `[remotes.staging]`): password rules, email confirmation, branded email templates, redirect URLs; pushed to staging by `deploy-data.yml`.
- **Layout split:** public pages in a `(site)` route group; dashboards have their own frame (ADR-069). NavBar gained an optional quiet "Sign in" link.

**Verified, and how:**
- **Static checks:** `pnpm verify` clean; 118 unit tests (workspaces, return paths, Cairo time incl. the 29 Oct 2026 repeated hour, authenticator codes against the RFC 6238 vectors).
- **Database:** 7 pgTAP files pass (new: admin without two-step gets nothing; only super admins change roles); 7 API tests (an admin password alone sees only public data; after two-step, everything).
- **End-to-end** against local Supabase: 51 account and dashboard tests, stable twice in a row at four workers. Full suite: 80 pass with production settings (97 dev-only skip) and 176 with dev routes (1 skipped by design).
- **Accessibility:** axe finds no serious or critical issues on account pages (EN and ES) and dashboards, in Day and Night.
- **Screenshots:** 114 in `docs/screenshots/batch-04a/` (account pages, every workspace, 403, company status, two-step), at 375, 768 and 1440 px in Day and Night. I checked phone and desktop views and fixed what I found: the phone sidebar now folds into a Sections menu; "sign-in" no longer breaks across lines; the 403 page has the wordmark.
- **Lighthouse (local, simulated):** accessibility 1.00, CLS 0, TBT ≤ 54 ms on all five URLs; sign-in LCP 2.72 s, in line with the unchanged ES/JA home pages on this busy machine (warning-level locally by design, ADR-041; strict on Railway). Largest account route ships 160 KB of JS (budget 200). Client bundle secret scan clean.

**Problems found and fixed:**
- A form action that redirected to `/dashboard/`, which redirected again, left the browser on `/dashboard/`: actions now send people straight to their workspace.
- The per-request session cache kept the pre-sign-in session for the page rendered after an action: it is now keyed on the session cookies.
- Layout-level redirects lost the page someone asked for: layouts only refuse; pages redirect with their own address.
- The first email-change link showed "changed" although only one address was confirmed: now "one address confirmed".
- Test flakiness came from the machine (load 18–28 with Spotlight indexing) and two test-helper races; the fixes are in the helpers and in serial runs for shared admin accounts, not in retries.

**Known issues:**
- The public header always says "Sign in", even when signed in (ADR-069; Batch 8).
- Staging sends account email through Supabase's built-in sender (a few per hour) until Resend is set up (ADR-065).
- The Auth settings reached staging before this branch was merged (ADR-069); harmless, recorded.

**Next:** Faris reviews and approves PR; after merge, Faris signs up on staging and I make that account super admin (CONTENT-NEEDED #34). Then the Batch 4b brief.

## 18 Oct 2026 · Batch 4b · Admin catalogue and quality

**Built** (branch `batch-04b-admin-catalogue`):
- **Database:** five categories and "Best for" labels (ADR-071, 072); dated, explained showcase exceptions that expire (DATA-024); evaluations with method v1 calculated in the database (ADR-070); external ratings; internal safety observations; operator applications; team invitations; submissions with their history and state machine; CSV import batches. Catalogue writes limited by admin sub-role (ADR-075). RLS, explicit grants and audit triggers on every new table.
- **Admin workspace:** overview queue with linked counters; activity history (names, changed fields, Cairo time, filters); catalogue directory (search by name or alias, filters, incomplete marker, stacked rows on phones); vessel editor (details, descriptions EN/ES/JA, photos with descriptions, credit and rights, readiness, publish or showcase, evaluations, external ratings, safety notes, private source facts); evaluation form with live preview; CSV import with template, stored preview and confirmation; operators (applications, decisions with reasons, team, connected vessels); submissions queue and review (proposal next to current values, history, approve, request changes, reject).
- **Operators:** apply from the account (EN/ES/JA); owners invite staff (existing accounts see the invitation; new addresses get a branded invitation email and set a password) and change or remove roles; propose new vessels or changes, submit, read feedback, resubmit.

**Verified, and how:**
- **Static checks:** `pnpm verify` clean; 132 unit tests (method v1 incl. the vector shared with the database, readiness, categories, CSV parsing, submission states).
- **Database:** 11 pgTAP files pass, new: evaluations and visibility (080), submissions workflow and locks (090), applications and teams incl. invitee reading the company (100), showcase rules (110). Grant diff empty locally with the new tables; the staging check list includes them.
- **End-to-end:** 15 new tests (catalogue, editor, photo upload, publish refused, showcase, evaluation 80.75, ratings, safety, CSV import, activity, apply → approve → invite → accept → submit → changes → resubmit → approve, and axe on every new screen in Day and Night). Full suite: 95 with production settings (97 dev-only skip), 191 with dev routes (1 skipped by design).
- **Screenshots:** 78 in `docs/screenshots/batch-04b/` at 375, 768 and 1440 px, Day and Night; I checked phone and desktop and fixed what I found (activity named records instead of IDs; tables stack on phones).

**Problems found and fixed:**
- Forms lost typed values after a validation error (React 19 reset): ADR-076.
- Owners saw "Join" for invitations they had sent; invited people couldn't see the company name: ADR-077.
- A column-level revoke didn't protect submission status: replaced by a trigger (ADR-077).
- `requireAdmin(roles)` didn't let super admins through when sub-roles were listed: fixed (ADR-075).
- The activity date filter used fixed offsets: it now uses the Cairo offset in force on each date.

**Known issues:**
- The seeded "Sample Dahabiya One" shows Published although incomplete, because seed data bypasses the editor; through the editor, publishing is refused until the readiness check is complete.
- No vessel can be published in this batch: the readiness check needs cabin types and rates, which arrive in Batch 4c. Only showcase exceptions make vessels visible until then.
- Invitation emails for new addresses use staging's limited built-in sender (ADR-065).

**Next:** Faris reviews PR; after merge, migrations, the invite template and the grant check deploy to staging through `deploy-data.yml`. Then the Batch 4c brief (operator product and inventory).

## 18 Oct 2026 · Batch 4c-1 · Operator product (first of two PRs, ADR-083)

**Built** (branch `batch-04c-operator-product`):
- **Database:** cabin types on decks (photos, translations, occupancy 1–3), directional schedules with periods and a day-by-day itinerary (EN/ES/JA), departures created by the database from sailing days, shared inventory per departure and cabin type with freshness by source (ADR-079), rates per occupancy, plan and currency (E£ only for local plans, ADR-082), the crew gratuity (US$, at least US$5), child bands with per-operator overrides snapshotted on each rate (DATA-022), promotions (percent, fixed, extra, upgrade) with no stacking and upgrades only against real inventory, admin-adjustable settings, and a per-vessel product summary for the readiness check. RLS, explicit grants and audit on every new table.
- **Operator workspace:** overview (upcoming departures, inventory issues); Cabins and decks (gratuity, cabin types, photos); Routes, schedules and rates (schedules, periods, itinerary, "Create departures", availability and prices for one date or all matching dates, confirm availability, the departure grid, one departure's rates); Promotions (owners only; create, edit, pause).
- **Admin:** the same product screens from each vessel in the catalogue; "Cabins and sailings" and "Promotions" overviews; Settings (super admins: freshness); child bands per operator. The readiness check now counts cabin types and bookable departures, so a complete vessel can be published.

**Verified, and how:**
- **Static checks:** `pnpm verify` clean; 153 unit tests (new: departure dates, child bands at every boundary and age on the departure date incl. 29 February, occupancy, gratuity, currencies by plan, promotion maths, freshness).
- **Database:** 12 pgTAP files pass (new 120_product: departures, shared quantity, occupancy, E£ rule, gratuity, bands snapshot, owner-only promotions, upgrade inventory, no stacking, rates private, freshness).
- **End-to-end:** 8 new tests (gratuity, cabins on two decks, schedule → 8 departures → availability and prices → a second currency adds no cabins, promotions and stacking, overview, admin publishes the now-complete vessel, child-band override). They pass twice in a row on one database. Full suite at normal machine load: all pass in both modes. A first run under load 32 (Spotlight indexing) timed out widely; it was rerun after the load fell, and the accessibility helper now measures the settled page.
- **Screenshots:** 66 in `docs/screenshots/batch-04c/`, 375 / 768 / 1440 px, Day and Night; checked desktop and phone (the departure grid stacks per departure on phones).

**Not done in 4c-1 (by plan):** paste, feed and API connections, their health and security: DASH-ADM-006, 045–047, DASH-OPR-016, 024–027, SEC-007–009 (4c-2). The concurrency test moves to 4e with reservations (ADR-084).

**Next:** Faris reviews PR 4c-1; then 4c-2 on the same batch.


## 18 Oct 2026 · Batch 4c-2 · Inventory connections (second of two PRs; closes Batch 4c)

**Built** (branch `batch-04c2-connections`):
- **One checked write path** (`app.apply_inventory_rows`, migration `20261018000800_connections`): paste, feed and API rows are checked the same way (company's own vessel, existing and open sailing, active cabin type, occupancy, E£ rule) and newer data wins (ADR-086). Every write records its source and confirmation time.
- **Paste** (DASH-OPR-024): JSON or XML in the Nilecruz inventory format v1 (ADR-080), pasted or uploaded, previewed row by row; nothing changes until "Apply", which checks again.
- **Feed** (DASH-OPR-025, DASH-ADM-047, SEC-007): owners save an https address (checked after DNS); catalogue admins approve, pause or reject it; approval pulls once; then hourly via `pg_cron` → a signed internal call (ADR-081), every two hours after three failures. The fetcher checks addresses inside the connection's own DNS lookup (no rebinding), re-checks redirects, and enforces 5 MB / 20 s / no compression. XML with DTDs or entities is refused.
- **API** (DASH-OPR-026, SEC-008, SEC-009): Ed25519 key pairs (ADR-085, flagged): private key shown once, only the public key stored, two active keys for rotation, revoke. `POST /api/v1/inventory/` verifies the signature (±5 min) and the idempotency key (repeat = first answer; different body = 422). Webhook signing is ready for 4e.
- **Health** (DASH-OPR-027, DASH-ADM-006, 045, 046): per route, last success, data age, rows changed, last problem in plain words; recent activity; problems on the operator overview; admin overview counters (connection errors, feeds awaiting approval) linking to the operators list, which shows each operator's modes and errors.
- **Format document** for operators in the dashboard, with the company's own vessel, cabin and schedule codes and a working signing example.

**Verified, and how:**
- **Static checks:** typecheck, lint, CSS lint, copy lint, format check clean. Unit tests: 178 (new: format parsing JSON/XML, entity attacks, oversize and row limits, row errors, prices without floats; signatures valid/expired/tampered/other key/malformed, scheduler HMAC, webhooks; private addresses incl. 127.0.0.1, 10/8, 169.254.169.254, ::1, mapped and NAT64, numeric spellings; DNS rebinding through the pinned lookup; redirects, size, time and compression against a local server; data age).
- **Database:** 13 pgTAP files, 156 checks pass (new 130_connections, 37 checks: only catalogue admins with two-step approve feeds, a changed address needs approval, http refused, keys public-only and max two active, revoked stays revoked, preview writes nothing, apply once, other companies refused, service functions closed to people, older data skipped, feed health and back-off, claims not doubled, customers see nothing). The deploy grants check returns no differences locally.
- **End-to-end:** 6 new tests in `connections.spec.ts` (paste preview and apply; key creation, signed call, replay changes nothing, different body 422, tampered 401, unsigned 401, revoked key 401; metadata address refused, feed awaits approval, admin approves, pulled from a local https server; scheduler call must be signed; axe on the operator page, format document, admin operator page, operators list and overview in Day and Night). Passed twice in a row on one database. The full suite on this machine hit sign-in timeouts in older files while load stayed at 23–36 (the same pattern as 4c-1); with two workers, as in CI, every connections test passed and 3 older tests timed out on sign-in. CI on GitHub is the record.
- **Screenshots:** 42 in `docs/screenshots/batch-04c/` (prefix `4c2-`), 375 / 768 / 1440 px, Day and Night: operator connections (with a paste preview), the format document, the operator overview, the admin overview, the operators list and an operator's page. Fixed after review: values in definition grids now line up with their labels.

**Needs Faris:**
- ADR-085: signing with Ed25519 instead of HMAC (the brief's "HMAC + only a hash stored" can't both hold).
- The staging scheduler: approve adding `feed_pull_url` and `feed_pull_secret` to Supabase Vault (staging) and `FEED_PULL_SECRET` on Railway. Until then approved feeds are pulled only at approval.
- PROPOSED-018: a "Pull now" button for approved feeds.

**Next:** Faris reviews PR 4c-2; once merged, Batch 4c is closed and Batch 4d (tours and sightseeing) is briefed.
