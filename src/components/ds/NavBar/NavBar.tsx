import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cx } from "../lib/cx";
import { LanguageSwitch } from "./LanguageSwitch";
import { MenuLinks, NavLinks, type NavLink } from "./NavLinks";
import { ThemeToggle } from "./ThemeToggle";
import styles from "./NavBar.module.css";

export type { NavLink } from "./NavLinks";

export type NavBarProps = {
  /** Seven links or fewer, with "Why prices differ" always visible (BRAND-025). */
  links: NavLink[];
  cta: NavLink;
  /**
   * A quiet text link before the call to action, e.g. "Sign in" (Batch 4a), or a render function given the
   * link's class, for account links that change with the session (the site header's HeaderAccount).
   */
  account?: NavLink | ((className?: string) => ReactNode);
  /** Transparent with on-media text, used inside Hero over a photo or scene. */
  overMedia?: boolean;
};

/**
 * Brochure-style navigation (COMP-NavBar): language and Day/Night on the left, centred wordmark,
 * call to action on the right, and a link row with a sliding brass underline.
 * Under 760px it collapses to a <details> menu that works without JavaScript (ADR-037).
 */
export function NavBar({ links, cta, account, overMedia }: NavBarProps) {
  const t = useTranslations("shell");
  return (
    <header className={cx(styles.nav, overMedia ? styles.onMedia : styles.solid)}>
      <div className={styles.top}>
        <div className={cx(styles.start, styles.desktopOnly)}>
          <LanguageSwitch />
          <ThemeToggle />
        </div>
        <details className={styles.menu}>
          <summary className={styles.menuButton}>{t("menuOpen")}</summary>
          <nav aria-label={t("mainNav")} className={styles.menuPanel}>
            <MenuLinks links={links} />
            {renderAccount(account, styles.account)}
            <Link href={cta.href} className={styles.cta}>
              {cta.label}
            </Link>
            <div className={styles.start}>
              <LanguageSwitch />
              <ThemeToggle />
            </div>
          </nav>
        </details>
        <Link href="/" className={styles.wordmark}>
          <span className={styles.brand}>Nilecruz</span>
          <span className={styles.tagline}>{t("tagline")}</span>
        </Link>
        <div className={styles.end}>
          {renderAccount(account, cx(styles.account, styles.desktopOnly))}
          <Link href={cta.href} className={cx(styles.cta, styles.desktopOnly)}>
            {cta.label}
          </Link>
        </div>
      </div>
      <nav aria-label={t("mainNav")} className={styles.desktopOnly}>
        <NavLinks links={links} />
      </nav>
    </header>
  );
}

function renderAccount(account: NavBarProps["account"], className: string | undefined): ReactNode {
  if (!account) return null;
  if (typeof account === "function") return account(className);
  return (
    <Link href={account.href} className={className}>
      {account.label}
    </Link>
  );
}
