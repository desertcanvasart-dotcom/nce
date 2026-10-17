"use client";

import type { ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Badge } from "../Badge/Badge";
import { Button } from "../Button/Button";
import { Icon } from "../Icon/Icon";
import { formatDate, formatMoney, formatNights } from "../lib/format";
import type { Money } from "../lib/types";
import { useCountUp } from "../lib/useCountUp";
import styles from "./BookingSummary.module.css";

export type SummaryLine = { label: string; amount: Money };

export type BookingSummaryProps = {
  vesselName: string;
  cabinName: string;
  /** yyyy-mm-dd */
  departure: string;
  nights: number;
  /** Lines that make up the total (fare per guest group, from the rate and child-price rules). */
  lines: SummaryLine[];
  total: Money;
  /** Optional guest controls, for example a Stepper, supplied by the caller who recomputes lines and total. */
  guests?: ReactNode;
  /** Obligatory crew gratuity, paid on board at check-out, never part of the total (ADR-010, ADR-017). */
  gratuity?: { perPersonPerNight: Money; payingGuests: number; nights: number };
  /** Extras sold separately (tours, transfers, flights), shown outside the total (ADR-011). */
  extras?: { label: string; price?: Money; href: string }[];
  /** Real payment-deadline and cancellation text for this departure (ADR-007, ADR-027). */
  policyNote?: ReactNode;
  requestLabel?: string;
  /** Where "Request to book" goes; or onRequest for client parents. */
  requestHref?: string;
  onRequest?: () => void;
};

/**
 * Booking panel (COMP-BookingSummary), rebuilt around real data (ADR-007): every line that changes the total is visible,
 * nothing is added later, the gratuity is shown separately as paid on board, and extras are sold separately.
 */
export function BookingSummary(p: BookingSummaryProps) {
  const t = useTranslations("ds.bookingSummary");
  const locale = useLocale();
  const shown = useCountUp(p.total.amount);
  const g = p.gratuity;
  const gratuityTotal = g
    ? { amount: g.perPersonPerNight.amount * g.payingGuests * g.nights, currency: g.perPersonPerNight.currency }
    : null;

  return (
    <aside className={styles.book} aria-label={t("label")}>
      <div className={styles.head}>
        <div>
          <p className={styles.eyebrow}>{p.vesselName}</p>
          <div className={styles.cabin}>{p.cabinName}</div>
          <p className={styles.departs}>{t("departs", { date: formatDate(p.departure, locale) })}</p>
        </div>
        <Badge tone="accent">{formatNights(p.nights, locale)}</Badge>
      </div>
      {p.guests}
      <div className={styles.rows}>
        {p.lines.map((l) => (
          <div className={styles.row} key={l.label}>
            <span>{l.label}</span>
            <span>{formatMoney(l.amount, locale)}</span>
          </div>
        ))}
      </div>
      <div className={styles.total}>
        <span>{t("total")}</span>
        <b aria-live="polite">{formatMoney({ amount: Math.round(shown), currency: p.total.currency }, locale)}</b>
      </div>
      {g && gratuityTotal ? (
        <div className={styles.aside}>
          <div className={styles.row}>
            <span>
              {t("gratuity")}
              <small>
                {t("gratuityDetail", {
                  rate: formatMoney(g.perPersonPerNight, locale),
                  guests: g.payingGuests,
                  nights: g.nights,
                })}
              </small>
            </span>
            <span>{formatMoney(gratuityTotal, locale)}</span>
          </div>
        </div>
      ) : null}
      {p.extras?.length ? (
        <div className={styles.aside}>
          <p className={styles.asideTitle}>{t("extrasTitle")}</p>
          <ul className={styles.extras}>
            {p.extras.map((x) => (
              <li key={x.href}>
                <a href={x.href}>{x.label}</a>
                {x.price ? <span>{t("from", { price: formatMoney(x.price, locale) })}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {p.requestHref ? (
        <Button variant="primary" size="lg" block icon="arrow-right" href={p.requestHref}>
          {p.requestLabel ?? t("request")}
        </Button>
      ) : (
        <Button variant="primary" size="lg" block icon="arrow-right" onClick={p.onRequest}>
          {p.requestLabel ?? t("request")}
        </Button>
      )}
      {p.policyNote ? (
        <p className={styles.note}>
          <Icon name="info" />
          <span>{p.policyNote}</span>
        </p>
      ) : null}
    </aside>
  );
}
