# Icon

## Design-system guideline

_Carried over verbatim from `vendor/design-system/components/Icon/README.md`._

A 24px line icon from the system's own set, covering UI, propulsion (sail, engine, steam) and on-board amenities.

Provide `name` (see `Nilecrz.data.icons`). Pass `label` whenever the icon stands alone, so it is announced; omit it when visible text sits beside it.

- Colour is `currentColor`: `accent` for facts and amenities, `ink`/`ink-muted` for controls.
- Size follows font-size (1em); set `size` for a fixed px size.
- Don't mix in other icon families. Add new icons to the set at a 1.5 stroke on the 24 grid.

## Changes in the build

- Shapes generated from the bundle's ICONS table (`icons.ts`); names identical to index.d.ts (47).
- `filled` prop replaces the bundle's internal `is-filled` class (Rating stars).

States: see `/dev/components/` and `Icon.stories.tsx`. Differences are measured by the visual-parity test (`tests/e2e/parity.spec.ts`).
