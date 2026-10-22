import { createHash, timingSafeEqual } from "node:crypto";
import { serverEnv } from "@/server/env";
import { handleWhatsApp, validMetaSignature } from "@/server/messaging/whatsapp-inbound";

/**
 * ADR-099: WhatsApp Cloud API webhook. GET answers Meta's verification with the shared verify token; POST is signed
 * with the app secret and carries button taps (and, in Part B, sheets). Off unless WHATSAPP_ENABLED is "true".
 */
export const dynamic = "force-dynamic";

/** Constant-time comparison (SEC-011): hashing first makes both sides the same length. */
const sameSecret = (given: string | null, want: string) =>
  !!given && timingSafeEqual(createHash("sha256").update(given).digest(), createHash("sha256").update(want).digest());

export function GET(request: Request) {
  const u = new URL(request.url);
  const token = serverEnv.WHATSAPP_VERIFY_TOKEN;
  if (token && u.searchParams.get("hub.mode") === "subscribe" && sameSecret(u.searchParams.get("hub.verify_token"), token))
    return new Response(u.searchParams.get("hub.challenge") ?? "", { status: 200 });
  return new Response("Forbidden", { status: 403 });
}

export async function POST(request: Request) {
  const raw = await request.text();
  if (!validMetaSignature(raw, request.headers.get("x-hub-signature-256")))
    return Response.json({ error: "Signature missing or wrong." }, { status: 401 });
  const handled = await handleWhatsApp(JSON.parse(raw) as Parameters<typeof handleWhatsApp>[0]);
  return Response.json({ handled });
}
