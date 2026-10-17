/**
 * Security headers for every response (SEC-012).
 * script-src allows inline scripts without a nonce: a nonce would force every page to render
 * dynamically and defeat static caching (PERF-010). The only inline script is the theme
 * bootstrap. Revisited in the Batch 11 security review (ADR-034).
 */
export function securityHeaders({ dev, https, supabaseUrl }: { dev: boolean; https: boolean; supabaseUrl?: string }) {
  const connect = ["'self'", supabaseUrl].filter(Boolean).join(" ");
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src ${connect}${dev ? " ws:" : ""}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    // Only on an HTTPS site: on plain-HTTP localhost it sends the browser to https://localhost, which fails.
    ...(!dev && https ? ["upgrade-insecure-requests"] : []),
  ].join("; ");

  return [
    { key: "Content-Security-Policy", value: csp },
    { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(self)" },
  ];
}
