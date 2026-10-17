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
