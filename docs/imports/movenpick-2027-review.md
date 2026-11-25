# Mövenpick five boats: corrections for review

Source: Mövenpick's 2027/28 fact sheets, checked 25 November 2026. Supplier rates are left out.
**Applied to staging and production on 25 November 2026.** "Site now" means the public pages on nilecruz.com before this work.

Files:

- `docs/imports/movenpick-2027.json`: cabin types, sizes, amenities, schedules, day-by-day programmes and every sailing date.
- `scripts/apply-movenpick-2027.ts`: applies them (report first; see the file header).
- `docs/imports/deck-plans/movenpick-{darakum,hamees,sun-ray,ss-misr}.json`: the drawings.
- `docs/imports/movenpick-2027-previews/*.png`: pictures of the drawings, to compare with the sheets' plans.
- `docs/imports/luxury-vessels.json`: Sun Ray and SS Misr brought in line with the sheets.

## Decided (Islam, 25 November 2026)

- Darakum's cabins are named by deck: "Water Level Cabin", "Main Deck Cabin" and "Upper Deck Cabin". Mövenpick's long and short sheets use "Superior" for different decks.
- Darakum's Senior Suites are two types.
- Darakum and SS Misr get stored dates from the files. The calendar labels these "Confirmed departure".
- Staging first.

## Cabin types

### Darakum (52): site now has no cabin types

| Code | Name | Number | Deck | m² |
|---|---|---|---|---|
| CLASSIC | Water Level Cabin | 8 | 1 | 20 |
| SUP | Main Deck Cabin | 18 | 2 | 20 |
| UPD | Upper Deck Cabin | 18 | 3 | 20 |
| JS | Junior Suite | 2 | 2 | 26 |
| SS | Senior Suite, Upper Deck | 2 | 3 | 40 |
| SST | Senior Suite, Top Deck | 2 | 4 | 34 |
| PS | Panorama Suite | 2 | 3 | 34 |

### Hamees (66): site now has no cabin types

| Code | Name | Number | Deck | m² |
|---|---|---|---|---|
| CLASSIC | Classic Cabin | 8 | A | not given |
| SUP | Superior Cabin | 6 | B | not given |
| DLX | Deluxe Cabin | 46 | C and D | not given |
| JS | Junior Suite | 2 | B | not given |
| DS | Deluxe Suite | 2 | C | not given |
| ES | Executive Suite | 2 | D | not given |

### Sun Ray (62)

| Code | Site now | Change to | Number | Deck | m² |
|---|---|---|---|---|---|
| CLASSIC | Classic Cabin | same | 8 | 1 | 20 |
| UPPER | Upper-deck Cabin | **Superior Cabin** | 18 | 2 | 20 |
| DLX | (none) | **add Deluxe Cabin** | 28 | 3 and 4 | 20 |
| JS | Junior Suite | same | 2 | 2 | 34.1 |
| SS | Superior Suite | **Junior Upper Suite** | 2 | 3 | 35.3 |
| DS | Deluxe Suite | same | 2 | 4 | 37 |
| ES | Executive Suite | same | 2 | 4 | 39 |

### SS Misr (24)

Counts and sizes already match. Changes: "Suite" becomes **Senior Suite**; every type gets a **private balcony**, a bathtub and the sheet's amenities; decks are 2, 3 and 4.

### SB Feddya (4 suites, 8 guests)

| Code | Site now | Change to | Number | m² | Outdoor space |
|---|---|---|---|---|---|
| SUITE | Suite, 4 cabins | **Senior Suite** | 2 | 22.5 | 8 m² patio |
| PANO | (none) | **add Panorama Suite** | 2 | 24 | 8 m² balcony |

No deck drawing: the sheet has no plan.

## Boat facts to fill in

| Boat | Length × beam (m) | Guest decks with sun deck | Shared spaces |
|---|---|---|---|
| Darakum | 72 × 15 | 5 | sun deck, pool, dining room, lounge, gym |
| Hamees | 72 × 14.8 | 5 | sun deck, pool, dining room, lounge, bar, library, gym |
| Sun Ray | 72 × 15 | 5 | sun deck, pool, dining room, lounge, bar, library, gym |
| SS Misr | 63 × 13.8 | not changed | sun deck, pool, dining room, lounge, bar |
| Feddya | not given | not changed | dining room, sun deck, jacuzzi, lounge, bar |

## Sailing days

| Boat | Route | When |
|---|---|---|
| Darakum | Aswan → Cairo, 12 nights | 7 dates in 2027 |
| Darakum | Cairo → Aswan, 14 nights | 7 dates in 2027 |
| Darakum (winter 2026/27) | Luxor → Aswan, 4 nights | Mondays, 30 November 2026 to 8 February 2027 (11 dates) |
| Darakum (winter 2026/27) | Aswan → Luxor, 3 nights | Fridays, 4 December 2026 to 5 February 2027 (10 dates) |
| Darakum (winter 2026/27) | Luxor round trip, 7 nights | 10 Mondays, worked out from the two above |
| Hamees | Luxor → Aswan, 4 nights | Every Monday, 2027 and 2028 |
| Hamees | Aswan → Luxor, 3 nights | Every Friday, 2027 and 2028 |
| Sun Ray | Luxor → Aswan, 4 nights | Thursdays, January–May and September–December, 2027 and 2028 |
| Sun Ray | Aswan → Luxor, 3 nights | Mondays, same months |
| SS Misr | Luxor → Aswan, 4 nights | 22 Mondays in 2027 |
| SS Misr | Aswan → Luxor, 3 nights | 23 Fridays in 2027 |
| Hamees | Luxor round trip, 7 nights | Every Monday, 2027 and 2028 |
| Sun Ray | Luxor round trip, 7 nights | Thursdays, same months as above (last: December 2028, before the 24th) |
| SS Misr | Luxor round trip, 7 nights | 19 Mondays in 2027: those with both the 4-night and the following 3-night date listed (worked out, not listed as such) |
| Feddya | On request, 4–7 nights, either direction | No dates; not Christmas or New Year |

Feddya also: soft all-inclusive (local alcoholic and non-alcoholic drinks), check-in 12:00, check-out 08:00, sails with one suite booked.

## Page texts to change (not rewritten here)

- **Hamees:** confirm or remove "two bathrooms" in the Executive Suites, and the porthole and larger-window descriptions. The sheet says neither.
- **Sun Ray:** remove any mention of single cabins or a "Superior Suite"; say there are no June–August sailings.
- **SS Misr:** mention the balconies, the three-night sailing and that departures are on selected dates.
- **Feddya:** add soft all-inclusive, the jacuzzi and the two suite types.
- Spanish and Japanese texts and cabin names are not prepared.

## Programmes

Taken from the itinerary file each sheet links to on Google Drive and rewritten in plain prose; meal themes and clock times are left out except noon check-in. Every programme is marked as a noon sailing.

## Not covered

- **Darakum's winter 2027/28 short season:** no sheet yet.
- **A further Drive folder** linked from each itinerary file showed nothing.
- **Feddya** has no programme in these files. Its old six-night itinerary stays, inactive.
- **The production database** has not been read.

## Ask Mövenpick

- Darakum's plan numbers two cabins 210 (one is probably 212).
- Sun Ray's table says 21 king and 33 twin cabins; its plan shows 22 and 32.
- Feddya's suite is "Superior" in one table and "Senior" in another.
- The SS Misr seven-night programme has odd times on days 5 and 6 (a Friday "check-in" mid-cruise, dinner at 17:00).

## Applying to production

Both are done; their backups are in `.import-backups/` on this branch. To report again:

```bash
pnpm exec tsx --env-file=/Users/islamhussein/nce-repo/.env.local scripts/apply-movenpick-2027.ts --target=production
```

Production's boat names and current data differ from staging's, so read that report before adding `--apply --confirm-production`. This is data only, so no deploy is needed.

**Don't run `pnpm import:luxury-vessels` on these boats before this script.** It adds missing cabin types without editing old ones.

## Darakum short cruises (added to staging, 25 November 2026)

From the winter 2026/27 short cruise sheet and its itinerary file, whose programme matches Hamees's. Applied to production the same day. Friday 27 November 2026 was then removed (Islam: that week's sailing is not confirmed), so the 3-night cruise has 10 dates, from 4 December.

## Public prices (approved by Islam, 25 November 2026; on production)

Euros per person per night, two sharing; sightseeing not included and sold separately. Set by `scripts/apply-movenpick-prices.ts`. Supplier rate files are not in this repository.

| Boat | From | Shown until |
|---|---|---|
| Darakum | €422 | 27 May 2027 |
| Hamees | €378 | 30 April 2028 |
| Sun Ray | €378 | 29 April 2027 |
| SS Misr | €880 | 23 December 2027 |
| Feddya | Price on request | |

Sightseeing can't yet be bought at reservation for these boats: there are no published sightseeing programmes, and the boats have no bookable rates.

## Sun Ray photos (published 25 November 2026)

Nine photos added by `scripts/add-movenpick-photos.ts`, ten with the exterior already there: restaurant, sun deck and reception in the gallery; Classic, Superior and Deluxe Cabins and Junior, Deluxe and Executive Suites on their cards. The originals and web copies are not in this repository.

- No photo for the Junior Upper Suite (none supplied under that name).
- The files only say "Standard Cabin": a twin room was used for Superior, a king room for Deluxe.
- Ask Mövenpick to confirm the suite photos show the real suites; the window views look edited.
