import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { AccountFrame } from "../AccountFrame";
import styles from "../account.module.css";
import { ResetRequestForm } from "../forms";
import { accountMetadata } from "../meta";

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return accountMetadata((await params).locale, "reset", "/account/reset-password");
}

export default async function ResetPasswordPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("account");
  return (
    <AccountFrame title={t("reset.title")} lede={t("reset.lede")}>
      <ResetRequestForm />
      <ul className={styles.links}>
        <li>
          <Link href="/account/sign-in/">{t("reset.backToSignIn")}</Link>
        </li>
      </ul>
    </AccountFrame>
  );
}
