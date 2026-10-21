import { routing } from "@/i18n/routing";
import { siteUrl } from "@/lib/env";

/** SEO-019: the sitemap index, listing each language's sitemap. */
export function GET() {
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routing.locales.map((l) => `  <sitemap><loc>${siteUrl}/sitemaps/sitemap/${l}.xml</loc></sitemap>`).join("\n")}
</sitemapindex>
`;
  return new Response(body, { headers: { "content-type": "application/xml; charset=utf-8" } });
}
