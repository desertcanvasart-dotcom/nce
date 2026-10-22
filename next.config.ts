import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { liveSiteRedirects } from "./src/lib/redirects";
import { securityHeaders } from "./src/lib/security-headers";

const dev = process.env.NODE_ENV !== "production";
const allowIndexing = process.env.ALLOW_INDEXING?.trim().toLowerCase() === "true";
// Vessel photos are signed links to the private media bucket (BRAND-014), served through the image optimiser.
const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL.trim()) : null;
const localSupabase = !!supabase && ["127.0.0.1", "localhost", "[::1]"].includes(supabase.hostname);

const nextConfig: NextConfig = {
  trailingSlash: true, // SEO-001
  turbopack: { root: process.cwd() },
  poweredByHeader: false,
  // ENG-014: errors are tagged with the release, the commit Railway deploys.
  env: { NEXT_PUBLIC_RELEASE: process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 12) || "local" },
  images: {
    // An object, not a URL: a URL pattern would demand an empty query, and signed links carry their token there.
    remotePatterns: supabase
      ? [
          {
            protocol: supabase.protocol.replace(":", "") as "http" | "https",
            hostname: supabase.hostname,
            port: supabase.port,
            pathname: "/storage/v1/object/sign/media/**",
          },
        ]
      : [],
    // Only the local development database lives on a private address.
    dangerouslyAllowLocalIP: localSupabase,
  },
  reactStrictMode: true,
  // Our CSS is ~5 KB gzipped: inlining it removes every render-blocking stylesheet request (PERF-001, ADR-036).
  // authInterrupts: forbidden() renders the 403 page for another role's workspace (ADR-067).
  experimental: {
    inlineCss: true,
    authInterrupts: true,
    // Vessel photos are uploaded through a server action (admins only); the storage bucket allows 15 MB.
    serverActions: { bodySizeLimit: "16mb" },
  },
  async redirects() {
    return liveSiteRedirects.map((r) => ({ ...r, statusCode: 301 as const }));
  },
  async headers() {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() ?? "";
    const https = siteUrl.startsWith("https://") || (!!siteUrl && !/^https?:\/\//.test(siteUrl));
    const headers = securityHeaders({
      dev,
      https,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      sentryDsn: process.env.NEXT_PUBLIC_SENTRY_DSN?.trim() || undefined,
    });
    if (!allowIndexing) headers.push({ key: "X-Robots-Tag", value: "noindex, nofollow" });
    return [{ source: "/:path*", headers }];
  },
};

export default createNextIntlPlugin("./src/i18n/request.ts")(nextConfig);
