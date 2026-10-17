"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "../Button/Button";
import { Icon, type IconName } from "../Icon/Icon";
import { cx } from "../lib/cx";
import { formatMoney } from "../lib/format";
import { useCountUp } from "../lib/useCountUp";
import { SampleFlag } from "../SampleFlag/SampleFlag";
import styles from "./PriceAnatomy.module.css";

/** One price factor and its options. Amounts are minor units in `currency` (Q25: maintained data, not component defaults). */
export type PriceFactor = {
  id: string;
  label: string;
  icon: IconName;
  options: { label: string; amount: number; why: string }[];
};

export type PriceAnatomyProps = {
  factors: PriceFactor[];
  currency: string;
  /** Option index per factor for the two example presets. */
  presets: { low: number[]; high: number[]; lowLabel: string; highLabel: string };
  defaultPreset?: "low" | "high";
  eyebrow?: string;
  /** What the total is, e.g. "per person, 4–5 nights". */
  totalLabel: string;
  note?: string;
  /** Keep it honest: where the figures come from and when. */
  footnote: string;
  sample?: boolean;
};

/**
 * The "why US$800 vs US$8,000" explainer (COMP-PriceAnatomy): presets and factors build the price live in a stacked bar.
 * Each segment is keyed by a square and named in the bar's text alternative, so colour is never the only cue (A11Y-008).
 */
export function PriceAnatomy({
  factors,
  currency,
  presets,
  defaultPreset = "low",
  eyebrow,
  totalLabel,
  note,
  footnote,
  sample,
}: PriceAnatomyProps) {
  const t = useTranslations("ds.priceAnatomy");
  const locale = useLocale();
  const [pick, setPick] = useState<number[]>(() => [...presets[defaultPreset]]);
  const [focus, setFocus] = useState<number | null>(null);

  const amountOf = (fi: number) => factors[fi]!.options[pick[fi] ?? 0]!.amount;
  const total = factors.reduce((sum, _, i) => sum + amountOf(i), 0);
  const max = factors.reduce((sum, f) => sum + Math.max(...f.options.map((o) => o.amount)), 0) || 1;
  const shown = useCountUp(total);
  const money = (amount: number) => formatMoney({ amount: Math.round(amount), currency }, locale);
  const matches = (p: number[]) => p.every((x, i) => pick[i] === x);
  const preset = matches(presets.low) ? "low" : matches(presets.high) ? "high" : null;

  return (
    <section className={styles.pa}>
      <div className={styles.head}>
        <div>
          {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
          <div className={styles.total} aria-live="polite">
            <b>{money(shown)}</b>
            <span>{totalLabel}</span>
          </div>
          {note ? <p className={styles.note}>{note}</p> : null}
        </div>
        <div className={styles.presets} role="group" aria-label={t("examples")}>
          <Button
            variant="outline"
            size="sm"
            aria-pressed={preset === "low"}
            onClick={() => (setPick([...presets.low]), setFocus(null))}
          >
            {presets.lowLabel}
          </Button>
          <Button
            variant="outline"
            size="sm"
            aria-pressed={preset === "high"}
            onClick={() => (setPick([...presets.high]), setFocus(null))}
          >
            {presets.highLabel}
          </Button>
        </div>
      </div>
      <div
        className={styles.bar}
        role="img"
        aria-label={t("barLabel", { items: factors.map((f, i) => `${f.label} ${money(amountOf(i))}`).join(", ") })}
      >
        {factors.map((f, i) => (
          <span
            key={f.id}
            className={cx(styles.seg, styles[`seg${i % 6}`], focus === i && styles.segFocus)}
            style={{ width: `${(amountOf(i) / max) * 100}%` }}
          />
        ))}
      </div>
      <ol className={styles.rows}>
        {factors.map((f, fi) => {
          const o = f.options[pick[fi] ?? 0]!;
          return (
            <li key={f.id} className={cx(styles.row, focus === fi && styles.rowFocus)}>
              <div className={styles.label}>
                <i className={cx(styles.key, styles[`seg${fi % 6}`])} aria-hidden="true" />
                <Icon name={f.icon} />
                <span>{f.label}</span>
              </div>
              <div className={styles.chips} role="radiogroup" aria-label={f.label}>
                {f.options.map((opt, oi) => (
                  <button
                    key={opt.label}
                    type="button"
                    role="radio"
                    aria-checked={(pick[fi] ?? 0) === oi}
                    tabIndex={(pick[fi] ?? 0) === oi ? 0 : -1}
                    className={styles.chip}
                    onClick={() => {
                      const next = [...pick];
                      next[fi] = oi;
                      setPick(next);
                      setFocus(fi);
                    }}
                    onKeyDown={(ev) => {
                      const dir =
                        ev.key === "ArrowRight" || ev.key === "ArrowDown"
                          ? 1
                          : ev.key === "ArrowLeft" || ev.key === "ArrowUp"
                            ? -1
                            : 0;
                      if (!dir) return;
                      ev.preventDefault();
                      const ni = ((pick[fi] ?? 0) + dir + f.options.length) % f.options.length;
                      const next = [...pick];
                      next[fi] = ni;
                      setPick(next);
                      setFocus(fi);
                      (ev.currentTarget.parentElement?.children[ni] as HTMLElement | undefined)?.focus();
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <b className={styles.amount}>+{money(o.amount)}</b>
              <p className={styles.why} key={pick[fi]}>
                {o.why}
              </p>
            </li>
          );
        })}
      </ol>
      <p className={styles.foot}>
        <Icon name="info" />
        {footnote}
        {sample ? <SampleFlag /> : null}
      </p>
    </section>
  );
}
