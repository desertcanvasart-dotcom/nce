"use client";

import { useId, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  areaBox,
  cabinShare,
  DECK_W,
  decksOf,
  hullPath,
  toneOf,
  type DeckArea,
  type DeckLayout,
} from "@/lib/marketplace/deck-layout";
import type { VesselCabin, VesselPage } from "@/lib/marketplace/vessel";
import styles from "./DeckLayoutView.module.css";

const size = (bytes: number | null) =>
  bytes === null
    ? ""
    : bytes < 1_000_000
      ? `${Math.max(1, Math.round(bytes / 1000))} KB`
      : `${(bytes / 1_000_000).toFixed(1)} MB`;
const kind = (name: string) => name.split(".").pop()?.toUpperCase() ?? "file";
// A label goes inside an area only when it fits (about 10 units a letter, 19 for a Japanese character).
const fits = (text: string, width: number) => [...text].reduce((n, c) => n + (/[　-鿿＀-￯]/.test(c) ? 19 : 10), 0) + 24 <= width;

/** The cabin types the drawing shows, biggest share first: the first gets the lightest shade, so words on it stay readable. */
export function drawnCabins(layout: DeckLayout, cabins: VesselCabin[]): VesselCabin[] {
  return cabins
    .filter((c) => c.code && decksOf(layout, c.code).length)
    .sort((a, b) => cabinShare(layout, b.code!) - cabinShare(layout, a.code!));
}
/** The shade a cabin type is drawn in, for its swatch elsewhere. */
export const toneClass = (drawn: VesselCabin[], code: string) =>
  styles[
    `c${Math.min(
      drawn.findIndex((c) => c.code === code),
      4,
    )}`
  ];

/**
 * EXP-002 (9-2b): the vessel deck by deck, redrawn by Nilecruz from the operator's plan, in the site's own colours.
 * Choosing a cabin type lights it up on every deck. Every block names itself: inside the drawing where it fits, and in a
 * tooltip and the caption above the decks when pointed at or tapped; the line under each deck names everything on it.
 * Never numbered cabins (DASH-BND-003). Without JavaScript the drawing, the words and the download still show.
 */
export function DeckLayoutView({
  layout,
  original,
  cabins,
  maxGuests,
  sharedSpaces,
  picked: chosen,
  onPick,
}: {
  layout: DeckLayout;
  original: NonNullable<VesselPage["deckPlan"]>["original"];
  cabins: VesselCabin[];
  maxGuests: number | null;
  sharedSpaces: string[];
  /** When the cabin types are chosen outside (the cabin cards): the chosen type's code, and how to change it. */
  picked?: string | null;
  onPick?: (code: string | null) => void;
}) {
  const t = useTranslations("vesselPage");
  const locale = useLocale();
  const uid = useId();
  const [own, setOwn] = useState<string | null>(null);
  // The block tapped last, and the cabin type chosen when it was: a newer choice of type replaces it in the caption.
  const [tapped, setTapped] = useState<{ deck: string; area: string; with: string | null } | null>(null);
  const controlled = onPick !== undefined;
  const picked = controlled ? (chosen ?? null) : own;
  const pick = controlled ? onPick : setOwn;
  const drawn = drawnCabins(layout, cabins);
  const name = (code: string) => cabins.find((c) => c.code === code)?.name;
  const labelOf = (a: DeckArea) => {
    if (a.label) return t.has(`deckLabels.${a.label}`) ? t(`deckLabels.${a.label}`) : a.label;
    return a.cabin ? (name(a.cabin) ?? a.cabin) : t(`spaces.${a.space!}`);
  };
  const tag = locale === "en" ? "en-GB" : locale;
  const list = (xs: string[]) => new Intl.ListFormat(tag, { type: "conjunction" }).format(xs);
  const lower = (s: string) => (locale === "ja" ? s : s.toLocaleLowerCase(tag));
  const names = sharedSpaces.map((s) => lower(t.has(`spaces.${s}`) ? t(`spaces.${s}`) : s));
  const shared = !maxGuests
    ? names.length
      ? t("deck.shared", { list: list(names) })
      : null
    : names.length
      ? t("deck.sharedGuests", { n: maxGuests, list: list(names) })
      : t("deck.sharedGuestsOnly", { n: maxGuests });
  const credit = original?.credit;
  const decksText = (code: string) => {
    const ds = decksOf(layout, code);
    return t("cabins.decks", { n: ds.length, list: list(ds) });
  };
  const summary = (deck: DeckLayout["decks"][number]) => [
    ...new Set([...deck.areas].sort((x, y) => x.from - y.from).map(labelOf)),
  ];

  const fillOf = (a: DeckArea, hatch: string) => (toneOf(a) === "crew" ? `url(#${hatch})` : undefined);
  const classOf = (a: DeckArea) => {
    const tone = toneOf(a);
    if (tone !== "cabin") return styles[tone];
    const base = `${styles.cabin} ${toneClass(drawn, a.cabin!)} ${styles.pickable}`;
    if (!picked) return base;
    return a.cabin === picked ? `${base} ${styles.on}` : `${base} ${styles.dim}`;
  };
  const tap = (deck: string, a: DeckArea) => {
    setTapped({ deck: t("deck.deck", { name: deck }), area: labelOf(a), with: picked });
    if (a.cabin && drawn.some((c) => c.code === a.cabin)) pick(a.cabin === picked ? null : a.cabin);
  };

  return (
    <div className={styles.view}>
      <p className={styles.note}>{credit ? t("deck.drawn", { credit }) : t("deck.drawnOperator")}</p>
      {shared ? <p>{shared}</p> : null}

      {!controlled && drawn.length ? (
        <ul className={styles.types} aria-label={t("cabins.types")}>
          {drawn.map((c) => (
            <li key={c.id}>
              <button type="button" aria-pressed={c.code === picked} onClick={() => pick(c.code === picked ? null : c.code!)}>
                <span className={`${styles.swatch} ${toneClass(drawn, c.code!)}`} aria-hidden="true" />
                <strong>{c.name}</strong>
                <small>{decksText(c.code!)}</small>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <p className={styles.detail} aria-live="polite">
        {tapped && tapped.with === picked && !(picked && tapped.area === name(picked)) ? (
          t("deck.tapped", { deck: tapped.deck, area: tapped.area })
        ) : picked && name(picked) ? (
          <>
            <strong>{name(picked)}</strong> · {t("deck.highlighted", { decks: decksText(picked) })}
          </>
        ) : (
          <span className={styles.muted}>{drawn.length ? t("deck.choose") : t("deck.tapHint")}</span>
        )}
      </p>

      <ol className={styles.decks}>
        {layout.decks.map((d, i) => {
          const words = summary(d);
          const clip = `${uid}-clip-${i}`;
          const hatch = `${uid}-hatch-${i}`;
          return (
            <li key={d.name}>
              <h3>{t("deck.deck", { name: d.name })}</h3>
              <svg
                viewBox={`0 0 ${DECK_W} 100`}
                className={styles.deck}
                role="img"
                aria-label={t("deck.deckLabel", { name: d.name, list: list(words) })}
              >
                <defs>
                  <clipPath id={clip}>
                    <path d={hullPath(d.length, d.bow)} />
                  </clipPath>
                  <pattern id={hatch} width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                    <rect width="10" height="10" className={styles.crewBase} />
                    <line x1="0" y1="0" x2="0" y2="10" className={styles.hatch} />
                  </pattern>
                </defs>
                <path d={hullPath(d.length, d.bow)} className={styles.hull} />
                <g clipPath={`url(#${clip})`}>
                  {d.areas.map((a, j) => {
                    const b = areaBox(a);
                    return (
                      <rect
                        key={j}
                        x={b.x}
                        y={b.y}
                        width={b.w}
                        height={b.h}
                        className={classOf(a)}
                        fill={fillOf(a, hatch)}
                        onClick={() => tap(d.name, a)}
                      >
                        <title>{labelOf(a)}</title>
                      </rect>
                    );
                  })}
                </g>
                <path d={hullPath(d.length, d.bow)} className={styles.outline} />
                {d.areas.map((a, j) => {
                  const b = areaBox(a);
                  const text = labelOf(a);
                  if (!fits(text, b.w)) return null;
                  return (
                    <text key={j} x={b.x + b.w / 2} y={b.y + b.h / 2} className={styles.label}>
                      {text}
                    </text>
                  );
                })}
              </svg>
              <p className={styles.contains}>{words.join(" · ")}</p>
            </li>
          );
        })}
      </ol>

      <ul className={styles.legend} aria-label={t("deck.key")}>
        <li>
          <span className={`${styles.cabin} ${styles.c0}`} /> {t("deck.keyCabins")}
        </li>
        <li>
          <span className={styles.room} /> {t("deck.keyRooms")}
        </li>
        <li>
          <span className={styles.outdoor} /> {t("deck.keyOpen")}
        </li>
        <li>
          <span className={styles.water} /> {t("deck.keyPool")}
        </li>
        <li>
          <span className={styles.crewKey} /> {t("deck.keyCrew")}
        </li>
      </ul>
      <p className={styles.muted}>
        {t("deck.orientation")} {t("deck.tapHint")}
      </p>

      {original ? (
        <p className={styles.download}>
          <a href={original.url} download={original.name}>
            {t("deck.download")}
          </a>{" "}
          <span className={styles.muted}>
            ({[kind(original.name), size(original.bytes)].filter(Boolean).join(", ")}
            {credit ? ` · ${credit}` : ""})
          </span>
        </p>
      ) : null}
    </div>
  );
}
