# PriceAnatomy

## Design-system guideline

_Carried over verbatim from `vendor/design-system/components/PriceAnatomy/README.md`._

The "why US$800 vs US$8,000" explainer: two five-star presets and six factors that build the price live in a stacked bar, each with what you notice on board.

Provide `factors` (`{id, label, icon, options:[{label, v, why}]}`, default `Nilecrz.data.priceFactors`), `defaultPreset` (`low`/`high`), `currency`, `eyebrow`, `note` and `footnote`.

- The figures are illustrative; feed real rate-sheet numbers and keep the footnote honest.
- Each segment colour is keyed by a square in its row and named in the bar's text alternative, so colour is never the only cue.

## Changes in the build

- Factors, presets, labels and footnote are props; amounts in minor units.
- Prices use lining figures (BRAND-024); radio-group keyboard (A11Y-009); Sample data flag when illustrative.

States: see `/dev/components/` and `PriceAnatomy.stories.tsx`. Differences are measured by the visual-parity test (`tests/e2e/parity.spec.ts`).
