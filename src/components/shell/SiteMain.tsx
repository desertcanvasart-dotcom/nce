"use client";

import type { ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { isTranslated } from "@/lib/seo/translations";
import shell from "./Container.module.css";

/**
 * The page's main content. On a Spanish or Japanese page that isn't translated yet (Batch 10) it says so in the
 * visitor's language, and marks the English content as English so screen readers pronounce it right.
 */
export function SiteMain({ children }: { children: ReactNode }) {
  const t = useTranslations("shell");
  const locale = useLocale() as Locale;
  const translated = isTranslated(usePathname(), locale);
  return (
    <main id="main" tabIndex={-1} className={shell.main} lang={translated ? undefined : "en"}>
      {translated ? null : (
        <p className={shell.untranslated} lang={locale}>
          {t("untranslated")}
        </p>
      )}
      {children}
    </main>
  );
}
