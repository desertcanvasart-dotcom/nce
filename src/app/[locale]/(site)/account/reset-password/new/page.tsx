import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { localizedPath } from "@/lib/seo/metadata";
import { requireUser } from "@/server/auth";
import { AccountFrame } from "../../AccountFrame";
import { NewPasswordForm } from "../../forms";
import { accountMetadata } from "../../meta";

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return accountMetadata((await params).locale, "resetNew", "/account/reset-password/new");
}

export default async function NewPasswordPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireUser(localizedPath(locale, "/account/reset-password/new"));
  const t = await getTranslations("account");
  return (
    <AccountFrame title={t("reset.newTitle")}>
      <NewPasswordForm />
    </AccountFrame>
  );
}
