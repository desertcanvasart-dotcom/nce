# CabinPicker

## Design-system guideline

_Carried over verbatim from `vendor/design-system/components/CabinPicker/README.md`._

Radio cards for cabin categories with a mini floor plan, size, deck, bed, price and scarcity or sold-out state.

Provide `cabins` (`{name, size, deck, bed, price, left, soldOut}`), `defaultValue`, `onChange` and `currency`. Always show the size in m², the number guests compare.

## Changes in the build

- Size is a number in m²; decks are the vessel's own names (Lower/Middle/Upper or vessel-specific).
- `showPrices={false}` for signed-out visitors: facts without prices (ADR-025).

States: see `/dev/components/` and `CabinPicker.stories.tsx`. Differences are measured by the visual-parity test (`tests/e2e/parity.spec.ts`).
