import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { safeNextPath } from "@/lib/auth/next-path";
import { getSession } from "@/server/auth";
import { AccountFrame, Notice } from "../AccountFrame";
import styles from "../account.module.css";
import { SignInForm } from "../forms";
import { accountMetadata } from "../meta";

type Props = { params: Promise<{ locale: Locale }>; searchParams: Promise<{ next?: string; notice?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return accountMetadata((await params).locale, "signIn", "/account/sign-in");
}

export default async function SignInPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { next, notice } = await searchParams;
  if (await getSession()) redirect(safeNextPath(next));
  const t = await getTranslations("account");
  return (
    <AccountFrame title={t("signIn.title")} lede={t("signIn.lede")}>
      {notice === "signedOutEverywhere" ? <Notice tone="success">{t("notices.signedOutEverywhere")}</Notice> : null}
      <SignInForm next={next ? safeNextPath(next) : undefined} />
      <ul className={styles.links}>
        <li>
          <Link href="/account/reset-password/">{t("signIn.forgot")}</Link>
        </li>
        <li>
          {t("signIn.noAccount")} <Link href="/account/sign-up/">{t("signIn.createAccount")}</Link>
        </li>
      </ul>
    </AccountFrame>
  );
}
