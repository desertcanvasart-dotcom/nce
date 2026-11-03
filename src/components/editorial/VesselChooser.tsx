"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ds/Button/Button";
import { VESSEL_TYPE_TEXT } from "@/content/vessel-types";
import { CHOOSER, recommend, type ChooserQuestion } from "@/lib/vessels/chooser";
import styles from "./editorial.module.css";

/**
 * "Which boat suits you?" (PAGE-026): three questions as native radio groups, so they work by keyboard and on a
 * phone with no account. Once all three are answered it suggests one vessel type, with a link to its page.
 */
export function VesselChooser() {
  const t = useTranslations("vesselsPillar.chooser");
  const tl = useTranslations("vesselsPillar.types.links");
  const [answers, setAnswers] = useState<Partial<Record<ChooserQuestion, string>>>({});
  const first = useRef<HTMLInputElement>(null);
  const result = recommend(answers);
  return (
    <form className={styles.chooser} onSubmit={(e) => e.preventDefault()}>
      {CHOOSER.map((q, i) => (
        <fieldset key={q.id} className={styles.question}>
          <legend>{t(`questions.${q.id}.legend`)}</legend>
          {q.answers.map((a, j) => (
            <label key={a.id} className={styles.answer}>
              <input
                ref={i === 0 && j === 0 ? first : undefined}
                type="radio"
                name={q.id}
                value={a.id}
                checked={answers[q.id] === a.id}
                onChange={() => setAnswers({ ...answers, [q.id]: a.id })}
              />
              <span>{t(`questions.${q.id}.${a.id}`)}</span>
            </label>
          ))}
        </fieldset>
      ))}
      <div className={styles.result} aria-live="polite">
        {result ? (
          <>
            <p className={styles.eyebrow}>{t("resultLabel")}</p>
            <p className={styles.resultText}>{t(`results.${result}`)}</p>
            <div className={styles.actions}>
              <Button variant="primary" icon="arrow-right" href={VESSEL_TYPE_TEXT[result].hub}>
                {tl(result)}
              </Button>
              <Button
                variant="ghost"
                type="button"
                onClick={() => {
                  setAnswers({});
                  first.current?.focus();
                }}
              >
                {t("startOver")}
              </Button>
            </div>
          </>
        ) : (
          <p className={styles.muted}>{t("waiting")}</p>
        )}
      </div>
    </form>
  );
}
