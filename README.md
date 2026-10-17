# Nilecruz

Nile cruises, explained before you sail. Built batch by batch; plan and records in `docs/` (start with `docs/BATCH-PLAN.md`).

## Run it

Requires Node 22 (`nvm use`) and pnpm (`corepack enable pnpm`).

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000 (Spanish: `/es/`, Japanese: `/ja/`). Private settings go in `.env.local` (see `.env.example`).

## Checks

| Command                       | What                                                                                  |
| ----------------------------- | ------------------------------------------------------------------------------------- |
| `pnpm verify`                 | tokens, types, lint, styles, copy, format, unit tests                                 |
| `pnpm build && pnpm budget`   | production build and the 200 KB JS budget                                             |
| `pnpm build && pnpm test:e2e` | end-to-end and accessibility tests on the production build                            |
| `pnpm tokens`                 | regenerate design tokens from `vendor/design-system/tokens/tokens.json`               |
| `pnpm screenshots --batch NN` | screenshots at 375/768/1440 in Day and Night (needs `pnpm start --port 3100` running) |
| `pnpm lhci`                   | Lighthouse (mobile) on key pages                                                      |

The design system in `vendor/design-system/` is an untouched copy of the source; never edit it. Differences are logged in `docs/DS-DIFFS.md`.
