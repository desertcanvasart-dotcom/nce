import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { pageMetadata } from "@/lib/seo/metadata";

type Key = "signIn" | "signUp" | "verify" | "reset" | "resetNew" | "twoStep" | "security" | "apply";

/** Account pages are private utilities: never indexed, not in the sitemap (ARCH §6). */
export async function accountMetadata(locale: Locale, key: Key, path: string): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "account.meta" });
  return pageMetadata({ locale, path, title: t(key), description: t("description"), noindex: true });
}
