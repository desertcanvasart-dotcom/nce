import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import type { Locale } from "@/i18n/routing";
import { safeNextPath } from "@/lib/auth/next-path";
import { localizedPath } from "@/lib/seo/metadata";
import { requireUser } from "@/server/auth";
import { AccountFrame } from "../AccountFrame";
import styles from "../account.module.css";
import { TwoStepForm } from "../forms";
import { accountMetadata } from "../meta";

type Props = { params: Promise<{ locale: Locale }>; searchParams: Promise<{ next?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return accountMetadata((await params).locale, "twoStep", "/account/two-step");
}

export default async function TwoStepPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { next } = await searchParams;
  const session = await requireUser(localizedPath(locale, "/account/two-step"));
  const target = safeNextPath(next);
  if (session.aal === "aal2") redirect(target);
  if (session.nextAal !== "aal2")
    redirect(`${localizedPath(locale, "/account/security")}?setup=two-step&next=${encodeURIComponent(target)}`);
  const t = await getTranslations("account");
  return (
    <AccountFrame title={t("twoStep.title")} lede={t("twoStep.lede")}>
      <TwoStepForm next={target} />
      <p className={styles.note}>{t("twoStep.lost")}</p>
    </AccountFrame>
  );
}
