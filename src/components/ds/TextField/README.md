# TextField

## Design-system guideline

_Carried over verbatim from `vendor/design-system/components/TextField/README.md`._

Underlined text field with a floating label, a brass focus bar, and hint or error text.

Provide `label`, plus optional `type`, `hint`, `error`, `multiline`, `defaultValue` and `onChange`. Errors say how to fix the problem ("Add a country code, e.g. +20").

## Changes in the build

- `<label for>` instead of a wrapping label, plus `name`, `required`, `autoComplete` for real forms.
- The global focus ring is kept alongside the brass bar (A11Y-003).

States: see `/dev/components/` and `TextField.stories.tsx`. Differences are measured by the visual-parity test (`tests/e2e/parity.spec.ts`).
