import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { safeNextPath } from "@/lib/auth/next-path";
import { localizedPath } from "@/lib/seo/metadata";
import { requireUser } from "@/server/auth";
import { AccountFrame, Notice } from "../AccountFrame";
import styles from "../account.module.css";
import { ChangeEmailForm, ChangePasswordForm, SignOutEverywhereForm, TwoStepSetup } from "../forms";
import { accountMetadata } from "../meta";

type Props = {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ notice?: string; setup?: string; next?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return accountMetadata((await params).locale, "security", "/account/security");
}

const NOTICES = ["emailChanged", "emailHalfConfirmed", "twoStepOn"] as const;

/** DASH-CUS-013: manage account security. Open to every signed-in person, in their language. */
export default async function SecurityPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { notice, setup, next } = await searchParams;
  const session = await requireUser(localizedPath(locale, "/account/security"));
  const t = await getTranslations("account");
  const admin = session.platformRole === "admin";
  const shown = NOTICES.find((n) => n === notice);

  return (
    <AccountFrame title={t("security.title")} lede={t("security.lede")}>
      <p className={styles.note}>{t("security.signedInAs", { email: session.email })}</p>
      {shown ? <Notice tone="success">{t(`notices.${shown}`)}</Notice> : null}
      {setup === "two-step" && session.nextAal !== "aal2" ? <Notice>{t("notices.setupTwoStep")}</Notice> : null}

      <section className={styles.section} aria-labelledby="sec-two-step">
        <h2 id="sec-two-step" className={styles.sectionTitle}>
          {t("security.twoStepTitle")}
        </h2>
        <TwoStepSetup enabled={session.nextAal === "aal2"} admin={admin} next={next ? safeNextPath(next) : undefined} />
      </section>

      <section className={styles.section} aria-labelledby="sec-email">
        <h2 id="sec-email" className={styles.sectionTitle}>
          {t("security.emailTitle")}
        </h2>
        <ChangeEmailForm />
      </section>

      <section className={styles.section} aria-labelledby="sec-password">
        <h2 id="sec-password" className={styles.sectionTitle}>
          {t("security.passwordTitle")}
        </h2>
        <ChangePasswordForm />
      </section>

      <section className={styles.section} aria-labelledby="sec-devices">
        <h2 id="sec-devices" className={styles.sectionTitle}>
          {t("security.devicesTitle")}
        </h2>
        <p className={styles.note}>{t("security.devicesBody")}</p>
        <SignOutEverywhereForm />
      </section>
    </AccountFrame>
  );
}
