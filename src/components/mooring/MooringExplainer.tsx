"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { useHydrated } from "@/components/ds/lib/useHydrated";
import { MOORING_TEXT, type Mooring } from "@/lib/catalogue/mooring";
import styles from "./MooringExplainer.module.css";

type State = "rafted" | "private_bank";
const STATES: { key: State; label: string; caption: string }[] = [
  {
    key: "rafted",
    label: "Rafted, six abreast",
    caption:
      "Seen from above: at busy stops ships tie up side by side. Only the first touches the bank; your window may face the next ship, and you cross other ships’ lobbies to go ashore.",
  },
  {
    key: "private_bank",
    label: "A private riverbank",
    caption: "Seen from above: the vessel ties up alone at its own bank. Your window faces open river or palms.",
  },
];

/** A hull seen from above, bow to the right. */
const hull = (y: number) => `M60 ${y}h300q46 0 60 13q-14 13-60 13h-300q-8 0-8-6v-14q0-6 8-6z`;

function Drawing({ state }: { state: State }) {
  const rafted = state === "rafted";
  const ships = rafted ? 6 : 1;
  return (
    <svg viewBox="0 0 480 262" aria-hidden="true" className={styles.drawing}>
      <rect x="0" y="0" width="480" height="262" className={styles.water} />
      <rect x="0" y="0" width="480" height="34" className={styles.bank} />
      {!rafted
        ? [130, 200, 270, 340, 410].map((x) => (
            <g key={x} className={styles.palm}>
              <circle cx={x} cy="14" r="9" />
              <circle cx={x + 10} cy="18" r="7" />
            </g>
          ))
        : null}
      {Array.from({ length: ships }, (_, i) => (
        <path key={i} d={hull(40 + i * 32)} className={!rafted || i === 2 ? styles.yours : styles.ship} />
      ))}
      <text x="12" y="22" className={styles.label}>
        Riverbank
      </text>
      {rafted ? (
        <>
          <text x="236" y="121" className={styles.labelOn}>
            Your ship
          </text>
          <text x="468" y="252" className={styles.labelEnd}>
            Your window faces the next ship
          </text>
        </>
      ) : (
        <>
          <text x="236" y="57" className={styles.labelOn}>
            Your ship
          </text>
          <text x="300" y="150" className={styles.label}>
            Open river on the other side
          </text>
        </>
      )}
    </svg>
  );
}

/**
 * EXP-005: rafted six abreast versus a private riverbank, the one mooring fact travellers most often miss. A two-state
 * toggle (arrow keys switch); without JavaScript both drawings show, one after the other. On a vessel page it opens on
 * that vessel's practice and says it in words.
 */
export function MooringExplainer({ practice }: { practice?: Mooring | null }) {
  const [state, setState] = useState<State>(practice === "rafted" || practice === "varies" ? "rafted" : "private_bank");
  const js = useHydrated();
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: KeyboardEvent) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
    e.preventDefault();
    const next = state === "rafted" ? 1 : 0;
    setState(STATES[next]!.key);
    buttons.current[next]?.focus();
  };
  return (
    <div className={styles.explainer} data-js={js ? "" : undefined}>
      {practice ? <p>{MOORING_TEXT[practice]}</p> : null}
      {js ? (
        <div className={styles.toggle} role="group" aria-label="Where the ship moors">
          {STATES.map((s, i) => (
            <button
              key={s.key}
              ref={(el) => {
                buttons.current[i] = el;
              }}
              type="button"
              aria-pressed={state === s.key}
              tabIndex={state === s.key ? 0 : -1}
              onClick={() => setState(s.key)}
              onKeyDown={onKey}
            >
              {s.label}
            </button>
          ))}
        </div>
      ) : null}
      {STATES.map((s) =>
        !js || state === s.key ? (
          <figure key={s.key} className={styles.figure}>
            <Drawing state={s.key} />
            <figcaption>
              {js ? null : <strong>{s.label}. </strong>}
              {s.caption}
            </figcaption>
          </figure>
        ) : null,
      )}
    </div>
  );
}
