# VesselArt

## Design-system guideline

_Carried over verbatim from `vendor/design-system/components/VesselArt/README.md`._

Side-profile illustration of a vessel type: motor cruise ship, sailing dahabiya, paddle steamer or felucca.

Provide `type`. It inherits `color` (`ink`) for the hull, uses `surface-raised` for windows and `brass-300` for sails. Sails billow and steam puffs. Use it wherever a vessel type is named: type cards, comparisons, the itinerary marker.

## Changes in the build

- No felucca variant (ADR-008, BRAND-027).
- `decorative` hides it from screen readers when text beside it names the vessel.

States: see `/dev/components/` and `VesselArt.stories.tsx`. Differences are measured by the visual-parity test (`tests/e2e/parity.spec.ts`).
