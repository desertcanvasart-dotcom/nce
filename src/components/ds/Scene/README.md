# Scene

## Design-system guideline

_Carried over verbatim from `vendor/design-system/components/Scene/README.md`._

Placeholder river art in four lights (dawn, day, dusk, night) with a chosen vessel, temple pylon, palms and water glints.

Provide `time`, `vessel` (`sail`, `motor`, `steam`, `felucca` or `null`), `temple` (false hides it), `parallax` (pointer-follow layers) and `label` if it carries meaning. It fills its container, so give the parent a height or aspect ratio.

- Replace it with real photography as soon as it exists; components take `image` and fall back to Scene.
- Colours are palette tokens, constant across themes.

## Changes in the build

- No felucca (ADR-008).
- Server-rendered SVG; pointer parallax is a small client wrapper, off under reduced motion (A11Y-004).

States: see `/dev/components/` and `Scene.stories.tsx`. Differences are measured by the visual-parity test (`tests/e2e/parity.spec.ts`).
