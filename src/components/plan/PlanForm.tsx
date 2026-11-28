"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { placeName } from "@/content/places";
import { emptyPlan, planProblems, readPlan, requestHref, STORAGE_KEY, type Plan } from "@/lib/plan/plan";
import styles from "./PlanForm.module.css";

const readSaved = () => {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};
// Storage changes in another tab; this tab's own writes go through state.
const subscribe = (onChange: () => void) => {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
};

/**
 * PAGE-105, DASH-PUB-007: plan a cruise without an account. The plan is kept on this device only (ADR-101: no email asked
 * for before sign-up). "Send to operators" opens the request form, filled in, after sign-in or sign-up.
 */
export function PlanForm({ routes, today }: { routes: { origin: string; destination: string }[]; today: string }) {
  const t = useTranslations("plan");
  const locale = useLocale();
  const hint = (c: ReactNode) => <span className={styles.hint}>{c}</span>;
  // The saved plan, read from this device's storage (the server can't see it, so the first render is empty).
  const saved = useSyncExternalStore(subscribe, readSaved, () => null);
  const [draft, setDraft] = useState<Plan | null>(null);
  const [tried, setTried] = useState(false);
  const fromSaved = readPlan(saved, today);
  const plan = draft ?? fromSaved ?? emptyPlan(today);
  const restored = draft === null && fromSaved !== null;

  const update = <K extends keyof Plan>(k: K, v: Plan[K]) => {
    const next = { ...plan, [k]: v };
    setDraft(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Storage blocked (private window): the plan just isn't kept.
    }
  };
  const problems = planProblems(plan, today, locale);
  const send = () => {
    setTried(true);
    if (!problems.length) window.location.assign(requestHref(plan));
  };
  const clear = () => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // As above.
    }
    setDraft(emptyPlan(today));
    setTried(false);
  };
  const num = (v: string) => (v === "" ? 0 : Number(v));

  return (
    <section className={styles.plan} aria-labelledby="your-plan">
      <h2 id="your-plan">{t("heading")}</h2>
      {restored ? <p className={styles.note}>{t("restored")}</p> : null}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        noValidate
      >
        <label>
          {t("route")}
          <select value={plan.route} onChange={(e) => update("route", e.target.value)}>
            <option value="">{t("anyRoute")}</option>
            {routes.map((r) => (
              <option key={`${r.origin}→${r.destination}`} value={`${r.origin}→${r.destination}`}>
                {t("routeOption", { from: placeName(r.origin, locale), to: placeName(r.destination, locale) })}
              </option>
            ))}
          </select>
        </label>
        <div className={styles.row}>
          <label>
            {t("earliest")}
            <input type="date" value={plan.earliest} min={today} onChange={(e) => update("earliest", e.target.value)} />
          </label>
          <label>
            {t("latest")}
            <input type="date" value={plan.latest} min={plan.earliest} onChange={(e) => update("latest", e.target.value)} />
          </label>
        </div>
        <div className={styles.row}>
          <label>
            {t("nightsMin")}
            <input
              type="number"
              min={1}
              max={21}
              value={plan.nightsMin}
              onChange={(e) => update("nightsMin", num(e.target.value))}
            />
          </label>
          <label>
            {t("nightsMax")}
            <input
              type="number"
              min={1}
              max={21}
              value={plan.nightsMax}
              onChange={(e) => update("nightsMax", num(e.target.value))}
            />
          </label>
        </div>
        <div className={styles.row}>
          <label>
            {t("adults")}
            <input type="number" min={1} max={30} value={plan.adults} onChange={(e) => update("adults", num(e.target.value))} />
          </label>
          <label>
            {t.rich("childAges", { hint })}
            <input type="text" inputMode="numeric" value={plan.childAges} onChange={(e) => update("childAges", e.target.value)} />
          </label>
          <label>
            {t("cabins")}
            <input type="number" min={1} max={30} value={plan.cabins} onChange={(e) => update("cabins", num(e.target.value))} />
          </label>
        </div>
        <div className={styles.row}>
          <label>
            {t.rich("budget", { hint })}
            <input type="text" inputMode="decimal" value={plan.budget} onChange={(e) => update("budget", e.target.value)} />
          </label>
        </div>
        <label>
          {t.rich("notes", { hint })}
          <textarea rows={3} maxLength={1000} value={plan.notes} onChange={(e) => update("notes", e.target.value)} />
        </label>
        {tried && problems.length ? (
          <ul className={styles.problems} role="alert">
            {problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        ) : null}
        <div className={styles.actions}>
          <button type="submit" className={styles.primary}>
            {t("send")}
          </button>
          <button type="button" className={styles.secondary} onClick={clear}>
            {t("again")}
          </button>
        </div>
        <p className={styles.note}>{t("stays")}</p>
      </form>
    </section>
  );
}
