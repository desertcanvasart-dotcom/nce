import type { MetadataRoute } from "next";
import { routing, type Locale } from "@/i18n/routing";
import { sitemapEntries } from "@/lib/seo/sitemap";
import { sitemapPaths } from "@/server/seo/sitemap";

/** Built on request (cached by `sitemapPaths`), so newly published vessels and tours appear without a rebuild. */
export const dynamic = "force-dynamic";

/** SEO-019: one sitemap per language, at /sitemaps/sitemap/{locale}.xml, listed by the index at /sitemap.xml. */
export async function generateSitemaps() {
  return routing.locales.map((id) => ({ id }));
}

export default async function sitemap({ id }: { id: Promise<string> }): Promise<MetadataRoute.Sitemap> {
  const locale = (await id) as Locale;
  if (!routing.locales.includes(locale)) return [];
  return sitemapEntries(locale, await sitemapPaths());
}
