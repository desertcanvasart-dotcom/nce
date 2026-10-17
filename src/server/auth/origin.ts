import "server-only";
import { siteUrl } from "@/lib/env";

/**
 * SEC-005: a route handler that changes something accepts only requests from this site.
 * (Server actions get the same check from Next.js.) The site URL and the request's own host both count,
 * so it works behind Railway's proxy.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const allowed = new Set<string>([new URL(siteUrl).origin]);
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? new URL(request.url).protocol.replace(":", "");
  if (host) allowed.add(`${proto}://${host}`);
  return allowed.has(origin);
}
