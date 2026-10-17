import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { footerCompany, footerExplore, footerLegal } from "./nav-items";
import styles from "./SiteFooter.module.css";

/** Footer: Trust & Company pages and silo roots (SEO-015), plus the draft legal pages (ENG-019). */
export function SiteFooter({ locale }: { locale: string }) {
  const t = useTranslations();
  const year = new Date().getFullYear();
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <span className={styles.name}>Nilecruz</span>
          <span className={styles.tagline}>{t("shell.tagline")}</span>
        </div>
        <nav aria-label={t("footer.explore")}>
          <h2 className={styles.heading}>{t("footer.explore")}</h2>
          <ul className={styles.list}>
            {footerExplore.map((item) => (
              <li key={item.href}>
                <Link href={item.href}>{t(`${item.ns}.${item.key}`)}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label={t("footer.company")}>
          <h2 className={styles.heading}>{t("footer.company")}</h2>
          <ul className={styles.list}>
            {footerCompany.map((item) => (
              <li key={item.href}>
                <Link href={item.href}>{t(`footer.${item.key}`)}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label={t("footer.legal")}>
          <h2 className={styles.heading}>{t("footer.legal")}</h2>
          <ul className={styles.list}>
            {footerLegal.map((item) => (
              <li key={item.href}>
                {/* English-only drafts: a plain link to the EN page, marked as English for other locales. */}
                <a href={item.href} hrefLang="en" lang={locale === "en" ? undefined : "en"}>
                  {t(`footer.${item.key}`)}
                </a>
                {locale === "en" ? null : <span className={styles.note}> ({t("footer.englishOnly")})</span>}
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <p className={styles.copy}>{t("footer.copyright", { year })}</p>
    </footer>
  );
}
