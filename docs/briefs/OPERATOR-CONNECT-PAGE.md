# Brief: "How operators connect to Nilecruz" (public page)

**Status:** approved by Faris 21 Oct 2026 (answers below) · **Asked for:** Faris, 21 Oct 2026 (detailed, with screenshots from the system) · **Size:** S–M · **Branch:** `operator-connect-page`, from 8-2b

**Goal:** an operator who has never heard of Nilecruz learns, on one page, every way to put their cabins on Nilecruz: from no system at all to a full API. They see how it looks inside, learn what each way means for how fast guests can book, and apply.

**Scope:** a new public page, not in the workbook's sitemap. It gets a new ledger ID (PAGE-107) as an addition you asked for.

## What the page says, section by section

1. **Short intro:**
   - what Nilecruz is for operators: a marketplace and booking agent;
   - you keep selling as you do today;
   - you choose how much to connect.
2. **The six ways, side by side:** a comparison table with these columns:
   - effort for the operator;
   - how fresh Nilecruz's availability stays;
   - whether guests book instantly or by request.
3. **One section per way.** Each section has numbered steps (what you do, what Nilecruz does, how often to update), a screenshot and "best for".

   | Way | What the operator does |
   |---|---|
   | **1. Weekly vacancy sheet** | Send the same sheet you send agents (Excel, CSV, PDF or a photo) by email or WhatsApp. Nilecruz reads it, checks it and confirms. No login needed. |
   | **2. One-tap answers** | When a guest asks for a sailing, answer Confirm, Decline, Hold 72 h or Offer other from the email or WhatsApp. No login needed. |
   | **3. Manual entry in your dashboard** | Cabins, schedules, departures, rates and free cabins, entered and updated by your team, with roles. |
   | **4. A feed Nilecruz pulls** | Publish a JSON or XML file at an address; Nilecruz pulls it every hour. |
   | **5. The inventory API** | Your system sends signed updates whenever something changes. |
   | **6. Allotments** | Contract cabins to Nilecruz per sailing, with a release period; they book instantly until release. |

4. **What each way means for bookings:**
   - Instant booking needs instant data: a feed, the API, an answer within 2 hours, or an allotment.
   - Manual and sheet data turn a booking into a request the operator confirms; the guest pays after confirmation.
   - "Confirmed within X hours" comes from the operator's own answer times.
5. **What Nilecruz never does:**
   - share guests' contact details before booking;
   - change operators' prices;
   - publish counts from manual data.
6. **How to start:**
   - apply (`/account/apply-operator/`);
   - Nilecruz reviews the company;
   - choose a way (and change it any time).
7. **Questions**, with FAQ data, for example:
   - "Do I need a booking system?" (No.)
   - "Can I use two ways at once?" (Yes.)
   - "Who sees my rates?"

## Screenshots

- **Which screens:**
  - the operator's inventory and connection health;
  - the format page;
  - the one-tap reply page;
  - the sheet preview an admin confirms;
  - the dashboard's cabins and schedules;
  - the allotment usage view.
- **Data:** taken from the local system with **sample data only** (no real operator, guest or price). Taken at 1440 px, cropped to the relevant part, in Day theme; Night where the page is shown in Night.
- **Format:** saved as optimised WebP in the site's assets, with real alt text; loaded lazily below the first screen, so the page stays within the performance budget.
- **Refreshing:** re-taken by a script, so they can be updated when the screens change.

## Technical

- **Address:** `/operators/connect/`. Linked from the footer, the operator application page, and the Contact page's "Operators" topic.
- **Template:** the trust pages' template from Batch 7-1. Breadcrumbs, a single H1, FAQPage data, canonical, and the internal links.
- **Language:** English now; Spanish and Japanese with the other pages in Batch 10.
- **Copy:** drafted to the house style and marked for your review, like the other drafts.

## Tests

- **End-to-end:**
  - the page renders with every section and image (each image with alt text);
  - its links work;
  - axe in Day and Night;
  - the link check includes it.
- **Unit:** the FAQ data matches the questions on the page.
- **Screenshots:** 375, 768 and 1440, Day and Night.

## Faris's answers (21 Oct 2026)

1. **Address:** `/operators/connect/`.
2. **Detail:** explain everything in detail, so that someone who isn't technical understands it. Nilecruz can also walk operators through it. Technical terms are explained where they first appear. The JSON and XML samples are in a section for the operator's IT person.
3. **Commission:** never on public pages; it is negotiated with each operator.
4. **Menu:** footer only.
5. **One-tap answers need more detail** on the page: the message the operator receives, what each button does, the hold, the reply time, and the reminders.

## Questions as asked

1. **Address.** Recommended: `/for-operators/`. Or `/operators/connect/`?
2. **How technical?** Recommended: the public page explains every way in plain words, with a short JSON and XML sample. The full format, the signing details and the test tools stay on the format page inside the operator dashboard.
3. **Commission and terms.** Should the page state the commission and how payouts work? Recommended: **not on the public page**; it says "we explain the commercial terms when we review your application".
4. **In the main menu?** Recommended: **footer only** ("For operators"). The main menu stays for travellers.
