# Differences from the design system

Every place where the build intentionally differs from `nilecrz-design-system` (CLAUDE.md §5: "any difference is fixed or logged"). The source is vendored unchanged in `vendor/design-system/`.

| # | Area | Design system | Build | Why | Decision |
|---|---|---|---|---|---|
| 1 | Japanese tracking | `:lang(ja)` eyebrow, section title, badge at 0.08em | 0 for all tracked styles | CLAUDE.md §6 "never letter-space Japanese" | ADR-016 |
| 2 | Motion tokens | Only in `bundle.css` | Added as `tokens/motion.json`, generated with the other tokens | Tokens come from source by script | ADR-016 |
| 3 | Japanese fonts | Stacks name Noto Serif JP / Noto Sans JP (not loaded) | Same stacks; no web font downloaded | Performance (≈200 KB render-blocking CSS) | ADR-035 |
| 4 | NavBar: theme control | None | Text control beside languages; in the menu on phones | Day/Night is part of the product | ADR-037 |
| 5 | NavBar: phone menu | JS button; language switch hidden under 760 px | `<details>` menu, includes language switch | Works without JS; phones can change language | ADR-037 |
| 6 | NavBar: wordmark name | "nilecrz" | "Nilecruz" | Brand name | ADR-022 |
| 7 | NavBar: underline | Sliding brass ink (JS-measured) | Static brass underline on the current page | Full port in Batch 2 (COMP-NavBar) | ADR-037 |
| 8 | Header hairline | `box-shadow: 0 1px 0 var(--line)` | `border-bottom: 1px solid var(--line)` | Brand allows only two shadows | Stylelint rule |
| 9 | Focus ring scope | Only inside `.nc-root` | Global `:focus-visible` | A11Y-003 | Batch 1 |

Planned for later batches (from ADR-007/008/009): BookingSummary rebuilt around real data; no felucca variant of VesselArt/Scene; CruiseCard shows the Nilecruz score instead of stars.
