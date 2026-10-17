# Batch 1 brief: Foundation

**Status:** revised 17 Oct 2026 after Faris's answers (ADR-029 to ADR-032); awaiting go-ahead · **Branch:** `batch-01-foundation` (from `main`) · **Size:** M

**Goal:** an empty but production-grade shell, with these properties:
- deployed to a Railway **staging** service from `main`;
- in EN, ES and JA;
- in Day and Night themes;
- every quality gate wired and green.

No product features or database tables are in scope. Those start in Batch 3.

## Requirement IDs in scope (45)

ENG-014 (Sentry) moved to Batch 11, and ENG-019 (draft terms and privacy) was added.

- **Tokens (12):** TOK-COLOR-SEMANTIC, TOK-COLOR-PALETTE, TOK-THEMES, TOK-TYPE-FAMILIES, TOK-TYPE-STYLES, TOK-SPACING, TOK-RADIUS, TOK-SHADOW, TOK-LAYOUT, TOK-MOTION, TOK-PIPELINE, TOK-NO-HARDCODE
- **Engineering (14):** ENG-001, 002, 003, 004, 005, 006, 008, 010, 011, 012, 016, 017, 018, 019
- **Brand (3):** BRAND-001, BRAND-002, BRAND-025
- **Accessibility (2):** A11Y-001, A11Y-006
- **Performance (4):** PERF-004, PERF-006, PERF-007, PERF-009
- **Security (2):** SEC-003, SEC-012
- **SEO (5):** SEO-001, SEO-002, SEO-006, SEO-015, SEO-020
- **Languages (3):** I18N-001, I18N-006, I18N-009

## What I will create

**Repository basics:**
- `package.json` (pnpm);
- `.nvmrc` (Node 22.23.3, already installed and set as the default);
- `.gitignore` (already created; `.env.local` is ignored);
- `tsconfig.json` (strict, `noUncheckedIndexedAccess`);
- `next.config.ts` (`trailingSlash: true`, `output: 'standalone'` for Railway, security headers);
- `railway.json` (build and start commands, health check);
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
- `.github/workflows/ci.yml`: typecheck, lint, format, stylelint, token-diff, copy-lint, unit tests, build, bundle budget, gitleaks, e2e plus axe against a production build started in CI with the local Supabase stack, Lighthouse CI.

**Integrations:**
- Draft legal pages: `src/app/[locale]/terms/page.tsx` and `src/app/[locale]/privacy/page.tsx`, in English, `noindex`, with a "Draft, under review" banner and marked placeholders (ADR-031).
- `messages/es.json` and `messages/ja.json` drafted by me with a `_review` note (ADR-032).
- Redirect map `src/lib/redirects.ts`, with the ADR-028 list and `/independence` → `/how-we-choose-vessels/`.
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

## Decided since the first version

| Item | Status |
|---|---|
| `main` branch | Created from `batch-00-discovery` and set as the default |
| Node 22 | 22.23.3 installed through nvm and made the default |
| Hosting | Railway: staging from `main`, production promoted manually |
| Supabase | Faris fills in `.env.local` (created, git-ignored) with the staging and production values |
| Sentry | Moved to Batch 11 |
| ES/JA strings | I draft them, marked for translator review |
| Footer legal links | Draft terms and privacy pages |

## Still needed during the batch, not before it

1. **Supabase values in `.env.local`.** Batch 1 only needs the staging URL and publishable key, to check that the connection works. No tables are created until Batch 3.
2. **Railway.** Near the end of the batch I'll need one of two things:
   - you create a Railway project with a service linked to `desertcanvasart-dotcom/nce` (branch `main`) and add the staging variables; or
   - you give me a Railway API token, which goes into `.env.local`, never into chat, so I can create it.
