"use client";

import { useId, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Badge } from "../Badge/Badge";
import { cx } from "../lib/cx";
import { formatMoney } from "../lib/format";
import type { Money } from "../lib/types";
import styles from "./CabinPicker.module.css";

export type Cabin = {
  id: string;
  name: string;
  /** Floor area in m²: the number guests compare. Always shown. */
  sizeM2: number;
  /** "Lower deck", "Upper deck" or the vessel's own deck name. */
  deck: string;
  bed: string;
  /** Per person. Omitted when prices are hidden from signed-out visitors (ADR-025). */
  price?: Money;
  /** Remaining cabins, from real inventory only (BRAND-003). */
  left?: number;
  soldOut?: boolean;
};

export type CabinPickerProps = {
  cabins: Cabin[];
  defaultValue?: string;
  /** Form field name, so the choice submits without JavaScript. */
  name?: string;
  legend?: string;
  /** False for signed-out visitors: facts are shown, prices are not (ADR-025). */
  showPrices?: boolean;
  onChange?: (cabin: Cabin) => void;
};

function Plan({ kind }: { kind: 0 | 1 | 2 }) {
  const w = kind === 2 ? 70 : kind === 1 ? 56 : 40;
  const door = kind === 2 ? 58 : kind === 1 ? 57 : 41;
  return (
    <svg className={styles.plan} viewBox="0 0 72 56" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={1.2}>
      <rect x={1} y={1} width={w} height={54} />
      <rect x={6} y={8} width={18} height={22} />
      <path d="M6 13h18" />
      {kind >= 1 ? <rect x={30} y={36} width={20} height={10} /> : null}
      {kind === 2 ? <path d="M58 1v54M58 10h13M58 20h13M58 30h13M58 40h13" /> : null}
      <path d={`M1 44h8M${door} 6v44`} strokeDasharray="2 2" />
    </svg>
  );
}

/** Radio cards for cabin categories with a mini floor plan, size, deck, bed, price and scarcity (COMP-CabinPicker). Plans are schematic (DASH-BND-003). */
export function CabinPicker({ cabins, defaultValue, name, legend, showPrices = true, onChange }: CabinPickerProps) {
  const t = useTranslations("ds.cabinPicker");
  const locale = useLocale();
  const group = useId();
  const [value, setValue] = useState(defaultValue ?? cabins.find((c) => !c.soldOut)?.id);

  return (
    <fieldset className={styles.cabins}>
      <legend className="visually-hidden">{legend ?? t("legend")}</legend>
      {cabins.map((c, i) => (
        <label key={c.id} className={cx(styles.cabin, value === c.id && styles.on, c.soldOut && styles.off)}>
          <input
            type="radio"
            name={name ?? group}
            value={c.id}
            checked={value === c.id}
            disabled={c.soldOut}
            onChange={() => {
              setValue(c.id);
              onChange?.(c);
            }}
          />
          <Plan kind={Math.min(i, 2) as 0 | 1 | 2} />
          <div>
            <h4 className={styles.name}>{c.name}</h4>
            <div className={styles.meta}>
              <span>{t("size", { size: c.sizeM2 })}</span>
              <span>{c.deck}</span>
              <span>{c.bed}</span>
            </div>
            {c.soldOut ? (
              <div className={styles.badge}>
                <Badge tone="danger" icon="close">
                  {t("soldOut")}
                </Badge>
              </div>
            ) : c.left ? (
              <div className={styles.badge}>
                <Badge tone="accent">{t("onlyLeft", { count: c.left })}</Badge>
              </div>
            ) : null}
          </div>
          <div className={styles.end}>
            <span className={styles.radio} aria-hidden="true" />
            {showPrices && c.price ? (
              <>
                <b>{formatMoney(c.price, locale)}</b>
                <small>{t("perPerson")}</small>
              </>
            ) : null}
          </div>
        </label>
      ))}
      {!showPrices ? <p className={styles.hint}>{t("signInForPrices")}</p> : null}
    </fieldset>
  );
}
