import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getSession } from "@/server/auth";
import { AccountFrame } from "../AccountFrame";
import styles from "../account.module.css";
import { SignUpForm } from "../forms";
import { accountMetadata } from "../meta";

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return accountMetadata((await params).locale, "signUp", "/account/sign-up");
}

export default async function SignUpPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (await getSession()) redirect("/dashboard/");
  const t = await getTranslations("account");
  return (
    <AccountFrame title={t("signUp.title")} lede={t("signUp.lede")}>
      <SignUpForm />
      <ul className={styles.links}>
        <li>
          {t("signUp.haveAccount")} <Link href="/account/sign-in/">{t("signUp.signIn")}</Link>
        </li>
      </ul>
    </AccountFrame>
  );
}
