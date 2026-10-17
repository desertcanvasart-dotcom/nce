# Badge

## Design-system guideline

_Carried over verbatim from `vendor/design-system/components/Badge/README.md`._

A small uppercase label for vessel type, scarcity or status.

Provide `children` and `tone`: `neutral`, `accent` (scarcity, highlights), `success`, `danger` or `media` (on photos). Status tones need a word, and an `icon` helps. Keep it to three words or fewer.

## Changes in the build

- No change in behaviour.

States: see `/dev/components/` and `Badge.stories.tsx`. Differences are measured by the visual-parity test (`tests/e2e/parity.spec.ts`).
