# Batch 1 brief: Foundation

**Status:** awaiting Faris's go-ahead · **Branch:** `batch-01-foundation` (from `main`) · **Size:** M

**Goal:** an empty but production-grade shell, with these properties:
- deployed to a preview URL;
- in EN, ES and JA;
- in Day and Night themes;
- every quality gate wired and green.

No product features or database tables are in scope. Those start in Batch 3.

## Requirement IDs in scope (45)

- **Tokens (12):** TOK-COLOR-SEMANTIC, TOK-COLOR-PALETTE, TOK-THEMES, TOK-TYPE-FAMILIES, TOK-TYPE-STYLES, TOK-SPACING, TOK-RADIUS, TOK-SHADOW, TOK-LAYOUT, TOK-MOTION, TOK-PIPELINE, TOK-NO-HARDCODE
- **Engineering (14):** ENG-001, 002, 003, 004, 005, 006, 008, 010, 011, 012, 014, 016, 017, 018
- **Brand (3):** BRAND-001, BRAND-002, BRAND-025
- **Accessibility (2):** A11Y-001, A11Y-006
- **Performance (4):** PERF-004, PERF-006, PERF-007, PERF-009
- **Security (2):** SEC-003, SEC-012
- **SEO (5):** SEO-001, SEO-002, SEO-006, SEO-015, SEO-020
- **Languages (3):** I18N-001, I18N-006, I18N-009

## What I will create

**Repository basics:**
- `package.json` (pnpm);
- `.nvmrc` (Node 22 LTS);
- `tsconfig.json` (strict, `noUncheckedIndexedAccess`);
- `next.config.ts` (`trailingSlash: true`, security headers);
- `.env.example` (variable names only);
- `README.md` ("how to run").

**Tokens:**
- `vendor/design-system/`: an untouched copy of the approved zip contents, the reference for the generator and parity tests.
- `tokens/motion.json` (ADR-016).
- `scripts/tokens.ts`, which writes `src/styles/tokens.css` and `src/styles/tokens.ts`.
- `src/styles/global.css`: reset, body, focus ring, the `:lang(ja)` rule.

**Fonts:**
- `src/app/fonts.ts`: Cormorant Garamond (400/500/600, italic 400/500) and Jost (300/400/500) through `next/font/google`, self-hosted and subset.
- Noto Serif JP and Noto Sans JP loaded only in the `/ja` layout.

**Language routing:**
- `src/i18n/routing.ts` with `en` unprefixed, `/es/` and `/ja/`, and a pathnames map ready for translated slugs.
- `messages/{en,es,ja}.json`.
- `src/proxy.ts` (Next 16 middleware) for locale detection and the CSP nonce.

**App shell and pages:**
- `src/app/[locale]/layout.tsx`:
  - skip link and landmarks;
  - NavBar: an early, minimal port of the design-system NavBar, verified for full parity in Batch 2;
  - footer;
  - theme toggle with a cookie and no flash;
  - language switch.
- Pages:
  - `src/app/[locale]/page.tsx`: placeholder home with one H1 and no invented facts;
  - `not-found.tsx` and `error.tsx`: 404 and 500 in the brand voice, in all three languages;
  - `src/app/robots.ts`;
  - `src/lib/seo/metadata.ts`: title, description, canonical.

**Scripts:**
- `scripts/copy-lint.ts`: banned words, exclamation marks, emoji.
- `scripts/screenshots.ts`: 375/768/1440 × Day/Night → `docs/screenshots/batch-01/`.
- `scripts/bundle-budget.ts`: fails above about 200 KB gzipped of JS per route.

**Quality tooling:**
- `eslint.config.mjs`: next, `jsx-a11y`, and a rule that reasons are required on `eslint-disable` and `@ts-ignore`.
- `.prettierrc`.
- `stylelint.config.mjs`: token-only colours, radii, shadows and font families.
- `vitest.config.ts`, `playwright.config.ts`, `lighthouserc.json`.

**CI:**
- `.github/workflows/ci.yml`: typecheck, lint, format, stylelint, token-diff, copy-lint, unit tests, build, bundle budget, gitleaks, e2e plus axe against the Vercel preview, Lighthouse CI.

**Integrations:**
- Sentry: `sentry.*.config.ts` and `instrumentation.ts`, with release tags.
- Supabase: `supabase/config.toml` (local stack only); the client helpers are added in Batch 3.

## Navigation

My recommendation from Q8, which Faris accepted with the docs:

| Item | Links to |
|---|---|
| Cruises | `/cruises/` |
| Vessels | `/vessels/` |
| Why prices differ | `/nile-cruise-prices/` |
| Nile cruise guide | `/nile-cruise-guide/` |
| Destinations | `/destinations/` |
| Tours & extras | `/tours-extras/` |
| CTA: "Plan my cruise" | `/plan-my-cruise/` |

- **Footer:** Trust pages and the silo roots.
- Links to pages that don't exist yet return the branded 404 until their batch. That is expected in preview only.

## Tests I will add

- **Unit (Vitest):**
  - the token generator: every tokens.json entry is emitted, Day and Night values match, motion is present;
  - copy-lint rules;
  - the metadata/canonical helper;
  - the locale path helper.
- **E2E (Playwright, run in each locale and theme):**
  - the shell renders with JS disabled;
  - the theme toggle persists with no flash;
  - the language switch goes to the same page in the other locale;
  - the skip link moves focus;
  - the 404 page in each language;
  - a URL without a trailing slash redirects (308);
  - `robots.txt` content;
  - one H1 and a self-canonical on each page;
  - security headers are present;
  - axe finds no serious or critical issues.
- **Gates:**
  - Lighthouse CI on the shell;
  - bundle budget;
  - gitleaks.
- **Visual:** screenshots of every new page at 375, 768 and 1440 px in Day and Night.

## New dependencies and why

**Runtime:**

| Package | Why |
|---|---|
| `next`, `react`, `react-dom` | Framework |
| `next-intl` | Languages |
| `zod` | Validating environment variables at startup; server inputs later |
| `@sentry/nextjs` | Error tracking (ENG-014) |

**Development:**

| Package | Why |
|---|---|
| `typescript` | Types |
| `eslint`, `eslint-config-next`, `eslint-plugin-jsx-a11y` | Lint |
| `prettier` | Formatting |
| `stylelint`, `stylelint-config-standard` | Token rule |
| `vitest` | Unit tests |
| `@playwright/test`, `@axe-core/playwright` | E2E and accessibility |
| `@lhci/cli` | Lighthouse |
| `tsx` | Running scripts |

- Gitleaks runs as a GitHub Action, not an npm package.
- No Tailwind and no UI kit (ADR-006).

## What I need from Faris before starting

1. **A `main` branch.** The repo had no `main`, so GitHub made `batch-00-discovery` the default. May I create `main` from it and set `main` as the default? Every batch then opens a PR into `main`.
2. **Node 22 LTS on this Mac.** It has Node 20, which reached end of life in April 2026. Run `brew install node@22`, or let me install it with `fnm`.
3. **Accounts.** You create or invite; please don't paste secrets in chat, I'll tell you where each one goes.
   - **Vercel:** a project linked to `desertcanvasart-dotcom/nce`. Production stays unpublished, and nilecruz.com stays on Railway until launch.
   - **Supabase:** two projects, `nilecruz-staging` (shared by previews until Batch 3) and `nilecruz-prod`. Separate per-PR databases need Supabase branching (paid plan). I recommend the shared staging project for now.
   - **Sentry:** an organisation and project. Otherwise I'll defer ENG-014 to Batch 11, with your OK.
4. **Spanish and Japanese UI strings.** About 40 labels for the nav, footer and 404/500 pages. May I draft them, marked "needs translator review" in CONTENT-NEEDED? Or will you supply them?
5. **Footer legal links (Q56).** May the footer link to placeholder `/terms/` and `/privacy/` pages (no text until you supply it)? Is `/independence/` kept or dropped?

**Answered since the brief was written:** Q3, Q51 and Q52 (ADR-025 to ADR-028). Q54 and Q55 are needed by Batches 4d and 4f, not Batch 1.
