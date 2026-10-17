"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import styles from "./SiteHeader.module.css";

export const THEME_KEY = "nc-theme";

// The theme lives on <html data-theme>, set before paint by the bootstrap script; React only reads it.
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}
const isDark = () => document.documentElement.getAttribute("data-theme") === "dark";

/** Day is the default theme; the choice is remembered in localStorage (TOK-THEMES). */
export function ThemeToggle({ className }: { className?: string }) {
  const t = useTranslations("shell");
  const dark = useSyncExternalStore(subscribe, isDark, () => false);
  // The visible text names the theme the button switches to.
  const label = dark ? t("themeShortLight") : t("themeShortDark");

  function toggle() {
    const next = dark ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // Storage can be unavailable (private mode); the theme still applies for this page.
    }
  }

  return (
    <button
      type="button"
      className={`${styles.themeToggle} js-only ${className ?? ""}`}
      // The accessible name starts with the visible label (WCAG 2.5.3) and then says what pressing does.
      aria-label={`${label}: ${dark ? t("themeToLight") : t("themeToDark")}`}
      data-state={dark ? "dark" : "light"}
      onClick={toggle}
      data-testid="theme-toggle"
    >
      {label}
    </button>
  );
}
