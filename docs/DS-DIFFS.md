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

| 10 | All components | Prices as plain numbers | `{amount (minor units), currency}` | Money storage rule | ADR-043 |
| 11 | All components | English strings in code | Translatable messages (EN/ES/JA) | I18N-006 | ADR-044 |
| 12 | Button | Fixed height, no wrap | Minimum height, labels wrap | Spanish length (I18N-007) | ADR-046 |
| 13 | CruiseSearch | Weekday sailing days, fake match count, child count only | Real departure dates, caller's count, age per child; one column under 480 px; GET form | ADR-007/012/018 | ADR-047 |
| 14 | CabinPicker | Prices always shown | Prices hidden for signed-out visitors | ADR-025 | — |
| 15 | BookingSummary | Built-in fees, gratuity and flight toggles, "free cancellation" | Caller's lines; gratuity paid on board, outside the total; extras listed separately; real policy note | ADR-007/010/011/017 | — |
| 16 | CruiseCard | Stars; price required; no link | Nilecruz score; "Prices in preparation"; card links to its vessel page | ADR-009/019/025 | — |
| 17 | VesselArt, Scene, ExperienceCard | Felucca variant / default | Removed | ADR-008/015 | BRAND-027 |
| 18 | VesselTypeCard, VesselCompare, PriceAnatomy | Built-in illustrative data | Data props; Sample data flag; Transfers instead of Flights & transfers | CLAUDE.md §6, ADR-011 | — |
| 19 | PriceAnatomy, BookingSummary | Old-style figures in amounts | Lining figures | BRAND-024 | — |
| 20 | Hero | Same scrim at all widths | Stronger scrim behind copy on phones | BRAND-020 | ADR-047 |
| 21 | ItineraryTimeline, VesselCompare | Key handling on the tab list | On each tab, with Home/End; no-JS list of days | A11Y-009 | — |
| 22 | Gallery, Scene, count-ups | JS motion ignored reduced motion | Tilt, parallax, smooth scroll and count-up off under reduced motion | A11Y-004 | ADR-048 |

Measured parity per component: `docs/screenshots/batch-02/parity/report.json`; reasons for anything over 1%: `tests/e2e/parity-allowlist.json`.
