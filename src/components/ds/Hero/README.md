# Hero

## Design-system guideline

_Carried over verbatim from `vendor/design-system/components/Hero/README.md`._

Full-bleed opening with a scene or photo, scrim, eyebrow, display headline, lead and an optional floating slot (usually CruiseSearch).

Provide `title` (short, one idea), `eyebrow`, `subtitle`, `action` (a link Button `onMedia`), `nav` (a NavBar `overMedia`), `children` (the slot), `image` or `time`/`vessel`, and `height`. One per page.

## Changes in the build

- Photos load with `next/image` and priority (LCP).
- On screens under 720 px the scrim extends behind the copy, because the scene crops so the boat sits behind the text (BRAND-020).

States: see `/dev/components/` and `Hero.stories.tsx`. Differences are measured by the visual-parity test (`tests/e2e/parity.spec.ts`).
