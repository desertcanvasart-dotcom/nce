# Stepper

## Design-system guideline

_Carried over verbatim from `vendor/design-system/components/Stepper/README.md`._

Minus / value / plus control for small counts (guests, children).

Provide `label`, `min`, `max`, and `value` + `onChange` (controlled) or `defaultValue`. Buttons disable at the limits, and the value bumps on change.

## Changes in the build

- `label` is required (it names the buttons for screen readers); labels are translated.

States: see `/dev/components/` and `Stepper.stories.tsx`. Differences are measured by the visual-parity test (`tests/e2e/parity.spec.ts`).
