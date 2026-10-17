# Rating

## Design-system guideline

_Carried over verbatim from `vendor/design-system/components/Rating/README.md`._

Star rating with the score and review count.

Provide `value` (0–5, one decimal) and optionally `count`. Show it only when backed by real reviews.

## Changes in the build

- `count` is required: stars appear only with the verified reviews behind them (ADR-009).

States: see `/dev/components/` and `Rating.stories.tsx`. Differences are measured by the visual-parity test (`tests/e2e/parity.spec.ts`).
