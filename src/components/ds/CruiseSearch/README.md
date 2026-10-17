# CruiseSearch

## Design-system guideline

_Carried over verbatim from `vendor/design-system/components/CruiseSearch/README.md`._

Floating search bar with route, vessel type, a departure calendar showing real sailing days, and guests. It reports how many departures match.

Provide `routes` (`{label, sub, days:[weekday numbers]}`), `vessels` (`{label, sub, icon}`), `onSearch` and `onMedia` when it sits over the hero, plus `cta`.

- Only sailing days can be picked, marked with a brass dot.
- Popovers close on Escape or an outside click.

## Changes in the build

- Routes carry real departure dates (no weekday guessing) and only those can be picked.
- Each child's age is asked for and required (ADR-012/018); submits as a GET form, so it works without JavaScript.
- No invented match count: the caller passes `matchCount` when it knows it.
- One column under 480 px so values are not cut off.

States: see `/dev/components/` and `CruiseSearch.stories.tsx`. Differences are measured by the visual-parity test (`tests/e2e/parity.spec.ts`).
