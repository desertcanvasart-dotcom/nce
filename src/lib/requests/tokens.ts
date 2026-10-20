import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/**
 * ADR-099: the signed links in a booking-request message. A link carries the request, the action and when it expires
 * (7 days), signed with HMAC-SHA256 over all three, so no field can be changed. Links are single use: the database keeps
 * a hash of each one used (`used_action_tokens`).
 *
 *   <request id>~<action>~<expiry, unix seconds>~<signature, base64url>
 *
 * `~` rather than `.`: the router treats a last path segment with a dot as a file.
 */
export const ACTIONS = ["confirm", "decline", "hold", "other"] as const;
export type Action = (typeof ACTIONS)[number];
export const LINK_DAYS = 7;

const message = (id: string, action: string, exp: number) => `nilecruz-action-v1.${id}.${action}.${exp}`;
const sign = (secret: string, id: string, action: string, exp: number) =>
  createHmac("sha256", secret)
    .update(message(id, action, exp))
    .digest("base64url");

export function actionToken(
  secret: string,
  requestId: string,
  action: Action,
  nowSeconds = Math.floor(Date.now() / 1000),
): string {
  const exp = nowSeconds + LINK_DAYS * 86_400;
  return `${requestId}~${action}~${exp}~${sign(secret, requestId, action, exp)}`;
}

export type TokenCheck =
  | { ok: true; requestId: string; action: Action; expiresAt: number }
  | { ok: false; reason: "malformed" | "signature" | "expired"; requestId?: string };

export function readToken(secret: string, token: string, nowSeconds = Math.floor(Date.now() / 1000)): TokenCheck {
  const m = /^([0-9a-f-]{36})~(confirm|decline|hold|other)~(\d{9,11})~([A-Za-z0-9_-]{43})$/.exec(token);
  if (!m) return { ok: false, reason: "malformed" };
  const [, id, action, expText, sig] = m as unknown as [string, string, Action, string, string];
  const exp = Number(expText);
  const want = Buffer.from(sign(secret, id, action, exp));
  const got = Buffer.from(sig);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return { ok: false, reason: "signature" };
  // Signed but out of date: still says which request, so the page can show its recorded answer.
  if (nowSeconds > exp) return { ok: false, reason: "expired", requestId: id };
  return { ok: true, requestId: id, action, expiresAt: exp };
}

/** What the database stores for a used link (never the link itself). */
export const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
