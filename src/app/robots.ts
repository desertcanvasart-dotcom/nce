import type { MetadataRoute } from "next";
import { indexingAllowed, siteUrl } from "@/lib/env";

/** SEO-020: private areas are never crawled. Staging and previews block everything. */
export default function robots(): MetadataRoute.Robots {
  if (!indexingAllowed) return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard/", "/account/", "/api/", "/mcp", "/dev/", "/studio/"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
