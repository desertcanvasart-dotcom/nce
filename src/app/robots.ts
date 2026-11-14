import type { MetadataRoute } from "next";
import { indexingAllowed, siteUrl } from "@/lib/env";

/**
 * SEO-020: private areas are never crawled. Staging and previews block everything. Vessel photos are the one public
 * address under /api/: pages name them as their share picture and in structured data, so crawlers must be able to fetch
 * them (the longer rule wins over `Disallow: /api/`).
 */
export default function robots(): MetadataRoute.Robots {
  if (!indexingAllowed) return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/api/vessel-files/"],
        disallow: ["/dashboard/", "/account/", "/api/", "/mcp", "/dev/", "/studio/"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
