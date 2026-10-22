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
| 43 | Which vessels already sell with sightseeing included (admins approve each one) | Can follow | ADR-102. None approved yet |

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
