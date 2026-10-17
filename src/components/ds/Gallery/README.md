# Gallery

## Design-system guideline

_Carried over verbatim from `vendor/design-system/components/Gallery/README.md`._

"Captured moments" carousel: snap-scrolling frames that tilt in 3D as they pass centre, with a counter, progress line and arrows.

Provide `items` (`{image or time/vessel, caption, meta, alt}`) and `label`. Captions name the place and the day.

## Changes in the build

- 3D tilt and smooth scrolling stop under reduced motion (A11Y-004); frames are labelled slides.

States: see `/dev/components/` and `Gallery.stories.tsx`. Differences are measured by the visual-parity test (`tests/e2e/parity.spec.ts`).
