import { defineRouting } from "next-intl/routing";

/**
 * EN is unprefixed; ES under /es/, JA under /ja/ (I18N-001).
 * Translated ES slugs arrive in Batch 10 (I18N-002); JA keeps English slugs (ADR-022).
 * localeDetection is off so a URL always shows the same language (ADR-033).
 */
export const routing = defineRouting({
  locales: ["en", "es", "ja"],
  defaultLocale: "en",
  localePrefix: "as-needed",
  localeDetection: false,
});

export type Locale = (typeof routing.locales)[number];

export const localeLabels: Record<Locale, string> = { en: "EN", es: "ES", ja: "日本語" };
