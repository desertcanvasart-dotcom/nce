"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ds/Button/Button";
import { Link } from "@/i18n/navigation";
import { PLANNER, PLANNER_ROUTES, planRoute, type PlannerQuestion } from "@/lib/guide/planner";
import styles from "./editorial.module.css";

/**
 * "Find your route" (PAGE-002): three questions as native radio groups, so they work by keyboard and on a phone with no
 * account. Once all three are answered it shows one route, the season's note, and links to the route and its cruises.
 */
export function GuidePlanner() {
  const t = useTranslations("guideHub.planner");
  const [answers, setAnswers] = useState<Partial<Record<PlannerQuestion, string>>>({});
  const first = useRef<HTMLInputElement>(null);
  const result = planRoute(answers);
  const route = result ? PLANNER_ROUTES[result.route] : null;
  return (
    <form className={styles.chooser} onSubmit={(e) => e.preventDefault()}>
      {PLANNER.map((q, i) => (
        <fieldset key={q.id} className={styles.question}>
          <legend>{t(`questions.${q.id}.legend`)}</legend>
          {q.answers.map((a, j) => (
            <label key={a} className={styles.answer}>
              <input
                ref={i === 0 && j === 0 ? first : undefined}
                type="radio"
                name={q.id}
                value={a}
                checked={answers[q.id] === a}
                onChange={() => setAnswers({ ...answers, [q.id]: a })}
              />
              <span>{t(`questions.${q.id}.${a}`)}</span>
            </label>
          ))}
        </fieldset>
      ))}
      <div className={styles.result} aria-live="polite">
        {result && route ? (
          <>
            <p className={styles.eyebrow}>{t("resultLabel")}</p>
            <p className={styles.resultText}>{t.rich(`results.${result.text}`, { b: (c) => <strong>{c}</strong> })}</p>
            {result.season === "unsure" ? (
              <p>
                <Link href="/nile-cruise-guide/when-to-go/">{t("whenToGo")}</Link>
              </p>
            ) : (
              <p>{t(`seasons.${result.season}`)}</p>
            )}
            <p>{t("flights")}</p>
            <ul className={styles.inline}>
              <li>
                <Link href={route.article}>{t(`routeLinks.${result.route}`)}</Link>
              </li>
              <li>
                <Link href={route.listing}>{t(`listLinks.${result.route}`)}</Link>
              </li>
            </ul>
            <div className={styles.actions}>
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
