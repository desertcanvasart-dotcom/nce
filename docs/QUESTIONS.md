# Questions for Faris

**Batch 0 · 17 Oct 2026 (updated with Faris's answers the same day).** Each question has a number, a recommendation and the reason for it.
- **Tags:** **[C]** contradiction between sources · **[A]** ambiguity that affects money, data, permissions or legal text · **[G]** gap (the matching `PROPOSED-*` row is in REQUIREMENTS).
- **Priority:** ★ means please answer before Batch 1. The others can wait until the batch that needs them, which is named on each question.

---

## The five to answer first

### Q1 ★ [C] Which codebase does the dashboard guide describe, and can we have it?
The guide describes "the application reviewed on 17 October 2026". Its wording matches the `desertcanvasart-dotcom/nilecrz` repository exactly: tabs named "My journey", "Deposits & commission" and "Catalogue & evaluations"; criteria scored 0–5; manual, feed and API inventory.

But the GitHub copy stopped on 6 Sep 2026 (4 commits). It has no tours, promotions, B2B, rate plans, schedules, decks, premium calendar or MCP. The live site nilecruz.com runs the same stack (vinext) on Railway, with routes that do not exist in either repo: `/tours`, `/match`, `/partners`, `/mcp`, `/how-we-score`, `/independence`.

So the code the guide describes is most likely a **newer, unpushed version of `nilecrz`** behind the live site.

**Recommendation:** please push that code (or point me to it) before Batch 1.
- If it exists, it implements most `DASH-*` rows already, and the right plan is to **adopt it and move it onto the target stack**, not rebuild. See ARCHITECTURE §1.
- If it doesn't, my fallback is in ARCHITECTURE §1.4.

**Also tell me:**
- Is the live database real (real operators, bookings or money records)? That decides whether Batch 3 migrates data or starts clean.
- Which repository is ours: the empty `nce` (my assumption, because you named it) or one of the existing ones?


> **Answered 17 Oct 2026:** there is no newer code; the two GitHub repos are everything, and I judge what to reuse. Decision in ADR-023 and ARCHITECTURE §1.3; we build in `nce`. **Still open:** whether the live database holds real records (Q52).
### Q2 ★ [C] How does a booking actually get paid?
Three sources say three different things:

| Source | Model |
|---|---|
| Dashboard guide | Full payment is due 3, 7 or 14 days after booking, depending on the departure season. Payment is **reported and verified manually**. There is "no automated payment gateway". |
| Design system `BookingSummary` | "Request to book", "No payment today · free cancellation for 14 days", "A cruise specialist will confirm availability within 24 hours". |
| `nile-cruise-marketplace` repo | Stripe Checkout, full fare charged up front, automatic full refunds. |

The 14-day free cancellation and the 24-hour promise are invented facts in the design system, and they conflict with per-cruise cancellation bands (DASH-PAY-011).

**Recommendation:**
- Follow the guide: reserve, then pay by the deadline using manual reporting and admin verification.
- Replace BookingSummary's footer with text generated from the cruise's actual deadline and cancellation policy.
- Keep a card gateway as PROPOSED-004 for later.


> **Answered 17 Oct 2026:** card payments through Stripe (ADR-020). Follow-ups are in Q51.
### Q3 ★ [C] Are exact cabin prices public?
The guide says exact departure rates and extra cabin details **need an account** (DASH-PUB-008). The silo's vessel page uses CabinPicker (per-cabin prices) and BookingSummary, and emits an `Offer` schema, which needs a price for rich results. The brand and design system show prices everywhere.

**Recommendation:**
- Public pages show **"from" prices per person**: the lowest current rate, labelled with its currency and what's included. They emit `AggregateOffer` (lowPrice/priceCurrency).
- CabinPicker shows cabin facts publicly. Per-departure prices and the deck selector unlock after sign-in, as the guide says.

This keeps SEO and the "explain the price" promise without breaking the guide's rule.

Also, which **rate plan** sets the public price? I recommend the international plan only. Egyptian-citizen, resident and trade rates are shown only to verified eligible accounts.


> **Answered 17 Oct 2026:** one public "from" price per vessel (lowest category); all categories and dates after sign-in (ADR-025).
### Q4 ★ [C] Is a vessel page about one vessel, or one sailing?
- The silo makes `/cruises/{vessel-slug}/` one URL per vessel, with H1 "{Vessel name} — {route}, {nights} nights".
- The guide lets a vessel have **several schedules** (routes and directions).
- CruiseCard is "a listing card for one sailing".

**Recommendation:**
- One URL per vessel, as the silo says. It shows every itinerary of that vessel with a route/nights selector, and the itinerary is a URL parameter (canonical to the vessel).
- The H1 uses the vessel's main itinerary: "{Vessel name}: {type}, {main route}". For a vessel with one schedule it stays exactly as the silo says.
- Listing cards are per vessel × itinerary and all link to the same vessel page with the itinerary pre-selected.


> **Answered 17 Oct 2026:** one page per vessel with its itineraries (ADR-021).
### Q5 ★ [C] Brand name, domain and slugs
**Name and domain.** The design system and silo say **nilecrz**. The guide and the live site say **Nilecruz** (domain nilecruz.com). Which name goes in the wordmark, titles and schema `Organization.name`?
- My recommendation: Nilecruz on nilecruz.com, with "nilecrz" kept only as the internal design-system name. The domain and existing equity are Nilecruz.

**Slugs for /es/ and /ja/.** The silo contradicts itself: the Read-me sheet says "English slugs" while the Languages row says "translated slugs".
- My recommendation: translated slugs for `/es/`, and **romanised English slugs for `/ja/`** (for example `/ja/nile-cruise-guide/`). Japanese characters in URLs are percent-encoded and hurt sharing.
- Please confirm.

**Redirects.** The live site has 9 URLs in its sitemap (`/explore`, `/how-we-score`, `/match`, `/request`, `/tours`, `/independence`, `/terms`, `/privacy`, `/`).
- I will 301 them to silo equivalents (for example `/how-we-score` → `/how-we-choose-vessels/`).
- `/terms`, `/privacy` and `/independence` have no silo row. Should they stay as legal/footer pages (PROPOSED-007)?


> **Answered 17 Oct 2026:** the brand is **Nilecruz**; Japanese URLs use English-letter slugs (ADR-022). **Still open:** redirects and the three legal/footer pages (Q52).
---

## Contradictions

**Q6 [C] Ratings on cards (Batch 5).**
- The problem:
  - CruiseCard and Rating show a 0–5 star score with a review count.
  - The guide has a Nilecruz evaluation scored **out of 100** and external ratings that are **kept separate**.
  - The brand says ratings only "when backed by real reviews".
- **Recommendation:**
  - The card shows the Nilecruz score as "86/100 · Nilecruz evaluation" when published.
  - Stars appear only for verified guest reviews (PROPOSED-006).
  - External ratings appear on the vessel page with their source and date, never as stars on the card.

> **Answered 17 Oct 2026:** agreed. See ADR-009.

**Q7 [C] The felucca (Batch 6).**
- The problem:
  - The silo uses VesselCompare on `/vessels/felucca/` and `/vessels/compare/dahabiya-vs-felucca/`, and gives the felucca hub a CruiseCard row.
  - VesselCompare and VesselTypeCard support only the three cruise types.
  - The brand says a felucca is not a cruise vessel.
- **Recommendation:**
  - Add a felucca data entry to VesselCompare, flagged "day boat, not a cruise".
  - The felucca pages end with an ExperienceCard row linking to `/tours-extras/felucca-sail-aswan/` instead of a CruiseCard row.
  - Log this as an exception to the money-row rule.

> **Answered 17 Oct 2026:** remove the felucca from the site completely. See ADR-008; four pages deferred, confirm the tour page in Q46.

**Q8 [C] Navigation labels (Batch 1).**
- The problem: the NavBar default ("Cruises, Vessels, Why prices differ, Itineraries, Journal, Contact") is not the silo rule (five pillars plus Cruises).
- **Recommendation:**
  - Cruises · Vessels · Why prices differ (→ `/nile-cruise-prices/`) · Nile cruise guide · Destinations · Tours & extras.
  - The CTA "Plan my cruise" → `/plan-my-cruise/`.

**Q9 [C] `/plan-my-cruise/` without an account (Batch 8).**
- The problem: the silo makes it a public lead form (ContactPage), but the guide says sending a personal request needs an account.
- **Recommendation:**
  - Visitors fill the form anonymously (DASH-PUB-007).
  - On submit they create an account or sign in, without losing the draft, and the request is then sent.

**Q10 [C] BookingSummary extras (Batch 8).**
- The problem:
  - The component adds "temple entries & port fees", "crew gratuities" and "flights from Cairo" into the cruise total, all with invented amounts.
  - The guide keeps tours and extras as **separate orders and payments** and has no fee or gratuity entity.
- **Recommendation:**
  - The cruise total contains only what the rate includes, plus mandatory fees if operators supply them.
  - Gratuities are shown as guidance ("not included, typical amount set by the operator").
  - Flights and transfers become separate extras (tour products) shown below the total with their own price.

> **Answered 17 Oct 2026:** flights removed from the cruise total; gratuities are separate and obligatory (min US$5 pp/night); cruise runs check-in to check-out, transfers sold separately. See ADR-007, ADR-010, ADR-011; follow-up in Q47.

**Q11 [C] Who manages tours (Batch 4d)?**
- The problem: tours appear under the admin dashboard only, the operator list never mentions them, and tours have their own "supplier information".
- **Recommendation:**
  - Admins manage tours and suppliers.
  - Operators can only see tours assigned to their cruises.
  - Please confirm whether operators may create tours.

> **Answered 17 Oct 2026:** tours are Nilecruz-only; operators have no access (ADR-030).

**Q12 [C] Evaluation scale (Batch 4b).**
- The problem: the two repos disagree on how a dimension is scored.
  - `nilecrz` scores each criterion 0–5 (4 criteria per dimension) and weights them to 100. The weights are hygiene 15, service 20, food 15, amenities 10, management 10, cabin & vessel 20, experience 10.
  - `nile-cruise-marketplace` scores each dimension 0–10 directly, with the same weights.
- The guide matches `nilecrz`.
- **Recommendation:** use `nilecrz`'s method and its criteria list. Please confirm the **weights and the 28 criteria** (they are trust-critical and public on `/how-we-choose-vessels/`).

**Q13 [C] Japanese letter-spacing (Batch 2).**
- The problem:
  - CLAUDE.md says "never letter-space Japanese".
  - The brand book says to reduce eyebrow tracking to 0.08em.
  - The bundle applies 0.08em to eyebrows, section titles and badges under `:lang(ja)`.
- **Recommendation:** follow CLAUDE.md (priority 1): letter-spacing 0 under `:lang(ja)`, and log the design-system difference.

> **Answered 17 Oct 2026:** Faris meant motion tokens, not letter-spacing. Japanese is **not** letter-spaced (ADR-016).

**Q14 [C] Motion tokens live outside tokens.json (Batch 1).**
- The problem: CLAUDE.md requires tokens generated from tokens.json, but `--ease-river` and `--dur-1/2/3` exist only in bundle.css and the brand book.
- **Recommendation:**
  - The generator also emits a `motion` group defined in a small `tokens/motion.json` beside the original, with the same values.
  - Ideally, add it to the design system's `tokens.json` at its next version.

> **Answered 17 Oct 2026:** yes, add them to the design-system tokens (ADR-016).

**Q15 [C] Fonts "with no files" (Batch 1).**
- The problem: the brand book says to use hosted Google fonts and no files, while our performance budget favours self-hosting through `next/font` (same faces, downloaded at build).
- **Recommendation:**
  - Self-host through `next/font`.
  - Load Noto Serif JP / Noto Sans JP subsets only on `/ja/`, because the stacks name them but nothing loads them today.

---

## Ambiguities: money, data, permissions, legal

**Q16 [A] Payment deadline edge cases (Batch 4f).** For DASH-PAY-002…005:
- Is "within N days of booking" counted in Cairo calendar days from reservation creation, ending at 23:59 Cairo?
- Are 24 Dec and 7 Jan inclusive?
- Is the season set by the **departure** date (as written) even when the booking crosses seasons?
- Is cabin release after the deadline automatic or an admin action?

> **Answered 17 Oct 2026:** full payment within 3/7/14 days of booking by departure period, never after departure; automatic cancellation unless a reported payment awaits review. My calls on Cairo days and inclusive bounds are logged in ADR-027.

**Recommendation:**
- Cairo calendar days.
- Both ends inclusive.
- Season by departure date.
- Automatic release only when no payment has been reported; otherwise the booking goes to the admin queue, as the guide says.

**Q17 [A] Deposits or full payment? (Batch 4f).**
- The problem: the guide talks about full payment, but its section is called "Deposits and commission", and `nilecrz` uses deposit percentages.
- **Recommendation:**
  - Full payment by the deadline.
  - Allow an optional operator-set first instalment (deposit) inside that window.
  - Please confirm.

> **Answered 17 Oct 2026:** full payment within the deadline (ADR-027).

**Q18 [A] Commission (Batch 4f).**
- The problem: the guide doesn't define the rate or its base.
  - `nilecrz` takes 5% of the verified deposit.
  - `nile-cruise-marketplace` uses 5% per operator, configurable.
- **Recommendation:**
  - A rate per operator, defaulting to 5%, on verified cruise payments.
  - Reversed proportionally on refund.
  - Tours carry their own rate.

> **Answered 17 Oct 2026:** 10%, kept by Nilecruz (ADR-026).

**Q19 [A] Refunds and currency (Batch 4f).**
- The problem: who approves a refund, and in which currency is it recorded when the payment came in another currency?
- **Recommendation:**
  - Admin approves.
  - It is recorded in the booking currency.
  - No FX conversion inside the ledger.

**Q20 [A] Rate plans and eligibility (Batch 4c/4h).**
- The problem:
  - How is Egyptian-citizen or foreign-resident eligibility verified (document upload? at check-in?)?
  - What happens if a guest is found ineligible?
- **Recommendation:**
  - The customer declares eligibility and uploads proof.
  - The operator verifies it before payment is due.
  - If ineligible, the operator issues an updated offer at the applicable rate.
  - **The legal wording must come from you.**

**Q21 [A] Freshness threshold (Batch 4c).** "Sufficiently recent cabin availability" isn't defined; `nilecrz` refuses inventory older than 2 hours.
- **Recommendation:** 2 hours for feed/API sources, 24 hours for manual entry, both configurable by admin.

**Q22 [A] Vessel slugs and facets (Batch 3).**
- The problem:
  - `/cruises/{vessel-slug}/` shares a folder with facet slugs (`luxury`, `compare`, `7-nights`…).
  - The silo tree also nests vessel pages under `/last-minute/`, while the workbook says `/cruises/`.
- **Recommendation:**
  - Use the workbook URL.
  - Keep a reserved-slug list enforced in the database (SEO-030).

**Q23 [A] Currency display (Batch 5).**
- The problem: rates come in several currencies (USD and EUR in the repos).
- **Recommendation:**
  - Show the rate's own currency.
  - Convert only in an optional "approx." display (PROPOSED-010).
  - Never charge a converted amount.

**Q24 [A] MCP access (Batch 8).**
- The problem: "follows account and pricing restrictions" implies authenticated MCP clients.
- **Recommendation:**
  - The anonymous MCP returns public data only (from-prices).
  - Account-scoped tokens unlock the user's own rates later.
  - Is a public, unauthenticated MCP endpoint acceptable to you?

**Q25 [A] PriceAnatomy on "real data" (Batch 6).**
- The problem: its six factors (who shares the boat, cabin size, guiding, dining, mooring, logistics) are not fields on a rate sheet.
- **Recommendation:**
  - Keep it as an editorial model maintained in the CMS.
  - Calibrate each factor from the median of real published rates by vessel type and cabin size, once there are enough rates.
  - Show the footnote "Illustrative build-up based on N current rates, updated {date}".
  - Until then, show a "Sample data" flag.

**Q26 [A] Real vessel data (Batch 3).**
- The problem:
  - `nile-cruise-marketplace/data/vessels.json` holds 609 real vessel names with sourced contacts and prices, 70 with expert scores.
  - `nilecrz` imported 604 private drafts.
- **Recommendation:**
  - Import vessel identities as **private drafts**.
  - Publish nothing until an operator or admin confirms them.
  - Scores and prices from these files stay private. CLAUDE.md forbids inventing facts, and these are unverified.

> **Answered 17 Oct 2026:** all vessels are private drafts until their information is complete. See ADR-013; follow-up in Q49.

**Q27 [A] Email sender (Batch 8).** The guide says account emails aren't ready.
- **Recommendation:** Resend (it is already used in one repo), from a verified `nilecruz.com` domain.
- I need DNS access for SPF/DKIM when we get there.

**Q28 [A] Hosting (Batch 1).** Railway (live today), Vercel and Cloudflare (`nilecrz` scaffold) are all in play.
- **Recommendation:** Vercel, for Next.js, preview deployments per PR, image optimisation and cron (ARCHITECTURE §6).
- Supabase stays on its own project; I recommend a new one per environment.

> **Answered 17 Oct 2026:** Railway, not Vercel (ADR-029).

---

## Gaps

Each of these is a `PROPOSED-*` row in REQUIREMENTS. My recommendation is in brackets.

- **Q29 [G]** Password reset, email verification, change email: PROPOSED-001. [Yes, needed for launch; Batch 4a.]
- **Q30 [G]** Operator team roles: PROPOSED-002. The guide's "subject to available permissions" implies them, and `nile-cruise-marketplace` already has manager/reservations/viewer. [Yes; mirror the B2B owner/reservations/finance model.]
- **Q31 [G]** Admin sub-roles and admin user management: PROPOSED-003. [Yes for at least super admin, finance and content editor.]
- **Q32 [G]** Card payment gateway: PROPOSED-004. [Not at launch; see Q2.]
- **Q33 [G]** Transactional notifications: PROPOSED-005. Without them, offers, deadlines and verifications go unnoticed. [Yes, needed for launch.]
- **Q34 [G]** Verified guest reviews: PROPOSED-006. They are needed for AggregateRating and `/reviews/`. [Phase 2.]
- **Q35 [G]** Legal pages and cookie consent: PROPOSED-007. **I will not write legal text.** [Yes; text from you or your lawyer.]
- **Q36 [G]** Data export and deletion: PROPOSED-008. [Yes before EU marketing.]
- **Q37 [G] Answered 17 Oct 2026** (ADR-012): under 3 free, 3–5.99 25%, 6–11.99 50%, 12+ full; follow-up in Q48. Was: Child and infant policy: PROPOSED-009. CruiseSearch already asks for "children under 12 sharing a cabin", but no source defines child rates. [Needed before Batch 4c rates.]
- **Q38 [G]** Display-currency conversion: PROPOSED-010. [Later.]
- **Q39 [G]** Receipts and confirmations as PDF, and the B2B "client booking record": PROPOSED-011. DASH-B2B-008 needs at least the client record. [Yes, HTML first and print-to-PDF.]
- **Q40 [G]** Saved cruises (CruiseCard heart): PROPOSED-012. [Yes, cheap; anonymous saves kept locally and merged on sign-in.]
- **Q41 [G]** Operator settlement records: PROPOSED-013. [Yes, if Nilecruz collects money; no if operators collect directly. Which is it?]
- **Q42 [G]** Analytics with consent: PROPOSED-014. [Yes, privacy-friendly analytics.]
- **Q43 [G]** Egyptologist profiles for `/our-egyptologists/`: PROPOSED-015. [Yes, a CMS type; names and bios from you only.]
- **Q44 [G]** Booking amendments: PROPOSED-016. [After launch.]
- **Q45 [G]** Messaging about a booking: PROPOSED-017. [After launch; email links in the meantime.]

---

## Follow-ups from Faris's answers (17 Oct 2026)

**Q46 [A] The felucca tour page (Batch 7/12).** I read "completely" as also removing `/tours-extras/felucca-sail-aswan/` (PAGE-097), so it is now deferred. A felucca sail is a popular extra; say if you want that one tour page kept.

> **Answered 17 Oct 2026:** keep the felucca tour page only, as a reference that the type exists, without recommending or evaluating it (ADR-015).

**Q47 [A] Gratuities (Batch 4c/4f).** These affect money:
- Is the gratuity collected by Nilecruz with the booking, or paid on board? Either way it stays a separate line.
- Does it apply to children? I recommend not to free infants under 3, and full for everyone 3 and over unless you say otherwise.
- If a vessel's rates are in EUR, is the minimum EUR 5, or the EUR equivalent of US$5?
- Is any commission taken on the gratuity? I recommend none.

> **Answered 17 Oct 2026:** paid directly to the front office at check-out; children pay from age 3; always US$5 minimum, even when the rate is in another currency; no commission (ADR-017).

**Q48 [A] Child pricing details (Batch 4c).**
- **When is the age measured?** I recommend age on the departure date.
- **What is the 25% or 50% taken from?** I recommend the adult per-person rate for the same cabin.
- **Does the rule apply to every operator, or is it a default operators can change?** I recommend it as the platform default, changeable by admin only.
- **How many children can share a cabin, and must they share with adults?** I recommend that children share with at least one adult, within the cabin's maximum occupancy, and that a free infant does not count towards occupancy.

> **Answered 17 Oct 2026:** age on the departure date; percentage of the adult rate; admins can override the bands per operator; maximum 3 per cabin (most vessels 2); children share a parent's cabin (ADR-018). My call: infants don't count towards occupancy.

**Q49 [A] Information-only listings (Batch 4b/5).** The guide lets a vessel be public before prices and availability exist. Your rule says vessels stay private until their information is complete.
- I recommend "complete" means the full **profile** (name, type, route, description, photos, cabins, decks, amenities, gratuity, policy). Rates can follow, so information-only listings still work.
- Or should nothing be public until it is bookable?

> **Answered 17 Oct 2026:** "complete" means complete, including rates. Temporary showcase exceptions are allowed so the front end has data until everything is in place (ADR-019).

**Q50 [C] Japanese tracking (Batch 2).** I read "add tracking to the design system" as: keep the design system's 0.08em letter-spacing on Japanese eyebrows, section titles and badges, which overrides CLAUDE.md's "never letter-space Japanese". If you meant the motion tokens (Q14) instead, tell me and I'll revert ADR-014.

> **Answered 17 Oct 2026:** it meant motion tokens. ADR-014 is reverted by ADR-016.

## Follow-ups from Faris's second answers (17 Oct 2026)

> **Answered 17 Oct 2026:** Nilecruz is merchant of record, keeps 10%, and pays operators later; full payment within the deadline (ADR-026, ADR-027). Bank transfer: see Q55.

**Q51 ★ [A] Stripe: what is charged, when, and to whom (Batch 4f).** These decide the payment design:
1. **At booking: full amount, or a deposit with the balance by the deadline?**
   - The guide's deadlines (3/7/14 days) suggest this: reserve, then pay in full by card before the deadline.
   - My recommendation: take full payment by card at booking whenever the departure is inside its deadline window anyway. Otherwise, take full payment within the deadline through a payment link, with reminders.
2. **Is bank transfer or cash still allowed** (for example for travel partners)? If not, the manual "reported payment / verification" flow is limited to admin-recorded exceptions.
3. **Who receives the money?**
   - (a) Nilecruz is merchant of record and pays operators. This needs settlement records (PROPOSED-013).
   - (b) Stripe Connect sends each payment to the operator's account, minus commission.
   - My recommendation: (b) Connect, because commission is then automatic and Nilecruz never holds operator money. It needs each operator to onboard to Stripe.
4. **Commission rate** (Q18): still 5% by default, per operator?

> **Answered 17 Oct 2026:** there is no real data on the live site, and redirects are approved (ADR-028). Terms, privacy and independence are still open.

**Q52 ★ [A] The live site (Batch 3/10).**
- Does the live nilecruz.com database hold real customers, bookings or payments that must be carried over?
- May I 301-redirect its URLs to the new silo? (`/how-we-score` → `/how-we-choose-vessels/`, `/explore` → `/cruises/`, `/request` → `/plan-my-cruise/`, `/tours` → `/tours-extras/`, `/compare` → `/cruises/compare/`, `/match` → `/plan-my-cruise/`.)
- Keep `/terms`, `/privacy` and `/independence` as footer pages?

**Q53 [A] Felucca tour page (Batch 7/12).** When a supplier and sessions exist, can the felucca sail be booked like any other extra? Or does it stay information-only? I assume information-only.

## Follow-ups from Faris's third answers (17 Oct 2026)

**Q54 [A] Commission on tours (Batch 4d/4f).** Does the 10% also apply to tour and extra orders, or do tours carry their own rate per supplier? I recommend 10% by default, set per supplier by admin.

> **Answered 17 Oct 2026:** tours are sold and charged by Nilecruz alone; there is no split (ADR-030).

**Q55 [A] Payments other than card (Batch 4f).** Your deadline rules mention "a payment already reported but awaiting verification". I read that as keeping manual payments (for example bank transfer), reported by the customer and verified by an admin, alongside Stripe. Is that right? Should it be open to everyone, or only to travel partners?

> **Answered 17 Oct 2026:** yes, admin-approved manual payments as a fallback (ADR-030).

**Q56 [A] Footer legal pages (Batch 1).** May the footer link to `/terms/` and `/privacy/` as placeholder pages (no text until you supply it), and is `/independence/` kept or dropped?

> **Answered 17 Oct 2026:** draft terms and privacy, to be revised by Faris (ADR-031). `/independence` redirects to `/how-we-choose-vessels/` (my call).

## From Batch 1 (17 Oct 2026)

**Q57 [C] "Best for" labels (Batch 4b).**
- The problem: the brand book says never write "best", but the dashboard guide gives vessels editorial "Best for" labels.
- The copy lint currently allows "best for" and still rejects every other "best".
- **Recommendation:** keep it, or rename the labels to "Suits" or "Ideal for", which needs no exception.

> **Answered 17 Oct 2026:** keep the strict simulated test as the gate (ADR-040).

**Q58 ★ [A] How Lighthouse should measure the mobile LCP budget (Batch 1 onward).** The two methods disagree on the same pages:

| Method | What it does | LCP on the Batch 1 pages |
|---|---|---|
| Simulated (Lighthouse default) | Models slow 4G and a slow phone CPU | 2.7–2.8 s on 3 of 4 pages (bimodal, about 2.0 or 2.8 s) |
| Applied throttling | Really slows the browser to the same profile | 0.8–2.1 s on all pages |

- The remaining gap is mostly React and Next's own runtime (about 120 KB), which every page needs.
- **Recommendation:** gate on applied throttling in CI, and confirm with field data (Core Web Vitals) after launch.
- **Alternative:** keep the stricter simulated gate and accept that later batches must cut client JavaScript further, for example by making the language switch and nav server-only.
- Until you choose, CI shows LCP as a warning (ADR-036).

**Q59 ★ [A] Where the strict Lighthouse gate runs.** On `localhost` in CI, the simulated LCP flips between about 2.0 s and 2.8 s for the same page (see BUILD-LOG). The simulation replays the page's real load trace, and on localhost that trace is unrealistically fast, so a 30 ms timing race decides pass or fail.
- **Recommendation:** run the same strict simulated gate against the **Railway deployment** instead:
  - For each PR: Railway "PR environments" create a temporary URL, CI waits for it and runs Lighthouse there.
  - After each merge: the same check runs against staging.
- **Until then:** the localhost run stays in CI as a warning, with the numbers recorded.

## Smaller notes (no answer needed unless you disagree)

- Trust pages list "TextField · Button · SectionHeading" as their components in every row, including About and Reviews. I'll use form components only on Contact and Plan my cruise.
- `CruiseCard` needs a "Prices in preparation" state for information-only listings (DASH-PUB-010). I'll add it in the port and log it as a design-system change.
- The design system's preview data (Dahabiya Meroe, Steamer Khedive, Nile Aurora, 212 reviews, "Browse 48 cruises") will never appear outside `/dev/components`.
