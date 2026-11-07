# Content needed from Faris

Facts I must not invent. Each is a marked placeholder until it is supplied.

**Reviewed 22 Oct 2026:** only open items are listed. Items already supplied or decided were removed; git history keeps them. Numbers are unchanged, so references in ADRs and code (`CONTENT-NEEDED #38`) still point here.

**Launch column, my proposal for you to sign off (Batch 11-2 content check):**
- **Must:** needed before indexing is switched on.
- **Can follow:** the site launches without it.

## Business and legal

| # | What to supply | Launch | Notes |
|---|---|---|---|
| 27 | The legal facts for Terms and Privacy: legal entity name, registration number, registered address, governing law and courts, contact email, data-protection contact, processors and retention. Then a review of both drafts | Must | ADR-031. The terms already describe Nilecruz as the operators' booking agent (ADR-094) |
| 9 | Cookie notice and booking conditions text, from you or your lawyer | Must | Q35, PROPOSED-007 |
| 42 | The accountant's answer: do tours and extras also follow the agent model, or does Nilecruz sell them itself? | Must | ADR-094. It changes the tour receipt and terms wording |
| 5 | Customer bank transfer: the IBAN, and confirmation that "Online Era" is the final account holder | Must | Account number, SWIFT and USD currency are already in. Enter them under Deposits and commission → Bank details; never in the repository |
| 25 | Operators' bank details for payouts | Can follow | No field for them yet; I'll add one when you have the first details. Payouts are recorded by admins |

## Vessels

| # | What to supply | Launch | Notes |
|---|---|---|---|
| 3 | The real vessels to publish, each confirmed by its operator | Must | Q26, ADR-013. 622 private drafts on staging. Sample showcase vessels must be cleared before launch (ADR-019, `pnpm launch:check`) |
| 37 | For each vessel to publish: its category, its operator and its "Best for" labels | Must | ADR-071, ADR-072. The label sets are decided |
| 35 | Real evaluations: who inspects which vessels and when, scored with method v1 | Must, for the vessels shown with a score | ADR-070 |
| 2 | Confirm the wording of the 28 evaluation criteria (the 7 weights are adopted) | Must | Q12, ADR-070 |
| 14, 36 | Vessel and destination photos with publishing rights and credits | Can follow | Illustrated scenes until then; no stock photos (ADR-096) |
| 31 | Facts for the 14 name-only vessel drafts, or confirmation they're dropped | Can follow | ADR-060 |
| 51 | ~~Nour El Nil's permission for Nilecruz to feature Malouka and its photos~~ | Done | Confirmed by the owner, 3 Nov 2026 (ADR-107): the whole fleet is imported with its photos |
| 52 | Verified price ranges per vessel type | Can follow | ADR-106. The comparison says "Varies by vessel, cabin and season" until then (`priceRange` in `src/content/vessel-types.ts`) |
| 53 | Paddle steamers: typical nights and guest counts; SS Sudan's cabin count (24, older listings say 23); SS Karim's current sailings | Can follow | ADR-106. Guests show "Varies by vessel" |
| 54 | ~~Malouka's length (the operator gives 50 m × 7.7 m and 52 m × 7.5 m)~~ | Done | ADR-107: 50 × 7.7 m, from the operator's email, which matches its fleet listing |
| 55 | Approval of the vessels page's share image (the site's own three boat drawings) and one licensed photo per vessel type | Can follow | ADR-106. `public/images/og/vessels.png`; the type cards keep their drawings until photos are licensed |
| 43 | Which vessels already sell with sightseeing included (admins approve each one) | Can follow | ADR-102. None approved yet |
| 56 | What drives each vessel already in the catalogue (motor, wind or steam), from the operator | Must, for each vessel shown | ADR-107. Only Royal Lily (motor) and SS Misr, SS Sudan and SS Karim (steam) are set; the rest show no badge. List: `docs/imports/propulsion-unconfirmed.md` |
| 57 | Nour El Nil, held back until you confirm: the facilities (pool, hot tub, spa, gym, balcony), gratuities, the €900 fleet price, Dendera's cabin counts and rates, numbered deck plans | Can follow | ADR-107. Stored in `docs/imports/nour-el-nil-fleet-data.json`, not shown. Malouka's page also uses Meroe photos and Dendera's and Poppee's use "Napata" photos: those were left out |
| 59 | Licensed photos of the eight stops (Luxor, Esna, El Kab, Edfu, Gebel Silsila, Kom Ombo, Aswan, Abu Simbel), each clearly showing the place | Can follow | ADR-108. `image` in `src/content/river-stops.ts`; an illustrated temple scene (no boat) until then. Also needed for the hub's share image |
| 60 | Typical visit length for each stop | Can follow | ADR-108. Only Edfu's (about two hours) is confirmed; `visitLength` stays hidden until set |
| 61 | "From our team" notes per stop: best time of day, crowds, what to skip | Can follow | ADR-108. From the evaluation team; `insiderNote`, hidden until written |
| 62 | Whether classic Luxor–Aswan cruises stop at Esna and El Kab | Can follow | ADR-108. The table says "Check the itinerary" until confirmed |
| 63 | Pages for Esna, El Kab and Gebel Silsila | Can follow | ADR-108. Shown on the hub without a link until each page is written (no thin pages) |
| 65 | Steam Ship Sudan: permission to use its photos; the current numbered deck plan; certified guest capacity (48 reported); build or launch year (operator says 1921, others 1885); length; cabin areas (17 m² and 25 m² are category averages); Wi-Fi and cabin amenities after the refit; departure calendar; what a cruise includes; commercial terms | Can follow | Featured paddle steamer (it replaced SS Misr on /vessels/). `docs/imports/steam-ship-sudan-data.json`; each field stays hidden until confirmed |
| 67 | Euro starting prices and operator approvals, vessel by vessel (public price mode, amount, basis, nights, valid dates). Until then every vessel shows "Price on request". Awaiting: the Nour El Nil dahabiyas' euro guides (Adelaïde €2,500, Agatha €2,500, El Nil €1,775, Malouka €2,100, Meroe €2,250, Najafa €3,375, Poppee €3,250, Roman €3,000 per person for 5 nights), whether they include our margin | Can follow | ADR-109. Set by catalogue admins; no price is converted from US dollars |
| 68 | Euro option values for the price calculator (the band wording is confirmed) | Can follow | ADR-109 |

## Pages and copy

| # | What to supply | Launch | Notes |
|---|---|---|---|
| 16 | Contact details: address, phone, licence numbers (tourism licence, company registration) | Must | The Contact and About pages leave them out until then |
| 12 | Review and approval of the drafted Phase 1 page copy (38 pages, all marked draft), plus keyword validation | Must | SEO-029, ADR-096. Approve in Sanity |
| 38 | Your wording for the Egyptian-citizen and foreign-resident rate declaration (what the guest declares, what proof, what happens if not eligible) | Must | The rules are settled (ADR-078, ADR-088); the text on the accept and reservation pages is a draft |
| 1 | Logo file | Can follow | Text wordmark until then (ADR-022) |
| 10 | Approval to keep "Prices explained" on illustrative amounts until enough real rates exist, or the real factor data | Can follow | Q25. Shown as "Sample data" |
| 11 | Review of the vessel-type profiles' text | Can follow | Guests and cabins come from the catalogue; no prices are shown |
| 13 | Egyptologists: names, bios, qualifications, languages, photos and photo consent | Can follow | ADR-053. Shown from Batch 12 |

## Tours

| # | What to supply | Launch | Notes |
|---|---|---|---|
| 39 | Tour photos with rights | Can follow | The 9 tours are imported as private drafts (ADR-094) |
| 15 | Your go-ahead to load your tour rate sheet on staging | Must, if tours sell at launch | 16 rates plus programmes are loaded locally (`pnpm import:tour-rates`) |
| 41 | Any tour whose cancellation differs from the standard "free until 48 hours, then 100 %" | Can follow | ADR-097 |
| 40 | The hot-air balloon supplier and its price | Can follow | Other tours run from your Luxor and Aswan offices (ADR-097) |

## Languages

| # | What to supply | Launch | Notes |
|---|---|---|---|
| 17, 28 | A native-speaker review of the Spanish and Japanese interface text (`messages/es.json`, `messages/ja.json`), then page translations | Must, for ES/JA pages to be indexed | I18N-005, ADR-032. Only the cancellation wording is approved |
| 44 | A review of the Spanish and Japanese keyword drafts (`docs/drafts/keywords-es-ja.xlsx`) | With 17 | I18N-012. Not checked against search volumes |
| 58 | A review of the Spanish and Japanese text for the Nour El Nil fleet: summaries, inclusions, programme, cabins, life on board, good to know and photo alt text | With 17 | ADR-107. `docs/imports/nour-el-nil-fleet-i18n.json`, drafted by Claude and marked `needs_human_review`; re-run `pnpm import:fleet` after edits |
| 64 | A review of the Spanish and Japanese text for the destinations hub and the stop data (`messages/*.json` → `destinationsPillar`, `src/content/river-stops.ts`) | With 17 | ADR-108. Drafted by Claude; the hub is listed in `TRANSLATED` so it renders in each language |
| 66 | A review of the Spanish and Japanese text for Steam Ship Sudan | With 17 | `docs/imports/steam-ship-sudan-i18n.json`, drafted by Claude; re-run `pnpm import:fleet docs/imports/steam-ship-sudan-data.json docs/imports/steam-ship-sudan-i18n.json` after edits |
| 69 | A review of the Spanish and Japanese price texts: the starting price, "Price on request", "Check rates for your dates", save-quote and alerts, the margin sentence and the gratuities line (`pricing` in messages/es.json and ja.json) | With 17 | ADR-109. Drafted by Claude |

## Accounts and settings (yours to create)

| # | What | Launch | Notes |
|---|---|---|---|
| 18 | Email: a Resend account and DNS access to verify the sending domain | Must | Q27. Without it no account or booking emails are sent |
| 23 | Stripe live keys and the live webhook | Must | Sandbox keys are in staging (ADR-090) |
| 45 | Supabase production: a paid EU project with daily backups (then I rehearse a restore) | Must | ENG-011, ENG-015 |
| 46 | Sentry: the account (EU region, free plan) and its two DSNs in Railway | Can follow | ENG-014. Error tracking is off until then |
| 47 | Domain DNS for nilecruz.com and Google Search Console | Must | LAUNCH.md |
| 34 | Sign up on staging with islamjp69@gmail.com so I can make it super admin, or confirm it's done | Must | ADR-066 |
| 48 | WhatsApp: Meta's approval of the message templates | Can follow | `docs/whatsapp-templates.md`. Email works without it |
| 49 | `ANTHROPIC_API_KEY` in Railway, for reading messy vacancy sheets | Can follow | Clean sheets work without it |
| 33 | A Google Cloud OAuth client, only if you want "Sign in with Google" | Can follow | ADR-065 |
| 50 | The old site's vessel list export, only for vessel-by-vessel redirects | Can follow | Batch 10-2a. Old vessel pages redirect to /vessels/ until then |

## Not content from you

These are entered by operators in their dashboard, so they're not on this list:
- gratuity per vessel (#19);
- itinerary days, which give check-in and check-out (#20);
- cabin occupancy and counts (#22);
- sailing times;
- webhook addresses.

Child-pricing bands that differ from the default (#21) are set by admins per operator, when an operator asks.
