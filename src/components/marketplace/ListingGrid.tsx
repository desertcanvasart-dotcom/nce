"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { CruiseCard } from "@/components/ds/CruiseCard/CruiseCard";
import { toggled, writeCompared } from "@/lib/marketplace/compare-store";
import { COMPARE_MAX, type GridCard } from "@/lib/marketplace/listing";
import { CompareTray, useCompared } from "./CompareTray";
import styles from "./marketplace.module.css";

/** The card grid with "Compare" ticks (DASH-PUB-004, EXP-004): ticks fill the compare tray, which opens the comparison. */
export function ListingGrid({ cards, why = {} }: { cards: GridCard[]; why?: Record<string, ReactNode> }) {
  const t = useTranslations("listing");
  const list = useCompared();
  const [full, setFull] = useState(false);
  const toggle = (card: GridCard, on: boolean) => {
    const next = toggled(list, { slug: card.slug, name: card.name }, on);
    setFull(next.full);
    if (!next.full) writeCompared(next.list);
  };
  return (
    <>
      <ul className={styles.grid} aria-label={t("cardsLabel")}>
        {cards.map((card) => {
          const { slug, ...rest } = card;
          return (
            <li key={slug}>
              <CruiseCard {...rest} compared={list.some((v) => v.slug === slug)} onCompare={(on) => toggle(card, on)} />
              {why[slug] ? <div className={styles.why}>{why[slug]}</div> : null}
            </li>
          );
        })}
      </ul>
      <CompareTray note={full ? t("trayFull", { max: COMPARE_MAX }) : undefined} />
    </>
  );
}
