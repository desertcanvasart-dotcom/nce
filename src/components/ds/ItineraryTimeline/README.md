# ItineraryTimeline

## Design-system guideline

_Carried over verbatim from `vendor/design-system/components/ItineraryTimeline/README.md`._

Day-by-day route drawn as a river: click a stop or press play and the boat sails there, with the day number, title, story and site tags below.

Provide `stops` (`{day, place, title, body, tags}`) and `vessel` (the marker). Arrow keys move between days. Keep each body to one sentence; save the detail for the cruise page.

## Changes in the build

- Each stop is a tab with Arrow, Home and End keys (A11Y-009); without JavaScript every day is listed.

States: see `/dev/components/` and `ItineraryTimeline.stories.tsx`. Differences are measured by the visual-parity test (`tests/e2e/parity.spec.ts`).
