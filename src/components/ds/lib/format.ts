/**
 * Brand formats (BRAND-005/006/007) with locale awareness (I18N-010).
 * English follows the brand book exactly: US$1,240 · 12 Feb 2027 · 4 nights.
 * Spanish and Japanese use their own number and date conventions with the same currency labels.
 */
import type { Money } from "./types";

/** Currency labels that cannot be confused across markets (a bare "$" could be any dollar). */
const CURRENCY_LABEL: Record<string, string> = { USD: "US$", EUR: "€", GBP: "£", EGP: "E£", JPY: "¥" };
const MINOR_DIGITS: Record<string, number> = { JPY: 0 };

export function minorDigits(currency: string): number {
  return MINOR_DIGITS[currency] ?? 2;
}

export function formatMoney(money: Money, locale = "en"): string {
  const digits = minorDigits(money.currency);
  const major = money.amount / 10 ** digits;
  const whole = Number.isInteger(major);
  const number = new Intl.NumberFormat(locale === "en" ? "en-US" : locale, {
    minimumFractionDigits: whole ? 0 : digits,
    maximumFractionDigits: whole ? 0 : digits,
    useGrouping: true,
  }).format(major);
  const label = CURRENCY_LABEL[money.currency] ?? `${money.currency} `;
  // Spanish puts the currency after the number; English and Japanese before it.
  return locale === "es" ? `${number} ${label.trim()}` : `${label}${number}`;
}

/** Dates as calendar days (no time of day). EN: "12 Feb 2027". */
export function formatDate(date: Date | string, locale = "en"): string {
  const d = typeof date === "string" ? new Date(`${date}T00:00:00Z`) : date;
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}

/** Durations are nights, never days (BRAND-007). */
export function formatNights(nights: number, locale = "en"): string {
  if (locale === "ja") return `${nights}泊`;
  if (locale === "es") return `${nights} ${nights === 1 ? "noche" : "noches"}`;
  return `${nights} ${nights === 1 ? "night" : "nights"}`;
}
