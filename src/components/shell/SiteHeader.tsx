import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LanguageSwitch } from "./LanguageSwitch";
import { NavLinks } from "./NavLinks";
import { ThemeToggle } from "./ThemeToggle";
import styles from "./SiteHeader.module.css";

/**
 * Early, minimal port of the design-system NavBar for the Batch 1 shell (ENG-018).
 * Full visual and motion parity (sliding brass underline, overMedia variant) is COMP-NavBar in Batch 2.
 * The mobile menu is a <details> element so it opens without JavaScript; only one of the two
 * navigation landmarks is visible at any width.
 */
export function SiteHeader() {
  const t = useTranslations();
  return (
    <header className={styles.header}>
      <div className={styles.top}>
        <div className={`${styles.start} ${styles.desktopOnly}`}>
          <LanguageSwitch />
          <ThemeToggle />
        </div>
        <details className={styles.menu}>
          <summary className={styles.menuButton}>{t("shell.menuOpen")}</summary>
          <nav aria-label={t("shell.mainNav")} className={styles.menuPanel}>
            <NavLinks className={styles.menuLinks} />
            <Link href="/plan-my-cruise" className={styles.cta}>
              {t("nav.cta")}
            </Link>
            <div className={styles.start}>
              <LanguageSwitch />
              <ThemeToggle />
            </div>
          </nav>
        </details>
        <Link href="/" className={styles.wordmark}>
          <span className={styles.brand}>Nilecruz</span>
          <span className={styles.tagline}>{t("shell.tagline")}</span>
        </Link>
        <div className={styles.end}>
          <Link href="/plan-my-cruise" className={`${styles.cta} ${styles.desktopOnly}`}>
            {t("nav.cta")}
          </Link>
        </div>
      </div>
      <nav aria-label={t("shell.mainNav")} className={styles.desktopOnly}>
        <NavLinks className={styles.links} />
      </nav>
    </header>
  );
}
