import type { Locale } from "@/i18n/routing";

export type Translated<T> = { value: T; locale: Locale; fallback: boolean };

/**
 * I18N-011: pick a field in the visitor's language, falling back to English.
 * `fallback` lets a page add lang="en" to the element, so screen readers switch voice.
 */
export function pickTranslation<R extends { locale: string }, K extends keyof R>(
  rows: readonly R[] | null | undefined,
  locale: Locale,
  field: K,
): Translated<NonNullable<R[K]>> | null {
  const has = (r: R | undefined): r is R => r != null && r[field] != null && String(r[field]).trim() !== "";
  const wanted = rows?.find((r) => r.locale === locale);
  if (has(wanted)) return { value: wanted[field] as NonNullable<R[K]>, locale, fallback: false };
  const en = rows?.find((r) => r.locale === "en");
  if (has(en)) return { value: en[field] as NonNullable<R[K]>, locale: "en", fallback: locale !== "en" };
  return null;
}
