import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { localizedPath } from "@/lib/seo/metadata";
import { requireUser } from "@/server/auth";
import { AccountFrame } from "../AccountFrame";
import { accountMetadata } from "../meta";
import { ApplyForm } from "./ApplyForm";

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return accountMetadata((await params).locale, "apply", "/account/apply-operator");
}

/** ADR-073: operators apply from their account; the public page on how operators connect is /operators/connect/ (PAGE-107). */
export default async function ApplyOperatorPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireUser(localizedPath(locale, "/account/apply-operator"));
  const t = await getTranslations("account");
  return (
    <AccountFrame title={t("apply.title")} lede={t("apply.lede")}>
      <ApplyForm />
      <p>
        <Link href="/operators/connect/">{t("apply.howConnect")}</Link>
      </p>
    </AccountFrame>
  );
}
