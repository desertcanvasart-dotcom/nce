nilecrz is a luxury Nile cruise marketplace whose first job is to explain. It teaches travellers how a sailing dahabiya, a paddle steamer and a motor cruise ship differ on board, and why one "five-star" cabin costs US$800 while another costs US$8,000. Then it lets them book. The look takes its cues from printed brochures and night on the river: deep Nile navy, ivory paper, brass detail, wide-tracked serif capitals and a great deal of air.

## Content fundamentals

- **Explain first, sell second.** Every selling surface should carry one honest fact the reader didn't know: what "rafted six abreast" means, why a dahabiya has no pool, what the licence does and doesn't measure. Never write "best", "unbeatable" or "once in a lifetime".
- **Speak to "you", plainly and with the senses.** Use short sentences in the present tense, built from concrete nouns: *"Lunch is served on the top deck while the crew trims the sails."* Don't use exclamation marks or emoji, and don't create urgency except for real availability ("Only 2 suites left").
- **Casing.** Use sentence case for headings, buttons and labels ("Check availability", "See details"). Write section titles in `title-caps` and kickers in `eyebrow`, and set them UPPERCASE with CSS, never in the source text, so translations stay correct.
- **Facts are exact.** Give site names in their common English form: Karnak, Esna, El Kab, Edfu, Kom Ombo, Philae, Gebel Silsila. Write durations as "4 nights", not "5 days". Write prices as `US$1,240`, per person, and always say what's included. Write dates as `12 Feb 2027`.
- **Vessel names.** Use the three categories exactly as written: *sailing dahabiya*, *paddle steamer*, *motor cruise ship*. A *felucca* is a small day sailboat, not a cruise vessel.
- **Multilingual (EN · ES · 日本語).** Allow for Spanish text running about 30% longer, so no fixed-width buttons. Japanese falls back to Noto Serif JP and Noto Sans JP through the family stacks. Never letter-space Japanese text: drop `eyebrow` tracking to 0.08em under `:lang(ja)`.

## Visual foundations

**Color.** The palette is a set of constant swatches (`nile-950`…`nile-300`, `brass-*`, `sand-*`, `ivory`, `dusk-*`), with semantic tokens in two themes: **Day** (light, the first theme) and **Night** (dark).
- Pages sit on `surface`. Cards, panels and popovers use `surface-raised`, and alternating bands and the footer use `surface-sunk`. Use `tint` for quiet fills.
- Set text in `ink` and secondary text in `ink-muted`. Both read at 4.6:1 or better on every surface and on `tint`, in both themes.
- `accent` is brass used as text: eyebrows, prices and active underlines. `brass-500` is decorative only (ornaments, rules), because it fails as small text.
- The main action is `primary` with `on-primary` text: navy by day, brass by night. Never hard-code white on a fill.
- Text on photography uses `on-media` over `scrim`.
- Status colors (`success`, `danger` and their `-soft` grounds) always come with a word or an icon, because they sit close in lightness.
- `dusk-*` belongs to illustration and the saved-heart state. It is never used for UI text.

**Type.** Use two hosted Google faces and no files: *Cormorant Garamond* (`--font-display`) and *Jost* (`--font-sans`).
- `display-xl` is for the single hero headline, `display-l` for page titles and `title-caps` for section titles (uppercase, tracked 0.06em).
- Use `heading` for vessel and cabin names, `price` for money and `quote` for guest voices.
- Running text is `body`, lead paragraphs are `body-l` (limited to the `measure` width), and buttons and labels use `label`.
- Use `eyebrow` above titles and `micro` in badges.
- Numbers in prices use lining figures. Totals and steppers use tabular figures.

**Space and layout.** Work on a 4px base: `space-1` (4) up to `space-10` (144).
- Sections are separated by `space-9`, and a section title sits `space-8` above its content.
- Card padding is `space-5`, and grid gaps are `space-5`.
- Content is capped at `container` (1240px), with `space-6` gutters on desktop and `space-4` on mobile.
- Leave generous margins. When in doubt, add space rather than a divider.

**Shape and depth.**
- Everything is square by default (`radius-0`), like a printed brochure.
- `radius-sm` is only for inputs and checkboxes. `radius-lg` is only for floating panels (the search bar and popovers). `radius-pill` is for round icon buttons and toggles.
- Cards rest flat with a hairline `line` border or none. They lift with `shadow-lift` on hover.
- Panels that float over imagery use `shadow-float`. No other shadows.

**Lines.** Use `line` for hairline dividers and `line-strong` for control borders (3:1 or better on every surface). The ornament (two hairlines around a small diamond, in `brass-500`) sits under section titles. Don't use it anywhere else.

**Imagery.**
- Real photography wins. Use wide, quiet compositions at dawn, dusk or night, with the vessel small in the frame and the river given room.
- Until photos exist, `Scene` draws placeholder art in four lights: dawn, day, dusk and night. Each scene shows one vessel type, a temple pylon, palms and water glints. It is built from palette tokens, so it reads the same in both themes.
- Never use stock images of a vessel other than the one being sold.

**Motion.** Use one easing everywhere, `--ease-river` (cubic-bezier(.22,.61,.36,1)), at three speeds: `--dur-1` 160ms for hovers, `--dur-2` 320ms for state changes and `--dur-3` 640ms for entrances.
- Signature moves:
  - Outline buttons fill from the left.
  - Link underlines redraw.
  - Hero copy rises into place.
  - Scenes parallax with the pointer.
  - Boats bob, sails billow and steam puffs.
  - Totals count up.
- Everything collapses under `prefers-reduced-motion`.

**States.** Hover darkens a border to `ink` or fills with `primary`. Selected uses `primary`/`on-primary`. Disabled drops to 45% opacity. Keyboard focus is always a solid 2px `focus` ring at a 2px offset (6:1 or better on every surface, in both themes). On media it is a 2px `on-media` ring.

## Iconography

The icon set is an original 24px line set, drawn for this system and shipped inside the bundle as `Icon`. It uses a 1.5px stroke, round caps and joins, `currentColor` and no fills.
- Use `accent` for icons that annotate facts (amenities, vessel facts, itinerary meta) and `ink` or `ink-muted` for UI controls.
- There are three groups:
  - **UI:** arrows, chevrons, calendar, users, pin, heart, star, plus, minus, check, close, menu, play, pause, info, clock, route, ruler, plane.
  - **Propulsion:** `sail` (wind), `engine` (motor), `steam` (paddle steamer), `anchor`, `compass`.
  - **Amenities:** `pool`, `sundeck`, `spa`, `wifi`, `ac`, `balcony`, `bath`, `restaurant`, `bar`, `wine`, `gym`, `egyptologist` (an ankh), `butler`, `library`, `accessible`, `bed`, `temple`, `sunrise`, `music`, `quiet`.
- Always give an amenity a text label, either visibly (`AmenityGrid`) or as the icon's `label` (the card amenity row).
- Vessel types each have one icon and one illustration (`VesselArt`). Always pair a type with its icon so the three are recognisable at a glance across the site.

## Logo

There is no logo file yet. The wordmark is the name set in Cormorant Garamond 500 at 34px, with the strapline "NILE CRUISES, EXPLAINED" in Jost at 9px, tracked 0.42em (see `NavBar`). Replace it with the real mark when one exists.

## Using the components

Components live in `components/bundle.js` as `window.Nilecrz` and need React 18. The page also needs `tokens.css` and `components/bundle.css`, which loads both Google fonts.
- **Education:** `VesselTypeCard`, `VesselCompare`, `PriceAnatomy`, `AmenityGrid`.
- **Discovery:** `CruiseCard`, `ExperienceCard`, `ItineraryTimeline`, `Gallery`.
- **Booking:** `CruiseSearch`, `CabinPicker`, `BookingSummary`.
- **Frame:** `NavBar`, `Hero`, `SectionHeading`, `Scene`, `VesselArt`.
- **Primitives:** `Button`, `Badge`, `Rating`, `Stepper`, `TextField`, `Icon`.
- The figures in `PriceAnatomy` and `VesselCompare` are illustrative defaults. Pass real rate-sheet data through their props before going live.
- The **LandingPage** card shows how they compose: a hero with the search bar, three ways to sail, the side-by-side comparison, the price explainer, cruise cards, the itinerary and the gallery.
