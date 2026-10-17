# CruiseCard

## Design-system guideline

_Carried over verbatim from `vendor/design-system/components/CruiseCard/README.md`._

A listing card for one sailing: scene or photo, vessel type, name, route, nights, guests, rating, amenity icons, price per person, save and compare.

Provide `name`, `vessel` (`sail`/`motor`/`steam`), `route` (array of stops), `nights`, `guests` (max on board, which is the honest size signal), `rating`, `reviews`, `price`, `amenities` (icon names), `badges`, `image` or `time`, and the callbacks `onSave` and `onCompare`.

- Always show the guest count: it explains most of the price.
- Show five amenity icons or fewer, the ones that differ.

## Changes in the build

- `price` is `{amount (minor units), currency}` and optional: without it the card says 'Prices in preparation' (ADR-019, ADR-025).
- Shows the Nilecruz evaluation 'NN/100'; stars only for verified reviews (ADR-009).
- The title links to the vessel page and the whole card is clickable; save and compare keep local state until saved cruises and the compare tray exist.

States: see `/dev/components/` and `CruiseCard.stories.tsx`. Differences are measured by the visual-parity test (`tests/e2e/parity.spec.ts`).
