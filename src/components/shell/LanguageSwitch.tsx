"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { localeLabels, routing } from "@/i18n/routing";
import styles from "./SiteHeader.module.css";

/** Links to the same page in each language. Plain links, so it works without JavaScript. */
export function LanguageSwitch({ className }: { className?: string }) {
  const t = useTranslations("shell");
  const locale = useLocale();
  const pathname = usePathname();
  return (
    <ul className={`${styles.lang} ${className ?? ""}`} aria-label={t("languageGroup")}>
      {routing.locales.map((l) => (
        <li key={l}>
          <Link
            href={pathname}
            locale={l}
            lang={l}
            hrefLang={l}
            aria-current={l === locale ? "true" : undefined}
            className={styles.langLink}
          >
            {localeLabels[l]}
          </Link>
        </li>
      ))}
    </ul>
  );
}
