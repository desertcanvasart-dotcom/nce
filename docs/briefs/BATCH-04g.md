# Batch 4g brief: My journey

**Status:** approved by Faris 20 Oct 2026 (ADR-091) · **Branch:** `batch-04g-my-journey` (from `main`) · **Size:** S (one pull request)

**Goal:** a customer opens My journey and sees exactly their own state: what is coming up, what they need to do next, the tours that fit their cruise, and what has already happened.

**Exit criterion (BATCH-PLAN):** the customer sees exactly their own state for every seeded scenario.

## Requirement IDs in scope (5)

DASH-CUS-001 (the name "My journey"), 002 (sections), 003 (overview: upcoming trips and actions), 011 (eligible tours, separate from cruises), 012 (past trips and closed requests).

## What I will build

**Sections (DASH-CUS-002)** match the dashboard guide. The URLs stay, so existing links keep working.

| Guide section | Today | After 4g |
|---|---|---|
| Overview | placeholder + notices | built (below) |
| Requests and offers | "Cruise requests" and "Offers", separately | one nav item: requests, each with its offers (the offers list stays reachable from it) |
| Bookings | "Reservations and payments" | renamed "Bookings": cruise reservations, plus a link to tour orders |
| Tours and sightseeing | orders + bookable tours (4f-2c) | adds "Suggested for your cruise" (below) |
| Past trips | placeholder | built (below) |
| Account | under the top bar | a nav item linking to Account security |

**Overview (DASH-CUS-003):**
- **Next trip:** the nearest upcoming cruise (vessel, route, dates, status) and any tours booked for those days.
- **Actions needed,** each with a button, soonest deadline first:
  - pay a reservation, with its deadline;
  - finish paying a tour order still on hold;
  - upload eligibility proof for a local rate;
  - offers waiting on an open request, with their expiry;
  - an open cancellation request, shown as waiting on Nilecruz (so nothing to do);
  - a transfer reported and being checked (also nothing to do, shown so the customer isn't left wondering).
- **Upcoming:** every future reservation and tour order, by date.
- **Notices,** as today.

The Overview is worked out by one pure function from the customer's records, `journeyState()`, and unit-tested scenario by scenario.

**Tours that fit the cruise (DASH-CUS-011).** For each upcoming reservation, "Suggested for your cruise" lists bookable tours:
- that admins have linked to that cruise's schedule (tour ↔ schedule links from 4d);
- that have a session with places on a day of the sailing.

Airport transfers and Meet and Assist are suggested for the embarkation and disembarkation days.

**Past trips (DASH-CUS-012):**
- reservations whose sailing has ended, and tour orders that have taken place;
- cancelled reservations and orders;
- closed or expired requests, with their offers.

Read-only.

**Test data:** a seeded customer with one reservation, offer or tour order in each state (to pay, paid, cancelled, past, local rate needing proof, request with offers, closed request, tour on hold). The e2e test checks the Overview against exactly that list.

## Tests I will add

- **Unit:** `journeyState()` for every scenario above: action order, nothing listed twice, past versus upcoming at the Cairo date boundary.
- **Unit:** tour suggestions by schedule link and sailing days (embarkation and disembarkation days for transfers).
- **End-to-end:**
  - the seeded customer's Overview, Bookings, Tours and Past trips show exactly their records;
  - another customer sees none of them;
  - each action button leads to the right page;
  - axe in Day and Night; screenshots at 375, 768 and 1440 px.

## Questions for Faris

1. **Combine Requests and Offers into one nav item ("Requests and offers")?** Recommended: yes, as the guide says. The separate Offers list stays reachable from it.
2. **Rename "Reservations and payments" to "Bookings"?** Recommended: yes, as the guide says, with tour orders linked from it rather than mixed in.
3. **Morning sailings from Aswan:** you asked for sailings to be marked morning, noon or evening, so guests sailing in the morning arrive the day before. That needs a new field on schedules (a product change, and the operator enters it). Recommended: propose it as its own small item after 4g (PROPOSED-019). Until then, 4g suggests tours only on sailing days.
