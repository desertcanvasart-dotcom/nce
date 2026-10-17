# VesselCompare

## Design-system guideline

_Carried over verbatim from `vendor/design-system/components/VesselCompare/README.md`._

Interactive comparison of the three vessel types: tabs with an illustration, five meters (intimacy, quiet, free itinerary, facilities, heritage) and a fact list, or all three side by side.

Provide `types` (order) and `defaultType`. Data comes from `Nilecrz.data.vessels`; replace the ranges with your fleet's real figures before launch.

- Meters show character, not quality: a motor ship scoring 5 on facilities and 1 on intimacy is a fair description, not a criticism.
- Arrow keys move between tabs.

## Changes in the build

- Profiles are data props (from content), not built in; meters are named and announced; Sample data flag when illustrative.

States: see `/dev/components/` and `VesselCompare.stories.tsx`. Differences are measured by the visual-parity test (`tests/e2e/parity.spec.ts`).
