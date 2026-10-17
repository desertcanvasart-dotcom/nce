import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { AccountFrame, Notice } from "../AccountFrame";
import styles from "../account.module.css";
import { ConfirmForm } from "../forms";
import { accountMetadata } from "../meta";

type Props = { params: Promise<{ locale: Locale }>; searchParams: Promise<{ token_hash?: string; type?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return accountMetadata((await params).locale, "verify", "/account/confirm");
}

/** Opening the email link only shows this page; the token is used when the person presses Confirm (a POST). */
export default async function ConfirmPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { token_hash, type } = await searchParams;
  const t = await getTranslations("account");
  const usable =
    !!token_hash &&
    /^[A-Za-z0-9_-]{10,200}$/.test(token_hash) &&
    ["signup", "recovery", "email_change", "email"].includes(type ?? "");
  return (
    <AccountFrame title={t("verify.title")} lede={usable ? t("verify.lede") : undefined}>
      {usable ? (
        <ConfirmForm tokenHash={token_hash!} type={type!} />
      ) : (
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
      )}
    </AccountFrame>
  );
}
