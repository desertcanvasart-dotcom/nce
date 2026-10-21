"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { useHydrated } from "@/components/ds/lib/useHydrated";
import { DECK_STATE_TEXT, deckState, sharedText } from "@/lib/marketplace/deck-view";
import { deckGroups, type BookingMode, type VesselCabin } from "@/lib/marketplace/vessel";
import styles from "./DeckView.module.css";

const TONE = { instant: styles.instant, confirm: styles.confirm, sold_out: styles.soldOut };

const facts = (c: VesselCabin) =>
  [c.sizeM2 ? `${c.sizeM2} m²` : null, c.bed, `sleeps ${c.maxOccupancy}`, c.view, c.balcony ? "private balcony" : null]
    .filter(Boolean)
    .join(" · ");

/**
 * EXP-002, DASH-CUS-016, 017, DASH-BND-003: the vessel deck by deck, as a schematic. Choose a deck (arrow keys move
 * between decks), then a cabin type to see what it is like; on a chosen sailing each type shows how it books, and can
 * be chosen for the booking form beside it. Never numbered cabins. Without JavaScript: the plain list of decks.
 */
export function DeckView({
  cabins,
  maxGuests,
  sharedSpaces,
  modes,
  chooseInForm,
}: {
  cabins: VesselCabin[];
  maxGuests: number | null;
  sharedSpaces: string[];
  modes?: Record<string, BookingMode>;
  chooseInForm?: boolean;
}) {
  const groups = deckGroups(cabins);
  const js = useHydrated();
  const [deck, setDeck] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const shared = sharedText(maxGuests, sharedSpaces);
  const g = groups[deck]!;
  const cabin = g.cabins.find((c) => c.id === picked) ?? null;
  const state = (c: VesselCabin) => (modes?.[c.id] ? deckState(modes[c.id]!) : null);

  const go = (i: number) => {
    const next = (i + groups.length) % groups.length;
    setDeck(next);
    setPicked(null);
    tabs.current[next]?.focus();
  };
  const onKey = (e: KeyboardEvent) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (step) go(deck + step);
    else if (e.key === "Home") go(0);
    else if (e.key === "End") go(groups.length - 1);
    else return;
    e.preventDefault();
  };
  const choose = (id: string) => {
    const radio = document.querySelector<HTMLInputElement>(`input[name="cabin"][value="${CSS.escape(id)}"]`);
    if (!radio || radio.disabled) return;
    radio.checked = true;
    radio.focus();
  };

  return (
    <div className={styles.view}>
      <p className={styles.schematic}>
        Schematic: not a floor plan. It shows which deck each cabin type is on; your cabin number is assigned by the operator.
      </p>
      {shared ? <p>{shared}</p> : null}
      {!js ? (
        <ol className={styles.list}>
          {groups.map((d) => (
            <li key={d.deck}>
              <h3>{d.deck} deck</h3>
              <ul>
                {d.cabins.map((c) => (
                  <li key={c.id}>
                    <strong>{c.name}</strong> <span>{facts(c)}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      ) : (
        <>
          <svg viewBox={`0 0 400 ${groups.length * 28 + 24}`} className={styles.profile} aria-hidden="true">
            {groups.map((d, i) => {
              // Upper decks drawn narrower, as on a ship's profile.
              const inset = Math.min(60, (groups.length - 1 - i) * 24);
              const top = 6 + i * 28;
              return (
                <g key={d.deck}>
                  <rect
                    x={20 + inset}
                    y={top}
                    width={360 - 2 * inset}
                    height={24}
                    rx={4}
                    className={i === deck ? styles.deckOn : styles.deckBand}
                  />
                  <text x={200} y={top + 16} className={i === deck ? styles.deckLabelOn : styles.deckLabel}>
                    {d.deck}
                  </text>
                </g>
              );
            })}
            <path d={`M20 ${groups.length * 28 + 6}h360l-24 14h-312z`} className={styles.hull} />
          </svg>
          <div className={styles.tabs} role="tablist" aria-label="Decks">
            {groups.map((d, i) => (
              <button
                key={d.deck}
                ref={(el) => {
                  tabs.current[i] = el;
                }}
                type="button"
                role="tab"
                id={`deck-tab-${i}`}
                aria-selected={i === deck}
                aria-controls="deck-panel"
                tabIndex={i === deck ? 0 : -1}
                onClick={() => go(i)}
                onKeyDown={onKey}
              >
                {d.deck} deck
              </button>
            ))}
          </div>
          <div className={styles.panel} role="tabpanel" id="deck-panel" aria-labelledby={`deck-tab-${deck}`}>
            <ul className={styles.cabins}>
              {g.cabins.map((c) => {
                const s = state(c);
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      aria-pressed={c.id === picked}
                      className={s ? TONE[s] : undefined}
                      onClick={() => setPicked(c.id === picked ? null : c.id)}
                    >
                      <strong>{c.name}</strong>
                      {s ? <small>{DECK_STATE_TEXT[s]}</small> : null}
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className={styles.detail} aria-live="polite">
              {cabin ? (
                <>
                  <h3>{cabin.name}</h3>
                  <p>{facts(cabin)}</p>
                  {cabin.amenities.length ? <p className={styles.muted}>{cabin.amenities.join(", ")}</p> : null}
                  {state(cabin) ? <p>{DECK_STATE_TEXT[state(cabin)!]}.</p> : null}
                  {chooseInForm && state(cabin) !== "sold_out" ? (
                    <button type="button" className={styles.choose} onClick={() => choose(cabin.id)}>
                      Choose {cabin.name}
                    </button>
                  ) : null}
                </>
              ) : (
                <p className={styles.muted}>Choose a cabin type to see what it’s like.</p>
              )}
            </div>
          </div>
          {modes ? (
            <ul className={styles.legend}>
              {(["instant", "confirm", "sold_out"] as const).map((s) => (
                <li key={s}>
                  <span className={TONE[s]} /> {DECK_STATE_TEXT[s]}
                </li>
              ))}
            </ul>
          ) : null}
        </>
      )}
    </div>
  );
}
