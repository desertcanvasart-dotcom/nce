"use client";

import { useSyncExternalStore } from "react";
import { Link } from "@/i18n/navigation";
import {
  readCompared,
  serverCompared,
  subscribeCompared,
  toggled,
  writeCompared,
  type Compared,
} from "@/lib/marketplace/compare-store";
import { COMPARE_MAX } from "@/lib/marketplace/listing";
import styles from "./marketplace.module.css";

export function useCompared() {
  return useSyncExternalStore(subscribeCompared, readCompared, serverCompared);
}

/**
 * EXP-004: the compare tray. It rises from the bottom when the first vessel is ticked, on every listing and vessel page,
 * and opens the side-by-side page with two or three. Kept on this device; nothing is sent anywhere.
 */
export function CompareTray({ note }: { note?: string }) {
  const list = useCompared();
  if (!list.length) return null;
  return (
    <aside className={styles.tray} aria-label="Compare">
      <ul className={styles.trayList}>
        {list.map((v) => (
          <li key={v.slug}>
            <span>{v.name}</span>
            <button
              type="button"
              className={styles.trayRemove}
              onClick={() => writeCompared(toggled(list, v, false).list)}
              aria-label={`Remove ${v.name} from the comparison`}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      <p className={styles.trayStatus} role="status" aria-live="polite">
        {note ??
          (list.length === 1
            ? "Add one more vessel to compare."
            : list.length >= COMPARE_MAX
              ? `That's ${COMPARE_MAX}, the most at once.`
              : "")}
      </p>
      {list.length >= 2 ? (
        <Link
          className={styles.compareLink}
          href={{ pathname: "/cruises/compare/", query: { v: list.map((v) => v.slug).join(",") } }}
        >
          Compare {list.length} vessels
        </Link>
      ) : null}
      <button type="button" className={styles.trayClear} onClick={() => writeCompared([])}>
        Clear
      </button>
    </aside>
  );
}

/** A vessel page's "Add to compare" (the same tray as the listings). */
export function AddToCompare({ vessel }: { vessel: Compared }) {
  const list = useCompared();
  const on = list.some((v) => v.slug === vessel.slug);
  const full = !on && list.length >= COMPARE_MAX;
  return (
    <button
      type="button"
      className={styles.secondary}
      aria-pressed={on}
      disabled={full}
      onClick={() => writeCompared(toggled(list, vessel, !on).list)}
      title={full ? `Compare up to ${COMPARE_MAX} vessels at a time` : undefined}
    >
      {on ? "In your comparison ✓" : "Add to compare"}
    </button>
  );
}
