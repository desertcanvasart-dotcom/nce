# CruiseCard

## Design-system guideline

_Carried over verbatim from `vendor/design-system/components/CruiseCard/README.md`._

A listing card for one sailing: scene or photo, vessel type, name, route, nights, guests, rating, amenity icons, price per person, save and compare.

Provide `name`, `vessel` (`sail`/`motor`/`steam`), `propulsion` (`motor`/`wind`/`steam`, from the vessel's data: a badge with an icon and a word), `route` (array of stops), `nights`, `guests` (max on board, which is the honest size signal), `rating`, `reviews`, `price`, `amenities` (icon names), `badges`, `image` or `time`, and the callbacks `onSave` and `onCompare`.

- Always show the guest count: it explains most of the price.
- Show five amenity icons or fewer, the ones that differ.

## Changes in the build

- `price` is the approved public starting price in euros, already including Nilecruz's margin: `{ from }` or a typical band `{ min, max }` (Money in minor units). The card shows the brief's sentence, "From €X per person. Includes our margin. A guide, not a quote." Without one it says "Price on request"; booking status stays a separate badge (ADR-109).
- Shows the Nilecruz evaluation 'NN/100'; stars only for verified reviews (ADR-009).
- The title links to the vessel page and the whole card is clickable; save and compare keep local state until saved cruises and the compare tray exist.

States: see `/dev/components/` and `CruiseCard.stories.tsx`. Differences are measured by the visual-parity test (`tests/e2e/parity.spec.ts`).
