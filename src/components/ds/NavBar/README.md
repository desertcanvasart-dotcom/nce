# NavBar

## Design-system guideline

_Carried over verbatim from `vendor/design-system/components/NavBar/README.md`._

Brochure-style navigation: language switch, centred wordmark, call-to-action and a link row with a sliding brass underline.

Provide `links`, `active`, `brand`, `tagline`, `cta`, `overMedia` (transparent with on-media text, used inside `Hero`), `onNavigate` and `onLanguage`. Under 760px it collapses to a menu button. Keep it to seven links or fewer, with "Why prices differ" always visible.

## Changes in the build

- Takes real links (`{label, href}`) and a CTA; the current section comes from the URL.
- Day/Night control beside the language switch; phone menu is a `<details>` element (works without JS) and includes the language switch (ADR-037).
- Wordmark reads Nilecruz (ADR-022).

States: see `/dev/components/` and `NavBar.stories.tsx`. Differences are measured by the visual-parity test (`tests/e2e/parity.spec.ts`).
