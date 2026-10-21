"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { localeLabels, routing, type Locale } from "@/i18n/routing";
import styles from "./NavBar.module.css";

/** The same page's address in a language: English unprefixed, the others under /{locale}/ (I18N-001). */
const inLocale = (l: Locale, path: string) => (l === routing.defaultLocale ? path : `/${l}${path === "/" ? "/" : path}`);

/**
 * Links to the same page in each language (I18N-004), straight to its address with no redirect on the way. Plain
 * links, so it works without JavaScript. A page not yet translated shows English with a note (Batch 10).
 */
export function LanguageSwitch({ className }: { className?: string }) {
  const t = useTranslations("shell");
  const locale = useLocale();
  const pathname = usePathname();
  return (
    <ul className={`${styles.lang} ${className ?? ""}`} aria-label={t("languageGroup")}>
      {routing.locales.map((l) => (
        <li key={l}>
          <a
            href={inLocale(l, pathname)}
            lang={l}
            hrefLang={l}
            aria-current={l === locale ? "true" : undefined}
            className={styles.langLink}
          >
            {localeLabels[l]}
          </a>
        </li>
      ))}
    </ul>
  );
}
