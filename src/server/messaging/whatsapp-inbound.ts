import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { siteUrl } from "@/lib/env";
import { actionToken, readToken, tokenHash } from "@/lib/requests/tokens";
import { getAdminDb } from "@/server/db/admin";
import { serverEnv } from "@/server/env";
import { sendWhatsAppText, whatsappOn } from "./send";

/**
 * ADR-099: what WhatsApp sends us. Meta signs each call with the app secret (X-Hub-Signature-256). A tapped quick-reply
 * button carries a signed action token: confirm, decline and hold apply at once (a person tapped them); "offer other"
 * replies with the link to the form. Part B adds sheets sent as media here.
 */
export function validMetaSignature(raw: string, header: string | null): boolean {
  const secret = serverEnv.WHATSAPP_APP_SECRET;
  if (!secret || !header?.startsWith("sha256=")) return false;
  const want = Buffer.from(createHmac("sha256", secret).update(raw).digest("hex"));
  const got = Buffer.from(header.slice(7));
  return want.length === got.length && timingSafeEqual(want, got);
}

type Inbound = {
  entry?: {
    changes?: { value?: { messages?: { from: string; type: string; button?: { payload?: string; text?: string } }[] } }[];
  }[];
};

const DONE: Record<string, string> = {
  confirmed: "Confirmed. The customer is asked to pay; the booking appears in your Nilecruz dashboard.",
  declined: "Declined. We've marked those cabins as full.",
  held: "Held for 72 hours. Tap Confirm or Decline before then.",
};

export async function handleWhatsApp(body: Inbound): Promise<number> {
  if (!whatsappOn()) return 0;
  const secret = serverEnv.ACTION_LINK_SECRET;
  let handled = 0;
  for (const change of body.entry?.flatMap((e) => e.changes ?? []) ?? []) {
    for (const m of change.value?.messages ?? []) {
      if (m.type !== "button" || !m.button?.payload || !secret) continue;
      const from = `+${m.from}`;
      const meta = { kind: "booking_request.whatsapp_reply" };
      const t = readToken(secret, m.button.payload);
      if (!t.ok) {
        await sendWhatsAppText(
          from,
          "That button has expired. Please answer in your Nilecruz dashboard or contact Nilecruz.",
          meta,
        );
        continue;
      }
      const db = getAdminDb();
      const { data: contact } = await db
        .from("operator_contacts")
        .select("id, org_id")
        .eq("whatsapp", from)
        .limit(1)
        .maybeSingle();
      if (t.action === "other") {
        const link = `${siteUrl}/operator-reply/${actionToken(secret, t.requestId, "other")}/?via=whatsapp`;
        await sendWhatsAppText(from, `Offer another date or cabin type here: ${link}`, {
          ...meta,
          orgId: contact?.org_id ?? null,
          requestId: t.requestId,
        });
        handled++;
        continue;
      }
      const { data, error } = await db.rpc("service_answer_booking_request", {
        req: t.requestId,
        act: t.action,
        channel: "whatsapp",
        contact: contact?.id ?? undefined,
        token_hash: tokenHash(m.button.payload),
      });
      const out = data as { status: string; changed: boolean } | null;
      const reply = error
        ? `That didn't work: ${error.message}`
        : out?.changed
          ? (DONE[out.status] ?? "Done.")
          : "This request was already answered. Nothing changed.";
      await sendWhatsAppText(from, reply, { ...meta, orgId: contact?.org_id ?? null, requestId: t.requestId });
      handled++;
    }
  }
  return handled;
}
