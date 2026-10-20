# Batch 4h brief: Travel partners

**Status:** approved by Faris 20 Oct 2026 (ADR-092) · **Branch:** `batch-04h-partners` (stacked on PR #21) · **Size:** L (recommend two pull requests, question 6)

**Goal:** a travel agency applies, Nilecruz approves it, and its team of three roles books Nile cruises for its clients. They search departures at the trade rates they're entitled to, reserve cabins or ask operators for offers, record passengers, the client's reference and their own selling price, pay, and hand the client a booking record.

**Exit criterion (BATCH-PLAN):** a partner team of three roles completes a client booking.

## Requirement IDs in scope (17)

- **Admin:** DASH-ADM-086 (review company and registration details), 087 (approve trade access), 088 (pause, keeping records), 089 (buyers and suppliers kept apart)
- **Partner:**
  - DASH-B2B-001 (search departures), 002 (trade and company rates), 003 (reserve cabins for clients), 004 (company requests and offers);
  - 005 (company bookings and payments), 006 (passengers and client references), 007 (agency selling total and margin), 008 (client booking record);
  - 009 (invite team, set permissions), 010 (roles: owner, reservations, finance), 011 (trade access needs approval), 012 (a rate for the trade channel or for one company), 013 (local-rate eligibility still verified)

## What I will build

**Applying and approval** (DASH-ADM-086–088, DASH-B2B-011):
- "Apply as a travel partner" from the account, like the operator application, with company name, country, registration or licence number, website and contact.
- Admin → **Travel partners** lists applications and partners. A catalogue or super admin reviews the details, then approves, rejects or pauses.
- **Paused:** the team can sign in and see its bookings and payments, but can't search, reserve or request. Nothing is deleted.

**Team** (DASH-B2B-009, 010): the operator team page, reused. The owner invites people as **reservations** (search, reserve, request, passengers, client details) or **finance** (bookings and payments, pays). The owner can do everything. The database enforces each role.

**Trade and company rates** (DASH-B2B-002, 012):
- On the rates screen, an operator can add a **trade** rate for all approved partners, or a rate for **one named partner company** (`rates.partner_org_id`).
- Trade and company rates are never visible to customers, the public, other companies or other operators. Partners see prices only through a search function that returns the rates they're entitled to: their company rate first, then the trade rate, then the international rate (question 2).

**Search** (DASH-B2B-001): route, dates, nights and guests (with children's ages), over bookable departures with fresh availability. Each result shows cabin types with places left and the price for the party, using the same pricing as offers (children's bands, gratuity shown separately).

**Reserve for a client** (DASH-B2B-003, 006, 013):
- From a search result, a reservations user picks cabins and names every guest, adds the **client reference** and accepts the terms and policy.
- `partner_reserve` takes the cabins in one transaction, like accepting an offer, at the rate shown. The reservation is owned by the company, with the booking user recorded.
- Local rates still need eligibility proof, checked by the operator (DASH-B2B-013).

**Company requests and offers** (DASH-B2B-004): a reservations user sends a request for the company. Operators see it marked "from a travel partner" and may offer at the trade rate. Anyone in the company with the reservations role can compare offers and accept one.

**Company bookings and payments** (DASH-B2B-005): every company reservation, with its deadline, balance, payments, receipts, cancellation and refunds (the 4f flows, at company level). Finance users pay by card or report a transfer, and ask for cancellations.

**Agency selling total** (DASH-B2B-007): on each booking, the agency records what it charges its client. The page shows the supplier total, the selling total and the difference. **Only the partner sees these:** not the operator, not the client record, and admins only for support.

**Client booking record** (DASH-B2B-008): a printable page for the agency's client, with the agency's name and the client reference, the vessel, route, dates, cabins, guests, inclusions, the cancellation terms and the **selling** price. It never shows the trade price or Nilecruz's payment details.

**Keeping roles apart** (DASH-ADM-089): partner teams never see operator screens, other companies' requests or bookings, or cost prices beyond their own. Operators see a partner booking like any other, plus the company name, never the selling total. Checked in the database tests.

## Tests I will add

- **Unit:** rate choice (company → trade → international); margin; the client record shows only selling figures.
- **Database (pgTAP):**
  - trade and company rates are hidden from anon, customers, other partners and other operators;
  - an applied or paused partner can't search or reserve;
  - each role gets only its own actions;
  - `partner_reserve` takes cabins with no overbooking, and refuses another company's rate;
  - the selling total is hidden from operators;
  - pausing keeps the records.
- **End-to-end** (the exit criterion): an agency applies, an admin approves it, and the owner invites a reservations user and a finance user. The reservations user searches (sees the company rate), reserves for a client with a client reference and selling total. The finance user pays, through a signed test webhook. The owner prints the client record. Pausing blocks searching while bookings stay visible. Axe in Day and Night; screenshots.

## Questions for Faris

1. **What to ask partners when they apply.** Recommended: company name, country, registration or licence number (for example a Ministry of Tourism licence or IATA number), website, and a contact name and phone. Anything else you need to check an agency?
2. **When a sailing has no trade or company rate,** should partners see the international rate? Recommended: yes, labelled "public rate", so they can still book every sailing.
3. **Commission on trade bookings:** the same 10 % of each payment, with the rest payable to the operator? Recommended: yes, so commission works the same for every booking. Or should trade bookings carry a different commission?
4. **Paying:** partners pay like customers (the same deadlines; card or transfer; to Nilecruz). Credit terms or monthly invoices come later, if at all. Agreed?
5. **Client booking record:** the agency's name and the selling price; no trade price; Nilecruz named only as "Booked through Nilecruz" in small print. Agreed, or should Nilecruz not appear at all?
6. **Two pull requests.** Recommended: **4h-1** for applying, approval and pausing, team roles, trade and company rates, and search; **4h-2** for reserving, company requests and offers, bookings and payments, client references, selling totals and the client record. The batch closes when both are merged.
