import type { MetadataRoute } from "next";
import type { Locale } from "@/i18n/routing";
import { absoluteUrl, hreflangAlternates } from "./metadata";
import { BUILT } from "./links";
import { isTranslated, type TRANSLATED } from "./translations";

/** Built pages that are never indexed, so never listed (the comparison is a tool page, ADR-093). */
export const NOT_IN_SITEMAP = new Set(["/cruises/compare/"]);
/** Built pages that live outside the silo workbook. */
export const EXTRA_PAGES = ["/operators/connect/"];

/** SEO-019: every indexable public page, unprefixed: the built pages plus published vessels and tours (no samples). */
export function indexablePaths(vessels: string[], tours: string[]): string[] {
  return [...new Set([...BUILT, ...EXTRA_PAGES, ...vessels, ...tours])].filter((p) => !NOT_IN_SITEMAP.has(p)).sort();
}

/** One language's sitemap: only the pages complete in that language, each with its hreflang set. */
export function sitemapEntries(locale: Locale, paths: string[], list?: typeof TRANSLATED): MetadataRoute.Sitemap {
  return paths
    .filter((p) => isTranslated(p, locale, list))
    .map((p) => ({ url: absoluteUrl(locale, p), alternates: { languages: hreflangAlternates(p, list) } }));
}
