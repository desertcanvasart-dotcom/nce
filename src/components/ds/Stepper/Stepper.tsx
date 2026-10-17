"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "../Icon/Icon";
import styles from "./Stepper.module.css";

export type StepperProps = {
  /** Plural noun for what is counted ("adults"); used in the button labels. */
  label: string;
  min?: number;
  max?: number;
  value?: number;
  defaultValue?: number;
  onChange?: (n: number) => void;
};

/** Minus / value / plus for small counts (COMP-Stepper). Buttons disable at the limits; the value bumps on change. */
export function Stepper({ label, min = 0, max = 10, value, defaultValue, onChange }: StepperProps) {
  const t = useTranslations("ds.stepper");
  const [inner, setInner] = useState(defaultValue ?? min);
  const [bump, setBump] = useState(0);
  const current = value ?? inner;

  function set(n: number) {
    const next = Math.max(min, Math.min(max, n));
    if (next === current) return;
    setInner(next);
    setBump((b) => b + 1);
    onChange?.(next);
  }

  return (
    <span className={styles.stepper} role="group" aria-label={label}>
      <button
        type="button"
        className={styles.btn}
        disabled={current <= min}
        aria-label={t("fewer", { label })}
        onClick={() => set(current - 1)}
      >
        <Icon name="minus" />
      </button>
      <output key={bump} className={bump ? styles.bump : undefined} aria-live="polite">
        {current}
      </output>
      <button
        type="button"
        className={styles.btn}
        disabled={current >= max}
        aria-label={t("more", { label })}
        onClick={() => set(current + 1)}
      >
        <Icon name="plus" />
      </button>
    </span>
  );
}
