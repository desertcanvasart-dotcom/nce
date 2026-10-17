"use client";

import { useLocale, useTranslations } from "next-intl";
import { useActionState } from "react";
import { Button } from "@/components/ds/Button/Button";
import { TextField } from "@/components/ds/TextField/TextField";
import { Link } from "@/i18n/navigation";
import {
  changeEmail,
  changePassword,
  confirmLink,
  removeTwoStep,
  requestPasswordReset,
  resendConfirmation,
  setNewPassword,
  signIn,
  signOutEverywhere,
  signUp,
  startTwoStep,
  twoStepSignIn,
  verifyTwoStep,
  type FormState,
} from "./actions";
import { Notice } from "./AccountFrame";
import styles from "./account.module.css";

const idle: FormState = { status: "idle" };

/** Every form posts to a server action, so it also works before JavaScript loads (progressive enhancement). */
function useForm(action: (s: FormState, fd: FormData) => Promise<FormState>) {
  const [state, run, pending] = useActionState(action, idle);
  const t = useTranslations("account");
  const locale = useLocale();
  const err = (field: string) => (state.fields?.[field] ? t(`errors.${state.fields[field]}`) : undefined);
  const message = state.message ? (
    <Notice tone={state.status === "error" ? "error" : state.status === "done" ? "success" : "info"}>
      {t(`messages.${state.message}`)}
    </Notice>
  ) : null;
  return { state, run, pending, t, locale, err, message };
}

export function SignInForm({ next }: { next?: string }) {
  const { state, run, pending, t, locale, err, message } = useForm(signIn);
  return (
    <form action={run} className={styles.form} noValidate>
      {message}
      <input type="hidden" name="locale" value={locale} />
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <TextField
        label={t("signIn.email")}
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        defaultValue={state.values?.email}
        error={err("email")}
      />
      <TextField
        label={t("signIn.password")}
        name="password"
        type="password"
        autoComplete="current-password"
        required
        error={err("password")}
      />
      <Button variant="primary" type="submit" disabled={pending} block>
        {t("signIn.submit")}
      </Button>
      {state.message === "notConfirmed" ? <ResendForm email={state.values?.email} /> : null}
    </form>
  );
}

function ResendForm({ email }: { email?: string }) {
  const { run, pending, t, locale, message } = useForm(resendConfirmation);
  return (
    <form action={run} className={styles.form}>
      {message}
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="email" value={email ?? ""} />
      <Button variant="link" type="submit" disabled={pending}>
        {t("signIn.resend")}
      </Button>
    </form>
  );
}

export function SignUpForm() {
  const { state, run, pending, t, locale, err, message } = useForm(signUp);
  if (state.status === "sent") {
    return <Notice tone="success">{t("signUp.sentBody")}</Notice>;
  }
  return (
    <form action={run} className={styles.form} noValidate>
      {message}
      <input type="hidden" name="locale" value={locale} />
      <TextField
        label={t("signUp.fullName")}
        name="full_name"
        autoComplete="name"
        required
        defaultValue={state.values?.full_name}
        error={err("full_name")}
      />
      <TextField
        label={t("signUp.email")}
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        defaultValue={state.values?.email}
        error={err("email")}
      />
      <TextField
        label={t("signUp.password")}
        name="password"
        type="password"
        autoComplete="new-password"
        required
        hint={t("signUp.passwordHint")}
        error={err("password")}
      />
      <Button variant="primary" type="submit" disabled={pending} block>
        {t("signUp.submit")}
      </Button>
    </form>
  );
}

export function ConfirmForm({ tokenHash, type }: { tokenHash: string; type: string }) {
  const { state, run, pending, t, locale } = useForm(confirmLink);
  if (state.status === "error") {
    return (
      <>
        <Notice tone="error">
          {t("verify.failedTitle")}. {t("verify.failedBody")}
        </Notice>
        <ul className={styles.links}>
          <li>
            <Link href="/account/sign-in/">{t("verify.newConfirmation")}</Link>
          </li>
          <li>
            <Link href="/account/reset-password/">{t("verify.newReset")}</Link>
          </li>
        </ul>
      </>
    );
  }
  return (
    <form action={run} className={styles.form}>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="token_hash" value={tokenHash} />
      <input type="hidden" name="type" value={type} />
      <Button variant="primary" type="submit" disabled={pending} block>
        {t("verify.submit")}
      </Button>
    </form>
  );
}

export function ResetRequestForm() {
  const { state, run, pending, t, locale, err, message } = useForm(requestPasswordReset);
  if (state.status === "sent") return message;
  return (
    <form action={run} className={styles.form} noValidate>
      {message}
      <input type="hidden" name="locale" value={locale} />
      <TextField
        label={t("reset.email")}
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        defaultValue={state.values?.email}
        error={err("email")}
      />
      <Button variant="primary" type="submit" disabled={pending} block>
        {t("reset.submit")}
      </Button>
    </form>
  );
}

export function NewPasswordForm() {
  const { run, pending, t, locale, err, message } = useForm(setNewPassword);
  return (
    <form action={run} className={styles.form} noValidate>
      {message}
      <input type="hidden" name="locale" value={locale} />
      <TextField
        label={t("reset.password")}
        name="password"
        type="password"
        autoComplete="new-password"
        required
        hint={t("signUp.passwordHint")}
        error={err("password")}
      />
      <TextField
        label={t("reset.confirm")}
        name="confirm"
        type="password"
        autoComplete="new-password"
        required
        error={err("confirm")}
      />
      <Button variant="primary" type="submit" disabled={pending} block>
        {t("reset.save")}
      </Button>
    </form>
  );
}

export function TwoStepForm({ next }: { next?: string }) {
  const { run, pending, t, locale, err, message } = useForm(twoStepSignIn);
  return (
    <form action={run} className={styles.form} noValidate>
      {message}
      <input type="hidden" name="locale" value={locale} />
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <TextField
        label={t("twoStep.code")}
        name="code"
        autoComplete="one-time-code"
        inputMode="numeric"
        maxLength={6}
        required
        error={err("code")}
      />
      <Button variant="primary" type="submit" disabled={pending} block>
        {t("twoStep.submit")}
      </Button>
    </form>
  );
}

export function ChangeEmailForm() {
  const { state, run, pending, t, locale, err, message } = useForm(changeEmail);
  return (
    <form action={run} className={styles.form} noValidate>
      {message}
      <input type="hidden" name="locale" value={locale} />
      <TextField
        label={t("security.newEmail")}
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        defaultValue={state.values?.email}
        error={err("email")}
      />
      <TextField
        label={t("security.current")}
        name="current"
        type="password"
        autoComplete="current-password"
        required
        error={err("current")}
      />
      <p className={styles.note}>{t("security.emailNote")}</p>
      <Button type="submit" disabled={pending}>
        {t("security.changeEmail")}
      </Button>
    </form>
  );
}

export function ChangePasswordForm() {
  const { run, pending, t, locale, err, message } = useForm(changePassword);
  return (
    <form action={run} className={styles.form} noValidate>
      {message}
      <input type="hidden" name="locale" value={locale} />
      <TextField
        label={t("security.current")}
        name="current"
        type="password"
        autoComplete="current-password"
        required
        error={err("current")}
      />
      <TextField
        label={t("security.newPassword")}
        name="password"
        type="password"
        autoComplete="new-password"
        required
        hint={t("signUp.passwordHint")}
        error={err("password")}
      />
      <TextField
        label={t("security.confirmPassword")}
        name="confirm"
        type="password"
        autoComplete="new-password"
        required
        error={err("confirm")}
      />
      <Button type="submit" disabled={pending}>
        {t("security.changePassword")}
      </Button>
    </form>
  );
}

export function TwoStepSetup({ enabled, admin, next }: { enabled: boolean; admin: boolean; next?: string }) {
  const start = useForm(startTwoStep);
  const verify = useForm(verifyTwoStep);
  const remove = useForm(removeTwoStep);
  const { t, locale } = start;
  const enrol = verify.state.enrol ?? start.state.enrol;

  if (enabled) {
    return (
      <>
        {remove.message}
        <p className={styles.note}>{t("security.twoStepOn")}</p>
        {admin ? null : (
          <form action={remove.run}>
            <input type="hidden" name="locale" value={locale} />
            <Button variant="ghost" type="submit" disabled={remove.pending}>
              {t("security.twoStepRemove")}
            </Button>
          </form>
        )}
      </>
    );
  }
  if (enrol) {
    return (
      <form action={verify.run} className={styles.form} noValidate>
        {verify.message}
        <p className={styles.note}>{t("security.twoStepScan")}</p>
        {/* Supabase returns the QR code as an SVG data URI; a plain img keeps it out of the page's script. */}
        {/* eslint-disable-next-line @next/next/no-img-element -- a data-URI SVG, not a photo for next/image */}
        <img className={styles.qr} src={enrol.qr} alt={t("security.twoStepQr")} width={192} height={192} />
        <p className={styles.note}>
          {t("security.twoStepKey")}: <span className={styles.key}>{enrol.secret}</span>
        </p>
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="factorId" value={enrol.factorId} />
        {next ? <input type="hidden" name="next" value={next} /> : null}
        <TextField
          label={t("twoStep.code")}
          name="code"
          autoComplete="one-time-code"
          inputMode="numeric"
          maxLength={6}
          required
          error={verify.err("code")}
        />
        <Button variant="primary" type="submit" disabled={verify.pending}>
          {t("security.twoStepConfirm")}
        </Button>
      </form>
    );
  }
  return (
    <form action={start.run} className={styles.form}>
      {start.message}
      <p className={styles.note}>{admin ? t("security.twoStepAdmin") : t("security.twoStepOff")}</p>
      <Button variant={admin ? "primary" : "outline"} type="submit" disabled={start.pending}>
        {t("security.twoStepStart")}
      </Button>
    </form>
  );
}

export function SignOutEverywhereForm() {
  const { run, pending, t, locale } = useForm(signOutEverywhere);
  return (
    <form action={run}>
      <input type="hidden" name="locale" value={locale} />
      <Button type="submit" disabled={pending}>
        {t("security.signOutEverywhere")}
      </Button>
    </form>
  );
}
