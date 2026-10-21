import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { serverEnv } from "@/server/env";
import { MAX_BYTES, receiveSheet } from "./ingest";

/**
 * ADR-099, Part B: vacancy sheets emailed to the inbound address. Resend (Faris, 21 Oct) calls our webhook with
 * `email.received`, signed the Svix way; the event carries only the attachments' details, so the body and files are
 * fetched from Resend's API (GET /emails/receiving/{id} and /emails/receiving/{id}/attachments, whose download links
 * expire). Each attachment becomes its own sheet; a message without one is read as text.
 */
export function validSvixSignature(raw: string, headers: Headers, nowSeconds = Math.floor(Date.now() / 1000)): boolean {
  const secret = serverEnv.RESEND_WEBHOOK_SECRET;
  const id = headers.get("svix-id");
  const ts = headers.get("svix-timestamp");
  const sigs = headers.get("svix-signature");
  if (!secret || !id || !ts || !sigs || !/^\d{9,11}$/.test(ts) || Math.abs(nowSeconds - Number(ts)) > 300) return false;
  const want = Buffer.from(
    createHmac("sha256", Buffer.from(secret.replace(/^whsec_/, ""), "base64"))
      .update(`${id}.${ts}.${raw}`)
      .digest("base64"),
  );
  return sigs.split(" ").some((part) => {
    const got = Buffer.from(part.replace(/^v1,/, ""));
    return got.length === want.length && timingSafeEqual(got, want);
  });
}

type Received = { type?: string; data?: { email_id?: string; from?: string } };
const api = (path: string) =>
  fetch(`https://api.resend.com${path}`, {
    headers: { Authorization: `Bearer ${serverEnv.RESEND_API_KEY}` },
    signal: AbortSignal.timeout(20_000),
  });
/** "Sample Desk <desk@operator.test>" → desk@operator.test */
const address = (from: string | undefined) => (from?.match(/<([^>]+)>/)?.[1] ?? from ?? "").trim().toLowerCase() || null;

export async function handleInboundEmail(event: Received): Promise<string[]> {
  if (event.type !== "email.received" || !event.data?.email_id || !serverEnv.RESEND_API_KEY) return [];
  const id = event.data.email_id;
  const sender = address(event.data.from);
  const list = (await (await api(`/emails/receiving/${id}/attachments`)).json()) as {
    data?: { filename: string; content_type: string; size: number; download_url: string }[];
  };
  const made: string[] = [];
  for (const a of list.data ?? []) {
    if (a.size > MAX_BYTES) continue;
    const bytes = Buffer.from(await (await fetch(a.download_url, { signal: AbortSignal.timeout(30_000) })).arrayBuffer());
    try {
      made.push(await receiveSheet({ channel: "email", sender, fileName: a.filename, contentType: a.content_type, bytes }));
    } catch {
      // A file type we don't take (a signature image, say): skipped.
    }
  }
  if (!made.length) {
    const mail = (await (await api(`/emails/receiving/${id}`)).json()) as { text?: string | null };
    if (mail.text?.trim())
      made.push(
        await receiveSheet({ channel: "email", sender, fileName: null, contentType: null, bytes: null, bodyText: mail.text }),
      );
  }
  return made;
}
