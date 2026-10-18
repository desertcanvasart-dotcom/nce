# Batch 4b brief: Admin catalogue and quality

**Status:** awaiting Faris's go-ahead · **Branch:** `batch-04b-admin-catalogue` (from `main`) · **Size:** L

**Goal:** the admin workspace becomes the working control centre for the vessel directory. An admin can:
- find any of the 622 staging vessels and complete it;
- add photographs and evaluate it with the Nilecruz method;
- see what is still missing before publication;
- import more vessels from a CSV file.

Operators can apply, be approved, prepare their vessel information and submit it. Admins review it, ask for changes, then approve or reject.

## Requirement IDs in scope (46)

- **Overview and activity:** DASH-ADM-001, 002, 007, 008, 009
- **Catalogue:** DASH-ADM-010 to 019
- **CSV import:** DASH-ADM-020 to 025, DASH-BND-004
- **Evaluations, external ratings, safety:** DASH-ADM-026 to 034, DASH-BND-005
- **Submissions:** DASH-ADM-035 to 041, DASH-OPR-006, 007
- **Operators:** DASH-ADM-042, 043, 044
- **Publication rules:** DATA-021 (private until the readiness check is complete), DATA-024 (temporary showcase exception)

## What I will build

**Overview** (`/dashboard/admin/`):
- **Counters**, each linking to its pre-filtered list:
  - operator applications awaiting approval;
  - private vessel drafts;
  - submissions awaiting review.
- The counters for payments, bookings, cancellations and feed errors arrive with their batches (4c–4f). Until then they show "not built yet", never zero.
- **Activity history:** the audit log, readable. Who did what to which record and when, in Cairo time, filterable by person, record type and date.
- No business-intelligence reports (DASH-ADM-009).

**Catalogue** (`/dashboard/admin/catalogue/`):
- **Directory:** search by name or alias, filter by type, visibility and readiness, with an "incomplete" marker on each row.
- **Vessel editor** for every field the guide lists:
  - name, type, route, category;
  - description in EN/ES/JA (English required);
  - photographs, with a description for screen readers, credit, and a rights confirmation;
  - cabin, guest and deck counts, and year built;
  - assigned operator (approved operators only);
  - "Best for" labels.
- **Readiness check:** a list of what is missing for each vessel.
  - It includes rates and availability (DATA-021), which only exist from Batch 4c.
  - So no vessel can be published in this batch except through a showcase exception.
- **Publication:**
  - an admin approves publication once the check is complete;
  - or grants a dated showcase exception with a reason, which shows a visible "Details in preparation · sample" flag and is never bookable (DATA-024, DASH-ADM-019);
  - every change goes into the audit log.
- **Private facts:** aliases, the sources and the verification notes from the directory import (Batch 3) are shown to admins only.

**CSV import** (`/dashboard/admin/catalogue/import/`):
- **Template:** a downloadable file with one example row marked as an example.
- **Preview:** upload, then a row-by-row preview with plain-language errors. Nothing is written until the admin confirms.
- **Writing:** rows become private drafts. Rows whose source reference or name already exists are skipped, and existing records are never changed.
- The screen says it imports vessel profiles only: no cabins, prices, availability, policies or evaluations (DASH-BND-004).

**Evaluations** (in the vessel editor):
- **Scoring:**
  - seven dimensions, each with its inspection criteria scored 0 to 5 (question 1);
  - the weighted dimension results and an overall score out of 100 are calculated on the server and unit-tested.
- **Record:** assessment date, evaluator or team, verdict, notes for travellers (EN/ES/JA), and the method version.
- **Visibility:** published only when an admin chooses; unpublished evaluations can never be read publicly.
- **External ratings:** a separate list (source, rating, scale, review count, link, date retrieved). Entered by hand, never refreshed automatically, and never mixed into the score (DASH-ADM-033, DASH-BND-005).
- **Safety observations:** internal only, with a review status (open, under review, resolved) and notes. Never public, never scored.

**Operators** (`/dashboard/admin/operators/`):
- **Applications:** the list, with approve, reject and pause actions and a reason. The company's owner sees the new status in their workspace.
- **Operator detail:** company details, team members, and connected vessels (assign or remove).

**For operators:**
- **Apply as an operator** from the account page: company name, legal name, registration details. It creates an "applied" company with the applicant as owner (question 4).
- **Team:** owners invite staff by email as reservations, finance or viewer, change their roles and remove them (question 5).
- **Cruises and submissions:**
  - create a vessel draft, or propose changes to an assigned vessel;
  - submit for review; the record is locked while under review (DASH-ADM-041);
  - read the admin's feedback, change it and resubmit.

  States: private draft → submitted → changes requested → approved or rejected, with the full history.

**Database (new migrations):** evaluations and criterion scores, external ratings, safety observations, submissions and their history, "Best for" labels, five-level vessel categories (question 2), team invitations. Each comes with RLS, explicit grants and pgTAP tests.

## Tests I will add

- **Unit:**
  - scoring (criteria → dimension → overall, with edge cases and rounding);
  - the readiness check;
  - CSV parsing and validation, including duplicates, bad types and wrong encodings;
  - the submission state machine (only allowed transitions);
  - category-to-facet mapping.
- **Database (pgTAP):**
  - unpublished evaluations and safety observations are never readable publicly or by operators;
  - operators see only their own submissions and can't change a locked one;
  - only admins with the catalogue (or super) role approve.
- **End-to-end:**
  - CSV import from upload to drafts, with duplicates skipped;
  - a vessel edited and evaluated, the score shown correctly, and the readiness list updating;
  - a showcase exception publishes a vessel with its sample flag;
  - an operator applies → admin approves → operator invites a team member → operator submits a vessel → admin requests changes → operator resubmits → admin approves;
  - catalogue, finance and content admins see only what their roles allow.
- **Accessibility and visual:** axe and keyboard checks on every new screen in Day and Night; screenshots at 375, 768 and 1440 px.

## New dependencies

| Package | Why |
|---|---|
| `papaparse` | CSV parsing that handles quoted fields, line breaks inside fields and encodings correctly. Server-only. |
| `image-size` | Reads a photo's width and height on upload, so pages reserve its space and don't jump (CLS). Server-only, tiny. |

## Questions for Faris before I start

1. **Evaluation method.**
   - Your `nilecrz` repository already defines one, and the weights match `nile-cruise-marketplace`:

     | Dimension | Weight |
     |---|---|
     | Hygiene | 15 |
     | Service | 20 |
     | Food | 15 |
     | Amenities | 10 |
     | Management | 10 |
     | Cabin and vessel | 20 |
     | Cruise experience | 10 |

   - Each dimension has four criteria scored 0–5; its result is (sum ÷ 20) × weight, and the total is out of 100. For example, Hygiene: cleanliness of cabins and public areas, bathroom hygiene, linen and towel care, food-handling hygiene.
   - May I adopt this as method version 1? The criteria text becomes editable later only through a new version, so old scores keep their meaning.
2. **Vessel categories.**
   - Both repositories use five: Basic, Standard, Superior, Deluxe, Luxury. My Batch 3 schema only has the site's two listing pages, `luxury` and `value`.
   - My proposal:
     - an admin sets the category (it is not calculated from the score);
     - `/cruises/luxury/` lists Luxury and Deluxe;
     - `/cruises/value/` lists Basic and Standard;
     - Superior appears in neither.
   - Agreed, or should the score decide the category?
3. **"Best for" labels** (closes Q57).
   - I propose the ten labels from `nilecrz`: first-time visitors, cabins, quiet stays, food lovers, families, couples, luxury travellers, value, traditional character, contemporary design.
   - Shown as "Best for: families". Admins choose them; they are never derived from scores.
   - Keep the wording "Best for", or use "Ideal for"?
4. **How operators apply.** The silo has no public operator page. I propose an "Apply as an operator" form inside the account; a public "List your vessels" page can come with the trust pages in Batch 7. Agreed?
5. **Operator team invitations in this batch.** I recommend yes. Owners can then add their reservations and finance staff before cruises are built in 4c. The invitations go through staging's limited email sender until Resend is set up.
6. **Evaluation verdict.** Free text, or a fixed choice? I recommend a fixed choice: Recommended / Recommended with reservations / Not recommended, plus free notes for travellers.
