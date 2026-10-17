# ExperienceCard

## Design-system guideline

_Carried over verbatim from `vendor/design-system/components/ExperienceCard/README.md`._

Portrait image, uppercase serif title, two-line description and an outline "See details" button, for on-board and ashore experiences.

Provide `title`, `children` or `description`, `image` or `time`/`vessel`, and `href`/`cta`. Use three or four in a row.

## Changes in the build

- The placeholder scene has no boat by default (the felucca default is removed, ADR-008).

States: see `/dev/components/` and `ExperienceCard.stories.tsx`. Differences are measured by the visual-parity test (`tests/e2e/parity.spec.ts`).
