import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { localizedPath } from "@/lib/seo/metadata";
import { requireUser } from "@/server/auth";
import { AccountFrame } from "../AccountFrame";
import { accountMetadata } from "../meta";
import { ApplyPartnerForm } from "./ApplyPartnerForm";

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return accountMetadata((await params).locale, "applyPartner", "/account/apply-partner");
}

/** DASH-B2B-011, ADR-092: travel agencies apply for trade access from their account. */
export default async function ApplyPartnerPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireUser(localizedPath(locale, "/account/apply-partner"));
  const t = await getTranslations("account");
  return (
    <AccountFrame title={t("applyPartner.title")} lede={t("applyPartner.lede")}>
      <ApplyPartnerForm />
    </AccountFrame>
  );
}
