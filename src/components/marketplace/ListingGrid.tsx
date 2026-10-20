"use client";

import { useState } from "react";
import { CruiseCard } from "@/components/ds/CruiseCard/CruiseCard";
import { Link } from "@/i18n/navigation";
import { COMPARE_MAX, type GridCard } from "@/lib/marketplace/listing";
import styles from "./marketplace.module.css";

/** The card grid with "Compare" ticks (DASH-PUB-004): two or three ticked vessels open the comparison page. */
export function ListingGrid({ cards }: { cards: GridCard[] }) {
  const [picked, setPicked] = useState<string[]>([]);
  const [full, setFull] = useState(false);
  const toggle = (slug: string, on: boolean) => {
    const over = on && !picked.includes(slug) && picked.length >= COMPARE_MAX;
    setFull(over);
    if (over) return;
    setPicked(on ? [...picked.filter((s) => s !== slug), slug] : picked.filter((s) => s !== slug));
  };
  return (
    <>
      <ul className={styles.grid} aria-label="Cruises">
        {cards.map(({ slug, ...card }) => (
          <li key={slug}>
            <CruiseCard {...card} compared={picked.includes(slug)} onCompare={(on) => toggle(slug, on)} />
          </li>
        ))}
      </ul>
      <div className={styles.compareBar} role="status" aria-live="polite">
        {full ? <span>Compare up to {COMPARE_MAX} vessels at a time.</span> : null}
        {picked.length >= 2 ? (
          <Link className={styles.compareLink} href={{ pathname: "/cruises/compare/", query: { v: picked.join(",") } }}>
            Compare {picked.length} vessels
          </Link>
        ) : picked.length === 1 ? (
          <span>Tick one more vessel to compare.</span>
        ) : null}
      </div>
    </>
  );
}
