# Requirement ledger

The single checklist for the whole build (CLAUDE.md §3). **Generated** from `scripts/ledger.py` during Batch 0; from Batch 1 on, edit this file directly and keep IDs stable. Statuses: `Planned`, `In progress`, `Built`, `Verified`, `Deferred (reason + Faris's OK)`. A requirement is never removed.

**Source keys:** `DG` = `Nilecruz Dashboard Guide.docx` (§ = heading, ¶ = paragraph within it, list = bullet list); `silo.xlsx` = `nilecrz-site-silo.xlsx`; `DS` = `nilecrz-design-system/`; `BRAND-BOOK` = `BRAND-BOOK.md` (= root `README.md`).

Batch codes are defined in `BATCH-PLAN.md`. Every ID below sits in exactly one batch; `PROPOSED-*` items at the end are **not** scheduled until Faris approves them.

## Totals by source

| Source | Rows |
|---|---:|
| Dashboard guide (ROLE) | 6 |
| Dashboard guide (ADM) | 107 |
| Dashboard guide (OPR) | 27 |
| Dashboard guide (CUS) | 17 |
| Dashboard guide (B2B) | 13 |
| Dashboard guide (PAY) | 14 |
| Dashboard guide (PUB) | 12 |
| Dashboard guide (BND) | 8 |
| PAGE | 106 |
| COMP | 22 |
| TOK | 12 |
| BRAND | 26 |
| ENG | 18 |
| A11Y | 11 |
| PERF | 10 |
| SEC | 13 |
| SEO | 30 |
| I18N | 12 |
| DATA | 14 |
| EXP | 10 |
| **Total** | **488** |

## Dashboard guide (ROLE)

| ID | Source | Requirement | Batch | Status | Evidence |
|---|---|---|---|---|---|
| DASH-ROLE-001 | DG §Account roles | There are four account types: Admin, Operator, Customer and Travel partner (B2B), each landing in its own workspace. | 4a | Planned | |
| DASH-ROLE-002 | DG §Account roles | Admin can act on vessels, operators, partners, evaluations, bookings, payments and tours across the whole marketplace. | 4a | Planned | |
| DASH-ROLE-003 | DG §Account roles | Operator can read and write only its own vessels, cabins, schedules, prices, offers and bookings (enforced by RLS and server checks). | 4a | Planned | |
| DASH-ROLE-004 | DG §Account roles | Customer can read and write only their own requests, offers, reservations, payments and tours. | 4a | Planned | |
| DASH-ROLE-005 | DG §Account roles | Travel partner can see only approved trade availability, its company's bookings and its team permissions. | 4a | Planned | |
| DASH-ROLE-006 | DG §Intro ¶2 | The dashboard's navigation and content change according to the signed-in account type. | 4a | Planned | |

## Dashboard guide (ADM)

| ID | Source | Requirement | Batch | Status | Evidence |
|---|---|---|---|---|---|
| DASH-ADM-001 | DG §Admin/Overview | Overview shows a counter of operator applications awaiting approval. | 4b | Planned | |
| DASH-ADM-002 | DG §Admin/Overview | Overview shows a counter of private vessel drafts and cruise submissions awaiting review. | 4b | Planned | |
| DASH-ADM-003 | DG §Admin/Overview | Overview shows a counter of payments awaiting verification. | 4f | Planned | |
| DASH-ADM-004 | DG §Admin/Overview | Overview shows a counter of current and upcoming bookings. | 4e | Planned | |
| DASH-ADM-005 | DG §Admin/Overview | Overview shows a counter of cancellation requests and refund reviews. | 4f | Planned | |
| DASH-ADM-006 | DG §Admin/Overview | Overview shows a counter of inventory connection errors. | 4c | Planned | |
| DASH-ADM-007 | DG §Admin/Overview | Each overview counter links to the list of the records it counts, pre-filtered. | 4b | Planned | |
| DASH-ADM-008 | DG §Admin/Overview | An activity history records marketplace actions (actor, action, record, time) and admins can browse it. | 4b | Planned | |
| DASH-ADM-009 | DG §Admin/Overview | The overview is an operational queue; business-intelligence reporting is out of scope unless Faris adds it. | 4b | Planned | |
| DASH-ADM-010 | DG §Admin/Catalogue ¶1 | Admins can search the vessel directory by vessel name. | 4b | Planned | |
| DASH-ADM-011 | DG §Admin/Catalogue ¶1 | Admins can filter vessels by publication status. | 4b | Planned | |
| DASH-ADM-012 | DG §Admin/Catalogue ¶1 | Admins can filter to, and see a marker on, incomplete vessel records. | 4b | Planned | |
| DASH-ADM-013 | DG §Admin/Catalogue ¶2 | A vessel record holds name, type, route, category, description, photographs, total cabin count, assigned operator and editorial 'Best for' labels. | 4b | Planned | |
| DASH-ADM-014 | DG §Admin/Catalogue ¶3 | Admins can create a vessel. | 4b | Planned | |
| DASH-ADM-015 | DG §Admin/Catalogue ¶3 | Admins can edit a vessel. | 4b | Planned | |
| DASH-ADM-016 | DG §Admin/Catalogue ¶3 | Admins can assign a vessel to an operator, choosing only from approved operators. | 4b | Planned | |
| DASH-ADM-017 | DG §Admin/Catalogue ¶3 | Admins can approve a vessel's publication. | 4b | Planned | |
| DASH-ADM-018 | DG §Admin/Catalogue ¶3 | A listing-readiness check lists the missing information for each vessel. | 4b | Planned | |
| DASH-ADM-019 | DG §Admin/Catalogue ¶4 | A vessel can be publicly visible as information-only while prices and availability are prepared; visibility never makes it bookable. | 4b | Planned | |
| DASH-ADM-020 | DG §Admin/Catalogue ¶5 | Admins can download the vessel CSV import template. | 4b | Planned | |
| DASH-ADM-021 | DG §Admin/Catalogue ¶5 | Admins can upload a vessel CSV file. | 4b | Planned | |
| DASH-ADM-022 | DG §Admin/Catalogue ¶5 | The importer previews row-level validation errors before anything is written. | 4b | Planned | |
| DASH-ADM-023 | DG §Admin/Catalogue ¶5 | Imported rows become private vessel drafts. | 4b | Planned | |
| DASH-ADM-024 | DG §Admin/Catalogue ¶5 | Rows whose source reference or vessel name already exists are skipped and existing records are left unchanged. | 4b | Planned | |
| DASH-ADM-025 | DG §Admin/Catalogue ¶6 | The CSV importer covers vessel profiles only, not cabins, departure prices, availability, cancellation policies or evaluations. | 4b | Planned | |
| DASH-ADM-026 | DG §Admin/Evaluations ¶1 | Evaluations are entered from the vessel's catalogue editor. | 4b | Planned | |
| DASH-ADM-027 | DG §Admin/Evaluations ¶1 | An evaluation covers seven dimensions: Hygiene, Service, Food, Amenities, Management, Cabin and vessel, Cruise experience. | 4b | Planned | |
| DASH-ADM-028 | DG §Admin/Evaluations ¶2 | Each dimension has inspection criteria scored 0 to 5. | 4b | Planned | |
| DASH-ADM-029 | DG §Admin/Evaluations ¶2 | The system calculates a weighted result for each dimension. | 4b | Planned | |
| DASH-ADM-030 | DG §Admin/Evaluations ¶2 | The system calculates an overall score out of 100 (unit-tested). | 4b | Planned | |
| DASH-ADM-031 | DG §Admin/Evaluations ¶3 | An evaluation records assessment date, evaluator or team name, verdict and notes for travellers. | 4b | Planned | |
| DASH-ADM-032 | DG §Admin/Evaluations ¶3 | Admins control whether an evaluation is published; unpublished evaluations are never readable publicly. | 4b | Planned | |
| DASH-ADM-033 | DG §Admin/Evaluations ¶4 | External review ratings are stored separately from Nilecruz's evaluation and are never treated as an inspection score. | 4b | Planned | |
| DASH-ADM-034 | DG §Admin/Evaluations ¶5 | Admins can record internal safety observations with a review status and notes; they are never public. | 4b | Planned | |
| DASH-ADM-035 | DG §Admin/Submissions ¶1 | Operators can prepare vessel information and submit it for review. | 4b | Planned | |
| DASH-ADM-036 | DG §Admin/Submissions ¶1 | A submission moves through private draft, submitted for review, changes requested, approved and rejected. | 4b | Planned | |
| DASH-ADM-037 | DG §Admin/Submissions ¶2 | Admins can inspect the submitted information. | 4b | Planned | |
| DASH-ADM-038 | DG §Admin/Submissions ¶2 | Admins can review a submission's history of states and changes. | 4b | Planned | |
| DASH-ADM-039 | DG §Admin/Submissions ¶2 | Admins can send feedback to the operator. | 4b | Planned | |
| DASH-ADM-040 | DG §Admin/Submissions ¶2 | Admins make the final approve or reject decision. | 4b | Planned | |
| DASH-ADM-041 | DG §Admin/Submissions ¶2 | A submitted record cannot be edited through ordinary editing while under review. | 4b | Planned | |
| DASH-ADM-042 | DG §Admin/Operators ¶1 | Admins can review operator applications. | 4b | Planned | |
| DASH-ADM-043 | DG §Admin/Operators ¶1 | Admins can approve an operator's marketplace access. | 4b | Planned | |
| DASH-ADM-044 | DG §Admin/Operators ¶1 | Admins can manage which vessels are connected to an operator. | 4b | Planned | |
| DASH-ADM-045 | DG §Admin/Operators ¶2 | Admins can see each operator's inventory connection status and integration problems. | 4c | Planned | |
| DASH-ADM-046 | DG §Admin/Operators ¶2 | An operator works through manual entry, an inventory feed or an API connection. | 4c | Planned | |
| DASH-ADM-047 | DG §Admin/Operators ¶2 | A feed connection becomes active only after an admin approves it. | 4c | Planned | |
| DASH-ADM-048 | DG §Admin/Cabins ¶2 | A cabin type holds name, description, photographs, size, bed configuration, maximum occupancy, view, balcony, amenities and active/inactive status. | 4c | Planned | |
| DASH-ADM-049 | DG §Admin/Cabins ¶3 | A cabin type has a deck: Lower, Middle, Upper or a vessel-specific deck name. | 4c | Planned | |
| DASH-ADM-050 | DG §Admin/Cabins ¶4 | The same cabin category on different decks is stored as separate cabin types so offers state the location. | 4c | Planned | |
| DASH-ADM-051 | DG §Admin/Cabins ¶5 | A schedule holds a directional route, number of nights, weekly sailing days, operating date ranges and itinerary details. | 4c | Planned | |
| DASH-ADM-052 | DG §Admin/Cabins ¶5 | A vessel can have several schedules for different routes or directions. | 4c | Planned | |
| DASH-ADM-053 | DG §Admin/Cabins ¶6 | A departure rate links one sailing, one cabin type, an occupancy, a currency, a price and an available quantity. | 4c | Planned | |
| DASH-ADM-054 | DG §Admin/Cabins ¶6 | Rates can be entered for one departure or applied to all matching dates of a schedule. | 4c | Planned | |
| DASH-ADM-055 | DG §Admin/Cabins ¶7 | The system distinguishes a scheduled sailing from confirmed, sufficiently recent cabin availability. | 4c | Planned | |
| DASH-ADM-056 | DG §Admin/Cabins ¶7 | Several prices or currencies for the same physical cabin inventory never add cabins: quantity is shared. | 4c | Planned | |
| DASH-ADM-057 | DG §Admin/Cabins ¶8 | There is no fixed per-booking cabin limit; reservations are limited only by available inventory and validation. | 4e | Planned | |
| DASH-ADM-058 | DG §Admin/Tours ¶2 | Tours and extras are independent products (museum visits, evening tours, excursions, transfers). | 4d | Planned | |
| DASH-ADM-059 | DG §Admin/Tours ¶2 | A tour has a name, location and duration. | 4d | Planned | |
| DASH-ADM-060 | DG §Admin/Tours ¶2 | A tour has a description and an itinerary. | 4d | Planned | |
| DASH-ADM-061 | DG §Admin/Tours ¶2 | A tour has photographs. | 4d | Planned | |
| DASH-ADM-062 | DG §Admin/Tours ¶2 | A tour has inclusions and exclusions. | 4d | Planned | |
| DASH-ADM-063 | DG §Admin/Tours ¶2 | A tour has meeting-point or pickup instructions. | 4d | Planned | |
| DASH-ADM-064 | DG §Admin/Tours ¶2 | A tour has supplier information. | 4d | Planned | |
| DASH-ADM-065 | DG §Admin/Tours ¶2 | A tour has cancellation wording and percentage calculation bands. | 4d | Planned | |
| DASH-ADM-066 | DG §Admin/Tours ¶2 | A tour is available standalone or assigned to relevant cruises. | 4d | Planned | |
| DASH-ADM-067 | DG §Admin/Tours ¶3 | A tour has bookable sessions with start and end times, guest capacity, currency and price. | 4d | Planned | |
| DASH-ADM-068 | DG §Admin/Tours ¶3 | A session is shared or private. | 4d | Planned | |
| DASH-ADM-069 | DG §Admin/Tours ¶3 | A session is priced per guest or per group. | 4d | Planned | |
| DASH-ADM-070 | DG §Admin/Tours ¶4 | Multi-night sightseeing programs can be associated with cruise schedules and departures. | 4d | Planned | |
| DASH-ADM-071 | DG §Admin/Tours ¶4 | A program links its included tour sessions and checks their availability. | 4d | Planned | |
| DASH-ADM-072 | DG §Admin/Tours ¶5 | Each tour has its own detail page; catalogue cards do not carry the full itinerary. | 7 | Planned | |
| DASH-ADM-073 | DG §Admin/Tours ¶6 | An information-only tour can be published before rates and sessions exist and stays non-bookable until they do. | 4d | Planned | |
| DASH-ADM-074 | DG §Admin/Promotions ¶1 | Admins and authorised operators can create promotions against existing cruise rates and inventory. | 4c | Planned | |
| DASH-ADM-075 | DG §Admin/Promotions ¶1 | A promotion can be a percentage discount. | 4c | Planned | |
| DASH-ADM-076 | DG §Admin/Promotions ¶1 | A promotion can be a fixed-amount discount. | 4c | Planned | |
| DASH-ADM-077 | DG §Admin/Promotions ¶1 | A promotion can be an included extra service. | 4c | Planned | |
| DASH-ADM-078 | DG §Admin/Promotions ¶1 | A promotion can be a guaranteed cabin upgrade. | 4c | Planned | |
| DASH-ADM-079 | DG §Admin/Promotions ¶2 | A promotion can be restricted to a booking period. | 4c | Planned | |
| DASH-ADM-080 | DG §Admin/Promotions ¶2 | A promotion can be restricted to departure dates. | 4c | Planned | |
| DASH-ADM-081 | DG §Admin/Promotions ¶2 | A promotion can be restricted to selected cabin rates. | 4c | Planned | |
| DASH-ADM-082 | DG §Admin/Promotions ¶2 | A promotion carries its own benefit description and terms. | 4c | Planned | |
| DASH-ADM-083 | DG §Admin/Promotions ¶2 | A promotion can be paused and resumed. | 4c | Planned | |
| DASH-ADM-084 | DG §Admin/Promotions ¶3 | An upgrade promotion must reference matching inventory in the upgraded cabin type and never creates stock. | 4c | Planned | |
| DASH-ADM-085 | DG §Admin/Promotions ¶3 | A promotion cannot be applied on top of another promotional rate. | 4c | Planned | |
| DASH-ADM-086 | DG §Admin/Partners ¶2 | Admins can review a travel partner's company details and registration information. | 4h | Planned | |
| DASH-ADM-087 | DG §Admin/Partners ¶2 | Admins can approve a partner's trade access. | 4h | Planned | |
| DASH-ADM-088 | DG §Admin/Partners ¶2 | Admins can pause a partner's access while keeping its historical records. | 4h | Planned | |
| DASH-ADM-089 | DG §Admin/Partners ¶3 | Travel partners (buyers) and operators (suppliers) have separate permissions and workflows. | 4h | Planned | |
| DASH-ADM-090 | DG §Admin/Requests ¶1 | Admins can see all customer requests across the marketplace. | 4e | Planned | |
| DASH-ADM-091 | DG §Admin/Requests ¶1 | Admins can see all operator offers. | 4e | Planned | |
| DASH-ADM-092 | DG §Admin/Requests ¶1 | Admins can see all resulting reservations. | 4e | Planned | |
| DASH-ADM-093 | DG §Admin/Requests ¶2 | A booking record shows sailing, guests, cabin arrangements, cabin decks, prices, payment status and the applicable terms. | 4e | Planned | |
| DASH-ADM-094 | DG §Admin/Requests ¶3 | Admins can find and investigate incomplete transactions. | 4e | Planned | |
| DASH-ADM-095 | DG §Admin/Requests ¶3 | Admins can investigate cancellation requests and refund cases. | 4f | Planned | |
| DASH-ADM-096 | DG §Admin/Requests ¶3 | Admins can search and filter requests and bookings by operator, route and booking reference. | 4e | Planned | |
| DASH-ADM-097 | DG §Admin/Deposits ¶1 | Admins can verify reported payments. | 4f | Planned | |
| DASH-ADM-098 | DG §Admin/Deposits ¶1 | Admins can browse financial records. | 4f | Planned | |
| DASH-ADM-099 | DG §Admin/Deposits ¶1 | Admins maintain a premium-date calendar. | 4f | Planned | |
| DASH-ADM-100 | DG §Admin/Deposits ¶2 | The finance workflow supports payment requests. | 4f | Planned | |
| DASH-ADM-101 | DG §Admin/Deposits ¶2 | The finance workflow supports reported payments. | 4f | Planned | |
| DASH-ADM-102 | DG §Admin/Deposits ¶2 | The finance workflow supports recorded receipts. | 4f | Planned | |
| DASH-ADM-103 | DG §Admin/Deposits ¶2 | The finance workflow shows outstanding balances. | 4f | Planned | |
| DASH-ADM-104 | DG §Admin/Deposits ¶2 | The finance workflow calculates cancellation charges. | 4f | Planned | |
| DASH-ADM-105 | DG §Admin/Deposits ¶2 | The finance workflow keeps refund records. | 4f | Planned | |
| DASH-ADM-106 | DG §Admin/Deposits ¶2 | Commission records track commission entries and reversals. | 4f | Planned | |
| DASH-ADM-107 | DG §Admin/Deposits ¶3 | Recording or verifying a payment never charges a card or moves money, and the UI never implies it does. | 4f | Planned | |

## Dashboard guide (OPR)

| ID | Source | Requirement | Batch | Status | Evidence |
|---|---|---|---|---|---|
| DASH-OPR-001 | DG §Operator ¶1 | An operator sees only its own business, never other operators' data. | 4c | Planned | |
| DASH-OPR-002 | DG §Operator list | Operator overview shows new requests. | 4e | Planned | |
| DASH-OPR-003 | DG §Operator list | Operator overview shows outstanding offers. | 4e | Planned | |
| DASH-OPR-004 | DG §Operator list | Operator overview shows upcoming departures. | 4c | Planned | |
| DASH-OPR-005 | DG §Operator list | Operator overview shows inventory issues. | 4c | Planned | |
| DASH-OPR-006 | DG §Operator list | An operator can create cruise drafts and submit them for admin approval. | 4b | Planned | |
| DASH-OPR-007 | DG §Operator list | An operator can respond to requested changes and resubmit. | 4b | Planned | |
| DASH-OPR-008 | DG §Operator list | An operator can maintain cabin descriptions, photographs, decks and capacities. | 4c | Planned | |
| DASH-OPR-009 | DG §Operator list | An operator can create routes, schedules and departure rates. | 4c | Planned | |
| DASH-OPR-010 | DG §Operator list | An operator can manage international, Egyptian-citizen, foreign-resident and trade rate plans. | 4c | Planned | |
| DASH-OPR-011 | DG §Operator list | An operator can prepare personal offers for suitable customer requests. | 4e | Planned | |
| DASH-OPR-012 | DG §Operator list | An authorised operator can manage promotions and upgrades. | 4c | Planned | |
| DASH-OPR-013 | DG §Operator list | An operator can review its bookings and their payment information. | 4f | Planned | |
| DASH-OPR-014 | DG §Operator list | An operator can request payments and record money received, subject to its permissions. | 4f | Planned | |
| DASH-OPR-015 | DG §Operator list | An operator can handle cancellation and refund workflows for its bookings. | 4f | Planned | |
| DASH-OPR-016 | DG §Operator list | An operator can configure manual, feed or API inventory connections. | 4c | Planned | |
| DASH-OPR-017 | DG §Operator ¶offers | A personal offer specifies a sailing and cabin arrangement. | 4e | Planned | |
| DASH-OPR-018 | DG §Operator ¶offers | A personal offer specifies price, inclusions, terms and expiry. | 4e | Planned | |
| DASH-OPR-019 | DG §Operator ¶offers | The operator confirms the family or passenger-eligibility conditions of an offer. | 4e | Planned | |
| DASH-OPR-020 | DG §Operator ¶offers | Sending an offer does not hold inventory. | 4e | Planned | |
| DASH-OPR-021 | DG §Operator ¶offers | Accepting an offer re-checks the sailing and cabin availability atomically. | 4e | Planned | |
| DASH-OPR-022 | DG §Operator ¶deck | An offer records the cabin deck. | 4e | Planned | |
| DASH-OPR-023 | DG §Operator ¶deck | If the deck changes before acceptance, the customer receives an updated offer to review and the old one cannot be accepted. | 4e | Planned | |
| DASH-OPR-024 | DG §Operator ¶integration | An operator can paste supported JSON or XML inventory. | 4c | Planned | |
| DASH-OPR-025 | DG §Operator ¶integration | An operator can configure an inventory feed URL. | 4c | Planned | |
| DASH-OPR-026 | DG §Operator ¶integration | An operator can generate and rotate API credentials. | 4c | Planned | |
| DASH-OPR-027 | DG §Operator ¶integration | The dashboard shows connection health and feed activity. | 4c | Planned | |

## Dashboard guide (CUS)

| ID | Source | Requirement | Batch | Status | Evidence |
|---|---|---|---|---|---|
| DASH-CUS-001 | DG §Customer ¶1 | The customer dashboard is called 'My journey'. | 4g | Planned | |
| DASH-CUS-002 | DG §Customer ¶2 | My journey has sections Overview, Requests and offers, Bookings, Tours and sightseeing, Past trips and Account. | 4g | Planned | |
| DASH-CUS-003 | DG §Customer list | Overview shows upcoming trips and actions requiring attention. | 4g | Planned | |
| DASH-CUS-004 | DG §Customer list | A customer can track their submitted cruise requests. | 4e | Planned | |
| DASH-CUS-005 | DG §Customer list | A customer can compare the personal offers received. | 4e | Planned | |
| DASH-CUS-006 | DG §Customer list | An offer shows actual departure dates, route, cabin arrangement and price. | 4e | Planned | |
| DASH-CUS-007 | DG §Customer list | A customer can read the terms and accept a valid (unexpired, current) offer. | 4e | Planned | |
| DASH-CUS-008 | DG §Customer list | A customer can review reservations, payment deadlines and outstanding balances. | 4f | Planned | |
| DASH-CUS-009 | DG §Customer list | A customer can report a payment and follow its verification status. | 4f | Planned | |
| DASH-CUS-010 | DG §Customer list | A customer can request cancellation and follow the refund-review status. | 4f | Planned | |
| DASH-CUS-011 | DG §Customer list | A customer can browse and manage eligible tours and sightseeing separately from cruises. | 4g | Planned | |
| DASH-CUS-012 | DG §Customer list | A customer can review past trips and closed requests. | 4g | Planned | |
| DASH-CUS-013 | DG §Customer list | A customer can manage account security. | 4a | Planned | |
| DASH-CUS-014 | DG §Customer ¶request | A request captures routes or flexible preferences, dates or windows, latest finish date, duration, guests, cabin arrangements and optional budget. | 4e | Planned | |
| DASH-CUS-015 | DG §Customer ¶request | Request copy states it is a request for offers: no bid or lowest market price is guaranteed. | 4e | Planned | |
| DASH-CUS-016 | DG §Customer ¶deck | A signed-in customer can use the cabin-deck selector to choose a deck and cabin type. | 5 | Planned | |
| DASH-CUS-017 | DG §Customer ¶deck | The deck selector is labelled schematic and never implies a numbered cabin is reserved. | 5 | Planned | |

## Dashboard guide (B2B)

| ID | Source | Requirement | Batch | Status | Evidence |
|---|---|---|---|---|---|
| DASH-B2B-001 | DG §Partner list | An approved partner can search available departures. | 4h | Planned | |
| DASH-B2B-002 | DG §Partner list | An approved partner sees eligible trade and market-specific rates. | 4h | Planned | |
| DASH-B2B-003 | DG §Partner list | A partner can reserve cabins for clients. | 4h | Planned | |
| DASH-B2B-004 | DG §Partner list | A partner can submit company requests and compare offers. | 4h | Planned | |
| DASH-B2B-005 | DG §Partner list | A partner can view company bookings and payment records. | 4h | Planned | |
| DASH-B2B-006 | DG §Partner list | A partner can record passenger details and client references. | 4h | Planned | |
| DASH-B2B-007 | DG §Partner list | A partner can record an agency selling total and see the difference from the supplier total. | 4h | Planned | |
| DASH-B2B-008 | DG §Partner list | A partner can produce a client booking record. | 4h | Planned | |
| DASH-B2B-009 | DG §Partner list | A partner owner can invite team members and set their permissions. | 4h | Planned | |
| DASH-B2B-010 | DG §Partner ¶teams | Team roles are company owner, reservations user and finance user, each with distinct permissions. | 4h | Planned | |
| DASH-B2B-011 | DG §Partner ¶access | Trade access requires admin approval. | 4h | Planned | |
| DASH-B2B-012 | DG §Partner ¶access | A rate can be restricted to the trade channel or to one particular company. | 4h | Planned | |
| DASH-B2B-013 | DG §Partner ¶access | Passenger-market eligibility (e.g. Egyptian-citizen rates) remains subject to verification. | 4h | Planned | |

## Dashboard guide (PAY)

| ID | Source | Requirement | Batch | Status | Evidence |
|---|---|---|---|---|---|
| DASH-PAY-001 | DG §Payment ¶1 | Payment deadlines and cancellation policies are separate mechanisms in data and code. | 4f | Planned | |
| DASH-PAY-002 | DG §Payment table | Departures from 24 Dec to 7 Jan, or in a configured premium period, require full payment within 3 days of booking. | 4f | Planned | |
| DASH-PAY-003 | DG §Payment table | Other October–April departures require full payment within 7 days of booking. | 4f | Planned | |
| DASH-PAY-004 | DG §Payment table | May–September departures require full payment within 14 days of booking. | 4f | Planned | |
| DASH-PAY-005 | DG §Payment ¶2 | The deadline is never later than departure. | 4f | Planned | |
| DASH-PAY-006 | DG §Payment ¶2 | Admins can add and edit premium periods. | 4f | Planned | |
| DASH-PAY-007 | DG §Payment ¶2 | Western Easter 21–29 Mar 2027 is configured as a premium period. | 4f | Planned | |
| DASH-PAY-008 | DG §Payment ¶3 | Unpaid reservations past their deadline are subject to cancellation and cabin release. | 4f | Planned | |
| DASH-PAY-009 | DG §Payment ¶3 | A reservation with a reported payment awaiting verification is reviewed before release, never released automatically. | 4f | Planned | |
| DASH-PAY-010 | DG §Payment ¶4 | Bookings keep the deadline and policy terms agreed at booking; later rule changes never rewrite them. | 4f | Planned | |
| DASH-PAY-011 | DG §Payment ¶5 | Each cruise can have its own cancellation wording and percentage bands by time before departure. | 4f | Planned | |
| DASH-PAY-012 | DG §Payment ¶5 | The system calculates cancellation charges, refundable amounts and unpaid cancellation charges (unit-tested). | 4f | Planned | |
| DASH-PAY-013 | DG §Payment ¶5 | A customer must acknowledge the applicable policy before the payment workflow proceeds. | 4f | Planned | |
| DASH-PAY-014 | DG §Payment ¶6 | Tours have their own orders, amounts, terms and payments; a tour payment can never settle a cruise balance. | 4f | Planned | |

## Dashboard guide (PUB)

| ID | Source | Requirement | Batch | Status | Evidence |
|---|---|---|---|---|---|
| DASH-PUB-001 | DG §Public ¶1 | Visitors can browse published vessels with photographs, descriptions and routes. | 5 | Planned | |
| DASH-PUB-002 | DG §Public ¶1 | Visitors can see published Nilecruz evaluations. | 5 | Planned | |
| DASH-PUB-003 | DG §Public ¶1 | Visitors can see external reviews, labelled by source. | 5 | Planned | |
| DASH-PUB-004 | DG §Public ¶1 | Visitors can use comparison tools. | 5 | Planned | |
| DASH-PUB-005 | DG §Public ¶1 | Visitors see starting prices where an operator supplied them. | 5 | Planned | |
| DASH-PUB-006 | DG §Public ¶2 | Visitors can browse tour pages. | 7 | Planned | |
| DASH-PUB-007 | DG §Public ¶2 | Visitors can begin planning a request without an account. | 8 | Planned | |
| DASH-PUB-008 | DG §Public ¶3 | Exact departure rates and additional cabin details require an account. | 8 | Planned | |
| DASH-PUB-009 | DG §Public ¶3 | Reserving or sending a personal request requires an account. | 8 | Planned | |
| DASH-PUB-010 | DG §Public ¶3 | Information-only listings stay visible without implying prices or stock. | 5 | Planned | |
| DASH-PUB-011 | DG §Public ¶4 | A read-only MCP layer offers cruise search, comparison and availability. | 8 | Planned | |
| DASH-PUB-012 | DG §Public ¶4 | The MCP layer applies the same account and pricing restrictions and cannot book or administer. | 8 | Planned | |

## Dashboard guide (BND)

| ID | Source | Requirement | Batch | Status | Evidence |
|---|---|---|---|---|---|
| DASH-BND-001 | DG §Boundaries 1 | A sailing is bookable only when its cabin, schedule, rate, inventory and policy records are complete. | 4e | Planned | |
| DASH-BND-002 | DG §Boundaries 2 | The deck selector shows an honest empty state when a vessel has no structured cabin types. | 5 | Planned | |
| DASH-BND-003 | DG §Boundaries 3 | No screen implies numbered-cabin selection or a verified floor plan. | 5 | Planned | |
| DASH-BND-004 | DG §Boundaries 4 | The importer's scope (vessel profiles only) is stated in the import screen. | 4b | Planned | |
| DASH-BND-005 | DG §Boundaries 5 | External reviews are not collected or refreshed automatically; each shows its source and retrieval date. | 4b | Planned | |
| DASH-BND-006 | DG §Boundaries 6 | Public surfaces are in EN/ES/JA; admin and operational interfaces may stay in English. | 10 | Planned | |
| DASH-BND-007 | DG §Boundaries 7 | Account-email sending depends on a configured sender and fails visibly, not silently, when it is missing. | 8 | Planned | |
| DASH-BND-008 | DG §Boundaries 8 | Finance tracking is operational only; no accounting, bank settlement or automated refunds. | 4f | Planned | |

## PAGE

| ID | Source | Requirement | Batch | Status | Evidence |
|---|---|---|---|---|---|
| PAGE-001 | silo.xlsx Silo map P001 | `/` (Homepage, P1): H1 "Nile cruises, explained before you sail"; components NavBar · Hero · CruiseSearch · VesselTypeCard · VesselCompare · PriceAnatomy · CruiseCard · ItineraryTimeline · Gallery; schema Organization · WebSite (SearchAction); links per row (same-silo + bridges); primary keyword "nile cruise". | 6 | Planned | |
| PAGE-002 | silo.xlsx Silo map P002 | `/nile-cruise-guide/` (Pillar, P1): H1 "The complete Nile cruise guide"; components Hero · SectionHeading · VesselTypeCard · ItineraryTimeline · CruiseCard; schema Article · BreadcrumbList · FAQPage; links per row (same-silo + bridges); primary keyword "nile cruise guide". | 6 | Planned | |
| PAGE-003 | silo.xlsx Silo map P003 | `/nile-cruise-guide/routes/` (Hub, P1): H1 "Nile cruise routes compared"; components SectionHeading · ItineraryTimeline · ExperienceCard; schema CollectionPage · BreadcrumbList · ItemList; links per row (same-silo + bridges); primary keyword "nile cruise routes". | 6 | Planned | |
| PAGE-004 | silo.xlsx Silo map P004 | `/nile-cruise-guide/routes/luxor-to-aswan/` (Route guide, P1): H1 "Luxor to Aswan: the classic 4-night route"; components Hero · ItineraryTimeline · VesselCompare · CruiseCard; schema Article · BreadcrumbList · FAQPage; links per row (same-silo + bridges); primary keyword "luxor to aswan nile cruise". | 6 | Planned | |
| PAGE-005 | silo.xlsx Silo map P005 | `/nile-cruise-guide/routes/aswan-to-luxor/` (Route guide, P1): H1 "Aswan to Luxor: the 3-night downstream route"; components Hero · ItineraryTimeline · VesselCompare · CruiseCard; schema Article · BreadcrumbList · FAQPage; links per row (same-silo + bridges); primary keyword "aswan to luxor nile cruise". | 6 | Planned | |
| PAGE-006 | silo.xlsx Silo map P006 | `/nile-cruise-guide/routes/luxor-round-trip/` (Route guide, P2): H1 "Luxor round trip: the full 7-night sailing"; components Hero · ItineraryTimeline · VesselCompare · CruiseCard; schema Article · BreadcrumbList · FAQPage; links per row (same-silo + bridges); primary keyword "7 night nile cruise". | 12 | Planned | |
| PAGE-007 | silo.xlsx Silo map P007 | `/nile-cruise-guide/routes/esna-to-aswan/` (Route guide, P1): H1 "Esna to Aswan: the dahabiya route"; components Hero · ItineraryTimeline · VesselCompare · CruiseCard; schema Article · BreadcrumbList · FAQPage; links per row (same-silo + bridges); primary keyword "esna to aswan dahabiya". | 6 | Planned | |
| PAGE-008 | silo.xlsx Silo map P008 | `/nile-cruise-guide/routes/lake-nasser/` (Route guide, P2): H1 "Lake Nasser cruises: Abu Simbel by water"; components Hero · ItineraryTimeline · VesselCompare · CruiseCard; schema Article · BreadcrumbList · FAQPage; links per row (same-silo + bridges); primary keyword "lake nasser cruise". | 12 | Planned | |
| PAGE-009 | silo.xlsx Silo map P009 | `/nile-cruise-guide/routes/cairo-to-aswan/` (Route guide, P3): H1 "Cairo to Aswan: the long Nile cruise"; components Hero · ItineraryTimeline · VesselCompare · CruiseCard; schema Article · BreadcrumbList · FAQPage; links per row (same-silo + bridges); primary keyword "cairo to aswan nile cruise". | 13 | Planned | |
| PAGE-010 | silo.xlsx Silo map P010 | `/nile-cruise-guide/when-to-go/` (Hub, P1): H1 "When to take a Nile cruise"; components SectionHeading · Gallery · CruiseCard; schema Article · BreadcrumbList · FAQPage; links per row (same-silo + bridges); primary keyword "best time for nile cruise". | 6 | Planned | |
| PAGE-011 | silo.xlsx Silo map P011 | `/nile-cruise-guide/when-to-go/winter/` (Guide article, P2): H1 "Nile cruising from October to April"; components SectionHeading · Scene · CruiseCard; schema Article · BreadcrumbList · FAQPage; links per row (same-silo + bridges); primary keyword "nile cruise in winter". | 12 | Planned | |
| PAGE-012 | silo.xlsx Silo map P012 | `/nile-cruise-guide/when-to-go/summer/` (Guide article, P2): H1 "Is a summer Nile cruise worth it?"; components SectionHeading · Scene · CruiseCard; schema Article · BreadcrumbList · FAQPage; links per row (same-silo + bridges); primary keyword "nile cruise in summer". | 12 | Planned | |
| PAGE-013 | silo.xlsx Silo map P013 | `/nile-cruise-guide/when-to-go/christmas-and-new-year/` (Guide article, P2): H1 "Christmas and New Year on the Nile"; components SectionHeading · Scene · CruiseCard; schema Article · BreadcrumbList · FAQPage; links per row (same-silo + bridges); primary keyword "christmas nile cruise". | 12 | Planned | |
| PAGE-014 | silo.xlsx Silo map P014 | `/nile-cruise-guide/when-to-go/ramadan/` (Guide article, P3): H1 "Cruising the Nile during Ramadan"; components SectionHeading · Scene · CruiseCard; schema Article · BreadcrumbList · FAQPage; links per row (same-silo + bridges); primary keyword "nile cruise during ramadan". | 13 | Planned | |
| PAGE-015 | silo.xlsx Silo map P015 | `/nile-cruise-guide/when-to-go/esna-lock-and-water-levels/` (Guide article, P3): H1 "The Esna lock and Nile water levels, explained"; components SectionHeading · Scene · CruiseCard; schema Article · BreadcrumbList · FAQPage; links per row (same-silo + bridges); primary keyword "esna lock nile cruise". | 13 | Planned | |
| PAGE-016 | silo.xlsx Silo map P016 | `/nile-cruise-guide/planning/` (Hub, P1): H1 "Planning a Nile cruise"; components SectionHeading · AmenityGrid · BookingSummary; schema Article · BreadcrumbList · FAQPage; links per row (same-silo + bridges); primary keyword "how to plan a nile cruise". | 6 | Planned | |
| PAGE-017 | silo.xlsx Silo map P017 | `/nile-cruise-guide/planning/how-many-nights/` (Guide article, P1): H1 "How many nights do you need on the Nile?"; components VesselCompare · ItineraryTimeline; schema Article · BreadcrumbList · FAQPage; links per row (same-silo + bridges); primary keyword "how many nights nile cruise". | 6 | Planned | |
| PAGE-018 | silo.xlsx Silo map P018 | `/nile-cruise-guide/planning/nile-cruise-vs-land-tour/` (Guide article, P1): H1 "Nile cruise or land tour?"; components VesselCompare · PriceAnatomy; schema Article · BreadcrumbList · FAQPage; links per row (same-silo + bridges); primary keyword "nile cruise vs land tour". | 6 | Planned | |
| PAGE-019 | silo.xlsx Silo map P019 | `/nile-cruise-guide/planning/tipping/` (Guide article, P1): H1 "Tipping on a Nile cruise"; components BookingSummary; schema Article · BreadcrumbList · FAQPage; links per row (same-silo + bridges); primary keyword "tipping on a nile cruise". | 6 | Planned | |
| PAGE-020 | silo.xlsx Silo map P020 | `/nile-cruise-guide/planning/what-to-pack/` (Guide article, P2): H1 "What to pack for a Nile cruise"; components AmenityGrid; schema Article · BreadcrumbList · FAQPage; links per row (same-silo + bridges); primary keyword "what to pack for a nile cruise". | 12 | Planned | |
| PAGE-021 | silo.xlsx Silo map P021 | `/nile-cruise-guide/planning/with-children/` (Guide article, P2): H1 "A Nile cruise with children"; components CabinPicker · AmenityGrid; schema Article · BreadcrumbList · FAQPage; links per row (same-silo + bridges); primary keyword "nile cruise with kids". | 12 | Planned | |
| PAGE-022 | silo.xlsx Silo map P022 | `/nile-cruise-guide/planning/accessible-nile-cruises/` (Guide article, P2): H1 "Accessible Nile cruises"; components AmenityGrid; schema Article · BreadcrumbList · FAQPage; links per row (same-silo + bridges); primary keyword "accessible nile cruise". | 12 | Planned | |
| PAGE-023 | silo.xlsx Silo map P023 | `/nile-cruise-guide/planning/honeymoon/` (Guide article, P2): H1 "A honeymoon on the Nile"; components CruiseCard · ExperienceCard; schema Article · BreadcrumbList · FAQPage; links per row (same-silo + bridges); primary keyword "honeymoon nile cruise". | 12 | Planned | |
| PAGE-024 | silo.xlsx Silo map P024 | `/nile-cruise-guide/planning/solo-travellers/` (Guide article, P3): H1 "Cruising the Nile alone"; components CabinPicker; schema Article · BreadcrumbList · FAQPage; links per row (same-silo + bridges); primary keyword "solo nile cruise". | 13 | Planned | |
| PAGE-025 | silo.xlsx Silo map P025 | `/nile-cruise-guide/planning/safety/` (Guide article, P2): H1 "Is a Nile cruise safe? An honest answer"; components SectionHeading; schema Article · BreadcrumbList · FAQPage; links per row (same-silo + bridges); primary keyword "is a nile cruise safe". | 12 | Planned | |
| PAGE-026 | silo.xlsx Silo map P026 | `/vessels/` (Pillar, P1): H1 "Three ways to sail the Nile"; components Hero · VesselTypeCard · VesselCompare · AmenityGrid; schema Article · BreadcrumbList · FAQPage; links per row (same-silo + bridges); primary keyword "nile cruise boat types". | 6 | Planned | |
| PAGE-027 | silo.xlsx Silo map P027 | `/vessels/dahabiya/` (Vessel type hub, P1): H1 "The sailing dahabiya"; components Hero · VesselArt · VesselCompare · AmenityGrid · CruiseCard; schema Article · BreadcrumbList · FAQPage; links per row (same-silo + bridges); primary keyword "dahabiya". | 6 | Planned | |
| PAGE-028 | silo.xlsx Silo map P028 | `/vessels/dahabiya/how-a-dahabiya-sails/` (Guide article, P2): H1 "How a dahabiya sails (and when the tug helps)"; components Scene · VesselArt · AmenityGrid; schema Article · BreadcrumbList · FAQPage; links per row (same-silo + bridges); primary keyword "how does a dahabiya sail". | 12 | Planned | |
| PAGE-029 | silo.xlsx Silo map P029 | `/vessels/dahabiya/history/` (Guide article, P3): H1 "From pharaohs’ barges to Victorian houseboats: dahabiya history"; components Scene · VesselArt · AmenityGrid; schema Article · BreadcrumbList · FAQPage; links per row (same-silo + bridges); primary keyword "dahabiya history". | 13 | Planned | |
| PAGE-030 | silo.xlsx Silo map P030 | `/vessels/dahabiya/a-day-on-board/` (Guide article, P1): H1 "A day on board a dahabiya"; components Scene · VesselArt · AmenityGrid; schema Article · BreadcrumbList · FAQPage; links per row (same-silo + bridges); primary keyword "dahabiya experience". | 6 | Planned | |
| PAGE-031 | silo.xlsx Silo map P031 | `/vessels/dahabiya/cabins/` (Guide article, P2): H1 "Dahabiya cabins and suites explained"; components Scene · VesselArt · AmenityGrid; schema Article · BreadcrumbList · FAQPage; links per row (same-silo + bridges); primary keyword "dahabiya cabins". | 12 | Planned | |
| PAGE-032 | silo.xlsx Silo map P032 | `/vessels/motor-cruise-ships/` (Vessel type hub, P1): H1 "The motor cruise ship"; components Hero · VesselArt · VesselCompare · AmenityGrid · CruiseCard; schema Article · BreadcrumbList · FAQPage; links per row (same-silo + bridges); primary keyword "nile cruise ship". | 6 | Planned | |
| PAGE-033 | silo.xlsx Silo map P033 | `/vessels/motor-cruise-ships/a-day-on-board/` (Guide article, P1): H1 "A day on board a Nile cruise ship"; components Scene · VesselArt · AmenityGrid; schema Article · BreadcrumbList · FAQPage; links per row (same-silo + bridges); primary keyword "nile cruise ship experience". | 6 | Planned | |
| PAGE-034 | silo.xlsx Silo map P034 | `/vessels/motor-cruise-ships/deck-plans-explained/` (Guide article, P2): H1 "Nile cruise ship deck plans, explained"; components Scene · VesselArt · AmenityGrid; schema Article · BreadcrumbList · FAQPage; links per row (same-silo + bridges); primary keyword "nile cruise deck plan". | 12 | Planned | |
| PAGE-035 | silo.xlsx Silo map P035 | `/vessels/motor-cruise-ships/pools-spas-and-facilities/` (Guide article, P3): H1 "Pools, spas and facilities on Nile ships"; components Scene · VesselArt · AmenityGrid; schema Article · BreadcrumbList · FAQPage; links per row (same-silo + bridges); primary keyword "nile cruise ship with pool". | 13 | Planned | |
| PAGE-036 | silo.xlsx Silo map P036 | `/vessels/paddle-steamers/` (Vessel type hub, P1): H1 "The paddle steamer"; components Hero · VesselArt · VesselCompare · AmenityGrid · CruiseCard; schema Article · BreadcrumbList · FAQPage; links per row (same-silo + bridges); primary keyword "nile paddle steamer". | 6 | Planned | |
| PAGE-037 | silo.xlsx Silo map P037 | `/vessels/paddle-steamers/history/` (Guide article, P2): H1 "The Nile steamers of the Cook’s tour era"; components Scene · VesselArt · AmenityGrid; schema Article · BreadcrumbList · FAQPage; links per row (same-silo + bridges); primary keyword "nile steamer history". | 12 | Planned | |
| PAGE-038 | silo.xlsx Silo map P038 | `/vessels/paddle-steamers/a-day-on-board/` (Guide article, P2): H1 "A day on board a paddle steamer"; components Scene · VesselArt · AmenityGrid; schema Article · BreadcrumbList · FAQPage; links per row (same-silo + bridges); primary keyword "paddle steamer cruise experience". | 12 | Planned | |
| PAGE-039 | silo.xlsx Silo map P039 | `/vessels/felucca/` (Vessel type hub, P1): H1 "The felucca"; components Hero · VesselArt · VesselCompare · AmenityGrid · CruiseCard; schema Article · BreadcrumbList · FAQPage; links per row (same-silo + bridges); primary keyword "felucca nile". | 6 | Planned | |
| PAGE-040 | silo.xlsx Silo map P040 | `/vessels/felucca/overnight-felucca-trips/` (Guide article, P3): H1 "Sleeping on the Nile: overnight felucca trips"; components Scene · VesselArt · AmenityGrid; schema Article · BreadcrumbList · FAQPage; links per row (same-silo + bridges); primary keyword "overnight felucca trip". | 13 | Planned | |
| PAGE-041 | silo.xlsx Silo map P041 | `/vessels/compare/` (Hub, P1): H1 "Comparing Nile vessels side by side"; components VesselCompare (all-three view) · PriceAnatomy; schema Article · BreadcrumbList · FAQPage; links per row (same-silo + bridges); primary keyword "dahabiya vs cruise ship". | 6 | Planned | |
| PAGE-042 | silo.xlsx Silo map P042 | `/vessels/compare/dahabiya-vs-cruise-ship/` (Comparison, P1): H1 "Dahabiya or cruise ship?"; components VesselCompare · PriceAnatomy · CruiseCard; schema Article · BreadcrumbList · FAQPage; links per row (same-silo + bridges); primary keyword "dahabiya vs cruise ship". | 6 | Planned | |
| PAGE-043 | silo.xlsx Silo map P043 | `/vessels/compare/dahabiya-vs-paddle-steamer/` (Comparison, P2): H1 "Dahabiya or paddle steamer?"; components VesselCompare · PriceAnatomy · CruiseCard; schema Article · BreadcrumbList · FAQPage; links per row (same-silo + bridges); primary keyword "dahabiya vs steamer". | 12 | Planned | |
| PAGE-044 | silo.xlsx Silo map P044 | `/vessels/compare/paddle-steamer-vs-cruise-ship/` (Comparison, P2): H1 "Paddle steamer or cruise ship?"; components VesselCompare · PriceAnatomy · CruiseCard; schema Article · BreadcrumbList · FAQPage; links per row (same-silo + bridges); primary keyword "steamer vs nile cruise ship". | 12 | Planned | |
| PAGE-045 | silo.xlsx Silo map P045 | `/vessels/compare/dahabiya-vs-felucca/` (Comparison, P3): H1 "Dahabiya or felucca?"; components VesselCompare · PriceAnatomy · CruiseCard; schema Article · BreadcrumbList · FAQPage; links per row (same-silo + bridges); primary keyword "dahabiya vs felucca". | 13 | Planned | |
| PAGE-046 | silo.xlsx Silo map P046 | `/vessels/cabins-explained/` (Explainer, P2): H1 "Nile cruise cabins explained"; components CabinPicker · AmenityGrid; schema Article · BreadcrumbList · FAQPage; links per row (same-silo + bridges); primary keyword "nile cruise cabin types". | 12 | Planned | |
| PAGE-047 | silo.xlsx Silo map P047 | `/vessels/amenities/` (Explainer, P2): H1 "What every icon on a Nile vessel means"; components AmenityGrid · Icon; schema Article · BreadcrumbList · FAQPage; links per row (same-silo + bridges); primary keyword "nile cruise amenities". | 12 | Planned | |
| PAGE-048 | silo.xlsx Silo map P048 | `/vessels/mooring-explained/` (Explainer, P2): H1 "Rafted or private? Where Nile boats moor"; components VesselCompare · Scene; schema Article · BreadcrumbList · FAQPage; links per row (same-silo + bridges); primary keyword "nile cruise mooring". | 12 | Planned | |
| PAGE-049 | silo.xlsx Silo map P049 | `/nile-cruise-prices/` (Pillar, P1): H1 "Nile cruise prices: why five-star costs US$800 or US$8,000"; components Hero · PriceAnatomy · VesselCompare · CruiseCard; schema Article · BreadcrumbList · FAQPage; links per row (same-silo + bridges); primary keyword "nile cruise prices". | 6 | Planned | |
| PAGE-050 | silo.xlsx Silo map P050 | `/nile-cruise-prices/star-ratings-explained/` (Explainer, P1): H1 "What “five-star” means on the Nile"; components PriceAnatomy · AmenityGrid; schema Article · BreadcrumbList · FAQPage; links per row (same-silo + bridges); primary keyword "5 star nile cruise". | 6 | Planned | |
| PAGE-051 | silo.xlsx Silo map P051 | `/nile-cruise-prices/whats-included/` (Explainer, P1): H1 "What is (and isn’t) included in a Nile cruise"; components AmenityGrid · BookingSummary; schema Article · BreadcrumbList · FAQPage; links per row (same-silo + bridges); primary keyword "nile cruise what is included". | 6 | Planned | |
| PAGE-052 | silo.xlsx Silo map P052 | `/nile-cruise-prices/sightseeing-and-entry-fees/` (Explainer, P2): H1 "Sightseeing, guides and temple entry fees"; components PriceAnatomy; schema Article · BreadcrumbList · FAQPage; links per row (same-silo + bridges); primary keyword "nile cruise excursions cost". | 12 | Planned | |
| PAGE-053 | silo.xlsx Silo map P053 | `/nile-cruise-prices/crew-to-guest-ratio/` (Explainer, P2): H1 "Crew per guest: the number that explains the price"; components PriceAnatomy · VesselCompare; schema Article · BreadcrumbList · FAQPage; links per row (same-silo + bridges); primary keyword "nile cruise crew ratio". | 12 | Planned | |
| PAGE-054 | silo.xlsx Silo map P054 | `/nile-cruise-prices/seasonal-pricing/` (Explainer, P2): H1 "How the season changes the price"; components PriceAnatomy; schema Article · BreadcrumbList · FAQPage; links per row (same-silo + bridges); primary keyword "nile cruise prices by month". | 12 | Planned | |
| PAGE-055 | silo.xlsx Silo map P055 | `/nile-cruise-prices/single-supplement/` (Explainer, P3): H1 "Single supplements on Nile cruises"; components CabinPicker; schema Article · BreadcrumbList · FAQPage; links per row (same-silo + bridges); primary keyword "nile cruise single supplement". | 13 | Planned | |
| PAGE-056 | silo.xlsx Silo map P056 | `/nile-cruise-prices/hidden-costs/` (Explainer, P2): H1 "The costs nobody lists"; components BookingSummary; schema Article · BreadcrumbList · FAQPage; links per row (same-silo + bridges); primary keyword "nile cruise hidden costs". | 12 | Planned | |
| PAGE-057 | silo.xlsx Silo map P057 | `/nile-cruise-prices/budget-vs-luxury/` (Explainer, P1): H1 "Budget or luxury? The same route at both ends"; components PriceAnatomy · CruiseCard; schema Article · BreadcrumbList · FAQPage; links per row (same-silo + bridges); primary keyword "budget vs luxury nile cruise". | 6 | Planned | |
| PAGE-058 | silo.xlsx Silo map P058 | `/nile-cruise-prices/is-a-luxury-dahabiya-worth-it/` (Explainer, P2): H1 "Is a luxury dahabiya worth the money?"; components PriceAnatomy · VesselCompare; schema Article · BreadcrumbList · FAQPage; links per row (same-silo + bridges); primary keyword "is a dahabiya worth it". | 12 | Planned | |
| PAGE-059 | silo.xlsx Silo map P059 | `/nile-cruise-prices/price-calculator/` (Tool, P1): H1 "Nile cruise price calculator"; components PriceAnatomy (full-page tool); schema WebApplication · BreadcrumbList; links per row (same-silo + bridges); primary keyword "nile cruise price calculator". | 6 | Planned | |
| PAGE-060 | silo.xlsx Silo map P060 | `/cruises/` (Listing hub, P1): H1 "Compare Nile cruises"; components CruiseSearch · CruiseCard · VesselTypeCard; schema CollectionPage · ItemList · BreadcrumbList; links per row (same-silo + bridges); primary keyword "nile cruises". | 5 | Planned | |
| PAGE-061 | silo.xlsx Silo map P061 | `/cruises/dahabiyas/` (Filtered listing, P1): H1 "Dahabiya cruises"; components CruiseSearch · CruiseCard; schema CollectionPage · ItemList · BreadcrumbList; links per row (same-silo + bridges); primary keyword "dahabiya cruise". | 5 | Planned | |
| PAGE-062 | silo.xlsx Silo map P062 | `/cruises/motor-ships/` (Filtered listing, P1): H1 "Nile cruise ships"; components CruiseSearch · CruiseCard; schema CollectionPage · ItemList · BreadcrumbList; links per row (same-silo + bridges); primary keyword "nile cruise ship booking". | 5 | Planned | |
| PAGE-063 | silo.xlsx Silo map P063 | `/cruises/paddle-steamers/` (Filtered listing, P2): H1 "Paddle steamer cruises"; components CruiseSearch · CruiseCard; schema CollectionPage · ItemList · BreadcrumbList; links per row (same-silo + bridges); primary keyword "nile steamer cruise". | 12 | Planned | |
| PAGE-064 | silo.xlsx Silo map P064 | `/cruises/luxury/` (Filtered listing, P1): H1 "Luxury Nile cruises"; components CruiseSearch · CruiseCard; schema CollectionPage · ItemList · BreadcrumbList; links per row (same-silo + bridges); primary keyword "luxury nile cruise". | 5 | Planned | |
| PAGE-065 | silo.xlsx Silo map P065 | `/cruises/value/` (Filtered listing, P2): H1 "Good-value Nile cruises"; components CruiseSearch · CruiseCard; schema CollectionPage · ItemList · BreadcrumbList; links per row (same-silo + bridges); primary keyword "cheap nile cruise". | 12 | Planned | |
| PAGE-066 | silo.xlsx Silo map P066 | `/cruises/luxor-to-aswan/` (Filtered listing, P1): H1 "Luxor to Aswan cruises"; components CruiseSearch · CruiseCard; schema CollectionPage · ItemList · BreadcrumbList; links per row (same-silo + bridges); primary keyword "luxor to aswan cruise". | 5 | Planned | |
| PAGE-067 | silo.xlsx Silo map P067 | `/cruises/aswan-to-luxor/` (Filtered listing, P1): H1 "Aswan to Luxor cruises"; components CruiseSearch · CruiseCard; schema CollectionPage · ItemList · BreadcrumbList; links per row (same-silo + bridges); primary keyword "aswan to luxor cruise". | 5 | Planned | |
| PAGE-068 | silo.xlsx Silo map P068 | `/cruises/7-nights/` (Filtered listing, P2): H1 "7-night Nile cruises"; components CruiseSearch · CruiseCard; schema CollectionPage · ItemList · BreadcrumbList; links per row (same-silo + bridges); primary keyword "7 night nile cruise booking". | 12 | Planned | |
| PAGE-069 | silo.xlsx Silo map P069 | `/cruises/lake-nasser/` (Filtered listing, P2): H1 "Lake Nasser cruises"; components CruiseSearch · CruiseCard; schema CollectionPage · ItemList · BreadcrumbList; links per row (same-silo + bridges); primary keyword "lake nasser cruise booking". | 12 | Planned | |
| PAGE-070 | silo.xlsx Silo map P070 | `/cruises/private-charter/` (Filtered listing, P2): H1 "Private charter dahabiyas"; components CruiseSearch · CruiseCard; schema CollectionPage · ItemList · BreadcrumbList; links per row (same-silo + bridges); primary keyword "private dahabiya charter". | 12 | Planned | |
| PAGE-071 | silo.xlsx Silo map P071 | `/cruises/last-minute/` (Filtered listing, P3): H1 "Last-minute Nile cruises"; components CruiseSearch · CruiseCard; schema CollectionPage · ItemList · BreadcrumbList; links per row (same-silo + bridges); primary keyword "last minute nile cruise". | 13 | Planned | |
| PAGE-072 | silo.xlsx Silo map P072 | `/cruises/{vessel-slug}/` (Vessel page (template), P1): H1 "{Vessel name} — {route}, {nights} nights"; components Hero · ItineraryTimeline · CabinPicker · AmenityGrid · BookingSummary · Gallery; schema TouristTrip · Offer · BreadcrumbList (AggregateRating only from verified reviews); links per row (same-silo + bridges); primary keyword "{vessel name} nile cruise". | 5 | Planned | |
| PAGE-073 | silo.xlsx Silo map P073 | `/cruises/compare/` (Tool, P2): H1 "Compare selected cruises"; components CruiseCard · VesselCompare; schema WebPage · BreadcrumbList; links per row (same-silo + bridges); primary keyword "compare nile cruises". | 12 | Planned | |
| PAGE-074 | silo.xlsx Silo map P074 | `/destinations/` (Pillar, P1): H1 "Temples and towns along the Nile"; components Hero · ItineraryTimeline · ExperienceCard · Gallery; schema CollectionPage · ItemList · BreadcrumbList; links per row (same-silo + bridges); primary keyword "nile cruise stops". | 7 | Planned | |
| PAGE-075 | silo.xlsx Silo map P075 | `/destinations/nile-map/` (Tool, P2): H1 "Interactive map of the Nile Valley"; components ItineraryTimeline (full-page); schema WebPage · BreadcrumbList; links per row (same-silo + bridges); primary keyword "nile cruise map". | 12 | Planned | |
| PAGE-076 | silo.xlsx Silo map P076 | `/destinations/luxor/` (Destination hub, P1): H1 "Luxor"; components Hero · Gallery · ItineraryTimeline · CruiseCard; schema TouristDestination · TouristAttraction · BreadcrumbList · FAQPage; links per row (same-silo + bridges); primary keyword "luxor temples". | 7 | Planned | |
| PAGE-077 | silo.xlsx Silo map P077 | `/destinations/luxor/karnak-temple/` (Site guide, P2): H1 "Karnak Temple"; components Scene · Gallery · ExperienceCard; schema TouristAttraction · Article · BreadcrumbList; links per row (same-silo + bridges); primary keyword "karnak temple". | 12 | Planned | |
| PAGE-078 | silo.xlsx Silo map P078 | `/destinations/luxor/luxor-temple/` (Site guide, P2): H1 "Luxor Temple"; components Scene · Gallery · ExperienceCard; schema TouristAttraction · Article · BreadcrumbList; links per row (same-silo + bridges); primary keyword "luxor temple". | 12 | Planned | |
| PAGE-079 | silo.xlsx Silo map P079 | `/destinations/luxor/valley-of-the-kings/` (Site guide, P2): H1 "The Valley of the Kings"; components Scene · Gallery · ExperienceCard; schema TouristAttraction · Article · BreadcrumbList; links per row (same-silo + bridges); primary keyword "valley of the kings". | 12 | Planned | |
| PAGE-080 | silo.xlsx Silo map P080 | `/destinations/luxor/west-bank/` (Site guide, P2): H1 "Luxor’s West Bank: Hatshepsut, Medinet Habu and the Colossi"; components Scene · Gallery · ExperienceCard; schema TouristAttraction · Article · BreadcrumbList; links per row (same-silo + bridges); primary keyword "luxor west bank". | 12 | Planned | |
| PAGE-081 | silo.xlsx Silo map P081 | `/destinations/esna/` (Destination hub, P2): H1 "Esna and the Temple of Khnum"; components Hero · Gallery · ItineraryTimeline · CruiseCard; schema TouristDestination · TouristAttraction · BreadcrumbList · FAQPage; links per row (same-silo + bridges); primary keyword "esna temple". | 12 | Planned | |
| PAGE-082 | silo.xlsx Silo map P082 | `/destinations/el-kab/` (Destination hub, P2): H1 "El Kab"; components Hero · Gallery · ItineraryTimeline · CruiseCard; schema TouristDestination · TouristAttraction · BreadcrumbList · FAQPage; links per row (same-silo + bridges); primary keyword "el kab tombs". | 12 | Planned | |
| PAGE-083 | silo.xlsx Silo map P083 | `/destinations/edfu/` (Destination hub, P1): H1 "Edfu and the Temple of Horus"; components Hero · Gallery · ItineraryTimeline · CruiseCard; schema TouristDestination · TouristAttraction · BreadcrumbList · FAQPage; links per row (same-silo + bridges); primary keyword "edfu temple". | 7 | Planned | |
| PAGE-084 | silo.xlsx Silo map P084 | `/destinations/gebel-silsila/` (Destination hub, P2): H1 "Gebel Silsila"; components Hero · Gallery · ItineraryTimeline · CruiseCard; schema TouristDestination · TouristAttraction · BreadcrumbList · FAQPage; links per row (same-silo + bridges); primary keyword "gebel silsila". | 12 | Planned | |
| PAGE-085 | silo.xlsx Silo map P085 | `/destinations/kom-ombo/` (Destination hub, P1): H1 "Kom Ombo"; components Hero · Gallery · ItineraryTimeline · CruiseCard; schema TouristDestination · TouristAttraction · BreadcrumbList · FAQPage; links per row (same-silo + bridges); primary keyword "kom ombo temple". | 7 | Planned | |
| PAGE-086 | silo.xlsx Silo map P086 | `/destinations/aswan/` (Destination hub, P1): H1 "Aswan"; components Hero · Gallery · ItineraryTimeline · CruiseCard; schema TouristDestination · TouristAttraction · BreadcrumbList · FAQPage; links per row (same-silo + bridges); primary keyword "things to do in aswan". | 7 | Planned | |
| PAGE-087 | silo.xlsx Silo map P087 | `/destinations/aswan/philae-temple/` (Site guide, P2): H1 "Philae Temple"; components Scene · Gallery · ExperienceCard; schema TouristAttraction · Article · BreadcrumbList; links per row (same-silo + bridges); primary keyword "philae temple". | 12 | Planned | |
| PAGE-088 | silo.xlsx Silo map P088 | `/destinations/aswan/elephantine-island/` (Site guide, P2): H1 "Elephantine Island"; components Scene · Gallery · ExperienceCard; schema TouristAttraction · Article · BreadcrumbList; links per row (same-silo + bridges); primary keyword "elephantine island". | 12 | Planned | |
| PAGE-089 | silo.xlsx Silo map P089 | `/destinations/aswan/nubian-village/` (Site guide, P2): H1 "Visiting a Nubian village"; components Scene · Gallery · ExperienceCard; schema TouristAttraction · Article · BreadcrumbList; links per row (same-silo + bridges); primary keyword "nubian village aswan". | 12 | Planned | |
| PAGE-090 | silo.xlsx Silo map P090 | `/destinations/abu-simbel/` (Destination hub, P1): H1 "Abu Simbel"; components Hero · Gallery · ItineraryTimeline · CruiseCard; schema TouristDestination · TouristAttraction · BreadcrumbList · FAQPage; links per row (same-silo + bridges); primary keyword "abu simbel". | 7 | Planned | |
| PAGE-091 | silo.xlsx Silo map P091 | `/destinations/lake-nasser-temples/` (Destination hub, P3): H1 "The temples of Lake Nasser"; components Hero · Gallery · ItineraryTimeline · CruiseCard; schema TouristDestination · TouristAttraction · BreadcrumbList · FAQPage; links per row (same-silo + bridges); primary keyword "lake nasser temples". | 13 | Planned | |
| PAGE-092 | silo.xlsx Silo map P092 | `/destinations/dendera-and-abydos/` (Destination hub, P3): H1 "Dendera and Abydos"; components Hero · Gallery · ItineraryTimeline · CruiseCard; schema TouristDestination · TouristAttraction · BreadcrumbList · FAQPage; links per row (same-silo + bridges); primary keyword "dendera temple". | 13 | Planned | |
| PAGE-093 | silo.xlsx Silo map P093 | `/tours-extras/` (Listing hub, P1): H1 "Tours and extras around your cruise"; components ExperienceCard · CruiseSearch; schema CollectionPage · ItemList · BreadcrumbList; links per row (same-silo + bridges); primary keyword "nile cruise excursions". | 7 | Planned | |
| PAGE-094 | silo.xlsx Silo map P094 | `/tours-extras/abu-simbel-day-trip/` (Tour / extra, P1): H1 "Abu Simbel day trip from Aswan"; components ExperienceCard · BookingSummary · Gallery; schema TouristTrip · Offer · BreadcrumbList; links per row (same-silo + bridges); primary keyword "abu simbel day trip". | 7 | Planned | |
| PAGE-095 | silo.xlsx Silo map P095 | `/tours-extras/luxor-hot-air-balloon/` (Tour / extra, P1): H1 "Hot-air balloon over Luxor"; components ExperienceCard · BookingSummary · Gallery; schema TouristTrip · Offer · BreadcrumbList; links per row (same-silo + bridges); primary keyword "luxor hot air balloon". | 7 | Planned | |
| PAGE-096 | silo.xlsx Silo map P096 | `/tours-extras/valley-of-the-kings-tour/` (Tour / extra, P2): H1 "Valley of the Kings with an Egyptologist"; components ExperienceCard · BookingSummary · Gallery; schema TouristTrip · Offer · BreadcrumbList; links per row (same-silo + bridges); primary keyword "valley of the kings tour". | 12 | Planned | |
| PAGE-097 | silo.xlsx Silo map P097 | `/tours-extras/felucca-sail-aswan/` (Tour / extra, P2): H1 "Sunset felucca sail in Aswan"; components ExperienceCard · BookingSummary · Gallery; schema TouristTrip · Offer · BreadcrumbList; links per row (same-silo + bridges); primary keyword "felucca ride aswan". | 12 | Planned | |
| PAGE-098 | silo.xlsx Silo map P098 | `/tours-extras/cairo-and-giza-add-on/` (Tour / extra, P2): H1 "Cairo and the Pyramids before or after your cruise"; components ExperienceCard · BookingSummary · Gallery; schema TouristTrip · Offer · BreadcrumbList; links per row (same-silo + bridges); primary keyword "cairo add on nile cruise". | 12 | Planned | |
| PAGE-099 | silo.xlsx Silo map P099 | `/tours-extras/transfers/` (Tour / extra, P1): H1 "Airport and hotel transfers"; components ExperienceCard · BookingSummary · Gallery; schema TouristTrip · Offer · BreadcrumbList; links per row (same-silo + bridges); primary keyword "luxor airport transfer". | 7 | Planned | |
| PAGE-100 | silo.xlsx Silo map P100 | `/tours-extras/pre-and-post-cruise-hotels/` (Tour / extra, P3): H1 "Hotels before and after your cruise"; components ExperienceCard · BookingSummary · Gallery; schema TouristTrip · Offer · BreadcrumbList; links per row (same-silo + bridges); primary keyword "luxor hotels before cruise". | 13 | Planned | |
| PAGE-101 | silo.xlsx Silo map P101 | `/about/` (Company, P1): H1 "About nilecrz"; components TextField · Button · SectionHeading; schema AboutPage · Organization; links per row (same-silo + bridges); primary keyword "nilecrz about". | 7 | Planned | |
| PAGE-102 | silo.xlsx Silo map P102 | `/how-we-choose-vessels/` (Trust, P1): H1 "How we inspect and choose vessels"; components TextField · Button · SectionHeading; schema Article · BreadcrumbList; links per row (same-silo + bridges); primary keyword "nilecrz how we choose vessels". | 7 | Planned | |
| PAGE-103 | silo.xlsx Silo map P103 | `/our-egyptologists/` (Trust, P2): H1 "Our Egyptologists"; components TextField · Button · SectionHeading; schema ProfilePage · Person (per guide); links per row (same-silo + bridges); primary keyword "nilecrz our egyptologists". | 12 | Planned | |
| PAGE-104 | silo.xlsx Silo map P104 | `/reviews/` (Trust, P2): H1 "Guest reviews"; components TextField · Button · SectionHeading; schema WebPage (no self-serving review stars); links per row (same-silo + bridges); primary keyword "nilecrz reviews". | 12 | Planned | |
| PAGE-105 | silo.xlsx Silo map P105 | `/plan-my-cruise/` (Lead form, P1): H1 "Plan my cruise"; components TextField · Button · SectionHeading; schema ContactPage; links per row (same-silo + bridges); primary keyword "nilecrz plan my cruise". | 8 | Planned | |
| PAGE-106 | silo.xlsx Silo map P106 | `/contact/` (Company, P1): H1 "Contact"; components TextField · Button · SectionHeading; schema ContactPage · Organization; links per row (same-silo + bridges); primary keyword "nilecrz contact". | 7 | Planned | |

## COMP

| ID | Source | Requirement | Batch | Status | Evidence |
|---|---|---|---|---|---|
| COMP-Icon | DS components/Icon/README.md, preview.html, index.d.ts | Icon is a typed, tree-shakeable React module with the props of index.d.ts, the behaviour and motion of bundle.js/bundle.css, its README carried over, and screenshot parity with preview.html in Day and Night. | 2 | Planned | |
| COMP-Button | DS components/Button/README.md, preview.html, index.d.ts | Button is a typed, tree-shakeable React module with the props of index.d.ts, the behaviour and motion of bundle.js/bundle.css, its README carried over, and screenshot parity with preview.html in Day and Night. | 2 | Planned | |
| COMP-Badge | DS components/Badge/README.md, preview.html, index.d.ts | Badge is a typed, tree-shakeable React module with the props of index.d.ts, the behaviour and motion of bundle.js/bundle.css, its README carried over, and screenshot parity with preview.html in Day and Night. | 2 | Planned | |
| COMP-Rating | DS components/Rating/README.md, preview.html, index.d.ts | Rating is a typed, tree-shakeable React module with the props of index.d.ts, the behaviour and motion of bundle.js/bundle.css, its README carried over, and screenshot parity with preview.html in Day and Night. | 2 | Planned | |
| COMP-Stepper | DS components/Stepper/README.md, preview.html, index.d.ts | Stepper is a typed, tree-shakeable React module with the props of index.d.ts, the behaviour and motion of bundle.js/bundle.css, its README carried over, and screenshot parity with preview.html in Day and Night. | 2 | Planned | |
| COMP-TextField | DS components/TextField/README.md, preview.html, index.d.ts | TextField is a typed, tree-shakeable React module with the props of index.d.ts, the behaviour and motion of bundle.js/bundle.css, its README carried over, and screenshot parity with preview.html in Day and Night. | 2 | Planned | |
| COMP-NavBar | DS components/NavBar/README.md, preview.html, index.d.ts | NavBar is a typed, tree-shakeable React module with the props of index.d.ts, the behaviour and motion of bundle.js/bundle.css, its README carried over, and screenshot parity with preview.html in Day and Night. | 2 | Planned | |
| COMP-Hero | DS components/Hero/README.md, preview.html, index.d.ts | Hero is a typed, tree-shakeable React module with the props of index.d.ts, the behaviour and motion of bundle.js/bundle.css, its README carried over, and screenshot parity with preview.html in Day and Night. | 2 | Planned | |
| COMP-SectionHeading | DS components/SectionHeading/README.md, preview.html, index.d.ts | SectionHeading is a typed, tree-shakeable React module with the props of index.d.ts, the behaviour and motion of bundle.js/bundle.css, its README carried over, and screenshot parity with preview.html in Day and Night. | 2 | Planned | |
| COMP-Scene | DS components/Scene/README.md, preview.html, index.d.ts | Scene is a typed, tree-shakeable React module with the props of index.d.ts, the behaviour and motion of bundle.js/bundle.css, its README carried over, and screenshot parity with preview.html in Day and Night. | 2 | Planned | |
| COMP-VesselArt | DS components/VesselArt/README.md, preview.html, index.d.ts | VesselArt is a typed, tree-shakeable React module with the props of index.d.ts, the behaviour and motion of bundle.js/bundle.css, its README carried over, and screenshot parity with preview.html in Day and Night. | 2 | Planned | |
| COMP-CruiseCard | DS components/CruiseCard/README.md, preview.html, index.d.ts | CruiseCard is a typed, tree-shakeable React module with the props of index.d.ts, the behaviour and motion of bundle.js/bundle.css, its README carried over, and screenshot parity with preview.html in Day and Night. | 2 | Planned | |
| COMP-ExperienceCard | DS components/ExperienceCard/README.md, preview.html, index.d.ts | ExperienceCard is a typed, tree-shakeable React module with the props of index.d.ts, the behaviour and motion of bundle.js/bundle.css, its README carried over, and screenshot parity with preview.html in Day and Night. | 2 | Planned | |
| COMP-ItineraryTimeline | DS components/ItineraryTimeline/README.md, preview.html, index.d.ts | ItineraryTimeline is a typed, tree-shakeable React module with the props of index.d.ts, the behaviour and motion of bundle.js/bundle.css, its README carried over, and screenshot parity with preview.html in Day and Night. | 2 | Planned | |
| COMP-Gallery | DS components/Gallery/README.md, preview.html, index.d.ts | Gallery is a typed, tree-shakeable React module with the props of index.d.ts, the behaviour and motion of bundle.js/bundle.css, its README carried over, and screenshot parity with preview.html in Day and Night. | 2 | Planned | |
| COMP-CruiseSearch | DS components/CruiseSearch/README.md, preview.html, index.d.ts | CruiseSearch is a typed, tree-shakeable React module with the props of index.d.ts, the behaviour and motion of bundle.js/bundle.css, its README carried over, and screenshot parity with preview.html in Day and Night. | 2 | Planned | |
| COMP-CabinPicker | DS components/CabinPicker/README.md, preview.html, index.d.ts | CabinPicker is a typed, tree-shakeable React module with the props of index.d.ts, the behaviour and motion of bundle.js/bundle.css, its README carried over, and screenshot parity with preview.html in Day and Night. | 2 | Planned | |
| COMP-BookingSummary | DS components/BookingSummary/README.md, preview.html, index.d.ts | BookingSummary is a typed, tree-shakeable React module with the props of index.d.ts, the behaviour and motion of bundle.js/bundle.css, its README carried over, and screenshot parity with preview.html in Day and Night. | 2 | Planned | |
| COMP-VesselTypeCard | DS components/VesselTypeCard/README.md, preview.html, index.d.ts | VesselTypeCard is a typed, tree-shakeable React module with the props of index.d.ts, the behaviour and motion of bundle.js/bundle.css, its README carried over, and screenshot parity with preview.html in Day and Night. | 2 | Planned | |
| COMP-VesselCompare | DS components/VesselCompare/README.md, preview.html, index.d.ts | VesselCompare is a typed, tree-shakeable React module with the props of index.d.ts, the behaviour and motion of bundle.js/bundle.css, its README carried over, and screenshot parity with preview.html in Day and Night. | 2 | Planned | |
| COMP-PriceAnatomy | DS components/PriceAnatomy/README.md, preview.html, index.d.ts | PriceAnatomy is a typed, tree-shakeable React module with the props of index.d.ts, the behaviour and motion of bundle.js/bundle.css, its README carried over, and screenshot parity with preview.html in Day and Night. | 2 | Planned | |
| COMP-AmenityGrid | DS components/AmenityGrid/README.md, preview.html, index.d.ts | AmenityGrid is a typed, tree-shakeable React module with the props of index.d.ts, the behaviour and motion of bundle.js/bundle.css, its README carried over, and screenshot parity with preview.html in Day and Night. | 2 | Planned | |

## TOK

| ID | Source | Requirement | Batch | Status | Evidence |
|---|---|---|---|---|---|
| TOK-COLOR-SEMANTIC | tokens.json color.tokens (19 themed) | All 19 semantic colour tokens exist as CSS custom properties with Day and Night values. | 1 | Planned | |
| TOK-COLOR-PALETTE | tokens.json color.tokens (12 constant) | All 12 palette swatches exist as constant custom properties in both themes. | 1 | Planned | |
| TOK-THEMES | tokens.json color.themes; DS README | Day (light) is the default theme and Night is applied with data-theme="dark" on <html>, with no flash of the wrong theme. | 1 | Planned | |
| TOK-TYPE-FAMILIES | tokens.json type.families; BRAND-BOOK §Type | --font-display and --font-sans stacks exist and Cormorant Garamond and Jost are loaded at the weights bundle.css uses. | 1 | Planned | |
| TOK-TYPE-STYLES | tokens.json type.groups (12 styles) | Each of the 12 type styles exists as a class and as tokens, including display-xl dropping to 56px under 720px. | 1 | Planned | |
| TOK-SPACING | tokens.json spacing (space-1…10) | space-1 to space-10 exist as custom properties. | 1 | Planned | |
| TOK-RADIUS | tokens.json radius | radius-0, -sm, -lg and -pill exist, and lint flags any other border-radius. | 1 | Planned | |
| TOK-SHADOW | tokens.json shadow | shadow-float and shadow-lift exist with themed values, and lint flags any other box-shadow. | 1 | Planned | |
| TOK-LAYOUT | tokens.json layout | container, measure and nav-height exist as custom properties. | 1 | Planned | |
| TOK-MOTION | BRAND-BOOK §Motion; bundle.css :root | --ease-river and --dur-1/2/3 exist as tokens (they are absent from tokens.json; see Q14). | 1 | Planned | |
| TOK-PIPELINE | CLAUDE.md §6 Design tokens | A script generates the token CSS (and TS constants) from tokens.json; CI fails if the generated files are stale or edited by hand. | 1 | Planned | |
| TOK-NO-HARDCODE | CLAUDE.md §6 | Lint rejects hard-coded colours, sizes and fonts that have a token in component and page styles. | 1 | Planned | |

## BRAND

| ID | Source | Requirement | Batch | Status | Evidence |
|---|---|---|---|---|---|
| BRAND-001 | BRAND-BOOK §Content ¶1 | UI and CMS copy never contains 'best', 'unbeatable' or 'once in a lifetime' (copy lint). | 1 | Planned | |
| BRAND-002 | BRAND-BOOK §Content ¶2 | UI copy has no exclamation marks or emoji (copy lint). | 1 | Planned | |
| BRAND-003 | BRAND-BOOK §Content ¶2 | Urgency appears only from real availability (e.g. 'Only 2 suites left' computed from inventory). | 5 | Planned | |
| BRAND-004 | BRAND-BOOK §Content ¶3 | Headings, buttons and labels are sentence case in source; uppercase is applied only by CSS. | 2 | Planned | |
| BRAND-005 | BRAND-BOOK §Content ¶4 | Prices are formatted as US$1,240, per person, with what is included stated. | 2 | Planned | |
| BRAND-006 | BRAND-BOOK §Content ¶4 | Dates are formatted as 12 Feb 2027 in English. | 2 | Planned | |
| BRAND-007 | BRAND-BOOK §Content ¶4 | Durations are stated in nights ('4 nights'), never days. | 2 | Planned | |
| BRAND-008 | BRAND-BOOK §Content ¶5 | Vessel categories are labelled exactly 'sailing dahabiya', 'paddle steamer', 'motor cruise ship'; a felucca is never presented as a cruise vessel. | 3 | Planned | |
| BRAND-009 | BRAND-BOOK §Content ¶4 | Site names use the common English forms (Karnak, Esna, El Kab, Edfu, Kom Ombo, Philae, Gebel Silsila). | 3 | Planned | |
| BRAND-010 | BRAND-BOOK §Content ¶1 | Every selling surface carries at least one honest, explanatory fact (editorial check per template). | 11 | Planned | |
| BRAND-011 | BRAND-BOOK §Lines | The ornament appears only under section titles. | 2 | Planned | |
| BRAND-012 | BRAND-BOOK §Shape | radius-sm is used only on inputs/checkboxes and radius-lg only on floating panels; everything else is square. | 2 | Planned | |
| BRAND-013 | BRAND-BOOK §Imagery | Components take a real image when one exists and fall back to Scene only when it does not. | 2 | Planned | |
| BRAND-014 | BRAND-BOOK §Imagery | A vessel's media can only be images of that vessel (media is attached to the vessel record). | 3 | Planned | |
| BRAND-015 | BRAND-BOOK §Iconography | Only the system's own icon set is used, and every amenity icon has a visible or accessible label. | 2 | Planned | |
| BRAND-016 | BRAND-BOOK §Iconography | Wherever a vessel type is named it is paired with its icon (and VesselArt where space allows). | 2 | Planned | |
| BRAND-017 | BRAND-BOOK §Logo | The wordmark (Cormorant Garamond 500 34px + strapline in Jost 9px tracked 0.42em) is used until a logo file exists. | 2 | Planned | |
| BRAND-018 | BRAND-BOOK §Color | dusk-* is never used for UI text and brass-500 never for small text. | 2 | Planned | |
| BRAND-019 | BRAND-BOOK §Color | Success and danger colours always come with a word or an icon. | 2 | Planned | |
| BRAND-020 | BRAND-BOOK §Color | Text on photography uses on-media over scrim. | 2 | Planned | |
| BRAND-021 | LandingPage/README; BRAND §Space | Sections are space-9 apart and alternate surface and surface-sunk; a section title sits space-8 above its content. | 2 | Planned | |
| BRAND-022 | BRAND-BOOK §Space | Card padding and grid gaps are space-5; content is capped at container with space-6 gutters (space-4 on mobile). | 2 | Planned | |
| BRAND-023 | BRAND-BOOK §States | Hover darkens the border to ink or fills with primary; selected uses primary/on-primary; disabled is 45% opacity. | 2 | Planned | |
| BRAND-024 | BRAND-BOOK §Type | Prices use lining figures; totals and steppers use tabular figures. | 2 | Planned | |
| BRAND-025 | NavBar/README | Main navigation has at most seven links and 'Why prices differ' is always visible. | 1 | Planned | |
| BRAND-026 | Rating/README; CruiseCard/README | Ratings render only when backed by real reviews, and cards always show the maximum guest count. | 5 | Planned | |

## ENG

| ID | Source | Requirement | Batch | Status | Evidence |
|---|---|---|---|---|---|
| ENG-001 | CLAUDE.md §5 | typecheck passes with zero errors under TypeScript strict. | 1 | Planned | |
| ENG-002 | CLAUDE.md §5 | lint passes with zero errors. | 1 | Planned | |
| ENG-003 | CLAUDE.md §5 | format:check passes. | 1 | Planned | |
| ENG-004 | CLAUDE.md §5 | No @ts-ignore or eslint-disable without a written reason (enforced by lint rule). | 1 | Planned | |
| ENG-005 | CLAUDE.md §5 | Vitest unit tests run in CI. | 1 | Planned | |
| ENG-006 | CLAUDE.md §5 | Playwright end-to-end tests run in CI against a preview deployment. | 1 | Planned | |
| ENG-007 | CLAUDE.md §6 | A private /dev/components gallery renders every component in every state in both themes, unavailable in production to the public. | 2 | Planned | |
| ENG-008 | CLAUDE.md §5 | A screenshot script captures any route at 375, 768 and 1440 px in Day and Night into docs/screenshots/batch-<nn>/. | 1 | Planned | |
| ENG-009 | CLAUDE.md §5 | A visual-parity check compares each ported component with its preview.html and logs differences. | 2 | Planned | |
| ENG-010 | CLAUDE.md §4 | Work happens on batch-<nn>-<slug> branches with conventional commits citing requirement IDs. | 1 | Planned | |
| ENG-011 | ARCH §Environments | Local, preview (per PR) and production environments exist with separate databases and secrets. | 1 | Planned | |
| ENG-012 | ARCH §CI | CI runs typecheck, lint, format, unit, e2e, axe and bundle-size checks on every PR. | 1 | Planned | |
| ENG-013 | CLAUDE.md §4 | REQUIREMENTS, BUILD-LOG and DECISIONS are updated at the end of every batch. | 0 | Built | |
| ENG-014 | ARCH §Monitoring | Server and client errors are reported to an error tracker with release tags. | 1 | Planned | |
| ENG-015 | ARCH §Backups | Database backups and point-in-time recovery are enabled and a restore has been rehearsed. | 11 | Planned | |
| ENG-016 | CLAUDE.md §6 | pnpm is the package manager and new dependencies are justified in the batch brief. | 1 | Planned | |
| ENG-017 | CLAUDE.md §6 | 404 and 500 pages exist in the brand voice in all three languages. | 1 | Planned | |
| ENG-018 | CLAUDE.md §6 | The app shell (NavBar, footer, theme, language switch, skip link) wraps every public page. | 1 | Planned | |

## A11Y

| ID | Source | Requirement | Batch | Status | Evidence |
|---|---|---|---|---|---|
| A11Y-001 | CLAUDE.md §5 | axe reports no serious or critical issues on every e2e-visited page (CI gate). | 1 | Planned | |
| A11Y-002 | CLAUDE.md §5 | Every interaction is keyboard-operable. | 2 | Planned | |
| A11Y-003 | CLAUDE.md §5; BRAND §States | Keyboard focus shows a solid 2px focus ring at 2px offset (on-media ring on photography) everywhere, not only inside .nc-root. | 2 | Planned | |
| A11Y-004 | CLAUDE.md §5; BRAND §Motion | prefers-reduced-motion disables CSS and JS motion (count-up, gallery tilt, parallax, autoplay, smooth scroll). | 2 | Planned | |
| A11Y-005 | CLAUDE.md §5 | Text contrast ≥4.5:1 (≥3:1 large text and UI marks) in both themes, checked automatically including on-media over scrim. | 2 | Planned | |
| A11Y-006 | CLAUDE.md §5 | Pages have a skip link and landmark regions. | 1 | Planned | |
| A11Y-007 | DS TextField | Every form field has a label and errors say how to fix the problem. | 2 | Planned | |
| A11Y-008 | DS PriceAnatomy/Badge | Colour is never the only cue (segment keys, status words). | 2 | Planned | |
| A11Y-009 | DS Gallery/VesselCompare/ItineraryTimeline | Carousel, tabs and radio-group widgets follow WAI-ARIA patterns including arrow-key navigation. | 2 | Planned | |
| A11Y-010 | DS Stepper/PriceAnatomy | Changing totals and counts are announced politely to screen readers. | 2 | Planned | |
| A11Y-011 | CLAUDE.md §5 | Pre-launch accessibility audit (automated + manual screen reader pass) has no open serious issues. | 11 | Planned | |

## PERF

| ID | Source | Requirement | Batch | Status | Evidence |
|---|---|---|---|---|---|
| PERF-001 | CLAUDE.md §5 | LCP ≤ 2.5 s on Lighthouse mobile for key templates (production build). | 11 | Planned | |
| PERF-002 | CLAUDE.md §5 | CLS ≤ 0.05 on key templates. | 11 | Planned | |
| PERF-003 | CLAUDE.md §5 | INP ≤ 200 ms on key templates. | 11 | Planned | |
| PERF-004 | CLAUDE.md §5 | No route ships more than ~200 KB gzipped JS without a logged reason (CI bundle budget). | 1 | Planned | |
| PERF-005 | CLAUDE.md §5 | Images use next/image with explicit sizes. | 2 | Planned | |
| PERF-006 | PERF/BRAND §Type | Fonts are self-hosted via next/font with subsets and display swap; Japanese fonts load only on /ja/. | 1 | Planned | |
| PERF-007 | CLAUDE.md §5 | Lighthouse CI runs on key templates on every PR to main. | 1 | Planned | |
| PERF-008 | CLAUDE.md §7 | Heavy effects meet the budget on a mid-range phone and degrade to static design-system art. | 9 | Planned | |
| PERF-009 | CLAUDE.md §6 | Public pages render their content on the server and are readable without JavaScript. | 1 | Planned | |
| PERF-010 | ARCH §Caching | Public pages are statically generated or cached and revalidated on content change. | 5 | Planned | |

## SEC

| ID | Source | Requirement | Batch | Status | Evidence |
|---|---|---|---|---|---|
| SEC-001 | CLAUDE.md §5 | Every table has row-level security enabled with explicit policies (CI test fails on a table without RLS). | 3 | Planned | |
| SEC-002 | CLAUDE.md §5 | Every dashboard action is authorised server-side against the caller's role and ownership. | 4a | Planned | |
| SEC-003 | CLAUDE.md §5 | No secrets in the client bundle or repository (secret scanning in CI). | 1 | Planned | |
| SEC-004 | CLAUDE.md §5 | All server inputs are validated with zod. | 3 | Planned | |
| SEC-005 | DG §Customer list | Sign-up, sign-in, sign-out and session handling are secure (httpOnly cookies, CSRF-safe mutations). | 4a | Planned | |
| SEC-006 | ARCH §Security | Public forms and auth endpoints are rate-limited and protected from bots. | 8 | Planned | |
| SEC-007 | DG §Operator ¶integration | Feed fetching blocks private network addresses and XML parsing rejects external entities. | 4c | Planned | |
| SEC-008 | DG §Operator ¶integration | API credentials are stored hashed and can be rotated without downtime. | 4c | Planned | |
| SEC-009 | DG §Operator ¶integration | Inbound API calls are signed and idempotent; outbound webhooks are signed. | 4c | Planned | |
| SEC-010 | DG §Admin/Overview | Privileged actions write an append-only audit log entry. | 3 | Planned | |
| SEC-011 | CLAUDE.md §5 | A security review before launch has no open high findings. | 11 | Planned | |
| SEC-012 | ARCH §Security | Security headers (CSP, HSTS, frame-ancestors, referrer policy) are set. | 1 | Planned | |
| SEC-013 | ARCH §Data | Passenger personal data is readable only by the booking's customer, partner, operator and admins. | 3 | Planned | |

## SEO

| ID | Source | Requirement | Batch | Status | Evidence |
|---|---|---|---|---|---|
| SEO-001 | silo.xlsx Read me C10 | URLs are lowercase, hyphenated and end with a trailing slash; non-slash variants redirect. | 1 | Planned | |
| SEO-002 | CLAUDE.md §5 | Each public page has a unique title and meta description from a metadata helper. | 1 | Planned | |
| SEO-003 | CLAUDE.md §5 | Each public page has exactly one H1 (CI check). | 10 | Planned | |
| SEO-004 | CLAUDE.md §5; Linking rules | Each public page shows a breadcrumb and emits BreadcrumbList. | 5 | Planned | |
| SEO-005 | CLAUDE.md §5 | Each page emits the schema types listed in its silo row (validated in CI). | 10 | Planned | |
| SEO-006 | CLAUDE.md §5 | Each page has a self-referencing canonical tag. | 1 | Planned | |
| SEO-007 | silo.md §Languages | Each page has reciprocal hreflang for en, es, ja and x-default. | 10 | Planned | |
| SEO-008 | Linking rules: Up | Each page links to its parent and pillar in the breadcrumb and once in the intro text. | 6 | Planned | |
| SEO-009 | Linking rules: Down | Pillars and hubs link to every child in card grids with the child's primary keyword as anchor. | 6 | Planned | |
| SEO-010 | Linking rules: Across | Supporting pages link to two or three siblings in the same hub in a 'Keep reading' block. | 6 | Planned | |
| SEO-011 | Linking rules: Bridges | Cross-silo links appear only where the row's Bridge links column lists them (CI check against the workbook). | 6 | Planned | |
| SEO-012 | Linking rules: Money flow | Every informational page ends with a filtered CruiseCard row linking to the matching listing. | 6 | Planned | |
| SEO-013 | Linking rules: Money flow | Each vessel page links to its vessel-type hub and to each destination it stops at. | 5 | Planned | |
| SEO-014 | Linking rules: Anchor text | Anchors use the target's primary keyword or a close variant, never 'click here' or a bare URL. | 6 | Planned | |
| SEO-015 | Linking rules: Navigation | Main nav shows the five pillars plus Cruises; the footer holds Trust pages and silo roots. | 1 | Planned | |
| SEO-016 | Linking rules: Facets | Only listed /cruises/ facet pages are indexable; parameters canonicalise to the clean URL with noindex. | 5 | Planned | |
| SEO-017 | silo.md rule 8; Orphan check | Every page is within three folders and three clicks of home (crawler check). | 10 | Planned | |
| SEO-018 | Linking rules: Orphan check | A crawler run after each release finds no orphan pages. | 10 | Planned | |
| SEO-019 | ARCH §Routing | XML sitemaps per locale list only indexable URLs. | 10 | Planned | |
| SEO-020 | ARCH §Routing | robots.txt disallows dashboards, account, API and MCP paths. | 1 | Planned | |
| SEO-021 | silo.md §Assumptions | Current nilecruz.com URLs redirect (301) to their silo equivalents. | 10 | Planned | |
| SEO-022 | silo.md §Assumptions | Tours & Extras slugs are reconciled with any live nilecruz.com tour URLs. | 7 | Planned | |
| SEO-023 | silo.md §Cannibalisation | Route guides carry no price grid and listings carry no long itinerary text. | 6 | Planned | |
| SEO-024 | silo.md §Cannibalisation | A vessel-type hub shows at most three CruiseCards, then links to its listing. | 6 | Planned | |
| SEO-025 | silo.md §Cannibalisation | The /cruises/compare/ tool is lightly indexed (indexable shell, parameterised states noindex). | 12 | Planned | |
| SEO-026 | silo.xlsx P072 schema | AggregateRating is emitted only from verified reviews. | 5 | Planned | |
| SEO-027 | silo.xlsx P104 schema | /reviews/ emits no self-serving review stars. | 12 | Planned | |
| SEO-028 | silo.xlsx P001 schema | Home emits Organization and WebSite with SearchAction. | 6 | Planned | |
| SEO-029 | silo.md §Assumptions | Primary keywords are validated in a keyword tool before copy is written. | 6 | Planned | |
| SEO-030 | ARCH §Routing | Vessel slugs cannot collide with reserved /cruises/ facet slugs. | 3 | Planned | |

## I18N

| ID | Source | Requirement | Batch | Status | Evidence |
|---|---|---|---|---|---|
| I18N-001 | silo.md §Languages | English is served unprefixed; Spanish under /es/ and Japanese under /ja/. | 1 | Planned | |
| I18N-002 | silo.md §Languages | Spanish and Japanese pages use translated slugs mapped to the English route. | 10 | Planned | |
| I18N-003 | Linking rules: Languages | Internal links stay within the current language. | 10 | Planned | |
| I18N-004 | Linking rules: Languages | The language switch goes to the equivalent page via hreflang alternates. | 10 | Planned | |
| I18N-005 | silo.md §Languages | Translation is plumbed in the order pillars/hubs, money pages, supporting articles. | 10 | Planned | |
| I18N-006 | CLAUDE.md §6 | UI strings live in next-intl message files, none hard-coded in components. | 1 | Planned | |
| I18N-007 | BRAND-BOOK §Multilingual | No fixed-width buttons or labels; layouts tolerate ~30% longer Spanish. | 2 | Planned | |
| I18N-008 | CLAUDE.md §6; BRAND §Multilingual | Japanese text is never letter-spaced (see Q13). | 2 | Planned | |
| I18N-009 | BRAND-BOOK §Multilingual | Japanese falls back to Noto Serif JP / Noto Sans JP through the family stacks. | 1 | Planned | |
| I18N-010 | CLAUDE.md §6 | Numbers, dates and money format per locale while keeping brand formats in English. | 2 | Planned | |
| I18N-011 | CLAUDE.md §6 | Translatable content (CMS and database) is stored per locale with a fallback rule. | 3 | Planned | |
| I18N-012 | silo.md §Assumptions | Spanish and Japanese keywords are validated before translated pages are written. | 10 | Planned | |

## DATA

| ID | Source | Requirement | Batch | Status | Evidence |
|---|---|---|---|---|---|
| DATA-001 | CLAUDE.md §6 | Money is stored as integer minor units with an ISO currency code. | 3 | Planned | |
| DATA-002 | CLAUDE.md §6 | Timestamps are stored in UTC. | 3 | Planned | |
| DATA-003 | CLAUDE.md §6 | Operational dashboards display dates and times in Africa/Cairo. | 4a | Planned | |
| DATA-004 | CLAUDE.md §6 | Public pages display dates in the visitor's locale. | 5 | Planned | |
| DATA-005 | CLAUDE.md §6 | Prices, vessel facts, itineraries, amenities, reviews and copy live in the database or CMS, not in components. | 3 | Planned | |
| DATA-006 | CLAUDE.md §6 | Seeded records carry a visible 'Sample data' flag wherever they render. | 3 | Planned | |
| DATA-007 | CLAUDE.md §6 | No invented facts: placeholders are marked and listed in docs/CONTENT-NEEDED.md. | 0 | Built | |
| DATA-008 | CLAUDE.md §6; DS PriceAnatomy | PriceAnatomy is fed from maintained data with an honest footnote, not the bundle defaults. | 6 | Planned | |
| DATA-009 | CLAUDE.md §6; DS VesselCompare | VesselCompare and VesselTypeCard are fed from maintained data, not the bundle defaults. | 6 | Planned | |
| DATA-010 | CLAUDE.md §6 | Every data view has loading, empty, error and permission-denied states in the brand voice. | 2 | Planned | |
| DATA-011 | DS BookingSummary | BookingSummary line items, fees, inclusions and notes come from the departure, rate and policy data. | 8 | Planned | |
| DATA-012 | DS CruiseSearch | CruiseSearch routes, sailing days and match counts come from real schedules and departures. | 5 | Planned | |
| DATA-013 | CLAUDE.md §5 | Deterministic test fixtures seed every role and state for e2e tests. | 3 | Planned | |
| DATA-014 | ARCH §Migration | Data chosen for carry-over from existing systems is migrated with a verified count report (see Q1). | 3 | Planned | |

## EXP

| ID | Source | Requirement | Batch | Status | Evidence |
|---|---|---|---|---|---|
| EXP-001 | CLAUDE.md §7; EXPERIENCE.md | Live price build-up linked from every price: built to its EXPERIENCE.md spec if Faris approves it. | 9 | Planned | |
| EXP-002 | CLAUDE.md §7; EXPERIENCE.md | Vessel cutaway: who shares what, deck by deck: built to its EXPERIENCE.md spec if Faris approves it. | 9 | Planned | |
| EXP-003 | CLAUDE.md §7; EXPERIENCE.md | Scroll-driven voyage Luxor → Aswan: built to its EXPERIENCE.md spec if Faris approves it. | 9 | Planned | |
| EXP-004 | CLAUDE.md §7; EXPERIENCE.md | Compare tray that builds a side-by-side: built to its EXPERIENCE.md spec if Faris approves it. | 9 | Planned | |
| EXP-005 | CLAUDE.md §7; EXPERIENCE.md | Mooring explainer: rafted six abreast vs private bank: built to its EXPERIENCE.md spec if Faris approves it. | 9 | Planned | |
| EXP-006 | CLAUDE.md §7; EXPERIENCE.md | Season & deadline calendar: built to its EXPERIENCE.md spec if Faris approves it. | 9 | Planned | |
| EXP-007 | CLAUDE.md §7; EXPERIENCE.md | View Transitions card → vessel page: built to its EXPERIENCE.md spec if Faris approves it. | 9 | Planned | |
| EXP-008 | CLAUDE.md §7; EXPERIENCE.md | Day/night theme following Egypt time: built to its EXPERIENCE.md spec if Faris approves it. | 9 | Planned | |
| EXP-009 | CLAUDE.md §7; EXPERIENCE.md | Evaluation radar that unfolds per dimension: built to its EXPERIENCE.md spec if Faris approves it. | 9 | Planned | |
| EXP-010 | CLAUDE.md §7; EXPERIENCE.md | Ambient river sound (off by default): built to its EXPERIENCE.md spec if Faris approves it. | 9 | Planned | |

## Proposed scope (not scheduled: needs Faris's approval)

These are gaps: things a marketplace like this normally needs but no source describes. Each is explained in `QUESTIONS.md` with a recommendation. Nothing here will be built until Faris approves it. Approved items get a batch and the status `Planned`.

| ID | Proposal | Suggested batch | Status |
|---|---|---|---|
| PROPOSED-001 | Password reset, email verification and change-email flows | 4a | Awaiting decision |
| PROPOSED-002 | Operator team roles (owner, reservations, finance, read-only), mirroring the B2B team model | 4a | Awaiting decision |
| PROPOSED-003 | Admin sub-roles (super admin, catalogue editor, finance, content editor) and admin user management | 4a | Awaiting decision |
| PROPOSED-004 | Online card payment through a gateway (e.g. Stripe), in addition to manual payment reporting | 4f | Awaiting decision |
| PROPOSED-005 | Transactional notifications (email + in-app): offer received, offer updated, deadline reminders, payment verified, cancellation outcome | 8 | Awaiting decision |
| PROPOSED-006 | Verified guest reviews collected after sailing (for `/reviews/` and AggregateRating) | 12 | Awaiting decision |
| PROPOSED-007 | Legal pages and consent: terms, privacy, cookie consent, booking conditions (text supplied by Faris) | 8 | Awaiting decision |
| PROPOSED-008 | Personal-data export and deletion requests | 11 | Awaiting decision |
| PROPOSED-009 | Child and infant policy: ages, occupancy and pricing rules | 4c | Awaiting decision |
| PROPOSED-010 | Display-currency conversion with dated exchange rates (charged currency unchanged) | 5 | Awaiting decision |
| PROPOSED-011 | Documents: payment receipts, booking confirmations, B2B client record as PDF | 4f | Awaiting decision |
| PROPOSED-012 | Saved cruises (the CruiseCard heart) persisted to the account | 5 | Awaiting decision |
| PROPOSED-013 | Operator settlement/payout records (what Nilecruz owes each operator) | 4f | Awaiting decision |
| PROPOSED-014 | Consent-based analytics and conversion tracking | 11 | Awaiting decision |
| PROPOSED-015 | Egyptologist profiles as a content type (needed by `/our-egyptologists/`, Person schema) | 3 | Awaiting decision |
| PROPOSED-016 | Booking amendments (change guests, dates or cabin after booking) | 4e | Awaiting decision |
| PROPOSED-017 | Customer support inbox / messaging between customer, operator and admin about a booking | 4e | Awaiting decision |
