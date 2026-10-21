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

### 18 Oct 2026 · Batch 4c closed
- **Merged:** PR #11 (4c-2), with CI green. On main, CI, the data-layer deploy (migration `20261018000800_connections`, grants check) and Lighthouse on deployment all passed.
- **Faris approved** ADR-085 (Ed25519 signing) and the staging scheduler secrets.
- **Staging scheduler:** `FEED_PULL_SECRET` is set on Railway (followed by a redeploy), and `feed_pull_url` and `feed_pull_secret` are in staging Vault. `cron.job` lists `nilecruz-feed-pull` (every 5 min) and `nilecruz-prune-connections` (daily). `app.request_feed_pull()` now answers "nothing due" (no approved feeds on staging yet). A one-off probe signed by the staging database exactly as the scheduler does got `200 {"pulled":0,"failed":0}` from staging, so the two secrets match. An unsigned call gets 401.
- **Smoke test:** the home page and the operator connections page (redirects to sign-in) respond; the API refuses unsigned calls in plain words; staging stays noindex. The first request right after the redeploy hung (75 s) once; the following requests took about 0.5 s.
- **Open:** PROPOSED-018 ("Pull now"). **Next:** the Batch 4d brief, on Faris's go-ahead.

## 18 Oct 2026 · Batch 4d · Tours and sightseeing

**Built** (branch `batch-04d-tours`; migration `20261018000900_tours`):
- **Suppliers** (DASH-ADM-064): company, contact, email, phone, licence or registration, notes. Admins only; never public.
- **Tours** (DASH-ADM-058–066):
  - kind, name, location (optionally a destination), duration and supplier;
  - texts in EN/ES/JA: description, itinerary, inclusions, exclusions, meeting point or pickup, cancellation wording;
  - photos with credits and alt text;
  - cancellation bands, checked in the database and in code;
  - sold on its own and/or with selected cruise schedules; optional "adults only".
- **Readiness** (DASH-ADM-073): a published tour is "information only" until it has a supplier, cancellation bands and a future session; then it becomes "bookable" (`public.tour_is_bookable`). The editor lists what is missing.
- **Sessions** (DASH-ADM-067–069): shared (per guest) or private (per guest or per group), capacity, US$ or €, price.
  - Created in bulk from dates, weekdays and Cairo start times, across summer time.
  - Running the same form again adds nothing; a session can be cancelled and restored.
- **Programs** (DASH-ADM-070, 071): days with tours, descriptions in EN/ES/JA, linked to cruise schedules. An availability grid shows, for each departure in the next 90 days and a chosen party size, whether every tour has a session on its day, and names what is missing.
- **Rights** (DATA-042, ADR-087): catalogue and super admins manage everything; content admins edit texts and photos only; operators and partners are refused; the public reads published tours with their prices, never suppliers.

**Verified, and how:**
- **Static checks:** `pnpm verify` clean; 194 unit tests. New tests cover session generation in Cairo time across the change to summer time, bands, per-guest and per-group prices with under-3s free and adults-only, readiness, and the program day mapping and availability check.
- **Database:** 14 pgTAP files pass. The new `140_tours` has 27 checks: bands, the shared-is-per-guest rule, currencies, no duplicate sessions, capacity, bookable only when complete, program days, content-admin limits, no two-step means no change, operators and partners refused, public reads published only and never suppliers. The grants check returns no differences locally.
- **End-to-end:** 5 new tests in `tours.spec.ts`:
  - build, publish as information-only, make bookable;
  - a program grid showing 1 of 2, then 2 of 2, then 1 of 2 departures for 8 guests;
  - content-admin and operator rights;
  - axe on five screens in Day and Night.

  The tests passed on a first run and on a third run on the same database. The second run had one failure under machine load 11–14; its log was overwritten before it was read. Bulk-creating sessions took more than 10 seconds under that load, so its assertions now allow 30.
- **Screenshots:** 36 in `docs/screenshots/batch-04d/`, at 375, 768 and 1440 px, Day and Night: the tours list, a tour as a catalogue admin and as a content admin, sessions, suppliers and a program with its grid.

**Placeholders:** only flagged sample tours exist. CONTENT-NEEDED #39–41 (tours, suppliers and prices, cancellation wording) come from Faris.

**Next:** Faris reviews the PR. Then Batch 4e (requests, offers and reservations) is briefed.

## 18 Oct 2026 · Batch 4e · Requests, offers and reservations

**Built** (branch `batch-04e-requests-offers`; migration `20261018001000_requests_offers`):
- **Requests (My journey → Cruise requests):**
  - route or flexible, date window, back-by date, nights, adults, each child's age, cabins, sharing notes, budget and notes;
  - the page says plainly that this asks for offers, with no bid or lowest price guaranteed.
- **Who sees a request (ADR-088):** operators with a published sailing that fits the route, dates and nights. They see the trip and the guests' ages, never the customer's details.
- **Offers (operator → Requests and offers):**
  - the operator picks a departure and, for each cabin, the cabin type (so the deck) and who sleeps there;
  - the price comes from their rates and child bands, unless they change it with a price note;
  - inclusions, terms, "who this offer is for" and an expiry (24 hours to 14 days, 72 by default);
  - sending holds no cabins;
  - offers can't be edited: a change sends version N+1, and the old version can't be accepted.
- **Accepting:**
  - the customer reads the terms and the cancellation policy, names every guest with a date of birth (plus the lead passenger's nationality), and accepts;
  - `public.accept_offer` re-checks the version, expiry, bookable gate and the ages on the departure date, takes the cabins with row locks in a fixed order, creates the reservation (`NC-XXXXXX`) with the terms and policy as shown, and closes the other offers.
- **Reservations:** customer, operator and admin views of the booking record. Status "awaiting payment" until 4f.
- **Bookable gate:** `public.departure_bookable`. A sailing is bookable only with a published vessel, an approved operator, a future scheduled departure, a cancellation policy, and a cabin type with a rate and fresh availability.
- **Cruise cancellation policies (ADR-088):** bands and wording in EN/ES/JA on the Cabins page, per vessel; schedule overrides exist in the data. The calculation comes in 4f.
- **Passenger data (SEC-013):** readable only by the customer, that operator's team and admins; changes are audited without copying the data.
- **Eligibility proof (ADR-078):** uploaded to a private bucket and checked by the operator. The wording is a marked draft (CONTENT-NEEDED #38).
- **Notices:** in-dashboard notices for new requests, offers, updates and reservations.
- **Admin "Requests and bookings":** every request, offer and reservation; search by reference, operator, route and dates; incomplete transactions; the booking record; an overview counter of current and upcoming bookings.

**Verified, and how:**
- **Static checks:** `pnpm verify` clean; 209 unit tests. New tests cover request checks, the offer price build-up (occupancy rates, child bands, under-3s, 12–17 at full price), versions and expiry, passenger ages on the departure date, and the bookable gate.
- **Database:** 15 pgTAP files pass. The new `150_requests_offers` has 31 checks:
  - the gate needs a policy; customers can't ask in someone else's name;
  - matching operators see the request, but not the customer's profile;
  - the cabins must hold everyone; expiry limits; E£ only for local plans;
  - the deck is recorded; sending holds nothing; offers can't be edited; a revision supersedes;
  - superseded, unread-terms and wrong-age acceptances are refused; acceptance takes the cabin;
  - passengers are visible only to the right people; not enough cabins means nothing is booked.
- **Concurrency (BATCH-PLAN exit criterion, ADR-084):** `tests/db-api/concurrency.test.ts` sends 20 simultaneous acceptances, through the real API, for the last 3 cabins. Exactly 3 reservations are made and availability ends at 0. The other 17 get plain refusals, never a deadlock or a server error. It passed on all five runs after the fixes and cleans up after itself.
- **End-to-end:** 5 new tests in `bookings.spec.ts`:
  - request → two operators' offers → a deck change (version 2; the old one is refused) → acceptance → reservation for customer, operator and admin, with inventory down and the other offer closed;
  - a second customer's acceptance when sold out books nothing;
  - admin search by reference; operators get 403 on admin pages; another customer gets 404;
  - axe on 12 screens in Day and Night.

  The tests passed twice in a row on one database.
- **Full suite** (two workers, as in CI): 117 of 119 passed. One older test expected "Offers" to still be unbuilt and now uses "Past trips"; one two-step sign-in timed out under load 15. Both files pass on a rerun.
- **Screenshots:** 66 in `docs/screenshots/batch-04e/`, at 375, 768 and 1440 px, Day and Night:
  - customer: the requests list, one request with two offers, the accept page, a reservation;
  - operator: the overview, requests and offers, the offer builder, a booking, the cabins page with the policy;
  - admin: Requests and bookings, and the booking record.

**Fixed while building:**
- A customer couldn't read the request they had just created: the read rule now checks their own id first.
- The sold-out message no longer claims the operator was told.
- Every offered cabin needs a guest aged 12 or over.
- After reviewing the screenshots: "4–4 nights" now reads "4 nights", one child reads "a child aged 7", and cancellation bands are described as ranges ("less than 30 days before departure") everywhere bands appear, tours included.

**Content needed:** CONTENT-NEEDED #4 (cruise cancellation policies) and #38 (eligibility wording). Until the policies are entered, real sailings stay unbookable.

**Next:** Faris reviews the PR. Then Batch 4f (payments, deadlines, cancellation and commission) is briefed.

## 18 Oct 2026 · Batch 4f-1 · Deadlines, payments, receipts, commission (first of two PRs, ADR-089)

**Built** (branch `batch-04f-payments`; migration `20261018001100_payments`):
- **Deadlines (ADR-027, DATA-039):**
  - set by the database when a reservation is made, and frozen after that;
  - 24 Dec–7 Jan and premium periods: 3 days; other October–April: 7; May–September: 14;
  - never later than the end of the day before departure;
  - Cairo calendar days, ending at Cairo midnight.
  - Reservations made before this batch were given deadlines from their booking day.
  - **Premium calendar:** finance admins edit it; Western Easter 2027 is seeded.
- **Release:** an hourly job cancels unpaid reservations past their deadline and returns the cabins, except those with a reported payment awaiting verification, which wait in the admin queue.
- **Paying:**
  - customers pay the outstanding balance by card through Stripe Checkout (US$ or €), after ticking the policy again;
  - or report a bank transfer with a private proof (the wording is a marked draft, CONTENT-NEEDED #5).
  - Card payments are recorded only from signature-checked Stripe webhooks, once per payment intent; a payment that arrives for a reservation no longer waiting is refunded straight back.
- **Admins (finance or super):**
  - verify or reject reported payments; record manual payments (method, reference, approver);
  - receipts NCR-YYYY-NNNNNN with a printable page;
  - payouts to operators recorded as transfers made elsewhere;
  - overview counter of payments awaiting verification.
- **Commission and payables (ADR-026):**
  - 10 % (a setting) of each received cruise payment, with the rest payable to the operator;
  - reversal entries are ready for 4f-2 refunds;
  - operator owners and finance see payables, payouts and balance, read-only.
- **Operators (ADR-089):** see payment status and send reminders (one per 12 hours); they can't record money.

**Verified, and how:**
- **Static checks:** `pnpm verify` clean; 236 unit tests. New tests cover deadlines at every boundary (23/24 Dec, 7/8 Jan, 30 Apr/1 May, 30 Sep/1 Oct, premium first and last day, the day before departure, last-minute bookings, Cairo midnight in winter and summer), commission and proportional reversal, the release decision, Checkout parameters, and webhook signatures (valid, wrong secret, tampered, too old).
- **Database:** 16 pgTAP files pass. The new `160_payments` has 30 checks:
  - a deadline is set at booking and can't be rewritten; a new premium period doesn't change existing reservations;
  - reports must be in the reservation's currency;
  - verification is refused to customers, operators and admins without two-step;
  - receipts, 10 % commission, part-payment and then confirmation;
  - payouts; payables visible only to the operator's owners and finance;
  - card payments only from the service role, a duplicate is ignored, a late payment is refunded;
  - release returns the cabin.
- **API tests:** 8 pass on a clean database.
- **End-to-end:** 6 new tests in `payments.spec.ts`:
  - card: the checkout button says cards are off without a key; a forged webhook gets 400; a signed webhook records the payment once; confirmed; receipt;
  - a reported transfer is verified by a finance admin, and the operator sees the payable;
  - operator reminders and the 12-hour limit, no record button, 403 on finance;
  - premium period and payout;
  - axe on 7 screens in Day and Night.

  The tests passed twice in a row on one database.
- **Full suite** (two workers, as in CI): all 125 passed.

- **Screenshots:** 42 in `docs/screenshots/batch-04f/`, at 375, 768 and 1440 px, Day and Night: a customer's unpaid and paid reservation and a receipt; the operator's bookings with payables, and an unpaid booking with the reminder; Deposits and commission, and an admin receipt. Fixed after review:
  - the deadline read "27 Oct 2026 00:00 Cairo", a day later than the last day to pay; it now reads "end of 26 Oct 2026, Cairo" (new unit test, winter and summer);
  - the Sailing section still said "payment requests arrive with deadlines" under the new Payment panel; it now says "Not paid yet (see Payment above)".

**Not verified until Faris adds Stripe test keys:** live Checkout (DATA-026, DATA-030 are "Built"). **Next:** 4f-2: cancellation and refunds, and tour orders.

### Where we stopped (18 Oct 2026, paused at Faris's request)
- **Branch:** `batch-04f-payments`, pushed. Everything below is committed. **No PR yet.**
- **Done for 4f-1:**
  - migration `20261018001100_payments`; deadline and commission logic; the Stripe webhook and Checkout;
  - customer, operator and admin finance screens;
  - pgTAP `160_payments`; e2e `payments.spec.ts`; ledger statuses; this entry.
  - Checks: verify, 236 unit tests, 16 pgTAP files, API tests and the full e2e suite (125) all pass locally.
- **Next, to finish 4f-1:**
  1. Take screenshots into `docs/screenshots/batch-04f/`, at 375, 768 and 1440 px, Day and Night:
     - customer: a reservation's payment panel (unpaid and paid) and a receipt;
     - operator: bookings with payables, and a booking with the reminder;
     - admin: Deposits and commission, and an admin receipt.

     Use `pnpm with-local-db pnpm build`, then `ENABLE_DEV_ROUTES=true pnpm with-local-db pnpm start --port 3100`, then `pnpm screenshots --batch 04f --as <email> [--password …] --routes …`. Rename ids by exact string only; an earlier regex rename broke names.
  2. Note the screenshots here, commit, open the PR "Batch 4f-1: Deadlines, payments, receipts, commission", wait for CI, and report to Faris.
- **Then 4f-2** (after Faris approves 4f-1): cancellation requests and the calculation (DASH-PAY-011, 012, DASH-CUS-010, DASH-OPR-015), refunds approved by finance/super admins through Stripe or recorded as manual (DATA-029, DASH-ADM-095, 104, 105), commission reversals, the admin queue and counter (DASH-ADM-005), and tour orders paid separately (DASH-PAY-014, DATA-027, 041).
- **Waiting on Faris:**
  - Stripe test keys (secret key and webhook signing secret), plus the account's country and whether it can charge E£;
  - CONTENT-NEEDED #4 (cruise cancellation policies), #5 (bank-transfer instructions), #38 (eligibility wording), #39–41 (tours);
  - PROPOSED-016, 017, 018.
- **Local machine notes:**
  - after a restart, start Docker, then `supabase stop --no-backup && supabase start`;
  - the Railway CLI is signed out (`railway login` is Faris's to run);
  - the ledger script needs `/usr/local/bin/python3` (it has openpyxl).

## 19 Oct 2026 · Batch 4f-1 merged; Stripe sandbox; Batch 4f-2a · Cancellation and refunds

**4f-1:** Faris approved it, and PR #15 was merged; staging deployed it. A follow-up fix, PR #16, was also merged: a Stripe webhook for a reservation this database doesn't have now gets 200 and is logged. One sandbox serves both local and staging, and these used to return 500 and be retried for days.

**Stripe sandbox (Faris, 19 Oct):**
- The account is registered in Spain, with euros by default. It can charge E£, US$ and €.
- Its secret key is in `.env.local` and in Railway's staging variables.
- A staging webhook endpoint was created through the API for `checkout.session.completed` and `checkout.session.async_payment_succeeded`. Its signing secret is in Railway.
- **Checked locally against the real sandbox:** the app's "Pay the balance by card" opens Stripe Checkout, and test card 4242 pays. Stripe's real event, passed to the local webhook, was recorded once and the duplicate ignored. The reservation was confirmed, and a receipt and commission entry were created.
- The e2e server now ignores a key in `.env.local`, so local runs match CI.

**Decisions from Faris on 19 Oct (memory and `docs/drafts/`, not yet built):**
- **Cancellation bands:** luxury and branded vessels (Sonesta, Mövenpick, Oberoi, Historia, Solai, Mayfair) are charged 0 / 15 / 50 / 100 % from 181 / 121 / 91 / 0 days. Other vessels are charged 0 / 25 / 35 / 50 / 100 % from 121 / 91 / 60 / 30 / 0 days. The EN wording is drafted; ES and JA drafts await a native speaker.
- **Bank transfer details:** Online Era (provisional), Emirates NBD, the account number and SWIFT code. The IBAN and the account's currency are still to come. They will be kept as a finance-admin setting.
- **Tours:** content comes from nilecruz.com/tours. Meet and Assist and airport transfers come out of the sightseeing programs and are sold separately; transfers are private only, and the other tours are sold private and shared.
- **Sailing time of day:** morning, noon or evening, especially from Aswan. To be proposed for a later batch.
- **Open question:** Faris's accountant is looking at whether Nilecruz should act as an agent rather than the seller (Stripe Connect can't make Egyptian operators the seller). If so, receipts, terms and the "payables" wording change; the money flow can stay.

### Batch 4f-2a: cancellation requests and refunds (branch `batch-04f-2-cancellations`, migration `20261019000100_cancellations`)

**Built:**
- **The calculation** (`app.cancellation_quote`, mirrored in `src/lib/payments/cancellation.ts`):
  - from the bands accepted at booking and the Cairo days before departure on the day the request arrives;
  - gives the charge (a share of the whole price, rounded half up), the refund (paid beyond the charge) and any charge still unpaid.
- **Customer:**
  - sees what cancelling today would cost, in words;
  - asks to cancel after ticking the policy, with an optional reason, and can withdraw while it's undecided;
  - follows the request through "requested", "refund being issued" and "cancelled", with each refund listed.
- **Operator (ADR-089):**
  - confirms the figures, or contests them with a note;
  - can't decide or refund.
- **Finance or super admin with two-step:**
  - approves or refuses on the booking record; a refusal needs a reason, which the customer sees;
  - approving cancels the reservation and returns its cabins. The charge stays as quoted, and the refund is refreshed against what has been received by then.
  - **Refunds:** "Refund to the card through Stripe" covers card payments, up to what is due, with idempotency keys. "Record a manual refund" covers the rest (how and reference).
  - Each refund is stored against the payment it gives back, with a proportional commission and payable reversal.
  - The request closes when everything due has been given back.
- **Queue:** "Cancellations and refunds" on Deposits and commission, plus an overview counter (it replaces the "arrives with 4f" placeholder).
- **Other changes:**
  - the release job leaves a reservation with an open request for the admin;
  - the balance now shows what was refunded.

**Verified, and how:**
- **Static checks:** `pnpm verify` is clean, with 261 unit tests. New unit tests cover every band edge of the luxury and standard bands (181/180, 121/120, 91/90, 60/59, 30/29, 0), refusal after departure, refunds, unpaid charges and rounding.
- **Database:** pgTAP passes, 17 files and 275 checks. The new `170_cancellations` has 31 checks:
  - the quote at 75 days (35 %);
  - another customer gets no quote;
  - the policy must be acknowledged;
  - one open request per reservation, and withdrawal;
  - the operator confirms, and contesting needs a note;
  - customers, operators and admins without two-step can't decide;
  - approval cancels and returns the cabin;
  - no Stripe plan for a transfer, and a manual refund can't exceed what is due;
  - closing, and commission net 10 % of the charge;
  - the card refund plan, Stripe refunds recordable by the service role only, never more than due, and a repeat changes nothing.
- **End-to-end:** `cancellations.spec.ts`:
  - ask → operator contests without a note (refused), then confirms → admin approves → the cabin is back;
  - the card refund says it's off with no key → manual refund → commission 7 000 / payable 63 000 → the customer sees the refund and the notice;
  - withdraw, then refuse with a reason;
  - axe on 6 screens in Day and Night.
- **Live Stripe refund against the real sandbox, run locally:**
  1. the customer paid by card on Stripe's sandbox Checkout (test card 4242), and the real event was recorded;
  2. the customer asked to cancel, and the `refunds@` admin approved with two-step;
  3. "Refund to the card through Stripe" created a US$1,300 refund that Stripe reports as **succeeded**, with our reservation and request ids in its metadata.

  It was recorded once, the request closed, and commission nets 7 000 against 63 000 payable. **DATA-029 is Verified.**
- **Full suites on a clean database:** e2e 129 passed, 97 skipped, none flaky (8.7 min); pgTAP 17 files, 275 checks.
- **Screenshots:** 48 in `docs/screenshots/batch-04f/` (prefix `4f2-`), at 375, 768 and 1440 px, Day and Night:
  - customer: the quote and form, a request waiting, and cancelled and refunded;
  - operator: the review form;
  - admin: the overview counter, the finance queue, the decision form, and a refund due with both refund forms.

  Fixed after review: a cancelled reservation no longer shows "Pay in full by" or the deadline rule.
- **Test set-up:**
  - a new local finance admin, `refunds@nilecruz.test`, is used by the cancellation tests. Two workers signing one admin in with the same two-step code made runs flaky.
  - `tests/support/sailing.ts` sets up a sample sailing with reservations.

**Notes:**
- The customer's cancellation form, the operator's review and the admin's decision disappear once used; the outcome is then read from the panel (as in ADR-076).
- With the sample bands the policy text reads "Cancelled less than 30 days before departure: 100 % charged". The real standard policy will show the same once entered.
- **Local machine:** Docker Desktop has 3.8 GB. Running two heavy jobs at once (a full check during the e2e suite) stopped Docker and caused auth timeouts. Run the suites one at a time.

**Next:**
1. Faris reviews the 4f-2a PR.
2. **4f-2b:**
   - tour orders paid separately (DASH-PAY-014, DATA-027, 041);
   - the 7 tours from nilecruz.com, with Meet and Assist and airport transfers sold separately, transfers private only;
   - the bank details as a finance-admin setting (#5);
   - the two standard cancellation policies as presets.
3. **Waiting on Faris:** the accountant's answer on the agent model; the bank account's currency and IBAN; tour prices and dates; ES/JA review of `docs/drafts/cruise-cancellation-policies.md`.

### Batch 4f-2b: bank details, standard policies, the tours from nilecruz.com (branch `batch-04f-2b-tours`, stacked on 4f-2a; migration `20261019000200_bank_details_transfers`)

**Split:** tour orders move to **4f-2c**. Until there are prices and dates, they'd sell nothing; the live site shows "Rates coming soon" for all seven.

**Built:**
- **Bank details for transfers (CONTENT-NEEDED #5):**
  - finance admins enter them under Deposits and commission → Bank details: holder, bank, account number, IBAN, SWIFT, account currency, note (`save_bank_details`, which accepts only known fields);
  - customers paying by transfer see them, with their reservation reference as the payment reference;
  - until they're entered, the page says to ask Nilecruz.
  - **The repository is public, so the details are never in the code or the seed.** Faris's details are to be entered on staging and production by a finance admin.
- **Standard cancellation policies (CONTENT-NEEDED #4):**
  - the Cabins page offers "Start from a Nilecruz standard policy: Luxury and branded vessels · All other vessels". The vessel's name suggests one: Sonesta, Mövenpick (with or without the accent), Oberoi, Historia, Solai or Mayfair as a whole word means luxury.
  - The preset fills the bands and an English paragraph; nothing is saved until the operator or admin saves.
  - The ES/JA drafts stay out of the app until a native speaker reviews them.
- **Tours (CONTENT-NEEDED #39):**
  - `docs/imports/nilecruz-tours.json` holds the 7 tours from nilecruz.com/tours, with Faris's 19 Oct rules applied:
    - the two sightseeing programs start at embarkation and end at the ship, with no meet and assist and no airport transfers (now "sold separately" under not included);
    - in the airport transfers the driver waits with your name, and meet and assist is sold separately;
    - excursions say "guide and vehicle", since they will be sold private and shared.
  - Added: "Meet and Assist: Aswan Airport" and "… Luxor Airport", with wording marked as a draft.
  - `pnpm import:tours` checks the file (the import refuses meet and assist or airport transfers in a program, and a transfer without "private"). `--apply --target=local|staging` inserts the tours as **private drafts**, never overwriting an existing slug. Production is refused.
  - The tours stay unbookable until an admin adds a supplier, bands and sessions.
  - **Staging import:** to be run with the staging service key once Faris approves.
- **Airport transfers are private only:** a trigger refuses a shared session for a tour of kind "transfer".

**Verified, and how:**
- **Unit:** 14 new tests: the import file is valid; programs exclude meet and assist and transfers; transfers private; bad slugs, durations and duplicates are refused; both presets are valid band sets; the luxury suggestion for 9 names, including accents and a near-miss ("Solaire").
- **pgTAP:** the new `180_bank_transfers` has 9 checks: customers and catalogue admins can't change the bank details; only known fields; holder and bank required; a finance admin saves and changes them; customers read them; a shared transfer session is refused and a private one accepted.
- **End-to-end** (`cancellations.spec.ts`, which runs serially with its own admin):
  - a finance admin saves bank details, and the customer of an unpaid reservation sees the holder, bank and SWIFT, no empty IBAN, and their reference;
  - the operator sees the suggestion, applies the luxury preset (band 1 = 181) and saves it, and the database holds exactly the four luxury bands.
- **Import, run locally:** a dry run, then `--apply --target=local` inserted 9 tours; a second run inserted 0.
- **Screenshots:** 24 in `docs/screenshots/batch-04f/` (prefix `4f2b-`): the customer's Pay section with bank details, the finance page with the bank form, the operator's Cabins page with the luxury preset, and the admin tours list with the 9 drafts.

**For Faris:**
1. **Unpaid reservations:** on an unpaid reservation, the cancel section correctly applies the policy ("US$700 of the charge would still be owed"). If unpaid reservations should simply be released without a charge, say so.
2. **Transfers wording:** in the transfers, the driver waiting with a name sign is part of the transfer. "Meet and assist" (a representative through the airport) is the separate product.

### Batch 4f-2c: tour orders (branch `batch-04f-2c-tour-orders`, stacked on 4f-2b; migration `20261019000300_tour_orders`)

**Built:**
- **Ordering** (DASH-PAY-014):
  - My journey → Tours and sightseeing lists the customer's tour orders and the tours bookable now. The rest of that section (suggestions with the cruise, past trips) stays with 4g.
  - The booking page shows the description, meeting point and the tour's cancellation bands in words. It takes the date and time (Cairo) with places left, every guest's age, the lead guest and notes (the flight for transfers), plus the terms ticked.
  - `order_tour` locks the session, then checks: bookable, adults only, places (shared), or one party per private session.
  - Price: per guest (under-3s free) or per group. The order, NT-XXXXXX, snapshots the bands and wording.
  - The places are held for **60 minutes**. An expired hold frees them at once, and a job closes it every 15 minutes.
- **Paying** (DATA-027): card through Stripe Checkout, payable until the hold ends (at least 30 minutes).
  - Recorded only from the signed webhook (`tour_order_id` in metadata), once, with a receipt number.
  - A payment for a released or cancelled order, or with the wrong amount, is refunded straight back.
  - Tour payments live in `tour_payments`, never in `payments`: no commission and no operator payable (DATA-041).
- **Cancelling:**
  - unpaid: the places are simply let go;
  - paid: the charge is by the tour's own bands, by Cairo days before the start, and fixed on the day of the request. A finance admin approves or refuses (with a reason) on Deposits and commission → Tour orders, then refunds to the card through Stripe or records a manual refund.
- **Test admin:** `orders@nilecruz.test` is a new local finance admin for the tour-order tests.

**Verified, and how:**
- **Unit:** the tour Checkout carries only the tour order id, never a reservation; the expiry follows the hold, at least 30 minutes.
- **pgTAP:** the new `190_tour_orders` has 30 checks:
  - the terms are required;
  - per guest with an under-3 free, per group;
  - places held, no overbooking; a private session takes one party, and a second is refused;
  - another customer sees nothing;
  - an expired hold frees the session, and the job cancels it;
  - customers can't mark an order paid; recorded once with a receipt; a late payment is refunded;
  - no cruise payment or commission;
  - the quote uses the tour's bands; requested; customers, and admins without two-step, can't decide; approved, and the places are free again;
  - never more than is due; the Stripe refund is recorded, and nothing more after that.
- **End-to-end:** `tour-orders.spec.ts`:
  - book 2 places (one under 3), held, "card payments off" with no key; a signed webhook records it and a duplicate is ignored; confirmed with a receipt; no cruise payment row;
  - ask to cancel (0 % at 40 days), the admin approves; the card refund is off with no key, so a manual refund; the customer sees it;
  - axe on 4 screens in Day and Night.
- **Live against the Stripe sandbox, run locally:** a tour order (2 guests, US$200) was paid on Stripe Checkout with 4242. Stripe's real event was recorded once, and the order was confirmed with receipt NCR-2026-000006, with no row in cruise payments. **DATA-027 is Verified.**
- **Full suites on a clean database:** verify with 277 unit tests; pgTAP 19 files and 314 checks; e2e 135 passed, 97 skipped, none flaky (8.6 min).
- **Screenshots:** 24 in `docs/screenshots/batch-04f/` (prefix `4f2c-`): the customer's tours page, booking page and confirmed order; the admin's tour order.
- **Local machine:** the earlier sign-in timeouts were memory. Supabase now runs without the log, analytics, studio and pg-meta services: `supabase start -x vector,logflare,studio,postgres-meta`. Docker uses about 1.2 GB instead of 3.8 GB.

**Batch 4f is now complete across four PRs (#15 merged; #17, #18 and this one stacked).** Still waiting on Faris:
- the agent-model answer;
- the IBAN and the account currency;
- tour prices, dates and suppliers;
- ES/JA review;
- approval to import the tours on staging.

## 20 Oct 2026 · Batch 4f merged; Batch 4g · My journey

**4f:** PRs #17, #18 and #19 are merged, and staging is deployed: the data deploy passed and the new pages are served.
- **Fixed while merging (on #19):**
  - two date-sensitive tests: a pgTAP tour session and the e2e sample sailing used UTC days, so they broke just after midnight in Cairo and across the 30 Oct summer-time change. Both now use Cairo dates and noon times;
  - the deploy's privileges check didn't list the five new tables (ADR-061).
- Decisions recorded as **ADR-090** (payments and tours, 19 Oct) and **ADR-091** (My journey sections).
- **PROPOSED-019**, sailing time of day, is approved for right after 4g.

### Batch 4g: My journey (branch `batch-04g-my-journey`, no migration)

**Built:**
- **Sections** (DASH-CUS-001, 002, ADR-091): Overview, Requests and offers (the offers list is linked from it), Bookings (cruise reservations, then tour orders), Tours and sightseeing, Past trips, Account (goes to Account security). URLs are unchanged.
- **Overview** (DASH-CUS-003):
  - **Needs your attention:** finish paying a held tour, live offers (with the first expiry), pay a reservation (with its deadline as the last day), eligibility proof for a local rate. Open cancellations and reported transfers are shown as waiting on Nilecruz, with nothing to do. Soonest first.
  - **Next trip,** with the tours booked for it.
  - **Coming up:** cruises and tours by date.
  - **Notices,** as before.
  - Worked out by `journeyState()` (`src/lib/journey/journey.ts`), from the customer's own records read under RLS. The clock is read on the server, not while rendering.
- **Tours that fit the cruise** (DASH-CUS-011): "Suggested for your cruise NC-…" lists bookable tours linked to that cruise's schedule, with places on a sailing day. Airport transfers and Meet and Assist are suggested only for embarkation and disembarkation days.
- **Past trips** (DASH-CUS-012):
  - finished or cancelled reservations;
  - past tours and lapsed holds;
  - closed or expired requests. Accepted ones already show as bookings.

**Verified, and how:**
- **Unit:** 13 tests for `journeyState()` and `suggestTours()`:
  - each action and its order; nothing for a new customer;
  - a cancellation replaces other actions; a reported transfer covers only what it covers;
  - a lapsed hold is past; offers counted only while live;
  - the next trip and its tours; a cruise under way stays current until the Cairo day after it ends (tested at 23:30 and 00:30 Cairo);
  - past lists; suggestions by schedule link and sailing day.
- **End-to-end** (`journey.spec.ts`, the exit criterion): a seeded customer with an unpaid, a paid, a cancelled and a local-rate reservation, a past trip, an open request with an offer, a closed request and a held tour order.
  - The Overview shows exactly their 4 actions in order, the next trip with its tour, and 4 items coming up.
  - Bookings shows 5 reservations and 1 tour order; the tour is suggested for the right cruise on the right day.
  - Past trips shows exactly the cancelled and the finished cruise and the closed request.
  - Another customer sees none of it; axe in Day and Night.
- **Full suites on a clean database:** verify; pgTAP 19 files and 314 checks; e2e 140 passed, 97 skipped. One existing admin two-step test passed on retry.
- **Screenshots:** 30 in `docs/screenshots/batch-04g/`. Fixed after review: reservation deadlines read "by end of 27 Oct 2026, Cairo" instead of "28 Oct 00:00", and "Coming up" lines start with the reservation reference.

**Next:** PROPOSED-019, the sailing time of day, then Batch 4h (travel partners).

### PROPOSED-019: sailing time of day (branch `proposed-019-sailing-time`, stacked on 4g; migration `20261020000100_sailing_time`)

Faris asked for each sailing to be marked morning, noon or evening, because guests on a morning sailing (especially from Aswan) arrive the day before and do their sightseeing then. Approved on 20 Oct (ADR-091).

**Built:**
- **Database:**
  - `schedules.sailing_period` (morning, noon or evening) and an optional exact `sails_at` time, Cairo time;
  - both optional, so feeds and older schedules keep working;
  - a rule refuses a time outside its period: morning before 12:00, noon 12:00–15:59, evening from 16:00.
- **Operators and catalogue admins:** "Sails on the first day" and "Exact time (optional)" on the schedule form.
  - A time on its own decides the period.
  - A mismatch is refused in plain words ("13:00 is around noon; choose that, or correct the time").
  - The schedules list shows the time.
- **Travellers:**
  - offers, the reservation's Sailing section, and the Overview's next trip say "Sails from Aswan in the morning (08:00 Cairo time)";
  - a morning sailing adds "plan to arrive in Aswan the day before. That day is free for sightseeing."
  - "Suggested for your cruise" includes the day before a morning sailing, for sightseeing and for airport transfers or Meet and Assist on arrival.

**Verified, and how:**
- **Unit:** 13 new tests: period boundaries (11:59, 12:00, 15:59, 16:00), invalid times, the wording, the tip, and suggestions for the day before (morning only).
- **pgTAP:** the new `200_sailing_time` has 6 checks on the time-in-period rule.
- **End-to-end** (`sailing-time.spec.ts`): the operator's 13:00 is refused for a morning sailing and 08:00 is saved; the customer's reservation shows the time and the tip, and the Overview's next trip shows the tip.
- **Full suites on a clean database:** verify with 303 unit tests; pgTAP 20 files and 320 checks; e2e 141 passed, 97 skipped. One older catalogue CSV test passed on retry.
- **Screenshots:** 12 in `docs/screenshots/batch-04g/` (prefix `p019-`): the operator's schedule form with "Morning, 08:00", and the customer's reservation with the time and the tip. Fixed after review: the tip no longer repeats the sailing time; it now says "Plan to arrive in Aswan the day before. That day is free for sightseeing."

**Next:** Batch 4h, travel partners.

## 20 Oct 2026 · Batch 4h-1 · Travel partners: applying, approval, team, trade and company rates, search

Brief approved by Faris as recommended (ADR-092): company rate, then trade, then public rate; the same 10 % commission; the client record shows the agency and its selling price, with "Booked through Nilecruz" in small print; partners pay like customers; two pull requests. Branch `batch-04h-partners`, stacked on PR #21; migration `20261020000200_partners`.

**Built:**
- **Applying** (DASH-B2B-011, DASH-ADM-086): "Apply as a travel partner" at `/account/apply-partner/`.
  - It asks for the agency name, legal name, country, registration or licence number, website, and a contact name and phone. The database requires the country, registration and contact.
  - EN wording, with ES/JA drafts (CONTENT-NEEDED #28).
  - Linked from My journey.
- **Admin → Travel partners** (DASH-ADM-086–088):
  - a list with a status filter, and a page per agency showing its company and registration details and its team;
  - approve, pause or reject (a reason is needed unless approving). Pausing keeps everything.
- **Paused agencies:** the workspace stays open with a notice. The Overview, bookings and payments stay visible (bookings and payments arrive in 4h-2); search, requests and team management are off.
- **Team** (DASH-B2B-009, 010):
  - the team page and actions are now shared by operators and partners (`dashboard/_team/`);
  - partners can invite reservations or finance users only. The database refuses viewer roles for partner companies.
  - **Fixed:** accepting an invitation always went to the operator workspace; it now goes to the company's own workspace.
- **Company rates** (DASH-B2B-012):
  - `partner_rates` holds a trade price for one named agency, set from the operator's rates form ("Only for one travel partner", Trade plan) and listed on the departure page with a remove button;
  - it is a separate table, so `rates`, its feeds and its API keep their key;
  - the same consistency trigger applies, rebased on its latest definition so child bands still never change on an existing rate.
- **Search** (DASH-B2B-001, 002, ADM-089):
  - `partner_search` is for owners and reservations users of approved agencies only;
  - it returns bookable departures with fresh availability and, per cabin and occupancy, the company rate, then the trade rate, then the public rate;
  - partners never read the rate tables.
  - The search page prices one cabin for the guests with the offer rules (`groupSearch`) and labels the rate used.
- **Tests:** `freshCode` now guards two-step codes across test workers (a lock file per admin account). Two workers signing in as the same admin in the same 30-second window had made admin tests flaky.

**Verified, and how:**
- **Unit:** 5 new tests: pricing at the rate the database chose (company for a single, trade for a double), children and infants, a party too big for the cabin, sorting, and children's ages.
- **pgTAP:** the new `210_partners` has 24 checks:
  - company rates are for partner companies only, take the operator's child bands, and are listed by name for operators only;
  - the public is refused rates; customers and partners read no trade or company rate;
  - tier order per agency; one agency can't search as another; finance users and operators can't search;
  - the application needs registration details, one application at a time, no search until approved;
  - pausing stops search and keeps the team; partner teams have no viewers.
- **End-to-end:** `partners.spec.ts`: apply (missing fields refused), admin approves; the owner invites reservations and finance colleagues, who join; the operator sets a US$700 company rate and the agency sees US$1,400 for two, "Your company rate"; the finance user gets 403 on search; pause (reason required) with a notice and search refused, then re-approve; axe on 6 screens in Day and Night.
- **Full suites on a clean database:** verify with 308 unit tests; pgTAP 21 files and 344 checks; e2e 147 passed, 97 skipped. One catalogue test passed on retry: the two-step page was slow under load. That's better than before the guard (1 failed, 1 flaky).
- **Screenshots:** 36 in `docs/screenshots/batch-04h/`: the application form, the agency's Overview, search results at the company rate and Team, and the admin list and agency page.
- **Fixed after review:** re-approving an agency left the old pause reason on its page; approving now clears it (e2e checks).

**Next:** 4h-2: reserving for clients, company requests and offers, company bookings and payments, client references, selling totals, and the client booking record.

### Batch 4h-2a: Partners book for their clients (branch `batch-04h-2-bookings`, stacked on 4h-1; migration `20261020000300_partner_bookings`)

**Split:** 4h-2 became two PRs. This one, **4h-2a**, covers reserving, company bookings and payments, client details and the client record, and meets the batch's exit criterion. Company requests and offers (DASH-B2B-004) follow in **4h-2b**.

**Built:**
- **Company bookings in the database:**
  - `reservations.buyer_org_id`, `buyer_name` and `booked_by`. `offer_id` may now be empty, but only for a company booking (check constraint).
  - `app.acts_for_reservation` replaces the customer-only checks in `report_payment`, `request_cancellation`, `withdraw_cancellation` and the proof uploads. Those functions were lifted from their current definitions with only that line changed.
  - Roles: owners and finance users pay; owners and reservations users upload eligibility proof; anyone with a role asks to cancel.
  - `app.can_read_reservation` adds the buyer company's people.
- **Private client details:** `partner_booking_details` holds the client reference and the agency's selling total. Only the agency (and admins) can read it, and only owners and reservations users edit it. Operators never see it.
- **`partner_reserve`:**
  - only approved agencies' owners and reservations users can use it;
  - it prices each cabin at the agency's rate (company, then trade, then public; children by bands, infants free) with `app.partner_cabin_price`, which mirrors `linePrice`;
  - it checks the guests (adults by count, children by exact age on the departure date), takes the cabins under row locks, records passengers and client details, and notifies the operator ("Trade booking … from <agency>") and the agency.
  - Rate plan: trade when a company or trade rate applies.
- **Screens:**
  - search results get a "Reserve" link;
  - the reserve page books 1–5 cabins of the party, every guest named, with the client reference, the selling price and the terms ticked;
  - **Company bookings** and the booking page: the client panel with the supplier total, selling price and difference; payment (card or transfer, for finance and owners), cancellation, and the full record;
  - **Payments**; and the **client booking record** (agency name, client reference, trip, cabins, guests, the cancellation terms, the selling price, "Booked through Nilecruz" in small print).
  - Operators see "Trade booking for <agency>" on the booking and in their list.
  - Company bookings stay out of the booker's own My journey.
- **Fixed on the way:** reservations now have two links to organisations, so four embeds through reservations (payments, cancellation queue, booking search) are hinted at the operator link. They would have failed at runtime.

**Verified, and how:**
- **pgTAP:** the new `220_partner_bookings` has 18 checks:
  - finance users can't reserve; mismatched guest ages are refused;
  - booking at the company rate as trade for the agency, with the cabin taken; a 7-year-old pays 50 %;
  - finance users see the bookings and the selling total; the operator sees the booking but not the details; another agency sees nothing;
  - reservations users edit the client reference, finance users can't;
  - reservations users can't report payments, finance users can; reservations users ask to cancel, another agency can't;
  - a paused agency can't reserve.
  - 150, 160 and 170 still pass.
- **End-to-end** (`partner-bookings.spec.ts`, **the batch exit criterion**) with the seeded Sample Partner team:
  - the reservations user finds US$1,400 for two at the company rate and reserves for a client with a reference and a US$1,800 selling price, so the difference is US$400; there's no pay button for them, and the booking isn't in their own My journey;
  - the finance user pays through a signed webhook, the booking is confirmed and listed in Payments, and they can't edit the client details;
  - the owner's client record shows the agency, the client reference, US$1,800 and the guests, and never US$1,400 or bank details;
  - the operator sees "Trade booking for Sample Partner" but not the selling price or client reference;
  - axe on 5 screens in Day and Night.
- **Full suites:** `pnpm verify` (308 unit tests, lint, types) and a production build against the local database; pgTAP, all files; end-to-end with `CI=1`: 147 passed, 1 flaky (a catalogue test that passed on retry, load on this machine), the rest skipped as usual without the local stack.
- **Screenshots:** 30 in `docs/screenshots/batch-04h/` (prefix `4h2-`): reserve, company bookings, booking, client record and payments, at 375, 768 and 1440 in Day and Night.

### Batch 4h-2b: Company requests and offers (branch `batch-04h-2b-requests`, stacked on 4h-2a; migration `20261020000400_partner_requests`)

The second 4h-2 PR. With it every Batch 4h requirement is Verified, and every dashboard section in the nav is built.

**Built:**
- **Company requests in the database:**
  - `cruise_requests.buyer_org_id` and `buyer_name`. A trigger takes the name from the database and stops a request changing hands.
  - Only owners and reservations users of an approved agency (`can_trade`) can create one, so a paused agency can't ask.
  - The company's owner and reservations users read its requests and their offers; finance users don't. A requester who leaves the company loses access.
  - Customer-only checks now also require `buyer_org_id is null`.
  - Operators get "New cruise request from a travel partner".
- **`send_offer`:** lifted from its current definition with two changes. The trade plan is refused on a customer's request (ADR-092), and the company, not the requester, is told about new and revised offers.
- **`accept_offer`:** lifted with only the company path added:
  - the company's owner or reservations users accept while the agency can trade;
  - the reservation belongs to the company (`buyer_org_id`, `buyer_name`, `booked_by`), with an empty client-details row;
  - the operator is told "trade booking … from <agency>", and the company is told instead of a person.
- **Screens:**
  - Partner **Requests and offers**: the company's requests and the shared request form (now `RequestFields` and `parseRequest`, also used by My journey);
  - one request with its offers side by side, and its status once accepted or closed;
  - **Accept for your client**: terms, policy, every guest named, the client reference and selling price, then the booking page;
  - operators see a "Travel partner" badge in their list, a notice on the request, and the rate plan defaults to Trade (Trade isn't offered for customers' requests);
  - the partner overview links to requests.
  - Company requests stay out of the requester's own My journey.
- **Tests made independent of leftover data:** two counts in `210` and `220` are scoped to the test's own sailing, so they pass after end-to-end runs too.

**Verified, and how:**
- **pgTAP:** the new `230_partner_requests` has 17 checks:
  - finance users and customers can't send a request in the agency's name; a reservations user can, and the company name comes from the database whatever is sent;
  - the owner sees the company's request; finance users and customers don't; the operator sees it marked as a travel partner's;
  - the operator offers at the trade rate, but not on a customer's request; the company's reservations users see the offer, and the company is told;
  - finance users can't accept; the owner accepts a colleague's request, and the result is a company booking at the offered trade price, with a client-details row;
  - a customer's request can't be moved to a company; a paused agency can't ask.
  - The full suite on a freshly reset database: 23 files, 379 checks.
- **End-to-end** (`partner-requests.spec.ts`, 6 tests):
  - the reservations user sends a request from the form, and it isn't in their own My journey;
  - the operator's list shows "Travel partner", the request shows the notice, and the rate plan defaults to Trade;
  - the owner compares offers, accepts with guests, the client reference and US$2,000 against the US$1,600 offer (a US$400 difference shown), the request shows as accepted, and the booking is in Company bookings;
  - finance users get 403 on Requests and offers;
  - axe on 2 screens in Day and Night.
  - `dashboard.spec`'s placeholder test now checks that the section is built.
- **Full suites:** `pnpm verify` (308 unit tests, lint, types) and a production build against the local database; end-to-end with `CI=1`: 160 passed, none failed or flaky (97 skipped as usual).
- **Screenshots:** 30 in `docs/screenshots/batch-04h/` (prefix `4h2b-`): the partner's requests, one request with two offers, and accept; the operator's list and request with the travel-partner notice; at 375, 768 and 1440 in Day and Night. Long sample-sailing names (test run IDs) overflow headings at 375, as on earlier pages; real names are short.

### Batch 5-1: The marketplace listings (branch `batch-05-marketplace`, stacked on 4h-2b; migration `20261020000500_public_listing`)

The first of two Batch 5 PRs (ADR-093). 5-2 adds the vessel page, the deck selector, prices after sign-in and reserving. Until then, cards link to vessel pages that don't exist yet, so **5-1 and 5-2 should reach production together**.

**Built:**
- **The one public price** (`public_vessel_prices`, for visitors): per published or showcase vessel, the "from" price and whether anything is bookable. It is the lowest international per-person price for two sharing, over bookable departures in the next 12 months, on cabin types with confirmed places, US$ before €. Rates and inventory stay closed to visitors.
- **Public data:** read as an anonymous visitor (no cookies), so row-level security decides what is public. It is cached under the `catalogue` tag:
  - refreshed by vessel, cabin, schedule, rate, inventory, evaluation and operator-approval changes in the dashboards, by feed pulls and by the inventory API;
  - refreshed by a signed `/api/internal/catalogue/refresh/` (the scheduler's secret, with its own message so a feed-pull signature can't be replayed);
  - and refreshed every ten minutes, because confirmed inventory goes stale with time.
  - Builds without a database (Lighthouse in CI) render an empty marketplace. Sample vessels never appear where indexing is on (production).
- **`/cruises/`:** breadcrumb, H1 "Compare Nile cruises", CruiseSearch (routes, dates and match counts from real departures), the five facet links and the cards.
  - A search is a parameter on the hub: canonical to `/cruises/`, `noindex`, with "N vessels · N matching departures".
- **Five filtered pages**, static and refreshed like the data: `/cruises/dahabiyas/`, `/motor-ships/`, `/luxury/` (category luxury only), `/luxor-to-aswan/` and `/aswan-to-luxor/`. Other facet slugs return 404.
- **Cards:** type, route and nights of the shortest itinerary, **maximum guests**, "NN/100 · Nilecruz evaluation" when published, and the "from" price per person or "Prices in preparation". Never stars. "Information only" for showcase or unbookable vessels, which show no price; "Sample data" on samples. A note explains the price basis and that gratuities are separate.
- **Comparison:** "Compare" ticks (up to three; the card's checkbox can now be controlled by its parent) open `/cruises/compare/?v=…`, `noindex`. It shows type, guests, cabins, decks, evaluation, the "from" price and itineraries.
- **Structured data:** BreadcrumbList, then CollectionPage with ItemList, escaped for script tags. No AggregateRating or Offer on listings.
- **Photos:** signed links to the private media bucket, valid for a day (longer than any cached page), allowed in `next/image`.
- Copy is English; `/es/` and `/ja/` show the same pages until Batch 10 (ADR-093).

**Verified, and how:**
- **Unit** (`marketplace.test.ts`, 13 tests):
  - the five facets (all reserved slugs; luxury excludes deluxe; direction matters), sorting, and card props (guests, score, one price, no stars; "Information only" with no price);
  - search routes and dates from real departures, the search form parsing, match counts;
  - BreadcrumbList, a CollectionPage with no ratings or offers, script-safe JSON-LD, the comparison's slug rules, and refresh signatures kept apart from feed pulls.
- **pgTAP** `240_public_listing` (10 checks):
  - the lowest international two-sharing price, US$ before €, ignoring trade, local, single-occupancy, sold-out and next-year rates;
  - showcase vessels are information only, private vessels absent, and rates and inventory still closed to visitors;
  - stale inventory, a missing policy or a paused operator removes the price, which returns when the operator is approved;
  - a € price stays in €.
  - The full suite on a freshly reset database: 24 files, 389 checks.
- **End-to-end** (`marketplace.spec.ts`, 8 tests):
  - the signed refresh;
  - the hub's card (60 guests, 80/100, US$1,000, sample flag, no stars), the showcase ship as information only, the canonical and structured data;
  - the five facets and a 404 for an unlisted one;
  - a search narrowed to one vessel and one departure, `noindex` with the clean canonical;
  - comparing two vessels from the ticks;
  - a vessel taken off sale disappearing after a refresh;
  - axe on three screens in Day and Night.
- **Full suites:** `pnpm verify` (321 unit tests, lint, types, format) and a production build against the local database; end-to-end with `CI=1`: 167 passed, 1 flaky (an admin two-step sign-in in the cancellation accessibility test, which passed on retry).
- **Screenshots:** 24 in `docs/screenshots/batch-05/` (prefix `5-1-`): the hub, `/luxury/`, `/aswan-to-luxor/` and a three-vessel comparison, at 375, 768 and 1440 in Day and Night.

### Batch 5-2: Vessel pages and reserving (branch `batch-05-2-vessel`, stacked on 5-1; migration `20261020000600_direct_reserve`)

The second Batch 5 PR, and the batch's exit criterion: listing → vessel → sign-in → reserve. With it, 32 of Batch 5's 34 requirements are Verified. Two stay **In progress** until later batches build their link targets (ADR-093):
- SEO-013 (links to the vessel-type hub and destinations);
- DATA-018 (the link to `/tours-extras/transfers/`; the text is already there).

**Built:**
- **Direct bookings in the database:**
  - `reservations.direct`: a direct booking has neither an offer nor a buying company, so `offer_or_buyer` became `has_source`.
  - `app.public_cabin_price` prices at the international rate only (child bands; adults 18 and over).
  - `customer_reserve`, adapted from `partner_reserve`: signed in; 1–5 cabins (more go through a request); every guest named and matched by age; cabins taken under row locks. The terms say check-in to check-out, with transfers, flights and tours not included. The operator and the customer are told.
  - `vessel_departure_prices` (signed in only): per departure and cabin type, the published price alone and for two or three sharing, places left from confirmed inventory, and whether it's bookable.
  - `public_party_price` (signed in only) quotes the party exactly as `customer_reserve` will charge it.
- **The vessel page** `/cruises/{slug}/`:
  - a static page per vessel, refreshed with the catalogue. Facets and vessels share the `[slug]` route, which SEO-030's reserved slugs keep apart.
  - Breadcrumb up to its type facet; H1 "{name} — {route}, {nights} nights"; facts (guests, cabins, decks, year, evaluation, "from" price).
  - **See prices and dates**, or for an information-only vessel **Ask for an offer** (a request prefilled with the route, a two-week window and the nights).
  - Gallery, About; the evaluation (score, verdict, date, evaluator, seven weighted dimensions as meters) and external ratings (source, scale, count, date checked, "not Nilecruz reviews").
  - Every itinerary is rendered on the server and `?itinerary=CODE` picks one in the browser, so the page stays static and the canonical stays the vessel URL. Each itinerary shows check-in to check-out with transfers not included, the sailing time and the arrive-the-day-before tip, the day-by-day programme and the next departures in the visitor's language.
  - **Cabins and decks:** a schematic by deck ("not a floor plan … your cabin number is assigned by the operator"), with cabin facts and no prices, or a plain empty state.
  - TouristTrip with an AggregateOffer from the "from" price only.
- **Prices and dates** `/cruises/{slug}/reserve/` (sign-in required, `noindex`):
  1. a departure, with its lowest two-sharing price;
  2. a deck and cabin type (radio groups by deck, with price, the single price, "Only N cabins left" from confirmed inventory, sold-out cabins disabled), the adults, children's ages and number of cabins;
  3. the exact total, the cancellation bands, every guest, then the terms and **Reserve**, which leads to the booking in My journey with its payment deadline (the 4f flows).
- **Amenities:** cabin amenities are free text, so they are listed on each cabin. The AmenityGrid component waits for structured vessel amenities.

**Verified, and how:**
- **Unit** (`marketplace-vessel.test.ts`, 10 tests):
  - the itinerary choice and H1; decks in order;
  - dates in English, Spanish and Japanese;
  - TouristTrip offering only the "from" price and no rating, and no offer for information-only vessels;
  - one currency per cabin (US$ first); per-person prices by beds (infants under 3 don't take one);
  - scarcity only at three or fewer; the prefilled request's rules.
- **pgTAP** `250_direct_reserve` (12 checks):
  - visitors get no departure prices and can't reserve;
  - a signed-in customer sees the published prices alone and two sharing, never trade, with places left;
  - unnamed guests and six cabins are refused;
  - a parent and a 7-year-old book at US$1,200 (the child at 50 %) as a direct international booking; the cabin is taken and the operator is told;
  - stale availability isn't bookable and can't be reserved.
  - The full suite on a fresh database: 25 files, 401 checks.
- **End-to-end** (`marketplace-vessel.spec.ts`, 6 tests, **the exit criterion**):
  - from the listing card to the vessel page: H1, breadcrumb, check-in to check-out, the morning sailing and arrive-the-day-before tip, the programme, the schematic deck, 80/100, the external rating, one public price, TouristTrip with `lowPrice` 1000.00 and no rating;
  - `?itinerary=CX7` switches to the 7-night itinerary with the same canonical;
  - the information-only ship offers a request and shows the empty deck state;
  - **listing → vessel → sign-in → reserve**: "See prices and dates" asks for sign-in and comes back; departure, Main deck · Double, 2 adults, US$2,000, two guests, terms, **Reserve**, then the booking in My journey;
  - the prefilled request form;
  - axe on the vessel page and all three reserve steps in Day and Night.
- **Full suites:** `pnpm verify` (331 unit tests, lint, types, format) and a production build against the local database; end-to-end with `CI=1`: 174 passed, none failed or flaky.
- **Screenshots:** 30 in `docs/screenshots/batch-05/` (prefix `5-2-`): the vessel page, the information-only ship, and the three reserve steps signed in, at 375, 768 and 1440 in Day and Night.
- **Noticed, not changed:** the public header shows "Sign in" even when signed in (it doesn't read the session yet; since Batch 1).

### Fix: the public header follows the session (branch `fix/header-session-state`, stacked on 5-2, no migration)

**What changed:** the public header said "Sign in" to everyone, signed in or not (since Batch 1). Now a signed-in visitor sees **Account** (their dashboard) and **Sign out**.
- Public pages stay static and cached (PERF-010): the server still renders "Sign in", and a small client island (`HeaderAccount`) asks the new `GET /api/session/` (`{ signedIn }`, `private, no-store`) after load. The session cookies stay httpOnly and Supabase is still never used from the browser (SEC-005).
- `/api/session/` makes no network call for visitors without a session cookie; otherwise it validates the token with `getUser()`, so a revoked cookie counts as signed out.
- **Sign out** posts to this language's `/account/sign-out/` (same-origin POST, SEC-005). **Account** goes to `/dashboard/` (English only, DASH-BND-006).
- Without JavaScript the header keeps "Sign in", which leads signed-in visitors on to their dashboard.
- NavBar's `account` prop also accepts a render function given the link's class.

**Verified, and how:**
- **End-to-end** (`auth.spec.ts`, "the public header follows the session", 2 tests): signed out, `/cruises/` shows Sign in; signed in, it shows Account (to `/dashboard/`, then My journey) and Sign out, and a statically generated page (`/cruises/dahabiyas/`) still isn't served `no-store`/`private`; Sign out from `/es/cruises/` lands on `/es/` with "Iniciar sesión" and the session is gone; without JavaScript a signed-in visitor still sees Sign in.
- `pnpm verify` (331 unit tests, lint, types, format); `pnpm build` keeps the `/cruises/{slug}/` pages static (●); `/cruises/` was already rendered per request for its search parameters, with its data cached under the catalogue tag.

### Faris's answers of 20 Oct 2026: agent model, free cancellation of unpaid bookings, ES/JA wording (branch `agent-model-unpaid-cancellation`, stacked on #27; migration `20261020000700_agent_model`)

ADR-094 records the answers. The accountant's advice is that Nilecruz acts as the operators' **booking agent**; an unpaid booking owes **no** cancellation charge; the Spanish and Japanese cancellation wording is approved; the bank account is in USD (IBAN later). The 9 tours were imported into staging as private drafts the same day (`pnpm import:tours --apply --target=staging`: 9 inserted, none already there).

**Built:**
- **Agent model:**
  - `reservations.seller_name`: the operator's legal name, or its display name, set by the database at booking and backfilled for existing reservations. Customers can't read companies, so the name is a snapshot.
  - The booking record shows "Sold by …, the operator; booked through Nilecruz as its agent".
  - Receipts read "Received by: Nilecruz, as booking agent", with "On behalf of (seller)", and say the commission is included in the price.
  - The terms ("What Nilecruz does") now say the operator sells and provides the cruise, the contract for the cruise is with the operator, and Nilecruz books and collects payment on its behalf for a commission.
  - Direct bookings' terms read "Booked through Nilecruz, acting as booking agent for the operator of …".
  - The operator and admin payables text says Nilecruz receives payments as the operator's booking agent.
- **Unpaid bookings cancel for free:**
  - `app.cancellation_quote` and `decide_cancellation` never record an unpaid charge, existing rows were zeroed, and the constraint `no_unpaid_charge` keeps it that way.
  - `quoteCancellation` returns `keptMinor` (never more than was paid) instead of an unpaid charge.
  - One sentence, `cancellationOutcome`, on the customer and partner booking pages covers every case: costs nothing; a part payment is kept and nothing more is owed; the excess is refunded; all of it is refunded.
  - The "Charge not yet paid" row is gone from the cancellation panel.
  - The terms say the charge only ever comes out of what was paid.
- **ES/JA presets:** both standard policies now fill English, Spanish and Japanese, using the reviewed texts.
- **Open (ADR-094):** whether tours and extras, which have no operator and no commission and are still described as sold by Nilecruz, also follow the agent model.
- **Housekeeping:**
  - ESLint and Prettier now ignore `.claude/`, where other sessions' worktrees (whole copies of the repository) live.
  - The tour-rates sheet for Faris is in `docs/imports/tour-rates-template.xlsx`: shared, private, programs, transfers, meet and assist, seasons and questions, ready for the calendar-booking brief.
  - Earlier build-log lines said `pnpm verify` includes the build. It doesn't; the build ran separately each time, and those lines are corrected.

**Verified, and how:**
- **Unit:** `cancellation.test.ts` covers the kept amount, nothing owed and the booking-page sentence in each case; `tour-import.test.ts` checks the presets in three languages. `pnpm verify`: 335 tests, types, lint, format.
- **pgTAP:**
  - `170` now expects nothing owed on an unpaid booking.
  - The new `260_agent_model` (4 checks): the seller's legal name on a direct booking, the agent wording in its terms, an unpaid booking's quote (100 % on paper, nothing refunded, nothing owed), and the constraint refusing an unpaid charge.
  - The full suite on a fresh database: 26 files, 405 checks.
- **End-to-end:**
  - the direct booking shows the agent terms, "Sold by …, the operator; booked through Nilecruz as its agent" and "You have paid nothing yet, so cancelling costs nothing";
  - the receipt shows "Nilecruz, as booking agent" and "On behalf of (seller)".
  - Full run with `CI=1` on a production build against the local database: 173 passed.
  - The one failure was the catalogue-refresh test. Another worker can re-cache `/cruises/` from data read just before the refresh, so the test now refreshes and reloads until the change shows, as a visitor would see it (at worst it waits for the 10-minute expiry). Marketplace, vessel and partner specs together: 20 passed.

### Oberoi Zahra on staging, and manual availability for 7 days (20 Oct 2026; branch `freshness-week`; migration `20261020000800_freshness_week`)

**On staging:** set up at Faris's request, with his rate of US$1,500 per cabin per night.
- The Oberoi Zahra (`/cruises/oberoi-zahra/`) is published and bookable:
  - an approved test operator, "Oberoi Zahra (staging test operator)", with no login;
  - category luxury; 27 cabins, 54 guests, 5 decks and built 2007, taken from the duplicate import record `the-oberoi-zahra-luxury-nile-cruiser`, which stays private for an admin to merge;
  - one Suite cabin type sleeping 2, with 10 cabins available on each departure;
  - Luxor → Aswan, 4 nights, on Mondays, and Aswan → Luxor, 3 nights, on Fridays: 104 departures over 12 months;
  - per person, two sharing: US$3,000 (4 nights) and US$2,250 (3 nights); alone: US$6,000 and US$4,500;
  - the luxury cancellation policy in EN/ES/JA.
  - The itineraries, sailing days, cabin type and number available are my assumptions and need confirming.
- The live `/cruises/` shows it "From US$2,250 per person".

**ADR-095:** manual and pasted availability now counts as confirmed for 7 days.
- Staging's setting was changed at once, so the Zahra stays bookable.
- The migration makes 7 days the default everywhere, and `FRESHNESS_HOURS` matches it.
- The operator inventory and schedule pages show the live thresholds with `hoursText` ("7 days").

**Verified:**
- unit `product.test.ts` (7-day expiry for manual and pasted; thresholds in words): 336 tests in all;
- pgTAP `120` checks manual availability is fresh at 6 days and stale at 8; on a reset database, 26 files and 405 checks;
- end-to-end connections, product and marketplace specs on a local production build: 22 passed.

### Batch 6-1: Home and the Vessels silo, with the linking engine (branch `batch-06-education`; migration `20261021000100_vessel_type_stats`)

The first of two Batch 6 PRs (ADR-096). 6-2 adds Prices Explained, with the calculator, and the Guide.

**Built:**
- **Linking engine** (SEO-008–014):
  - `scripts/link-map.py` (`pnpm links:map`) turns the silo workbook into `src/lib/seo/link-map.json`: 102 pages, felucca rows removed (ADR-008).
  - `src/lib/seo/links.ts` derives each page's breadcrumb, its one link up, children, up to three siblings ("Keep reading"), bridges and closing listing.
  - Links go only to pages listed in `BUILT` (ADR-093). Anchors are the target's keyword, with place names capitalised.
  - **CI link check** (`silo-links.spec.ts`): every built education page against its row (H1, breadcrumb, every required link, nothing outside the row, every link answering 200, no "click here" anchors).
- **Content** (ADR-096):
  - Each page is an `article` in Sanity with its workbook row (`pageId`), a review status ("Draft for review" until approved), page FAQs and an optional close-variant anchor for the link up. The Studio schema is updated and validated.
  - The drafted copy for nine pages is in `src/content/pages/`. `pnpm seed:content --apply` loaded it into the development dataset; production waits for review.
  - The site reads Sanity and falls back to the repository drafts where Sanity isn't configured (CI). It is cached under the `content` tag, which the signed refresh route also expires.
- **Maintained data** (DATA-009):
  - `vessel_type_stats()` gives visitors only aggregates: per type, how many vessels and the middle half of guests and cabins, sample records excluded.
  - On staging that's dahabiyas 12–20 guests in 6–10 cabins, and motor ships 82–140 guests in 42–70 cabins.
  - VesselCompare and VesselTypeCard combine those figures with drafted editorial text, and show no sample prices.
- **Pages:**
  - home (PAGE-001): the hero with the cruise search, vessel types, comparison, drafted sections, live cruises, and Organization and WebSite with SearchAction;
  - the Vessels silo (PAGE-026, 027, 030, 032, 033, 036, 041, 042): a pillar with type cards, hubs with the vessel illustration and comparison, day-on-board articles with a scene, comparisons.
  - One template (`EditorialFrame`): breadcrumb, H1, the intro with its link up, sections, children, related bridges, "Keep reading", FAQs, closing cruises (at most three), and Article and FAQPage data.
  - The cruise listing now searches by vessel name (`?q=`), so the site search works (SEO-028).
- **Vessel pages** now link to their vessel-type hub (SEO-013, part).
- Removed the Batch 1 placeholder home stylesheet.

**Verified, and how:**
- **Unit** (`silo-links.test.ts`, 22 tests):
  - the map (felucca dropped, `BUILT` pages all in the workbook);
  - breadcrumbs, the link up, children, siblings, bridges and the closing listing, with keyword anchors;
  - every draft against its row: H1, house style, the review flag, the link-up marker, FAQs;
  - portable text read back into sections; catalogue figures in the comparison; the site search; FAQPage only with questions.
- `pnpm verify`: 358 tests, types, lint, format. The Studio schema validates (`pnpm studio:check`).
- **pgTAP:** 26 files, 405 checks on a reset database.
- **End-to-end:**
  - `silo-links.spec.ts` (14 tests): the CI link check for every built education page, plus draft flags and structured data, real comparison figures with no sample prices, 404 for felucca and unbuilt pages, and axe on five pages in Day and Night;
  - the vessel page links to its type hub.
  - Full run with `CI=1` on a production build against the local database: 190 passed, none failed or flaky.
  - The link check leaves vessel pages in the cruise row to the marketplace tests: other specs change test vessels straight in the database, so a cached row can briefly name one.
- **Screenshots:** 30 in `docs/screenshots/batch-06/` (prefix `6-1-`): home, the Vessels pillar, the dahabiya hub, a day on a cruise ship, and dahabiya or cruise ship, at 375, 768 and 1440 in Day and Night.
- **Environment:** two app restarts stopped the background test runs and Docker, so nothing reported. Docker and Supabase were restarted and the database reset, then the suites ran in full as above.

### Batch 6-2: Prices Explained and the Guide (branch `batch-06-2-prices-guide`, stacked on 6-1; no migration)

The second Batch 6 PR. With it, 35 of Batch 6's 37 requirements are Verified:
- PAGE-039 (felucca) is deferred (ADR-008);
- SEO-029 (keyword validation) waits until before launch (ADR-096).

**Built:**
- **One renderer for the three silos** (`src/app/[locale]/(site)/_silo/silo.tsx`). `/vessels/`, `/nile-cruise-prices/` and `/nile-cruise-guide/` are thin static catch-alls, and each page's components follow from its workbook row and URL.
- **Prices Explained** (PAGE-049, 050, 051, 057, 059):
  - the pillar, star ratings and budget or luxury show the price breakdown (PriceAnatomy);
  - **the calculator** is that breakdown as a full-page tool, with WebApplication data.
  - The factors (boat, cabin, sightseeing, season) are maintained in `src/content/price-factors.ts`, flagged "Sample data" with a footnote saying they're illustrative, not quotes, and never include gratuities, flights or transfers (DATA-008).
- **The Guide** (PAGE-002, 003, 004, 005, 007, 010, 016, 017, 018, 019):
  - the pillar, the routes, when-to-go and planning hubs;
  - three route guides with a day-by-day timeline and the vessel comparison, and no price grid (SEO-023; stops in `src/content/routes.ts`);
  - how many nights, cruise or land tour, and tipping, using the gratuity rules from ADR-010.
- **Copy:** 14 more pages drafted (23 in all) and loaded into Sanity's development dataset as "Draft for review".
- The vessels pillar now bridges to Prices Explained, which exists. Links to pages still to come (destinations, seasonal pricing, the Nile map) stay off.

**Verified, and how:**
- **Unit** (`silo-links.test.ts`, 40 tests): every draft against its row and the house style (which caught a "best" in a question, now reworded); price factors and presets; route stops without prices; the calculator's data. `pnpm verify`: 376 tests.
- **pgTAP:** 26 files, 405 checks on a reset database.
- **End-to-end:**
  - `silo-links.spec.ts` (31 tests): the CI link check on all 23 built education pages; the calculator's total changing with a choice, its "not quotes" footnote, sample flag and WebApplication data; route guides without a price breakdown or table.
  - Full run with `CI=1` on a production build against the local database: 207 passed, none failed or flaky.
- **Screenshots:** 36 in `docs/screenshots/batch-06/` (prefix `6-2-`): the prices pillar, the calculator, the guide pillar, Luxor to Aswan, when to go and tipping, at 375, 768 and 1440 in Day and Night.

## 20 Oct 2026 · Batch 7-1 · Destinations, tour pages and trust pages (first of two PRs, ADR-097)

**Branch:** `batch-07-destinations-tours` (from `main`). One migration (`contact_messages`).

**Built:**
- **Destinations** (PAGE-074, 076, 083, 085, 086, 090): the pillar in river order, and Luxor, Edfu, Kom Ombo, Aswan and Abu Simbel, each with what to see, an illustrated scene until photos arrive, FAQs, the closing cruise row and TouristDestination data.
- **Vessel pages** now list their stops, linking each built destination (SEO-013), and link transfers to `/tours-extras/transfers/` (DATA-018).
- **Tours as pages** (PAGE-093, 094, 095, 099; DASH-PUB-006, DASH-ADM-072):
  - every published tour has `/tours-extras/{slug}/`; the hub shows cards without the full itinerary;
  - the three workbook rows use the workbook's URLs, and tours they cover redirect to them;
  - no tour is bookable yet: each says "Prices coming soon" and links Contact until rates are imported in 7-2;
  - the balloon page is information only (no supplier yet).
- **Live tour URLs** from nilecruz.com redirect permanently to their new pages (SEO-022).
- **About, How we choose vessels, Contact** (PAGE-101, 102, 106): the weights table comes from the scoring code; Contact saves messages to a new admin inbox (Dashboard → Messages) with a honeypot field; email notices come in Batch 8.
- **Copy:** 13 more pages drafted (36 in all), loaded into Sanity development as "Draft for review".
- The link map writes the brand as Nilecruz everywhere.

**Verified, and how:**
- **Unit:** `destinations-tours.test.ts` (stops, tour URLs, redirects, links); `pnpm verify`: 396 tests.
- **pgTAP:** 27 files on a reset database, including `270_contact_messages` (visitors can send, only admins read and file); `060_privileges` allows that one visitor write.
- **End-to-end** (`CI=1`, production build, local database): 227 passed, 2 failed, both test faults, now fixed:
  - the "nothing bookable" check matched the cruise row's "Save Sample Bookings Ship" button; it now looks for buttons starting with Book or Reserve;
  - the link check didn't expect the hub's tour cards; tour pages from the hub are now allowed, like vessel pages from cruise cards.
  - Both specs re-run: 53 passed.
- **Screenshots:** 48 in `docs/screenshots/batch-07/` (prefix `7-1-`): destinations, Aswan, the tours hub, the Abu Simbel day trip, transfers, About, How we choose vessels and Contact, at 375, 768 and 1440 in Day and Night.

**Next:** 7-2, booking tours by calendar with the rate sheet.

## 21 Oct 2026 · Batch 7-2 · Tours booked by calendar, the offices' dashboard, the rate-sheet import (second of two PRs, ADR-097, ADR-098)

**Branch:** `batch-07-2-tour-booking`, stacked on 7-1. Two migrations (`tour_office_kind`, `tour_calendar`).

**Built:**
- **Rates, not sessions:** each tour has an office (Luxor or Aswan) and rates by mode:
  - shared per person, with child prices by age and at most 8 guests per start;
  - private per person by party size;
  - transfers per vehicle, one way, with a night extra;
  - meet and assist per party.
  - Seasons add or take off a percentage between two dates.
  - The database checks each rate's prices and works out the price exactly as the page does.
- **Booking:** the customer picks how (shared or private), who (adults and children's ages) and when (a month calendar in Cairo time, then a start time), and sees the price at once, with places left on a shared start.
  - Parties of 9 or more are pointed to the private tour.
  - The order uses the 4f-2c flow: a 60-minute hold, card payment through the signed webhook.
  - A lock per start means two parties can't both take the last places.
  - With no bands of its own, a tour uses the standard rule: free until 48 hours before, then 100 %.
- **Tour pages:** once a tour has an office and rates, its page shows its prices and a "Choose a date" link instead of "Prices coming soon"; its TouristTrip data carries the lowest price.
- **The offices:** a new "tour office" company type, with a workspace at `/dashboard/office/{id}/`.
  - It shows bookings by day and start, with guests, ages, pickup and notes.
  - An office can cancel a start it can't run: everyone on it is cancelled, paid bookings are approved for a full refund through finance's usual refund page, and customers are told with the reason.
  - Offices see only their own tours' bookings, never payments.
  - Sample Luxor and Aswan offices are in the local seed.
- **Admins:** choose a tour's office, and see its rates on the tour editor; readiness counts a tour with an office and rates as bookable.
- **`pnpm import:tour-rates <sheet.xlsx> --target=local|staging [--apply]`:**
  - reads the filled-in rate sheet, checks every row and says what to fix by tab and row;
  - sets each tour's office, replaces its rates, replaces the seasons, and prints the answers on the Questions tab;
  - it's a dry run without `--apply`; production is refused; tours are not published by it.
- **Older orders:** the fixed sessions of 4d stay for orders already made; every order now has its own start time.
- ADR-098 records the gaps I filled (children's prices, flexible start times, notice periods) and what is not built yet: the below-minimum shared start, the cruise-day suggestion on the calendar, the Programs tab.

**Verified, and how:**
- **Unit:** `tour-calendar.test.ts` (16 tests) and readiness in `tours.test.ts`. The unit tests cover:
  - prices for every mode, with children and seasons;
  - the rules for 9 or more guests and for shared groups;
  - open days, Cairo times in winter and summer, and the rate sheet's rows and error messages.
  - `pnpm verify`: 413 tests.
- **pgTAP:** 28 files, 440 checks on a reset database. `280_tour_calendar` (29 checks) covers:
  - price shapes, and that only a tour office can run a tour;
  - visitors read published rates only;
  - prices in the database match the page;
  - the lead time, the 12-month limit and start times;
  - 8 per shared start, and private parties kept separate;
  - who sees which bookings;
  - an office cancelling a start, with a full refund.
- **API under load:** `tour-slot-concurrency`: ten parties of 3 booking one start at the same moment make exactly two bookings (6 of 8 places); the rest get a plain "places left" refusal. The API suite (9 tests) passes on a clean database.
- **End-to-end:** `tour-calendar.spec.ts` (5 tests) covers:
  - prices and the calendar link on the tour page;
  - a shared booking for 2, paid through the signed webhook;
  - 7 more refused with 6 left, and a party of 9 switched to private at US$540;
  - a 5-guest transfer at 23:15 priced as a van plus the night extra;
  - the office seeing the booking and cancelling the start;
  - axe in Day and Night.
  - Full run with `CI=1` on a production build: 234 passed, none failed.
- **Grants check:** no differences.
- **The import, tried locally:** I loaded a filled copy of the template with made-up prices, ran the dry run, applied it, then applied it again (no change the second time). The database price matched the page.
- **Screenshots:** 18 in `docs/screenshots/batch-07/` (prefix `7-2-`): the tour page with prices, the booking calendar and the Aswan office's bookings, at 375, 768 and 1440 in Day and Night.

**Added after review (21 Oct, Faris's answers):**
- **Private tours, children's prices:** 6–11 pay 50 % of the adult price, or the sheet's figure; 3–5 pay 25 %.
- **The customer's cruise on the tour calendar:** each day of an upcoming cruise is marked with where the ship is, and days in the tour's city are highlighted. Picking a day says where the ship is.
  - Unit: `cruise-days.test.ts`, 4 tests.
  - End-to-end: a new test in `tour-calendar.spec.ts`. The calendar, journey and tour order specs pass, 15 tests.

**Next:** Faris's filled rate sheet (staging dry run first), then Batch 8.

## 21 Oct 2026 · Operator loop (Batch 8-1): one-tap booking requests, the reservable rule, vacancy sheets (ADR-099)

**Branch:** `batch-08-1-operator-loop`, stacked on 7-2. Four migrations: `inventory_sources`, `booking_requests`, `reservable_rule`, `sheet_ingest`. Part 0's report and Faris's answers are in `docs/briefs/BATCH-08-OPERATOR-LOOP.md`.

**Built:**
- **Part A, booking requests answered with one tap:**
  - **Contacts:** operator contacts who need no login, and a per-operator reply time (6 hours by default, set by admins).
  - **The request:** a booking request is for one sailing's cabins and guests.
    - The operator gets one email (Resend; recorded as skipped without a key) with Confirm, Decline, Hold 72h and Offer other as signed links.
    - Links are single use and last 7 days. They open a one-button page, so opening a link alone changes nothing.
    - WhatsApp sends the same as quick replies (signed webhook), behind `WHATSAPP_ENABLED`, off. The template text for Meta is in `docs/whatsapp-templates.md`.
  - **Answers:** every answer is timed and writes availability as `tap` through the existing write path.
    - Confirm makes the reservation through the same path as a direct booking (one shared function; direct booking unchanged).
    - Decline sets that cabin type to 0 free.
    - Hold takes the cabins and releases them after 72 hours.
    - Offer other lets the customer take another date or cabin type.
  - **Chasing answers:** a reminder at the reply time, an admin alert (email and a "Phone the operator" flag) at twice it, and a 09:00 Cairo digest. They come from a signed scheduler call.
  - **Metrics:** 90-day reply metrics and a data-accuracy score, on the admin operator page and the operator's connection health. Customers see "confirmed within X hours".
- **Part C, the reservable rule:**
  - Instant booking only from feed, API or `tap` data no older than 2 hours. Manual and sheet data within 7 days become a booking request, paid once confirmed (Faris, 21 Oct).
  - Exact counts appear only for instant data. Sold-out dates suggest nearby dates and similar ships.
  - Travel partners' bookings are unchanged; there are no allotments.
- **Part B, vacancy sheets:**
  - **Intake:** email (Resend inbound, Svix-signed webhook, files fetched from Resend's API), WhatsApp media, and admin upload (.xlsx, .csv, .pdf, .jpg, .png, up to 15 MB). Every raw file is kept privately.
  - **Reading:** plain tables are read directly. Other sheets are read by Claude (`claude-opus-5-5`, structured output, sheet treated as data).
  - **Names:** per-operator aliases are learnt when an admin maps a name.
  - **Preview:** the existing preview (48 hours), with the original, changed values and rows no longer listed (shown only).
  - **Confirming:** rows apply as `sheet`, dated by the sheet; newer data is never overwritten.
  - **Auto-confirm:** after 4 clean imports, and only when every check passes. An optional acknowledgement goes to the sender.
  - **Operator pages:** a "No system? Send us your weekly sheet" section on the format page, and the last sheet received on connection health.
- **Docs:**
  - `docs/OPERATOR-LOOP-ADMIN-GUIDE.md` (reviewing sheets, mapping names, auto-confirm, reply times);
  - new settings in `.env.example`;
  - ADR-099.

**Verified, and how:**
- **Unit:** `pnpm verify` runs 439 tests. New: links (signing, tampering, expiry), messages and digest, availability labels, dates, the plain-table reader, name mapping and aliases, auto-confirm checks.
- **pgTAP:** 31 files, 495 checks on a reset database:
  - `290_booking_requests`: each answer's effect, single-use links, holds expiring, reminder then escalation, metrics, who sees what;
  - `300_reservable_rule`: each kind of data;
  - `310_sheet_ingest`: preview, confirm as sheet, no overwrite, auto-confirm gate, who reviews.
  - `250` and `260` now use feed data, since they test instant booking.
  - The grants check shows no differences.
- **End-to-end** (`CI=1`, production build, fresh database): 242 passed, none failed. New tests:
  - `booking-requests.spec.ts` covers:
    - manual data becoming a request on the vessel page;
    - the operator's message, with no guest names;
    - Confirm from the email link without signing in, then the link showing the recorded answer;
    - the customer paying after confirmation;
    - decline;
    - reminder then admin alert.
  - `sheets.spec.ts`: a real Excel sheet uploaded, one name mapped and saved as an alias, confirmed, availability as `sheet`.
- **Screenshots:** 24 in `docs/screenshots/batch-08/` (prefix `8-1-`): the operator's reply page, the customer's request, the operator's request page and its connection health, at 375, 768 and 1440 in Day and Night.

**Not verified here:**
- real email sending and inbound mail (needs the Resend account and DNS);
- WhatsApp (needs Meta approval);
- the AI reader on real sheets (needs `ANTHROPIC_API_KEY`);
- the 8-weeks × 5-operators sheet test (needs the sheets).

### Operator loop follow-up (21 Oct 2026): allotments, and the rule for travel partners (ADR-100)

**Built:**
- **Allotments:**
  - cabins contracted to Nilecruz per sailing, with a release period;
  - book instantly for customers and travel partners until release; marked on each booked cabin; freed by cancellation;
  - a lock per sailing and cabin type, so the last allotment cabin can't go twice;
  - entered and switched off by catalogue admins on the operator's page; read by the operator with booked counts per sailing.
- **Travel partners:**
  - instant only from an allotment or instant data;
  - otherwise a booking request in the agency's name, at its rate, with its client reference and selling price;
  - the operator's message names the agency; confirming makes the agency's trade booking;
  - the agency's request page and list (take the other offer, withdraw);
  - search shows booking modes and no counts from manual data.
- **Shared booking step:** one step takes cabins for every booking path (customers, travel partners, operator-confirmed).

**Verified:**
- **pgTAP:** 32 files, 515 checks. `320_allotments_agents` (20 checks) covers:
  - who enters allotments;
  - instant from an allotment despite old data, and the release period;
  - counting, and cancellation giving a cabin back;
  - the operator's usage view;
  - travel partners refused instant booking on manual data;
  - a partner request confirmed into the agency's booking.
  - `220` now uses feed data. The grants check shows no differences.
- **End-to-end:** `allotments-agents.spec.ts` (2 tests):
  - an admin adds an allotment, a customer books from it instantly (old operator data), and the operator sees "1 of 2 booked";
  - a partner's request is confirmed from the email link and becomes the agency's booking with its client reference.
  - `partner-bookings.spec.ts` passes with feed data.

## 21 Oct 2026 · Batch 8-2a · Plan my cruise, emails behind every notice, rate limits (ADR-101)

**Branch:** `batch-08-2-conversion`, stacked on the operator loop. One migration, `20261024000100_conversion`. Brief: `docs/briefs/BATCH-08.md` (approved with the recommended answers).

**Built:**
- **Plan my cruise** (`/plan-my-cruise/`, PAGE-105, DASH-PUB-007):
  - route, dates, nights, guests and children's ages, cabins, budget and notes, with no account and no email asked for;
  - the plan stays on the device only, and comes back on the next visit; "Start again" forgets it;
  - mistakes are explained in the request form's own words before anything leaves the page;
  - "Send to operators" asks for sign-in or sign-up. Signing in keeps the plan in the address. After sign-up, My journey offers "Continue with your plan" from the device copy.
  - The request form opens with every field filled in, to check and send. Once handed over, the device copy is forgotten.
  - ContactPage data, the workbook's links, and the header's existing button.
- **Emails behind every notice** (DASH-BND-007, PROPOSED-005), English for now:
  - each notice goes to its person, or to its company's team by role (finance too for payments and cancellations), or for Nilecruz to `ADMIN_ALERT_EMAIL`;
  - the subject is the notice; the body says what to do next and links to the page;
  - sent on the scheduler's tick (every minute, only when something waits); a failed send is retried up to 3 times within a day;
  - operators' booking requests and admins' escalations aren't sent twice (the dispatcher already emails them);
  - people can turn off optional emails (offer updates, holds) under Account → Emails from Nilecruz; bookings, payments, cancellations and reminders always go;
  - a new Contact message tells the admins;
  - payment deadline reminders 3 days and 1 day before, and on the day, each once.
  - **Without a sender** (`RESEND_API_KEY` and `EMAIL_FROM`), admins see a banner on every admin page, every message is recorded as not sent, and Messages → Email delivery shows the 24-hour counts and recent problems.
- **Rate limits and bots** (SEC-006):
  - limits per address (hashed with a server secret, never stored) and per account: sign-in, 10 wrong passwords per email in 15 minutes, sign-up, password reset, Contact, requests, booking requests and operator replies;
  - too many tries says to wait, never a bare error;
  - a hidden field on sign-up, password reset and Contact: a bot that fills it gets the normal answer and nothing is kept;
  - Turnstile only if bots get through (ADR-101).

**Verified, and how:**
- **Unit:** `pnpm verify`, 450 tests. New in `conversion.test.ts`: the plan's rules and defaults, the hand-over to the request form, malformed addresses, each email's wording, links and escaping, which emails are optional, who gets money emails.
- **pgTAP:** `330_conversion` (13 checks): rate-limit counting and looking, emails waiting and marked, optional emails only for oneself, the Contact notice, a reminder sent once. The grants check shows no differences.
- **End-to-end:** `conversion.spec.ts`:
  - an anonymous visitor plans, signs up, continues with the plan, sends it, an operator offers, and the offer email is recorded for them;
  - signing in keeps the plan;
  - 10 wrong passwords make the right one wait;
  - a bot sign-up looks sent and makes no account;
  - admins see the missing-sender banner and Email delivery;
  - axe in Day and Night.
- **Screenshots:** to follow in `docs/screenshots/batch-08/` (prefix `8-2a-`); local Docker was stopped by an update during this run.
- **Local end-to-end:** not run for the same reason; CI runs the full suite on this pull request.

**Not verified here:**
- real sending (needs the Resend account and DNS);
- sign-in emails through Resend (a Supabase setting on staging, with Faris's OK);
- staging, while Railway isn't deploying.

## 21 Oct 2026 · Batch 8-2b · Read-only MCP for assistants, booking summary checks (ADR-101)

**Branch:** `batch-08-3-mcp-summary`, stacked on 8-2a. One migration, `20261025000100_mcp`.

**Built:**
- **MCP for assistants** (DASH-PUB-011, 012), at `/api/mcp/`:
  - Streamable HTTP, stateless: each POST is a JSON-RPC message answered with JSON. No login, no sessions, no resources or prompts.
  - Four tools, all marked read-only:
    - `search_cruises`: by origin, destination, dates, nights, vessel type and guests;
    - `get_vessel`: facts, the Nilecruz evaluation, cabin types, the gratuity and the itinerary by day;
    - `compare_vessels`: two or three side by side;
    - `sailing_availability`: each sailing's booking mode (instant, confirmed by the operator, sold out, to be confirmed).
  - **Restrictions:** it reads the same cached public data a visitor's pages read. It shows only the "from" price, with no per-sailing prices and no cabin counts. A new public function, `public_sailing_modes`, gives the modes without either.
  - **Limits:** no tool books, requests or changes anything; an unknown tool says so. Every answer links to its page. 120 calls a minute per address, and bodies up to 64 KB.
- **Booking summary checks** (DATA-011, 016, 017):
  - **Reviewed:** the vessel page, the customer and partner reserve pages, offers, reservations, receipts and the agency's client sheet.
  - **Fares:** they come from the rates, and the policy from the departure's vessel. The total is the sum of the cabin lines, and the card checkout charges only the reservation's outstanding balance. Tours have their own orders and checkout.
  - **Fixed:** the gratuity is now one shared line everywhere: per person per night, the party's total where it's known, and "paid on board at check-out; never charged online and not part of the amount due". The customer and partner reserve pages showed no gratuity line before.

**Verified, and how:**
- **Unit:** `pnpm verify`, 462 tests. New tests:
  - `mcp.test.ts`: the protocol, the tool list, no price for vessels that can't be booked, modes without counts, compare limits, booking refused, bad arguments explained;
  - `booking-summary.test.ts`: the gratuity line and the party's ages.

**Not verified yet:** local Docker kept stopping while an update downloaded. Still to run:
- `340_mcp_summary` (pgTAP): modes for anyone, prices still signed-in only, no price or count columns, nothing for unpublished vessels, a booking's total equal to its cabin lines without the gratuity;
- `mcp.spec.ts` (end-to-end), and screenshots;
- regenerating the database types (the new function's type was added by hand).

## 21 Oct 2026 · How operators connect (PAGE-107, Faris's request)

**Branch:** `operator-connect-page`, stacked on 8-2b. Brief: `docs/briefs/OPERATOR-CONNECT-PAGE.md`, with Faris's answers: `/operators/connect/`, detailed for non-technical readers, no commission, footer only.

**Built:**
- **The page** `/operators/connect/`:
  - an intro, then a few words explained (availability, sailing, instant booking, booking request, dashboard);
  - the six ways compared in one table (work, freshness, how guests book), which becomes cards on a phone;
  - one section per way: best for, what you do step by step, what Nilecruz does, how often, notes and screenshots. The ways are the weekly sheet, one-tap answers, the dashboard, a feed, the API and allotments.
  - The one-tap section covers what the email shows (and never shows), each of the four buttons, the hold, the reply time, the reminder and the admin's call, the morning digest, the 7-day links and answer times.
  - Then the booking rule (ADR-099), what Nilecruz never does, how to start, six questions with FAQPage data, and a section for the operator's IT person with a short JSON sample.
- **Copy:** in `src/content/operator-connect.ts`, marked "Draft for review". Every fact is checked against the code. There is no commission and no commercial terms; the WhatsApp parts say "coming soon".
- **Links:** "For operators" in the footer (EN, ES and JA labels; ES and JA for the translators to check), and a link from the operator application page.
- **Screenshots from the system:** each image appears once its file exists in `public/images/operators/`. They are still to take from sample data, when the local database is running.

**Verified:**
- **Unit:** `operator-connect.test.ts` (6 tests) checks:
  - six ways, each with steps, Nilecruz's part, frequency and a screenshot with real alt text;
  - every one-tap detail;
  - the booking rule's numbers;
  - no commission or percentages;
  - house style;
  - the FAQ.

  `pnpm verify`: 469 tests.
- **Seen in the browser** at 375, 768 and 1440 in Day and Night (`docs/screenshots/batch-08/8-op-*`).
- **Not run yet:** `operator-connect.spec.ts` (sections, table, anchors, alt text, FAQ data, footer only, axe in Day and Night) needs the local database for the full suite.

## 21 Oct 2026 · Batch 8-3a · Sightseeing: approved vessels, prices with sightseeing, bookable programme prices (ADR-102)

**Branch:** `sightseeing-two-prices`, stacked on the operator page. Brief: `docs/briefs/SIGHTSEEING-TWO-PRICES.md`, approved with the recommended answers. Two migrations: `20261026000100_programme_mode`, `20261026000200_sightseeing`.

**Built:**
- **Approval** (DATA-046):
  - `vessels.sightseeing_approved_at` / `_by`, set only through `set_sightseeing_approval`, by super and catalogue admins in a two-step session;
  - a guard stops anyone else changing them, and the vessels audit records each change;
  - a "Sightseeing" section on the admin vessel editor: approve, or withdraw (its prices with sightseeing stop showing; bookings keep what they bought).
- **Prices with sightseeing** (DATA-047):
  - **The tables:**
    - `sightseeing_rates`: the same shape as `rates`, so the dozen cruise-only readers are untouched;
    - `schedule_sightseeing`: what each itinerary includes (guide, entrance fees, sites, note).
  - **The rule:** both refuse any vessel that isn't approved, whoever writes.
  - **Format v1:** each rate takes an optional `package` (`cruise` by default, or `with_sightseeing`). `apply_inventory_rows` refuses `with_sightseeing` for a vessel that isn't approved and writes each package to its own table. Paste, feed, API and one-tap all use it. The format page explains it.
  - **Vacancy sheets:** they carry no prices, so nothing changes there; the brief is corrected.
  - **Operator screens:**
    - on approved vessels: a "Sightseeing" section (what's included, required before those prices show), a "Package" choice in the rate form, and the with-sightseeing prices listed and removable on each departure;
    - on other vessels: "Nilecruz sells the sightseeing for this vessel".
- **Programmes** (DATA-048):
  - **Pricing:** a new tour rate kind, `program`, priced like private tours: per person by party size, children 3–5 at 25 % and 6–11 at 50 %, under 3 free. Groups over 14 are told to ask Nilecruz.
  - **Kept for 8-3b:** programmes aren't bookable on their own and stay off tours' calendars until 8-3b books them with a cruise.
  - **The import:** `pnpm import:tour-rates` now reads the Programs tab, with entrance fees included and the first office named. It links each programme to the itineraries its name gives (3 nights Aswan → Luxor, 4 nights Luxor → Aswan). The dry run on your sheet gives 16 rates with nothing to fix.

**Verified:**
- **Unit:** `pnpm verify`, 474 tests. New:
  - the `package` field;
  - programme prices (party sizes, children, groups over 14);
  - the programme row;
  - the Programs tab (prices, office, links, error messages).
- **Not run yet** (local Docker is down):
  - `350_sightseeing` (pgTAP, 18 checks): who approves, every path refused for vessels that aren't approved, both prices landing in their own places, inclusions public only while approved, programmes not bookable on their own;
  - `sightseeing.spec.ts` (end-to-end: admin approves, the operator enters inclusions and a with-sightseeing price, a vessel that isn't approved shows the note);
  - the grants check;
  - regenerating the database types (added by hand).

**Next:** 8-3b, the two prices for travellers, and booking and paying both parts.

### Follow-up (21 Oct 2026): your rate sheet loaded locally; tours bookable 7 days ahead

- **The sheet:** `pnpm import:tour-rates` loaded your sheet into the local database: 16 rates on the 9 imported tours, including both programmes. They link to no itinerary locally because the sample ships don't sail those routes; on staging they will.
- **The booking window** (Questions tab, answer 3; ADR-102 question 5):
  - a tour booked on its own can be booked up to **7 days** ahead;
  - it's a setting, `tour_horizon_days`, used by the database check and by the calendar customers see;
  - programmes go with their cruise and don't use it.
- **Tests:**
  - pgTAP `280`: day 7 open, day 8 refused; the older checks there run with the window open;
  - the calendar end-to-end test opens the window for its run and sets it back;
  - the concurrency test books 5 days ahead;
  - unit: the calendar shows days only up to the window.
- **Verified:** pgTAP, 35 files and 556 checks on a reset database; the grants check shows no differences; `pnpm verify` runs 475 tests.
- **Not run:** the full end-to-end suite. Docker Desktop shut down again before the build.

### Local verification (21 Oct 2026): full end-to-end, screenshots

- **Why Docker kept stopping:** each run began by stopping whatever held ports 3000 and 3100. Faris's `open-webui` container publishes port 3000, so that killed Docker Desktop. Runs no longer stop anything on those ports.
- **Full end-to-end** (`CI=1`, production build, reset database): 254 passed, with two test faults, both fixed:
  - **The 10-wrong-passwords test** waited for Next's page announcer (also an "alert"), so it fired the 11th try before the 10th failure was counted. It now waits for the "don't match" message. The limit itself works: the database refused correctly when asked directly.
  - **The sightseeing test** left the page before the price was saved. It now waits for "Updated".

  Both specs pass after the fixes (9 tests).
- **Screenshots** in `docs/screenshots/batch-08/`:
  - `8-2a-`: Plan my cruise, the customer's My journey and Account security, the admin's Messages;
  - `8-3a-`: the admin's Sightseeing section and the operator's schedule with "what's included" and the Package choice;
  - each at 375, 768 and 1440, in Day and Night.
- **Operator page screenshots:** `scripts/operator-shots.ts` (and `.py` for the WebP files) takes the eight screens from the local system. The test suite's sample names (long numbers, a "NOPE" cabin code, warning banners) aren't fit for a public page, so they aren't published yet. A tidy sample set comes first.

### Operator page screenshots published (21 Oct 2026, PAGE-107)

- **A tidy sample set:** `scripts/operator-sample.ts` builds one on the local seed (run right after `supabase db reset`). It makes "Sample Dahabiya Nefertari" for Sample Operator A: Esna to Aswan, 4 nights, Saturdays, with a Double and a Suite. It has:
  - eight sailings with prices;
  - free cabins entered by hand;
  - an allotment of suites;
  - one pasted update (for connection health);
  - a guest's booking request waiting for an answer;
  - a clean weekly sheet, waiting for review.
- **The screenshots:** `scripts/operator-shots.ts` took eight screens from it:
  - the one-tap reply page;
  - the booking request;
  - free cabins per sailing;
  - the cabin types;
  - connection health;
  - allotments;
  - the format page;
  - the sheet preview.

  `scripts/operator-shots.py` turned them into WebP in `public/images/operators/` (276 KB in all, loaded as the reader scrolls). The admin banner "Email isn't set up" is removed before each capture; it only appears on a machine without an email key.
- **Each image** shows at its own size, never wider than the column.
- **The screenshot script** now loads lazy images before a full-page capture, which would otherwise leave them blank.
- **Checked in the browser:** all eight load, each with alt text of 90 to 138 characters. The page's screenshots are retaken (`8-op-*`).

## 21 Oct 2026 · Batch 8-3b-1 · An approved vessel's price with sightseeing, from the "from" price to the reservation (ADR-102)

**Branch:** `batch-08-3b-two-prices`, stacked on #39. One migration, `20261027000100_sightseeing_booking`. 8-3b is in two parts, so a price never shows before it can be booked:
- **8-3b-1:** approved vessels' own sightseeing, all the way through;
- **8-3b-2:** Nilecruz's programme for every other vessel: its price and its booking together.

**Built:**
- **The package travels in the booking.** Each cabin in a booking says its package (`"package": "with_sightseeing"`; cruise only without it). So the booking, the booking request and the operator's confirmation carry it without new parameters.
  - Every cabin has the same package.
  - A package with sightseeing needs an approved vessel whose itinerary says what's included (`app.sells_sightseeing`).
  - It's priced from `sightseeing_rates` (`app.public_cabin_price(…, pkg)`).
- **The reservation** keeps its `package` and, in `sightseeing`, what was included when booked. Its terms say so. The operator's notice says "with sightseeing".
- **Prices:**
  - `public_vessel_prices` adds the "from" price with sightseeing;
  - `vessel_departure_prices` and `public_party_price` take a package.
- **What travellers see:**
  - **cards:** a badge, "With sightseeing from US$…";
  - **the vessel page:** "With sightseeing, from" beside the "from" price, and on each itinerary "Also sold with the vessel's own sightseeing: …";
  - **the comparison:** a row;
  - **the assistants' answers (MCP):** `from_price_with_sightseeing`, and each itinerary's inclusions.
- **The reserve page:** "Cruise only" or "With sightseeing" first, carried through every step. The prices and the total follow the choice, and the summary says what the total holds.
- **Records:**
  - the reservation record shows "Package: with the vessel's sightseeing: …";
  - the operator's booking request lines read "Double, with your sightseeing".

**Verified:**
- **pgTAP:** `360_sightseeing_booking` (11 checks) covers:
  - both "from" prices;
  - each package's prices and the party's price;
  - booking with sightseeing at its price, with what was included kept;
  - cruise only unchanged;
  - mixed packages refused;
  - nothing without the inclusions.

  All 36 files (567 checks) pass on a reset database, and the grants check shows no differences.
- **Unit:** the card badge and the inclusions wording. `pnpm verify`: 477 tests.
- **End-to-end:** `sightseeing.spec.ts` adds a customer booking with sightseeing on the reserve page: US$2,600 for two, and the reservation's package. The sightseeing, vessel page, booking request and MCP specs pass (18 tests).
- **By hand on localhost:** Sample Dahabiya Nefertari, approved, booked as a Suite with sightseeing (US$4,500).

**Next, 8-3b-2:** Nilecruz's programme as the "with sightseeing" option on every other vessel:
- its price, booked with the cruise in one checkout as two payments;
- cancelling the cruise cancels the programme;
- adding it later from My journey;
- the search filter.

## 21 Oct 2026 · Batch 8-3b-2 · The cruise with Nilecruz's sightseeing programme (ADR-102)

**Branch:** `batch-08-3b-two-prices` (with 8-3b-1). One migration, `20261027000200_programme_booking`.

**Built:**
- **Which programme:**
  - `app.programme_rate_for(departure)` finds the one for the sailing's itinerary: published, with an office and an active programme rate;
  - none for a vessel approved to sell its own sightseeing, so nothing is sold twice;
  - programmes are priced like private tours (`app.tour_slot_price` now covers `program`);
  - groups over 14 are told to ask Nilecruz.
- **Booking it with the cruise:** a third package, `with_programme`.
  - The cruise is a cruise-only reservation, at its own price.
  - `app.add_programme` makes the programme a tour order linked to it (`tour_orders.reservation_id`): the whole party, starting on the sailing's first day, and held until the cruise's payment deadline (not the usual 60 minutes).
  - One programme per reservation.
  - The programme is priced in US$, so it goes with a US$ booking.
  - It works for direct bookings and for booking requests, where it's added when the operator confirms.
- **Adding it later:** `customer_add_programme`, up to 2 days before the cruise, from a "Sightseeing" section on the reservation page.
- **One payment page, two payments:**
  - the reservation's card checkout carries the unpaid programme as a second line, with both amounts in the metadata;
  - the webhook records the cruise as the reservation's payment and the programme as the tour order's;
  - a part that can't be taken goes back to the card on its own.
- **Cancelled together:** when the cruise is cancelled (or released unpaid), its programme is cancelled. A paid programme is approved for a full refund through finance's tour refund page, as an office's cancelled start is. The programme alone uses the tour's own cancellation.
- **What travellers see:**
  - the "with sightseeing" from-price is the cruise plus the programme for two (`public_vessel_prices.sightseeing_by` says vessel or Nilecruz);
  - the vessel page names the programme and its price;
  - the reserve page's "With sightseeing" shows the cruise, "Sightseeing by Nilecruz" and "Together";
  - the reservation page shows the programme, or offers to add it;
  - the Pay button says "Pay the cruise and the sightseeing by card";
  - the assistants' (MCP) answers say who provides the sightseeing;
  - a "With sightseeing" filter on /cruises/.

**Verified:**
- **pgTAP:** `370_programme_booking` (13 checks) covers:
  - the from-price;
  - the programme's price for a couple;
  - the currency rule;
  - booked together as two orders, held until the cruise's deadline;
  - one programme per cruise;
  - one payment recorded as two;
  - confirmed when paid;
  - cancelled and refunded with the cruise;
  - added later;
  - none on an approved vessel.

  All 37 files (580 checks) pass on a reset database, and the grants check shows no differences.
- **Unit:** the two-line checkout and its metadata, one line without a programme, the filter. `pnpm verify`: 480 tests.
- **End-to-end:** `sightseeing.spec.ts` covers a cruise with the programme:
  - US$578 for two, US$2,578 together;
  - the reservation's Sightseeing section;
  - one signed payment recorded as two, with the cruise confirmed and the programme paid.
- **Full end-to-end** (`CI=1`, production build, reset database): 259 passed, none failed. The sheet upload test needed one retry; it timed out at the admin sign-in, before anything this change touches.

**Not built:**
- paying the programme by bank transfer (tour orders are card-only today; a transfer covers the cruise);
- programmes for travel agencies (cruise only, as the brief says).
