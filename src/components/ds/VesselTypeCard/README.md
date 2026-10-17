# VesselTypeCard

## Design-system guideline

_Carried over verbatim from `vendor/design-system/components/VesselTypeCard/README.md`._

Explains one of the three ways to sail: illustration, nickname, name, one honest sentence, three facts and a link.

Provide `type`, and optionally override `title`, `eyebrow`, `description`, `facts` (`[icon, text]` pairs), `href` and `cta`. Show the three types together, in a row.

## Changes in the build

- All text and facts are props (from content), with a Sample data flag when illustrative.

States: see `/dev/components/` and `VesselTypeCard.stories.tsx`. Differences are measured by the visual-parity test (`tests/e2e/parity.spec.ts`).
