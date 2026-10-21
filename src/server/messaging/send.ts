import "server-only";
import { getAdminDb } from "@/server/db/admin";
import { serverEnv } from "@/server/env";

/**
 * ADR-099: outbound messages. Email goes through Resend (Faris, 21 Oct); WhatsApp through the Cloud API when
 * WHATSAPP_ENABLED is "true". Every message is recorded in `outbound_messages`, sent or not: without a key (local runs,
 * tests) it is "skipped", so nothing leaves the machine and the tests can read what would have gone.
 */
type Meta = { kind: string; orgId?: string | null; requestId?: string | null };

async function record(row: {
  channel: "email" | "whatsapp";
  to: string;
  subject?: string;
  text: string;
  status: "sent" | "skipped" | "failed";
  providerId?: string;
  error?: string;
  meta: Meta;
}) {
  await getAdminDb()
    .from("outbound_messages")
    .insert({
      channel: row.channel,
      kind: row.meta.kind,
      to_address: row.to,
      subject: row.subject ?? null,
      body_text: row.text.slice(0, 20000),
      org_id: row.meta.orgId ?? null,
      booking_request_id: row.meta.requestId ?? null,
      status: row.status,
      provider_id: row.providerId ?? null,
      error: row.error?.slice(0, 1000) ?? null,
    });
}

/** A message that couldn't be sent for a reason on our side (no signing secret, no alert address). */
export const recordSkipped = (
  channel: "email" | "whatsapp",
  to: string,
  subject: string,
  text: string,
  why: string,
  meta: Meta,
) => record({ channel, to, subject, text, status: "skipped", error: why, meta });

export async function sendEmail(to: string, mail: { subject: string; text: string; html: string }, meta: Meta) {
  const key = serverEnv.RESEND_API_KEY;
  const from = serverEnv.EMAIL_FROM;
  if (!key || !from) return record({ channel: "email", to, ...mail, status: "skipped", error: "Email is not configured", meta });
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject: mail.subject, text: mail.text, html: mail.html }),
      signal: AbortSignal.timeout(15_000),
    });
    const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!res.ok)
      return record({ channel: "email", to, ...mail, status: "failed", error: body.message ?? `HTTP ${res.status}`, meta });
    return record({ channel: "email", to, ...mail, status: "sent", providerId: body.id, meta });
  } catch (e) {
    return record({ channel: "email", to, ...mail, status: "failed", error: e instanceof Error ? e.message : String(e), meta });
  }
}

export const whatsappOn = () =>
  serverEnv.WHATSAPP_ENABLED === "true" && !!serverEnv.WHATSAPP_TOKEN && !!serverEnv.WHATSAPP_PHONE_NUMBER_ID;

/**
 * A business-initiated template message with quick-reply buttons (WhatsApp allows four; only two link buttons). Each
 * button's payload is a signed token, in the template's button order; a tap comes back to /api/whatsapp/webhook/.
 */
export async function sendWhatsAppTemplate(
  to: string,
  template: string,
  params: string[],
  buttons: string[],
  preview: string,
  meta: Meta,
) {
  if (!whatsappOn()) return record({ channel: "whatsapp", to, text: preview, status: "skipped", error: "WhatsApp is off", meta });
  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${serverEnv.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${serverEnv.WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: to.replace(/^\+/, ""),
        type: "template",
        template: {
          name: template,
          language: { code: "en" },
          components: [
            { type: "body", parameters: params.map((text) => ({ type: "text", text: text.slice(0, 1000) })) },
            ...buttons.map((payload, index) => ({
              type: "button",
              sub_type: "quick_reply",
              index: String(index),
              parameters: [{ type: "payload", payload }],
            })),
          ],
        },
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const body = (await res.json().catch(() => ({}))) as { messages?: { id: string }[]; error?: { message?: string } };
    if (!res.ok)
      return record({
        channel: "whatsapp",
        to,
        text: preview,
        status: "failed",
        error: body.error?.message ?? `HTTP ${res.status}`,
        meta,
      });
    return record({ channel: "whatsapp", to, text: preview, status: "sent", providerId: body.messages?.[0]?.id, meta });
  } catch (e) {
    return record({
      channel: "whatsapp",
      to,
      text: preview,
      status: "failed",
      error: e instanceof Error ? e.message : String(e),
      meta,
    });
  }
}

/** A plain reply inside the 24-hour window that a button tap opens. */
export async function sendWhatsAppText(to: string, text: string, meta: Meta) {
  if (!whatsappOn()) return record({ channel: "whatsapp", to, text, status: "skipped", error: "WhatsApp is off", meta });
  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${serverEnv.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${serverEnv.WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: to.replace(/^\+/, ""),
        type: "text",
        text: { body: text.slice(0, 4096) },
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const body = (await res.json().catch(() => ({}))) as { messages?: { id: string }[]; error?: { message?: string } };
    if (!res.ok)
      return record({
        channel: "whatsapp",
        to,
        text,
        status: "failed",
        error: body.error?.message ?? `HTTP ${res.status}`,
        meta,
      });
    return record({ channel: "whatsapp", to, text, status: "sent", providerId: body.messages?.[0]?.id, meta });
  } catch (e) {
    return record({ channel: "whatsapp", to, text, status: "failed", error: e instanceof Error ? e.message : String(e), meta });
  }
}
