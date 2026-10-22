# Vessel onboarding spec: closing seven gaps

**Status:** asked for by Faris 22 Oct 2026, after the compliance review against "Nile Cruise Vessel Onboarding — Build Spec" (20 Oct 2026). Choices answered the same day (ADR-103). · **Branch:** `batch-11-2-vessel-spec-gaps`, stacked on 11-1 · **Size:** L

The standalone vessel system and Vessel Desk stay out of this brief. Everything below is built inside nilecrz, on the tables that exist.

## In scope

| # | Spec item | What we build |
|---|---|---|
| 1 | `cabin_category.count_total` | `cabin_types.cabin_count` (optional, 1–400). Operators and admins set it on the cabin type. Sheet checks and every availability write stop at it when set, else at the ship's total as today. |
| 2 | `inventory.mode` freesale | `freesales`: an admin-entered agreement per ship (one cabin type or all) for a range of departure dates. Under it, manual, paste and sheet data no older than 72 hours books instantly; the operator is told, as for any booking. |
| 2 | `inventory.mode` stop_sale | `stop_sales`: the operator's team (owner, reservations) or a catalogue admin closes a ship, or one cabin type, for a range of departure dates. Those cabins show sold out and can't be booked or requested; no feed, API call or sheet lifts it. **Allotment cabins stay open** (the contract holds until release). |
| 3 | `hold` | `holds`: one row per hold (sailing, cabin type, cabins, expiry, status `active / confirmed / expired / released`). An operator's "Hold 72h" answer writes one. Catalogue admins can also place a hold (1–168 hours), extend any active hold, and release their own. Operators and admins see free / held / booked per cabin type on each sailing. |
| 4 | `supplement` | `supplements`: per ship (one cabin type or all), kind `gala_dinner` or `peak`, name, nights it covers, amount per person per currency. **Compulsory and in the cruise total**: a sailing on board on any of those nights adds it per guest (children by the same age bands as the fare). It follows the total into payment, commission and cancellation, and shows as its own line. No `single` kind: single-occupancy rates already exist. Offers stay priced by hand. |
| 5 | Webhooks | Operators only. An operator's owner sets an https URL on Inventory connections. Events `inventory.changed`, `hold.expired`, `booking.confirmed`, signed with Nilecruz's Ed25519 key (the existing `signWebhook`), queued in `webhook_deliveries` and sent by the existing scheduler tick, retried with back-off for 24 hours. No guest names in the payloads. |
| 6 | Accuracy rung | An operator whose data was wrong in more than 20 % of answered requests where it showed space (at least 5 such requests, 90 days) drops a rung: its manual and sheet cabins show "To be confirmed" instead of "confirmed within X h". Refreshed on every answer and nightly. |
| 7 | "Availability updated …" | Each sailing on the reserve page and the partner search shows when its availability was last confirmed, in words ("updated 3 hours ago"). |

## Not changed

- Offers (priced by hand), tours and programmes, the "from" price on listing cards (supplements are dated; most sailings have none).
- Travel partners can't place holds (ADR-103).

## Tests

- pgTAP `400_vessel_spec_gaps`: cabin counts, freesale, stop-sale vs allotment, holds and their expiry, supplements in totals, the accuracy rung, webhook queueing.
- Unit: sheet checks per cabin type, supplement arithmetic in partner search, webhook payloads and signature, relative time.
