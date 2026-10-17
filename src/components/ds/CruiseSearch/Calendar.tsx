"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Icon } from "../Icon/Icon";
import { cx } from "../lib/cx";
import { formatDate } from "../lib/format";
import styles from "./CruiseSearch.module.css";

/** ISO date (yyyy-mm-dd) in UTC; departures are calendar dates. */
const iso = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

export type CalendarProps = {
  /** Real departure dates for the chosen route (ADR: no weekday guessing). Only these can be picked. */
  sailingDates: string[];
  value: string | null;
  onPick: (date: string) => void;
  /** Today in ISO form; injectable for tests. */
  today?: string;
};

export function Calendar({ sailingDates, value, onPick, today }: CalendarProps) {
  const t = useTranslations("ds.cruiseSearch");
  const locale = useLocale();
  const todayIso = today ?? new Date().toISOString().slice(0, 10);
  const firstSailing = sailingDates.filter((d) => d >= todayIso).sort()[0];
  const start = value ?? firstSailing ?? todayIso;
  const [month, setMonth] = useState(() => ({ y: Number(start.slice(0, 4)), m: Number(start.slice(5, 7)) - 1 }));
  const sailing = new Set(sailingDates);

  const firstWeekday = (new Date(Date.UTC(month.y, month.m, 1)).getUTCDay() + 6) % 7; // Monday first
  const days = new Date(Date.UTC(month.y, month.m + 1, 0)).getUTCDate();
  const thisMonth = { y: Number(todayIso.slice(0, 4)), m: Number(todayIso.slice(5, 7)) - 1 };
  const canPrev = month.y > thisMonth.y || (month.y === thisMonth.y && month.m > thisMonth.m);
  const shift = (delta: number) =>
    setMonth(({ y, m }) => ({ y: y + Math.floor((m + delta) / 12), m: (((m + delta) % 12) + 12) % 12 }));
  const monthLabel = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(month.y, month.m, 1)));
  const weekdayNames = Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(locale === "en" ? "en-GB" : locale, { weekday: "narrow", timeZone: "UTC" }).format(
      new Date(Date.UTC(2024, 0, 1 + i)),
    ),
  );

  return (
    <div className={styles.cal}>
      <div className={styles.calHead}>
        <button
          type="button"
          className={styles.iconBtn}
          disabled={!canPrev}
          aria-label={t("prevMonth")}
          onClick={() => shift(-1)}
        >
          <Icon name="chevron-left" />
        </button>
        <b aria-live="polite">{monthLabel}</b>
        <button type="button" className={styles.iconBtn} aria-label={t("nextMonth")} onClick={() => shift(1)}>
          <Icon name="chevron-right" />
        </button>
      </div>
      <div className={styles.calGrid}>
        {weekdayNames.map((w, i) => (
          <span key={`h${i}`} className={styles.dow} aria-hidden="true">
            {w}
          </span>
        ))}
        {Array.from({ length: firstWeekday }, (_, i) => (
          <span key={`b${i}`} />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const date = iso(month.y, month.m, i + 1);
          const isSailing = sailing.has(date) && date >= todayIso;
          return (
            <button
              key={date}
              type="button"
              className={cx(styles.day, isSailing && styles.sail)}
              disabled={!isSailing}
              aria-pressed={value === date}
              aria-label={`${formatDate(date, locale)}${isSailing ? t("sailingDay") : ""}`}
              onClick={() => onPick(date)}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
      <div className={styles.calFoot}>
        <i />
        {t("departureDays")}
      </div>
    </div>
  );
}
