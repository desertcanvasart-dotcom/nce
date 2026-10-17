import type { Metadata } from "next";
import { routing, type Locale } from "@/i18n/routing";
import { indexingAllowed, siteUrl } from "@/lib/env";

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

/**
 * One helper for every page: unique title and description (SEO-002) and a
 * self-referencing canonical (SEO-006). Indexing is off unless ALLOW_INDEXING=true.
 */
export function pageMetadata({ locale, path, title, description, noindex }: PageMeta): Metadata {
  const index = indexingAllowed && !noindex;
  return {
    title,
    description,
    alternates: { canonical: absoluteUrl(locale, path) },
    robots: index ? { index: true, follow: true } : { index: false, follow: !noindex },
    openGraph: { title, description, url: absoluteUrl(locale, path), siteName: "Nilecruz", locale },
  };
}
