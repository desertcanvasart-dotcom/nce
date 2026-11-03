"use client";

import { useId, useState } from "react";
import {
  areaBox,
  areaLabel,
  cabinShare,
  DECK_W,
  deckSummary,
  decksOf,
  hullPath,
  toneOf,
  type DeckArea,
  type DeckLayout,
} from "@/lib/marketplace/deck-layout";
import { sharedText } from "@/lib/marketplace/deck-view";
import type { VesselCabin, VesselPage } from "@/lib/marketplace/vessel";
import { cabinFacts } from "./DeckView";
import styles from "./DeckLayoutView.module.css";

const list = (xs: string[]) => (xs.length < 2 ? (xs[0] ?? "") : `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}`);
const size = (bytes: number | null) =>
  bytes === null
    ? ""
    : bytes < 1_000_000
      ? `${Math.max(1, Math.round(bytes / 1000))} KB`
      : `${(bytes / 1_000_000).toFixed(1)} MB`;
const kind = (name: string) => name.split(".").pop()?.toUpperCase() ?? "file";
// A label goes inside an area only when it fits (about 10 units a letter); every area is named under its deck anyway.
const fits = (text: string, width: number) => text.length * 10 + 24 <= width;
const decksText = (names: string[], word = "Deck") => `${word}${names.length > 1 ? "s" : ""} ${list(names)}`;

/**
 * EXP-002 (9-2b): the vessel deck by deck, redrawn by Nilecruz from the operator's plan, in the site's own colours.
 * Choosing a cabin type lights it up on every deck. Never numbered cabins (DASH-BND-003). Without JavaScript the drawing,
 * the words under each deck and the download still show; only the highlighting needs it.
 */
export function DeckLayoutView({
  layout,
  original,
  cabins,
  maxGuests,
  sharedSpaces,
}: {
  layout: DeckLayout;
  original: NonNullable<VesselPage["deckPlan"]>["original"];
  cabins: VesselCabin[];
  maxGuests: number | null;
  sharedSpaces: string[];
}) {
  const uid = useId();
  const [picked, setPicked] = useState<string | null>(null);
  // Biggest first: the type covering most of the plan gets the lightest shade, so the words drawn on it stay readable.
  const drawn = cabins
    .filter((c) => c.code && decksOf(layout, c.code).length)
    .sort((a, b) => cabinShare(layout, b.code!) - cabinShare(layout, a.code!));
  const tone = (code: string) =>
    Math.min(
      drawn.findIndex((c) => c.code === code),
      4,
    );
  const name = (code: string) => cabins.find((c) => c.code === code)?.name;
  const cabin = drawn.find((c) => c.code === picked) ?? null;
  const shared = sharedText(maxGuests, sharedSpaces);
  const credit = original?.credit;

  const fillOf = (a: DeckArea, hatch: string) => (toneOf(a) === "crew" ? `url(#${hatch})` : undefined);
  const classOf = (a: DeckArea) => {
    const t = toneOf(a);
    if (t !== "cabin") return styles[t];
    const base = `${styles.cabin} ${styles[`c${tone(a.cabin!)}`]}`;
    if (!picked) return base;
    return a.cabin === picked ? `${base} ${styles.on}` : `${base} ${styles.dim}`;
  };

  return (
    <div className={styles.view}>
      <p className={styles.note}>
        Drawn by Nilecruz from {credit ? `${credit}’s` : "the operator’s"} deck plan. It shows where each cabin type and shared
        space is; your cabin number is assigned by the operator.
      </p>
      {shared ? <p>{shared}</p> : null}

      {drawn.length ? (
        <ul className={styles.types} aria-label="Cabin types">
          {drawn.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                aria-pressed={c.code === picked}
                onClick={() => setPicked(c.code === picked ? null : c.code!)}
              >
                <span className={`${styles.swatch} ${styles[`c${tone(c.code!)}`]}`} aria-hidden="true" />
                <strong>{c.name}</strong>
                <small>{decksText(decksOf(layout, c.code!))}</small>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className={styles.detail} aria-live="polite">
        {cabin ? (
          <>
            <h3>{cabin.name}</h3>
            <p>{cabinFacts(cabin)}</p>
            {cabin.amenities.length ? <p className={styles.muted}>{cabin.amenities.join(", ")}</p> : null}
            <p className={styles.muted}>Highlighted on {decksText(decksOf(layout, cabin.code!), "deck")}.</p>
          </>
        ) : (
          <p className={styles.muted}>Choose a cabin type to see where it is on board.</p>
        )}
      </div>

      <ol className={styles.decks}>
        {layout.decks.map((d, i) => {
          const words = deckSummary(d, name);
          const clip = `${uid}-clip-${i}`;
          const hatch = `${uid}-hatch-${i}`;
          return (
            <li key={d.name}>
              <h3>Deck {d.name}</h3>
              <svg viewBox={`0 0 ${DECK_W} 100`} className={styles.deck} role="img" aria-label={`Deck ${d.name}: ${list(words)}`}>
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
                      <rect key={j} x={b.x} y={b.y} width={b.w} height={b.h} className={classOf(a)} fill={fillOf(a, hatch)} />
                    );
                  })}
                </g>
                <path d={hullPath(d.length, d.bow)} className={styles.outline} />
                {d.areas.map((a, j) => {
                  const b = areaBox(a);
                  const text = areaLabel(a, name);
                  if (!fits(text, b.w) || (toneOf(a) === "crew" && !a.label)) return null;
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

      <ul className={styles.legend} aria-label="Key">
        <li>
          <span className={`${styles.cabin} ${styles.c0}`} /> Cabins
        </li>
        <li>
          <span className={styles.room} /> Shared rooms
        </li>
        <li>
          <span className={styles.outdoor} /> Open deck
        </li>
        <li>
          <span className={styles.water} /> Pool
        </li>
        <li>
          <span className={styles.crewKey} /> Crew only
        </li>
      </ul>
      <p className={styles.muted}>Stern on the left, bow on the right. Not to scale.</p>

      {original ? (
        <p className={styles.download}>
          <a href={original.url} download={original.name}>
            Download the official deck plan
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
