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
