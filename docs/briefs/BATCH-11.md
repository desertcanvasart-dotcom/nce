# Batch 11 brief: hardening and launch

**Status:** draft for Faris · **Branch:** `batch-11-1-…`, `batch-11-2-…` · **Size:** M (two pull requests)

**Goal:** the site is fast, accessible and secure on every page that matters. A broken server is noticed within minutes, and a lost database can be restored. Launch day follows a written checklist you sign off.

**Exit criterion (BATCH-PLAN):** all launch rows Verified; Faris signs off.

## Where we are

| Area | Today |
|---|---|
| Performance (PERF-001–003) | Lighthouse runs on every pull request, but only on the home pages, terms and sign-in. The listing, vessel page, article, destination and tour templates aren't measured. LCP is a warning, not a failure. |
| Accessibility (A11Y-011) | axe runs in the end-to-end tests on most templates, in Day and Night. There's no audit across every page and no screen-reader pass. |
| Security (SEC-011) | Covered so far: RLS tests on every table, a grants check, a secret scan, security headers, rate limits and two-step sign-in for staff. Not yet done: one review across the whole system before launch. |
| Errors (ENG-014) | Errors go to the server log only. Nothing alerts anyone. |
| Backups (ENG-015) | Supabase takes its standard backups. No restore has been rehearsed. |
| Honest facts (BRAND-010) | Each selling template has explanatory facts (the price's "Why?", deck view, mooring, evaluation), but no one has checked every template against the rule. |
| Showcase exception (DATA-025) | The sample vessels are marked sample. No check yet that none is public at launch. |
| Staging | Railway hasn't been deploying since Batch 8. Several items need it: email sending through Resend, live Stripe webhooks, the staging tour import. |

## What I recommend building

### 11-1: everything I can do from the code

| ID | What |
|---|---|
| **PERF-001–003** | Lighthouse (mobile) on the key templates: home, listing, a vessel page, an article, a destination, a tour, the operators page and the reserve page (signed in). It fails a pull request if LCP is over 2.5 s, CLS over 0.05 or TBT over 200 ms. TBT is the lab stand-in for INP; real-visitor INP comes from the error tracker's performance data once it's on. I fix whatever misses. |
| **A11Y-011** | An axe pass over **every** built page, in Day and Night, as part of the crawl in CI. Plus a keyboard-only pass of every task: search, compare, book, pay, cancel, operator reply, and the admin queues. I fix what's found and write a screen-reader script for the human pass (question 3). |
| **SEC-011** | A written review in `docs/SECURITY-REVIEW.md`. It covers: access rules table by table, every security-definer function, server actions and their checks, the Stripe and operator-reply signatures, file uploads, rate limits, headers, dependencies (`pnpm audit`), secrets handling and the MCP endpoint. High findings are fixed before launch; the rest are logged with a decision. |
| **ENG-014** | An error tracker wired in for server and browser errors, tagged with the release. It stays off until its key is set (question 1). |
| **BRAND-010** | A template-by-template check that each selling page carries at least one honest, explanatory fact, recorded in the ledger, plus a test per template. |
| **DATA-025** | A launch check (script and test): no showcase or sample vessel, tour or evaluation is public. |
| **The launch checklist** | `docs/LAUNCH.md`, step by step: domain and DNS, environment variables, Stripe live keys and webhook, Resend sender, Supabase settings, indexing on, the old site's redirects, smoke tests, rollback. Each step has an owner and a check. |

### 11-2: what needs your accounts (when Railway is back)

| ID | What |
|---|---|
| **ENG-015** | Turn on the backup plan you choose (question 2), then rehearse a restore: restore staging's backup into a scratch project, check the counts and that the app works against it, and write down how long it took. |
| **Staging, end to end** | The checks staging has been waiting for: Resend email, the Stripe test webhook, the tour import, and a full booking with payment on staging. |
| **ENG-011** | Production created with its own database and secrets, then the launch checklist run against it, up to the step where indexing is switched on. |
| **Content check** | Every open CONTENT-NEEDED item marked "must have for launch" or "can follow". You sign off the list. |

## Tests

- **CI:**
  - Lighthouse on the key templates, failing on LCP, CLS and TBT;
  - axe on every built page in both themes;
  - the showcase check;
  - a test per selling template for its explanatory fact.
- **Written:** the security review, the screen-reader script and its results, the restore rehearsal log, and the signed launch checklist.

## Questions for Faris

1. **Error tracker.** **Recommended: Sentry**, in its EU region, on the free plan to start. You create the account and add its key to Railway's variables; I wire everything else. The alternative is none, which leaves us relying on Railway's logs.
2. **Backups.** Supabase's paid plans include daily backups. Point-in-time recovery (restore to any minute) is a paid add-on. **Recommended:** daily backups at launch and a rehearsed restore; add point-in-time recovery once bookings carry real money. Please check current prices on your Supabase plan.
3. **Screen-reader pass.** I can test with the keyboard and read the accessibility tree, but I can't drive a real screen reader. **Recommended:** I write a 30-minute VoiceOver script (search, compare, book, pay). You or a tester runs it once, and I fix what's found.
4. **Order.** **Recommended:** 11-1 now. 11-2 when Railway is back and you've chosen the backup plan.
