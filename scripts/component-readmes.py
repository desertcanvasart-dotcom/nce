"""Writes src/components/ds/<Name>/README.md: the design system's guideline verbatim + the build's changes.
The changes come from one table (CHANGES) so READMEs and docs/DS-DIFFS.md stay consistent. Run: python3 -I scripts/component-readmes.py"""
import pathlib
root = pathlib.Path(__file__).resolve().parent.parent
CHANGES = {
 "Icon": ["Shapes generated from the bundle's ICONS table (`icons.ts`); names identical to index.d.ts (47).", "`filled` prop replaces the bundle's internal `is-filled` class (Rating stars)."],
 "Button": ["Internal `href`s are locale-aware links (next-intl).", "Labels may wrap and height is a minimum (44/36/56 px): Spanish runs ~30% longer and buttons are never fixed-width (I18N-007)."],
 "Badge": ["No change in behaviour."],
 "Rating": ["`count` is required: stars appear only with the verified reviews behind them (ADR-009)."],
 "Stepper": ["`label` is required (it names the buttons for screen readers); labels are translated."],
 "TextField": ["`<label for>` instead of a wrapping label, plus `name`, `required`, `autoComplete` for real forms.", "The global focus ring is kept alongside the brass bar (A11Y-003)."],
 "NavBar": ["Takes real links (`{label, href}`) and a CTA; the current section comes from the URL.", "Day/Night control beside the language switch; phone menu is a `<details>` element (works without JS) and includes the language switch (ADR-037).", "Wordmark reads Nilecruz (ADR-022)."],
 "Hero": ["Photos load with `next/image` and priority (LCP).", "On screens under 720 px the scrim extends behind the copy, because the scene crops so the boat sits behind the text (BRAND-020)."],
 "SectionHeading": ["No change in behaviour."],
 "Scene": ["No felucca (ADR-008).", "Server-rendered SVG; pointer parallax is a small client wrapper, off under reduced motion (A11Y-004)."],
 "VesselArt": ["No felucca variant (ADR-008, BRAND-027).", "`decorative` hides it from screen readers when text beside it names the vessel."],
 "CruiseCard": ["`price` is `{amount (minor units), currency}` and optional: without it the card says 'Prices in preparation' (ADR-019, ADR-025).", "Shows the Nilecruz evaluation 'NN/100'; stars only for verified reviews (ADR-009).", "The title links to the vessel page and the whole card is clickable; save and compare keep local state until saved cruises and the compare tray exist."],
 "ExperienceCard": ["The placeholder scene has no boat by default (the felucca default is removed, ADR-008)."],
 "ItineraryTimeline": ["Each stop is a tab with Arrow, Home and End keys (A11Y-009); without JavaScript every day is listed."],
 "Gallery": ["3D tilt and smooth scrolling stop under reduced motion (A11Y-004); frames are labelled slides."],
 "CruiseSearch": ["Routes carry real departure dates (no weekday guessing) and only those can be picked.", "Each child's age is asked for and required (ADR-012/018); submits as a GET form, so it works without JavaScript.", "No invented match count: the caller passes `matchCount` when it knows it.", "One column under 480 px so values are not cut off."],
 "CabinPicker": ["Size is a number in m²; decks are the vessel's own names (Lower/Middle/Upper or vessel-specific).", "`showPrices={false}` for signed-out visitors: facts without prices (ADR-025)."],
 "BookingSummary": ["Rebuilt around data (ADR-007): lines and total from the caller; gratuity shown separately as paid on board at check-out, never in the total (ADR-010/017); extras listed separately, never in the total (ADR-011); the policy note comes from the departure's real deadline and cancellation rules.", "No built-in fees, flights, gratuity toggle or 'free cancellation' claim."],
 "VesselTypeCard": ["All text and facts are props (from content), with a Sample data flag when illustrative."],
 "VesselCompare": ["Profiles are data props (from content), not built in; meters are named and announced; Sample data flag when illustrative."],
 "PriceAnatomy": ["Factors, presets, labels and footnote are props; amounts in minor units.", "Prices use lining figures (BRAND-024); radio-group keyboard (A11Y-009); Sample data flag when illustrative."],
 "AmenityGrid": ["Filter chips are a radio group with arrow keys; tiles with a note are focusable to reveal it (A11Y-002)."],
}
done = []
for name, notes in CHANGES.items():
    src = root / f"vendor/design-system/components/{name}/README.md"
    guide = src.read_text().strip() if src.exists() else "(The design system ships no README for this component.)"
    text = f"# {name}\n\n## Design-system guideline\n\n_Carried over verbatim from `vendor/design-system/components/{name}/README.md`._\n\n{guide}\n\n## Changes in the build\n\n" + "\n".join(f"- {n}" for n in notes) + "\n\nStates: see `/dev/components/` and `" + name + ".stories.tsx`. Differences are measured by the visual-parity test (`tests/e2e/parity.spec.ts`).\n"
    (root / f"src/components/ds/{name}/README.md").write_text(text)
    done.append(name)
(root / "src/components/ds/StateView/README.md").write_text("# StateView\n\nNot a design-system component: the shared loading, empty, error and permission-denied view for every data view (DATA-010), in the brand voice, built from design-system tokens and the Icon set.\n\nProvide `state` and optionally `title`, `body` and `action` (a retry button or sign-in link).\n")
print(len(done), "component READMEs written")
