# Screen-reader pass (A11Y-011): a 30-minute VoiceOver script

**Who:** Faris or a tester, once, on staging before launch. **With:** a Mac, Safari, VoiceOver. **Results:** fill in the table at the end and send it back; Claude fixes what's found.

## Setting up (2 minutes)

1. Turn VoiceOver on with **Cmd + F5**. It speaks as you move.
2. The keys used below:
   - **VO** means holding **Control + Option** together.
   - **VO + Right / Left arrow:** the next or previous thing on the page.
   - **VO + Space:** press the button or link VoiceOver is on.
   - **VO + U:** the rotor, a list of headings, links and form controls. Left and right switch the list; up and down move; Enter goes there.
   - **Tab:** the next link or control.
3. Open staging in Safari, signed out.

## The tasks

For each step, write in the table whether it worked and anything VoiceOver said that was wrong, missing or confusing.

### A. Find a cruise (8 minutes)

1. On the home page, open the rotor (VO + U) and go to **Headings**. *Expect: one main heading (level 1), then the sections in order.*
2. Go to **Cruises** in the main menu.
3. On the listing, move through the first two cards with VO + Right. *Expect: the vessel name, its type, route, nights, guests and the "from" price, each read as text.*
4. Find a card's **"Why US$…?"** button and press it (VO + Space). *Expect: a dialog named "Why US$…" opens and its lines are read. Escape closes it and you're back on the button.*
5. Tick **Compare** on two cards. *Expect: "Compare, checkbox, checked", and the tray's "Compare 2 vessels" link is announced or easy to find with Tab.*

### B. Learn about a vessel (8 minutes)

6. Open a vessel. With the rotor's Headings list, check that each section has a heading: the itinerary, cabins and decks, where it moors, the evaluation.
7. In **Cabins and decks**, Tab to the deck tabs and use the **arrow keys**. *Expect: "Upper deck, tab, selected, 1 of 2". The arrows move between decks.*
8. Tab to a cabin type and press it. *Expect: its size, beds and how many it sleeps are read.*
9. In **Where it moors**, use the arrows on the two buttons. *Expect: "Rafted, six abreast, toggle button, pressed", and the caption below changes.*
10. In the **itinerary**, move through the days. *Expect: each day's number, place and title in order.*
11. The **evaluation**: *expect the score read as "… out of 100" and each dimension with its points.*

### C. Book (10 minutes)

12. Sign in with the test account you've been given. *Expect: the email and password fields are labelled, and a wrong password is read out as an error.*
13. On **See prices and dates**, choose a departure, then a cabin. *Expect: each departure's date and availability are read; each cabin option says its price and how it books.*
14. Fill in the guests. Leave one name empty and submit. *Expect: the error is read and focus goes to it.*
15. Reserve. On the reservation page, find the **payment deadline**. *Expect: "Pay in full by …" read as a date.*
16. Pay by card (Stripe test card `4242 4242 4242 4242`, any future date and CVC on staging). *Expect: Stripe's page is usable with VoiceOver (it's Stripe's), and back on our page the payment is announced as received.*

### D. When to go (2 minutes)

17. On **When to go**, Tab into the calendar and use the arrows. *Expect: each day is read as "Sail on …: the main season. Book today and pay in full by …".*

## Results

| Step | Worked? (yes / partly / no) | What VoiceOver said that was wrong or confusing |
|---|---|---|
| 1 | | |
| 2 | | |
| 3 | | |
| 4 | | |
| 5 | | |
| 6 | | |
| 7 | | |
| 8 | | |
| 9 | | |
| 10 | | |
| 11 | | |
| 12 | | |
| 13 | | |
| 14 | | |
| 15 | | |
| 16 | | |
| 17 | | |

**Tested by:** ____________ **Date:** ____________ **macOS / Safari version:** ____________
