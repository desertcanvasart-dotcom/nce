"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Media } from "@/components/ds/Media/Media";
import { decksOf, type DeckLayout } from "@/lib/marketplace/deck-layout";
import { UNKNOWN_DECK, verifiedCabin, type VesselCabin, type VesselPage } from "@/lib/marketplace/vessel";
import { DeckLayoutView, drawnCabins, toneClass } from "./DeckLayoutView";
import { DeckView } from "./DeckView";
import layoutStyles from "./DeckLayoutView.module.css";
import styles from "./VesselPage.module.css";

/**
 * Cabins and decks: a card per cabin type with its confirmed facts and photos only, above Nilecruz's deck plan.
 * Choosing a card (a button: mouse, touch or keyboard) lights its cabins up on the plan, and tapping a cabin on the
 * plan chooses its card. Without a drawn plan the cards come before the deck-by-deck schematic.
 */
export function CabinsAndDecks({
  cabins,
  layout,
  original,
  maxGuests,
  sharedSpaces,
}: {
  cabins: VesselCabin[];
  layout: DeckLayout | null;
  original: NonNullable<VesselPage["deckPlan"]>["original"];
  maxGuests: number | null;
  sharedSpaces: string[];
}) {
  const t = useTranslations("vesselPage");
  const locale = useLocale();
  const [picked, setPicked] = useState<string | null>(null);
  const tag = locale === "en" ? "en-GB" : locale;
  const list = (xs: string[]) => new Intl.ListFormat(tag, { type: "conjunction" }).format(xs);
  const drawn = layout ? drawnCabins(layout, cabins) : [];
  const onPlan = (c: VesselCabin) => !!c.code && drawn.some((d) => d.code === c.code);
  // No deck schematic when the operator hasn't said which deck any cabin is on: nothing is drawn from guesses.
  const decksKnown = cabins.some((c) => c.deck !== UNKNOWN_DECK);

  return (
    <>
      {cabins.length ? (
        <ul className={`${styles.cabins} ${layoutStyles.palette}`} aria-label={t("cabins.types")}>
          {cabins.map((raw) => {
            const c = verifiedCabin(raw);
            const decks = layout && c.code && decksOf(layout, c.code).length ? decksOf(layout, c.code) : null;
            const facts = [
              c.count ? t("cabins.count", { n: c.count }) : null,
              c.sizeM2 ? t(c.sizeIncludesBathroom ? "cabins.sizeWithBath" : "cabins.size", { n: c.sizeM2 }) : null,
              c.bed,
              c.maxGuests ? t("cabins.sleeps", { n: c.maxGuests }) : null,
              c.view,
              c.balcony ? t("cabins.balcony") : null,
              decks ? t("cabins.decks", { n: decks.length, list: list(decks) }) : null,
            ].filter((x): x is string => !!x);
            const on = !!c.code && picked === c.code;
            return (
              <li key={c.id} className={on ? styles.cabinOn : undefined}>
                {c.photos?.length ? (
                  <div className={styles.cabinPhotos} data-count={Math.min(c.photos.length, 2)}>
                    {c.photos.slice(0, 2).map((p) => (
                      <Media key={p.src} image={p} sizes="(min-width: 900px) 25vw, 50vw" className={styles.cabinPhoto} />
                    ))}
                  </div>
                ) : null}
                <h3>
                  {onPlan(c) ? (
                    <span className={`${layoutStyles.swatch} ${toneClass(drawn, c.code!)}`} aria-hidden="true" />
                  ) : null}
                  {c.name}
                </h3>
                {facts.length ? (
                  <ul className={styles.cabinFacts}>
                    {facts.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                ) : null}
                {c.description ? <p className={styles.cabinNote}>{c.description}</p> : null}
                {onPlan(c) ? (
                  <button
                    type="button"
                    className={styles.showOnPlan}
                    aria-pressed={on}
                    onClick={() => setPicked(on ? null : c.code!)}
                  >
                    {on ? t("cabins.shown") : t("cabins.show")}
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
      {layout ? (
        <DeckLayoutView
          layout={layout}
          original={original}
          cabins={cabins}
          maxGuests={maxGuests}
          sharedSpaces={sharedSpaces}
          picked={picked}
          onPick={setPicked}
        />
      ) : (
        <>
          {/* No drawn plan yet: the decks as a schematic, the operator's own plan to download when there is one. */}
          {cabins.length && decksKnown ? (
            <DeckView cabins={cabins.map(verifiedCabin)} maxGuests={maxGuests} sharedSpaces={sharedSpaces} />
          ) : null}
          {original ? (
            <p>
              <a href={original.url} download={original.name}>
                {t("deck.download")}
              </a>
            </p>
          ) : null}
        </>
      )}
    </>
  );
}
