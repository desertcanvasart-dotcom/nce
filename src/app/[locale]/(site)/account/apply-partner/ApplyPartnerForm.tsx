"use client";

import { useLocale, useTranslations } from "next-intl";
import { useActionState } from "react";
import { Button } from "@/components/ds/Button/Button";
import { TextField } from "@/components/ds/TextField/TextField";
import { Notice } from "../AccountFrame";
import styles from "../account.module.css";
import { applyAsPartner, type ApplyPartnerState } from "./actions";

export function ApplyPartnerForm() {
  const [state, run, pending] = useActionState(applyAsPartner, {} as ApplyPartnerState);
  const t = useTranslations("account");
  const locale = useLocale();
  const err = (f: string) =>
    state.field === f && state.error && state.error !== "already" && state.error !== "unexpected"
      ? t(`applyPartner.errors.${state.error}`)
      : undefined;
  return (
    <form action={run} className={styles.form} noValidate>
      {state.error === "already" ? <Notice tone="error">{t("applyPartner.already")}</Notice> : null}
      {state.error === "unexpected" ? <Notice tone="error">{t("messages.unexpected")}</Notice> : null}
      <input type="hidden" name="locale" value={locale} />
      <TextField
        label={t("applyPartner.company")}
        name="display_name"
        required
        autoComplete="organization"
        error={err("display_name")}
      />
      <TextField label={t("applyPartner.legal")} name="legal_name" error={err("legal_name")} />
      <TextField label={t("applyPartner.country")} name="country" required autoComplete="country-name" error={err("country")} />
      <TextField
        label={t("applyPartner.registration")}
        name="registration_number"
        required
        hint={t("applyPartner.registrationHint")}
        error={err("registration_number")}
      />
      <TextField label={t("applyPartner.website")} name="website" type="url" autoComplete="url" error={err("website")} />
      <TextField
        label={t("applyPartner.contactName")}
        name="contact_name"
        required
        autoComplete="name"
        error={err("contact_name")}
      />
      <TextField
        label={t("applyPartner.contactPhone")}
        name="contact_phone"
        required
        type="tel"
        autoComplete="tel"
        error={err("contact_phone")}
      />
      <p className={styles.note}>{t("applyPartner.note")}</p>
      <Button variant="primary" type="submit" disabled={pending} block>
        {t("applyPartner.submit")}
      </Button>
    </form>
  );
}
