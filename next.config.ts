import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { liveSiteRedirects } from "./src/lib/redirects";
import { securityHeaders } from "./src/lib/security-headers";

const dev = process.env.NODE_ENV !== "production";
const allowIndexing = process.env.ALLOW_INDEXING === "true";

const nextConfig: NextConfig = {
  trailingSlash: true, // SEO-001
  turbopack: { root: process.cwd() },
  poweredByHeader: false,
  reactStrictMode: true,
  // Our CSS is ~5 KB gzipped: inlining it removes every render-blocking stylesheet request (PERF-001, ADR-036).
  experimental: { inlineCss: true },
  async redirects() {
    return liveSiteRedirects.map((r) => ({ ...r, statusCode: 301 as const }));
  },
  async headers() {
    const headers = securityHeaders({ dev, supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL });
    if (!allowIndexing) headers.push({ key: "X-Robots-Tag", value: "noindex, nofollow" });
    return [{ source: "/:path*", headers }];
  },
};

export default createNextIntlPlugin("./src/i18n/request.ts")(nextConfig);
