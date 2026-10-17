# SectionHeading

## Design-system guideline

_Carried over verbatim from `vendor/design-system/components/SectionHeading/README.md`._

Centered eyebrow, uppercase serif title, brass ornament and intro: the opening of every section.

Provide `title`, plus optional `eyebrow`, `intro`, `align` (`center`/`left`), `as` (heading level, default h2) and `ornament={false}`. Keep titles to six words or fewer.

## Changes in the build

- No change in behaviour.

States: see `/dev/components/` and `SectionHeading.stories.tsx`. Differences are measured by the visual-parity test (`tests/e2e/parity.spec.ts`).
