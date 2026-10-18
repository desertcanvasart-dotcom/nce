"use client";

import { useLocale, useTranslations } from "next-intl";
import { useActionState } from "react";
import { Button } from "@/components/ds/Button/Button";
import { TextField } from "@/components/ds/TextField/TextField";
import { Notice } from "../AccountFrame";
import styles from "../account.module.css";
import { applyAsOperator, type ApplyState } from "./actions";

export function ApplyForm() {
  const [state, run, pending] = useActionState(applyAsOperator, {} as ApplyState);
  const t = useTranslations("account");
  const locale = useLocale();
  const err = (f: string) =>
    state.field === f && state.error && state.error !== "already" && state.error !== "unexpected"
      ? t(`apply.errors.${state.error}`)
      : undefined;
  return (
    <form action={run} className={styles.form} noValidate>
      {state.error === "already" ? <Notice tone="error">{t("apply.already")}</Notice> : null}
      {state.error === "unexpected" ? <Notice tone="error">{t("messages.unexpected")}</Notice> : null}
      <input type="hidden" name="locale" value={locale} />
      <TextField
        label={t("apply.company")}
        name="display_name"
        required
        autoComplete="organization"
        error={err("display_name")}
      />
      <TextField label={t("apply.legal")} name="legal_name" error={err("legal_name")} />
      <TextField label={t("apply.country")} name="country" autoComplete="country-name" error={err("country")} />
      <TextField label={t("apply.registration")} name="registration_number" error={err("registration_number")} />
      <TextField label={t("apply.website")} name="website" type="url" autoComplete="url" error={err("website")} />
      <p className={styles.note}>{t("apply.note")}</p>
      <Button variant="primary" type="submit" disabled={pending} block>
        {t("apply.submit")}
      </Button>
    </form>
  );
}
