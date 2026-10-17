"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Icon, type IconName } from "../Icon/Icon";
import { cx } from "../lib/cx";
import styles from "./AmenityGrid.module.css";

export type AmenityStatus = "included" | "request" | "none";
export type Amenity = { icon: IconName; label?: string; status?: AmenityStatus; /** One sentence of fact. */ note?: string };

export type AmenityGridProps = { items: Amenity[]; filters?: boolean; columns?: number };

const STATUS: Record<AmenityStatus, IconName> = { included: "check", request: "plus", none: "minus" };

/**
 * Icon tiles for a vessel's facilities, each Included, On request or Not aboard, with filter chips and a note shown
 * on hover or focus (COMP-AmenityGrid). Status is always a word plus an icon, never colour alone (BRAND-019, A11Y-008).
 * List what is missing too: "Pool · Not aboard" on a dahabiya teaches the trade-off.
 */
export function AmenityGrid({ items, filters = true, columns }: AmenityGridProps) {
  const t = useTranslations("ds");
  const [filter, setFilter] = useState<"all" | AmenityStatus>("all");
  const counts: Record<string, number> = { all: items.length };
  for (const it of items) counts[it.status ?? "included"] = (counts[it.status ?? "included"] ?? 0) + 1;
  const keys = (["all", "included", "request", "none"] as const).filter((k) => counts[k]);
  const shown = items.filter((it) => filter === "all" || (it.status ?? "included") === filter);

  return (
    <section className={styles.amen}>
      {filters ? (
        <div className={styles.chips} role="radiogroup" aria-label={t("amenityGrid.filter")}>
          {keys.map((k, i) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={filter === k}
              tabIndex={filter === k ? 0 : -1}
              className={styles.chip}
              onClick={() => setFilter(k)}
              onKeyDown={(ev) => {
                const dir =
                  ev.key === "ArrowRight" || ev.key === "ArrowDown" ? 1 : ev.key === "ArrowLeft" || ev.key === "ArrowUp" ? -1 : 0;
                if (!dir) return;
                ev.preventDefault();
                const ni = (i + dir + keys.length) % keys.length;
                setFilter(keys[ni]!);
                (ev.currentTarget.parentElement?.children[ni] as HTMLElement | undefined)?.focus();
              }}
            >
              {k === "all" ? t("amenityGrid.all") : t(`amenityGrid.${k}`)} · {counts[k]}
            </button>
          ))}
        </div>
      ) : null}
      <ul className={styles.grid} style={columns ? { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` } : undefined}>
        {shown.map((it) => {
          const status = it.status ?? "included";
          return (
            // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- tiles are focusable so keyboard users can reveal the note (A11Y-002)
            <li key={`${it.icon}-${it.label}`} className={cx(styles.tile, styles[status])} tabIndex={it.note ? 0 : undefined}>
              <span className={styles.ico}>
                <Icon name={it.icon} />
              </span>
              <b>{it.label ?? t(`amenities.${it.icon}`)}</b>
              <span className={styles.status}>
                <Icon name={STATUS[status]} />
                {t(`amenityGrid.${status}`)}
              </span>
              {it.note ? <span className={styles.note}>{it.note}</span> : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
