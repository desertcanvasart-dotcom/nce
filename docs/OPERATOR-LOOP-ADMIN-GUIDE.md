# Operator loop: guide for Nilecruz admins (ADR-099)

How booking requests and vacancy sheets work, and what you do in the dashboard. You need the catalogue or super admin role.

## Booking requests

Some cabins can't be booked instantly: those whose availability comes from a manual entry or a vacancy sheet (counted as confirmed for 7 days). For these, the customer sends a **booking request** and pays only once the operator confirms.

1. **The request goes out.** The operator's request contacts get one email with four answers: **Confirm**, **Decline**, **Hold 72h** and **Offer other**. They also get a WhatsApp message once WhatsApp is switched on. Without contacts, the email goes to the operator's owners and reservations staff. The message shows guests as a count and the lead's nationality, never names.
2. **One tap, no login.**
   - A link opens a page with one button: opening the link alone changes nothing.
   - Each link works once, for 7 days.
   - Opening a used or old link shows the answer already given.
3. **What each answer does:**
   - **Confirm:** the reservation is made and the customer is asked to pay, as for any booking. The cabins come off availability.
   - **Decline:** that cabin type is set to 0 free on that sailing, and the customer is offered other dates.
   - **Hold 72h:** the cabins are held. After 72 hours with no Confirm or Decline, they are released automatically.
   - **Offer other:** the operator proposes another date or cabin type. The customer can take it in one click when the number of cabins is the same.
4. **Reply time.**
   - Each operator has a reply time, 6 hours by default. Change it under **Admin → Operators → (operator) → Booking requests open**.
   - When the reply time passes, the operator gets a reminder. At twice the reply time, Nilecruz gets an alert email (to `ADMIN_ALERT_EMAIL`) and the request shows **Phone the operator** on the operator's page.
   - Every morning at 09:00 Cairo, each operator with something open gets a digest of waiting requests and holds ending that day.
5. **Metrics** (last 90 days, on the operator's page and their connection health):
   - median reply time;
   - share answered within the reply time;
   - how often the operator declined when our data showed space, which tells you how accurate their data is.
   - Customers see "confirmed within X hours": the median rounded up, at least 4, and 24 until the operator has answered 5 requests.

**Contacts:** add the people who answer requests (and who send sheets) on the operator's page under **Request contacts**. Give an email and/or a WhatsApp number in international format. Tick the WhatsApp agreement only if they agreed to receive messages there.

## Vacancy sheets

Operators without a system keep sending the weekly sheet they send agents. They can send Excel (.xlsx), CSV, PDF or a photo, by email to the inbound address or on WhatsApp. You can also upload one under **Admin → Vacancy sheets**.

### Reviewing a sheet

1. Open it from **Admin → Vacancy sheets → To review**. The original is linked; photos show inline.
2. **Unknown sender:** if the sender isn't an operator's contact, choose the operator. Then add the sender as a contact so later sheets are recognised.
3. **Names to map:** a ship or cabin name that doesn't match exactly is listed. Choose what it means, for example "Deluxe Upper" is the Deluxe Upper Deck cabin type. The mapping is saved for this operator's later sheets, and the sheet is read again.
4. **Rows read:**
   - Each row shows what was written, the ship and cabin it maps to, the cabins free, what Nilecruz shows today, and the check result.
   - Rows that change availability are highlighted.
   - To fix a misread number, change it in the row.
5. **On Nilecruz but not on this sheet:** sailings we have that the sheet no longer lists. This is only for you to check with the operator; nothing is removed.
6. **Confirm** applies the rows. They are checked again at that moment.
   - Each row counts as confirmed as of the sheet's date, or the time it arrived if the sheet has no date.
   - Newer data already on Nilecruz (for example an answer to a booking request) is never overwritten.
   - Sheets never create or delete ships, cruises or cabin types.
   - **Reject** changes nothing, and keeps your reason with the sheet.

### How sheets are read

- **Plain tables** are read directly, with no AI: columns for the ship, the date, the cabin type and the number free, with any headings like "Ship / Departure / Cabin / Free".
- **Everything else** is read by Claude: calendar grids, PDFs and photos. Its answer goes through the same mapping, checks and your review.
  - Without `ANTHROPIC_API_KEY`, these sheets show "Couldn't read". Upload an .xlsx or CSV version instead.
  - Old .xls files can't be read; ask for .xlsx, CSV or PDF.

### Auto-confirm (off by default)

On the operator's page under **Vacancy sheets**, after **4 clean imports in a row**, you can let sheets confirm themselves. A clean import is one confirmed with no row problems, no names to map and no edits.

Even when auto-confirm is on, a sheet waits for review unless every check passes:

- the operator is identified;
- every name is mapped by an existing alias;
- no number is above the ship's total cabins (per row, and in all per sailing);
- under 30 % of the operator's coming sailings change;
- the sheet is dated, and newer than the data we already hold for this operator.

Any import that needed fixing switches auto-confirm off again.

**Acknowledgement:** the same section can send the sender a short "Received: N rows updated" reply after confirmation. It is off by default.

## Allotments

An allotment is cabins an operator contracts to Nilecruz: a number of cabins **per sailing**, of one cabin type on one ship, for departures between two dates. Each sailing's allotment is released a number of days before departure (14 by default).

**Adding one:** go to Admin → Operators → (operator) → Allotments, and give:

- the ship and cabin type;
- the first and last departure dates;
- the cabins per sailing;
- the release in days;
- the contract reference.

Switch an allotment off there too; bookings already made stay.

**What it does:**

- Until a sailing's release date, its allotment cabins book instantly for customers and travel partners, even when the operator's own availability is old or comes from a manual entry or sheet. Customers see "Instant confirmation", or "Last few cabins" when 2 or fewer are left.
- Bookings use allotment cabins first, then instant availability. They don't change the operator's own availability figure, and the operator is told the booking came from the allotment.
- A cancelled booking gives its cabin back to the allotment.
- After the release date, unsold cabins simply stop counting: the cabins are the operator's again.
- The operator sees its allotments, and how many cabins are booked on each coming sailing, on its Inventory connections page.

## Travel partners

Travel partners follow the same rule as customers.

- **Instant:** from an allotment, or from availability a feed, the API or an operator's answer confirmed in the last 2 hours.
- **Booking request:** otherwise, the partner sends a booking request in its company's name, at its rate, with its client reference. The operator gets the usual one-tap message, which names the partner. Once confirmed, it becomes the partner's trade booking, paid by its deadline.
