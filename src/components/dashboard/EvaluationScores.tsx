"use client";

import { useState } from "react";
import { DIMENSIONS, type DimensionKey } from "@/lib/evaluation/method";
import styles from "./ui.module.css";

type Values = Record<DimensionKey, string[]>;
const num = (s: string) => (s.trim() === "" ? NaN : Number(s));

/**
 * The 28 criterion scores (ADR-070), grouped by dimension, with a live preview of each dimension's result
 * and the overall score. The database recalculates on save, so the preview is a convenience only.
 */
export function EvaluationScores({ initial }: { initial?: Partial<Record<DimensionKey, number[]>> }) {
  const [values, setValues] = useState<Values>(
    () =>
      Object.fromEntries(
        DIMENSIONS.map((d) => [d.key, [0, 1, 2, 3].map((i) => (initial?.[d.key]?.[i] ?? "").toString())]),
      ) as Values,
  );
  const result = (k: DimensionKey, weight: number) => {
    const xs = values[k].map(num);
    if (xs.some((x) => Number.isNaN(x) || x < 0 || x > 5)) return null;
    return Math.round((xs.reduce((a, b) => a + b, 0) / 20) * weight * 100) / 100;
  };
  const results = DIMENSIONS.map((d) => result(d.key, d.weight));
  const overall = results.every((r) => r !== null) ? Math.round(results.reduce((a, b) => a! + b!, 0)! * 100) / 100 : null;

  return (
    <>
      {DIMENSIONS.map((d, di) => (
        <fieldset key={d.key} className={styles.section}>
          <legend className={styles.sectionTitle}>
            {d.label} <span className={styles.muted}>(weight {d.weight})</span>
          </legend>
          <div className={styles.grid}>
            {d.criteria.map((c, i) => (
              <div key={c} className={styles.field}>
                <label className={styles.label} htmlFor={`s_${d.key}_${i}`}>
                  {c}
                </label>
                <input
                  id={`s_${d.key}_${i}`}
                  name={`s_${d.key}_${i}`}
                  className={styles.input}
                  type="number"
                  min={0}
                  max={5}
                  step={0.5}
                  inputMode="decimal"
                  required
                  value={values[d.key][i]}
                  onChange={(e) => setValues((v) => ({ ...v, [d.key]: v[d.key].map((x, j) => (j === i ? e.target.value : x)) }))}
                />
              </div>
            ))}
          </div>
          <p className={styles.hint} aria-live="polite">
            {results[di] === null ? `Enter four scores from 0 to 5.` : `${d.label}: ${results[di]!.toFixed(2)} of ${d.weight}`}
          </p>
        </fieldset>
      ))}
      <p className={styles.notice} aria-live="polite">
        {overall === null
          ? "Overall score appears when every criterion has a score."
          : `Overall: ${overall.toFixed(2)} / 100 (preview; saved by the database)`}
      </p>
    </>
  );
}
