# Brief: two prices on every sailing, cruise only and with sightseeing (ADR-102)

**Status:** approved by Faris 21 Oct 2026 with the recommended answers · **Asked for:** Faris, 21 Oct 2026 · **Size:** L (two pull requests) · **Branch:** `sightseeing-two-prices`, from the operator page

**Goal:** a traveller sees two prices on every sailing and books either one.

- **Cruise only:** as today.
- **Cruise with sightseeing:** for an approved vessel, its own rate with sightseeing; for every other vessel, the cruise plus Nilecruz's sightseeing programme.

Nilecruz keeps the tours: an operator can sell sightseeing only if an admin has approved its vessel.

**Exit criterion:**

- **A vessel that isn't approved:** a customer books it with sightseeing and gets a cruise reservation plus a Nilecruz programme order, paid at once.
- **An approved vessel:** a customer books its with-sightseeing rate as one reservation, and its payment counts for the operator.
- **Cancellation:** cancelling the cruise cancels the programme.

## Where we are today

- **Programmes:** they exist from Batch 4d: days, the tours on each day, and the itineraries they go with. They aren't bookable or priced.
  - The imported 3-night Aswan → Luxor and 4-night Luxor → Aswan sightseeing are tour pages with their day plans.
  - The rate sheet's **Programs** tab has their prices: per person for 1, 2, 3–4, 5–8 and 9–14 guests, children 6–11 at 50 %. The import skips it today (ADR-098).
- **Tour orders:** since 7-2 they take a start date and a rate, and pay by card through the signed webhook, separately from cruises.
- **Cruise rates:** one price per cabin, occupancy, plan and currency, with no "includes sightseeing".

## What I will build

### 1. Approved vessels and their with-sightseeing rate (8-3a)

- **Approval:**
  - an "Approved to sell with sightseeing included" switch on the vessel, for catalogue and super admins only, recorded in the activity history with who and when;
  - operators see it but can't change it.
- **The rate:**
  - every rate gets a "package": **cruise only** (all existing rates) or **with sightseeing**;
  - the database refuses a with-sightseeing rate on a vessel that isn't approved, from the dashboard, a sheet, a feed or the API.
- **What's included** (per itinerary, approved vessels only):
  - an Egyptologist guide (yes/no);
  - entrance fees (included / not included);
  - the sites visited (a list);
  - a note.

  It's required before the with-sightseeing rate can be shown.
- **Feeds, the API and sheets:**
  - the inventory format gets an optional `package` on each rate; v1 documents without it mean cruise only, so nothing breaks;
  - vacancy sheets carry only free cabins, never prices, so they need no change (found while building 8-3a);
  - the format page explains it.
- **Withdrawing approval:** with-sightseeing rates stop showing; bookings already made keep what they bought.

### 2. Nilecruz's programmes become bookable (8-3a)

- **A new tour rate kind, "programme":**
  - prices per person by party size, like private tours, from the Programs tab;
  - children by age.
- **The import** reads the Programs tab. Each programme is matched to its tour by name, as other tabs are, and to its itineraries by route and nights:
  - 3-night Aswan → Luxor;
  - 4-night Luxor → Aswan.

  The admin can change the links on the programme.
- **The programme's dates follow the sailing:** day 1 is the departure date, and its tours follow the itinerary's days. Only Nilecruz admins handle programme orders, as the Questions tab says.

### 3. Two prices for travellers (8-3b)

- **Vessel page:** each itinerary shows both prices with what each includes. Examples:
  - "With sightseeing: guide, entrance fees, Karnak, Valley of the Kings…";
  - "Sightseeing by Nilecruz, a separate booking".

  The reserve page asks "Cruise only or with sightseeing?" before the cabin.
- **Cards, search, comparison and assistants:**
  - **cards:** "From US$X cruise only · US$Y with sightseeing";
  - **search:** a filter, "With sightseeing available";
  - **comparison:** both lines;
  - **MCP answers:** both "from" prices.
- **No programme yet:** a sailing whose itinerary has none (and isn't on an approved vessel) shows cruise only.

### 4. Booking and paying (8-3b)

- **Approved vessel:**
  - one reservation on the with-sightseeing rate, with the included items on the booking summary;
  - one payment, and the operator's share works as for any cruise.
- **Other vessels:** one step creates the cruise reservation and the programme order together, for the same guests and the departure date.
  - **Payment:** one card checkout pays both, recorded as two payments: the cruise's (for the operator) and the programme's (Nilecruz's own).
  - **Bank transfer:** shows both amounts and both references.
  - **Deadline:** the programme follows the cruise's payment deadline.
  - **Booking requests:** when the cruise needs the operator's confirmation, the programme is held and paid together with it once the operator confirms.
- **The booking summary:**
  - the cruise lines and their total;
  - then "Sightseeing by Nilecruz" with its own total and reference (NT-…);
  - then "You pay today", the sum of the two.

  The cruise total never includes the programme (ADR-011, DATA-017).
- **Cancelling:**
  - cancelling the cruise cancels the programme, refunded in full;
  - the programme can be cancelled alone under its own rule (free until 48 h before, then 100 %), and the cruise stays.
- **Adding it later:** a customer who booked cruise only is offered the programme in My journey until its booking cut-off.
- **No double selling:** a sailing booked with an approved vessel's sightseeing never offers Nilecruz's programme; day trips such as Abu Simbel and transfers are still offered.

### 5. Admin and operators (8-3a, 8-3b)

- **Admins:** the approval switch; the programme's prices and itineraries; programme orders alongside tour orders, by sailing.
- **Operators:**
  - an approved vessel's operator enters both packages' rates and the inclusions;
  - other operators see "Sightseeing is sold by Nilecruz" on their rates page;
  - operators never see programme orders or their payments.

## Tests

- **Unit:**
  - the two prices for each kind of vessel;
  - programme prices by party size and children's ages;
  - "from" prices;
  - the booking summary's lines (programme never in the cruise total);
  - Programs tab reading and its error messages.
- **pgTAP:**
  - only admins approve;
  - with-sightseeing rates refused on vessels that aren't approved, from every path;
  - reservation and programme order created together or not at all;
  - two payments recorded from one checkout;
  - the operator's share counts only the cruise;
  - cancelling the cruise cancels the programme;
  - no programme offered with included sightseeing.
- **End-to-end:**
  - approve a vessel, enter its rate and inclusions, and a customer books it with sightseeing;
  - a customer books a vessel that isn't approved with Nilecruz's programme and pays both in one checkout;
  - cruise-only stays as today;
  - axe;
  - screenshots.

## Questions for Faris

1. **Children on programmes.** The Programs tab gives only 6–11 (50 %). Recommended: the same as private tours, under 3 free, 3–5 at 25 %, 6–11 at 50 %, 12 and over as adults.
2. **Entrance fees on Nilecruz's programmes.** Does the Programs tab price include temple tickets? Recommended: **yes**, shown as "entrance fees included". Otherwise say "tickets paid on the day".
3. **Paying both parts.** Recommended: **one checkout for both**, recorded as two payments. Or two separate payments one after the other?
4. **Which price shows first.** Recommended: the reserve page **pre-selects "with sightseeing"** where it exists, with "cruise only" one tap away. Cards show both. Or cruise only first?
5. **Booking horizon.** The Questions tab says customers book tours **1 week** ahead. Recommended: a programme booked **with its cruise** can be booked as far ahead as the cruise; the 1-week horizon applies only to day trips booked on their own. Or should 1 week be 12 months for everything?
6. **Groups over 14.** The Programs tab stops at 9–14 guests. Recommended: 15 or more guests is "ask us" (Nilecruz quotes by hand).
7. **Travel partners.** Recommended: agencies book **cruise only** in this batch. Programmes for agencies, at a trade price, come later.

## Not in this brief

- programmes for travel partners (question 7);
- a programme added to a personal offer from an operator;
- languages: both prices are in English now, with Spanish and Japanese in Batch 10.
