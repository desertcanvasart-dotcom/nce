"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ds/Button/Button";
import { Input, Select } from "@/components/dashboard/ui";
import { Honeypot } from "@/components/forms/Honeypot";
import { Link } from "@/i18n/navigation";
import styles from "./VesselPage.module.css";

type Option = { value: string; label: string };
/** What the form shows after sending, and the quote it can save (Level 3), as a query string for the save page. */
export type RatesState = { ok?: boolean; message?: string; quote?: string };
export type RatesAction = (prev: RatesState, fd: FormData) => Promise<RatesState>;

/**
 * ADR-109, Level 2 and 3: "Check rates for your dates" on the vessel page. Date, guests, cabin preference and an email
 * address; the vessel, its route and nights travel with it. Sent without an account. Once it is sent (or a signed-in
 * rate is shown), and only then, it offers to save the quote and alert on price changes (Level 3).
 */
export function RatesForm({
  action,
  locale,
  slug,
  itineraries,
  cabins,
  defaultItinerary,
}: {
  action: RatesAction;
  locale: string;
  slug: string;
  itineraries: Option[];
  cabins: Option[];
  defaultItinerary?: string;
}) {
  const t = useTranslations("pricing");
  const [state, run, pending] = useActionState(action, {} as RatesState);
  return (
    <div className={styles.rates}>
      <h3 id="rates-h">{t("rates.title")}</h3>
      <p>{t("rates.lead")}</p>
      {state.message ? (
        <p role="status" className={state.ok ? styles.ratesOk : styles.ratesError}>
          {state.message}
        </p>
      ) : null}
      {state.ok && state.quote !== undefined ? (
        <div className={styles.saveQuote}>
          <p>
            <strong>{t("save.title")}</strong>
          </p>
          <p>
            <Link href={`/cruises/${slug}/save-quote/${state.quote ? `?${state.quote}` : ""}`}>{t("save.button")}</Link>
          </p>
          <p className={styles.muted}>{t("save.noAccount")}</p>
        </div>
      ) : (
        <form action={run} className={styles.ratesForm} aria-labelledby="rates-h">
          <input type="hidden" name="locale" value={locale} />
          {itineraries.length ? (
            <Select
              label={t("rates.cruise")}
              name="itinerary"
              defaultValue={defaultItinerary ?? ""}
              options={[{ value: "", label: t("rates.anyCruise") }, ...itineraries]}
            />
          ) : null}
          <Input label={t("rates.date")} name="date" type="date" hint={t("rates.dateHint")} />
          <Input label={t("rates.guests")} name="guests" type="number" inputMode="numeric" min={1} max={30} defaultValue={2} />
          {cabins.length ? (
            <Select
              label={t("rates.cabin")}
              name="cabin"
              defaultValue=""
              options={[{ value: "", label: t("rates.anyCabin") }, ...cabins]}
            />
          ) : null}
          <Input
            label={t("rates.email")}
            name="email"
            type="email"
            maxLength={254}
            autoComplete="email"
            hint={t("rates.emailHint")}
          />
          <Honeypot />
          <div>
            <Button type="submit" disabled={pending}>
              {t("rates.submit")}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
