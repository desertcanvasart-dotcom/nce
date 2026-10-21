import type { Metadata } from "next";
import { routing, type Locale } from "@/i18n/routing";
import { indexingAllowed, siteUrl } from "@/lib/env";
import { isTranslated, translatedLocales } from "./translations";

/** Public URL for a path in a locale: EN unprefixed, others under /{locale}/, always with a trailing slash (SEO-001). */
export function localizedPath(locale: Locale, path: string): string {
  const clean = `/${path.replace(/^\/+|\/+$/g, "")}`;
  const withSlash = clean === "/" ? "/" : `${clean}/`;
  if (locale === routing.defaultLocale) return withSlash;
  return withSlash === "/" ? `/${locale}/` : `/${locale}${withSlash}`;
}

export function absoluteUrl(locale: Locale, path: string): string {
  return `${siteUrl}${localizedPath(locale, path)}`;
}

type PageMeta = {
  locale: Locale;
  /** Path without locale prefix, e.g. "/" or "/terms". */
  path: string;
  title: string;
  description?: string;
  noindex?: boolean;
};

/** SEO-007: each language the page is complete in, both ways, and x-default (English). */
export function hreflangAlternates(path: string, list?: Parameters<typeof translatedLocales>[1]): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const l of translatedLocales(path, list)) languages[l] = absoluteUrl(l, path);
  languages["x-default"] = absoluteUrl(routing.defaultLocale, path);
  return languages;
}

/**
 * One helper for every page: unique title and description (SEO-002), a self-referencing canonical (SEO-006) and
 * hreflang (SEO-007). Indexing is off unless ALLOW_INDEXING=true. A Spanish or Japanese page that isn't translated yet
 * (Batch 10) shows English, so it isn't indexed and its canonical is the English page.
 */
export function pageMetadata({ locale, path, title, description, noindex }: PageMeta): Metadata {
  const translated = isTranslated(path, locale);
  const index = indexingAllowed && !noindex && translated;
  const self = absoluteUrl(locale, path);
  return {
    title,
    description,
    alternates: translated
      ? { canonical: self, languages: noindex ? undefined : hreflangAlternates(path) }
      : { canonical: absoluteUrl(routing.defaultLocale, path) },
    robots: index ? { index: true, follow: true } : { index: false, follow: !noindex },
    openGraph: { title, description, url: self, siteName: "Nilecruz", locale },
  };
}
