import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { getAdminDb } from "@/server/db/admin";
import { serverEnv } from "@/server/env";

/**
 * SEC-006 (ADR-101): limits on public forms and sign-in. Counted in the database per action and per address (or account),
 * in fixed windows. The address is hashed with a server secret first, so none is stored. Without a database (a build
 * with no connection) or a secret, nothing is limited rather than everything refused.
 */
export const LIMITS = {
  // All sign-in tries from one address; failed tries per email address (password guessing) are counted apart.
  "sign-in": { max: 30, window: 15 * 60 },
  "sign-in-failed": { max: 10, window: 15 * 60 },
  "sign-up": { max: 5, window: 60 * 60 },
  "password-reset": { max: 5, window: 60 * 60 },
  contact: { max: 5, window: 60 * 60 },
  request: { max: 10, window: 60 * 60 },
  "booking-request": { max: 10, window: 60 * 60 },
  "operator-reply": { max: 30, window: 15 * 60 },
  mcp: { max: 120, window: 60 },
} as const;
export type LimitedAction = keyof typeof LIMITS;

/** The caller's address, as the proxy in front of the app reports it. */
export async function callerAddress(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "unknown").trim();
}

export const bucketFor = (action: string, who: string, secret: string) =>
  `${action}:${createHash("sha256").update(`${secret}|${who}`).digest("hex").slice(0, 32)}`;

/**
 * One more try; `{ ok: false, retryAfter }` (seconds) when over the limit. Without `who`, the caller's address counts;
 * limits by address are off when RATE_LIMIT_ADDRESSES is "off" (the end-to-end tests run everything from one address).
 * `peek` looks without counting (for limits that count only failures).
 */
export async function rateLimit(
  action: LimitedAction,
  who?: string,
  { peek = false }: { peek?: boolean } = {},
): Promise<{ ok: true } | { ok: false; retryAfter: number }> {
  const secret = serverEnv.FEED_PULL_SECRET ?? serverEnv.SUPABASE_SECRET_KEY;
  if (!secret || !serverEnv.SUPABASE_SECRET_KEY) return { ok: true };
  if (!who && process.env.RATE_LIMIT_ADDRESSES === "off") return { ok: true };
  const { max, window } = LIMITS[action];
  const { data, error } = await getAdminDb().rpc("service_rate_limit", {
    bucket: bucketFor(action, who ?? (await callerAddress()), secret),
    max_hits: max,
    window_seconds: window,
    add: !peek,
  });
  if (error) return { ok: true }; // never lock people out because counting failed
  return data === 0 ? { ok: true } : { ok: false, retryAfter: Number(data) };
}

/** "Too many tries. Try again in 12 minutes." */
export const tooMany = (retryAfter: number) =>
  `Too many tries. Try again in ${Math.max(1, Math.ceil(retryAfter / 60))} minute${retryAfter > 60 ? "s" : ""}.`;

/** SEC-006: the hidden field from `<Honeypot />` was filled in, so a bot sent the form. */
export function trapFilled(fd: FormData): boolean {
  return String(fd.get("website") ?? "").trim() !== "";
}
