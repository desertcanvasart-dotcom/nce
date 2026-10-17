# Button

## Design-system guideline

_Carried over verbatim from `vendor/design-system/components/Button/README.md`._

The action button: `primary` for the one main action, `outline` for secondary, `ghost` for tertiary and `link` for inline navigation.

Provide `children` (the label, sentence case, verb first) and optionally `icon` (`arrow-right` for forward actions, `arrow-up-right` for leaving the page), `size` (`sm`/`md`/`lg`), `onMedia` over photography, `block` for full width and `href` to render a link.

- Use one `primary` per view (Check availability, Request to book).
- Outline buttons fill from the left on hover. Don't add shadows or rounding.

## Changes in the build

- Internal `href`s are locale-aware links (next-intl).
- Labels may wrap and height is a minimum (44/36/56 px): Spanish runs ~30% longer and buttons are never fixed-width (I18N-007).

States: see `/dev/components/` and `Button.stories.tsx`. Differences are measured by the visual-parity test (`tests/e2e/parity.spec.ts`).
