# Batch 4f brief: Payments, deadlines, cancellation and commission

**Status:** awaiting Faris's go-ahead · **Branch:** `batch-04f-payments` (from `main`) · **Size:** L (recommend two pull requests, question 6)

**Goal:** a reservation from 4e gets a payment deadline and is paid in full by card through Stripe, with Nilecruz as merchant of record (ADR-020, ADR-026, ADR-027). An admin can also approve a manual payment as a fallback (ADR-030). Unpaid reservations are released at their deadline, unless a reported payment is waiting. A customer can ask to cancel; the charge and refund are calculated from the policy accepted at booking, and refunds go through Stripe after an admin approves them. Every verified payment records Nilecruz's 10% commission and the operator's payable. Tours are ordered and paid separately from cruises.

**Exit criterion (BATCH-PLAN):** the deadline and cancellation maths are fully unit-tested at every boundary; the finance flows work end to end.

## Requirement IDs in scope (48)

- **Deadlines:** DASH-PAY-001–010, DASH-ADM-099 (premium calendar), DATA-039, DATA-040
- **Payments:**
  - DASH-ADM-097, 100, 101, 102, 103, 107;
  - DASH-OPR-013, 014;
  - DASH-CUS-008, 009;
  - DATA-026, 027, 028, 030, 035, 043
- **Cancellation and refunds:** DASH-PAY-011, 012, 013, DASH-ADM-095, 104, 105, DASH-OPR-015, DASH-CUS-010, DATA-029
- **Commission and payables:** DASH-ADM-106, DATA-036, 037, 038
- **Tours:** DASH-PAY-014, DATA-041
- **Admin:** DASH-ADM-003 (payments awaiting verification), 005 (cancellations and refund reviews), 098 (financial records)
- **Boundary:** DASH-BND-008 (operational tracking only: no accounting, bank settlement or automatic refunds)

## What I will build

**Deadlines** (ADR-027):
- Computed when an offer is accepted and stored on the reservation:
  - 3 days for 24 Dec–7 Jan and premium periods;
  - 7 days for other October–April departures;
  - 14 days for May–September departures;
  - never later than departure.
- Cairo calendar days, with the season set by the departure date (DATA-039).
- Reservations made before this batch get a deadline when the migration runs.
- **Premium calendar:** admins add and edit premium periods (DASH-ADM-099). Western Easter 21–29 Mar 2027 is seeded (DASH-PAY-007).
- **Release:** an hourly job cancels unpaid reservations past their deadline and returns their cabins. A reservation with a reported payment awaiting verification goes to the admin queue instead (DATA-040, DASH-PAY-009).
- **Agreed terms stay put:** a reservation keeps the deadline and policy it was booked with; later rule changes never rewrite them (DASH-PAY-010).

**Card payments** (Stripe Checkout, DATA-026–030, 035):
- "Pay now" opens Stripe Checkout for the outstanding balance, in the reservation's currency. Card details never reach us.
- Before paying, the customer acknowledges the cancellation policy again (DASH-PAY-013).
- Status changes only from signed Stripe webhooks, never from the return page. A repeated webhook changes nothing.
- A payment for a reservation that was cancelled meanwhile is refunded automatically and recorded (the reference repo's rule).
- Locally and in CI there is no Stripe network at all: tests sign webhooks themselves with a test secret. Staging uses Stripe **test mode** only (question 1).

**Reported and manual payments** (DASH-CUS-009, DASH-ADM-097, 101, DATA-043):
- A customer can report a bank transfer (amount, date, reference, optional proof) and follow its status.
- An admin verifies or rejects it, or records a manual payment directly, with method, reference and approver.
- **Wording:** the interface never suggests that recording or verifying moves money (DASH-ADM-107, DASH-BND-008).

**Balances and receipts:**
- Each reservation shows its total, paid, outstanding balance and deadline (DASH-CUS-008, DASH-ADM-103).
- Each verified payment has a numbered receipt page that can be printed (DASH-ADM-102).
- An operator sees its bookings' payment status (DASH-OPR-013).

**Commission and payables** (ADR-026):
- Each verified cruise payment records:
  - Nilecruz's commission, 10% (a setting), never on the gratuity;
  - the operator's payable: the payment less commission.
- A refund reverses both in proportion (DATA-036, 037, DASH-ADM-106).
- Admins record payouts made outside the system. Operators see their payables, payouts and balance, read-only (DATA-038).
- Admin "Deposits and commission" lists every payment, refund, commission entry and payout (DASH-ADM-098).

**Cancellation and refunds** (DASH-PAY-011, 012):
- **Request:** the customer asks to cancel (DASH-CUS-010).
- **Calculation:** from the policy accepted at booking and the Cairo days left before departure, the system works out the charge, the refundable amount and any unpaid charge. This is unit-tested at every band edge.
- **Operator** (DASH-OPR-015): reviews the request and confirms or contests the calculation.
- **Admin:** approves the refund, which is issued through Stripe for the calculated amount (DATA-029) or recorded as a manual refund. The cabins return to inventory.
- **Admin queue:** cancellation requests and refund reviews (DASH-ADM-005, 095).

**Tour orders** (DASH-PAY-014, DATA-041):
- A customer orders places on a bookable tour session; capacity is now counted against orders.
- The order is paid by card separately and has its own cancellation by the tour's bands.
- A tour payment can never settle a cruise balance. Tours are Nilecruz revenue, with no commission split.

## Tests I will add

- **Unit:**
  - **Deadlines:** every boundary (23 Dec, 24 Dec, 7 Jan, 8 Jan, 30 Apr, 1 May, 30 Sep, 1 Oct, a premium period's first and last day), departures sooner than the deadline, and Cairo midnight;
  - **Cancellation:** maths at each band edge, partial payments and unpaid charges;
  - commission and payable, and proportional reversal;
  - the release decision;
  - webhook handling (signature valid, wrong or repeated).
- **Database (pgTAP):**
  - only admins verify payments or approve refunds;
  - operators see only their own payments and payables;
  - a tour payment can't attach to a cruise reservation;
  - the release job skips reservations with a payment awaiting verification;
  - reservations keep their original deadline when the premium calendar changes.
- **End-to-end:**
  - accept → pay through Checkout, with a signed test webhook marking it paid → receipt;
  - report a transfer → admin verifies;
  - deadline passes → cabins released (with a payment awaiting verification, it is queued instead);
  - cancellation request → calculation → admin approves → refund recorded and cabins returned;
  - tour order paid separately;
  - axe in Day and Night; screenshots at 375, 768 and 1440 px.

## New dependencies

| Package | Why |
|---|---|
| `stripe` | Checkout sessions, webhook signature checks, refunds. Server-only; the reference repo uses it. |

## Questions for Faris before I start

1. **Stripe test account.** I need a Stripe account in **test mode**: the secret key and, once the webhook endpoint is added in Stripe (`https://nce-production-da4c.up.railway.app/api/stripe/webhook/`), its signing secret. These go into Railway's staging variables and `.env.local` (CONTENT-NEEDED #23). Which country is the Nilecruz Stripe account in, and in which currency does it settle? Stripe takes US$ and €. E£ is charged only if the account can present it; otherwise E£ rates are shown but paid in US$ at a stated rate. My recommendation: if E£ can't be charged, keep E£ prices for display and ask the customer to pay by bank transfer.
2. **Operators "recording money received" (DASH-OPR-014).** With Nilecruz as merchant of record (ADR-026), money shouldn't go to operators directly. My recommendation: operators can send payment reminders and see payment status, but only Nilecruz admins record or verify money received. The "record money received" part of DASH-OPR-014 becomes admin-only. Do you agree to change it this way?
3. **Paying in instalments.** I recommend one full card payment for the outstanding balance, as ADR-027 describes. Partial amounts are possible only through reported transfers or admin-recorded manual payments. Agreed?
4. **Payment instructions for transfers** (CONTENT-NEEDED #5): bank details and wording. Until you supply them, the "report a transfer" form says "ask Nilecruz for bank details", marked draft.
5. **Who approves refunds.** DATA-029 says an admin. I recommend admins with the finance or super role. The operator confirms the calculation first but can't release money. Agreed?
6. **Two pull requests.** Recommended: **4f-1** deadlines, card and manual payments, balances, receipts, commission and payables; **4f-2** cancellation and refunds, and tour orders. The batch closes when both are merged.
