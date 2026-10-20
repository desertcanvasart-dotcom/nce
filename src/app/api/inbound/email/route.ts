import { handleInboundEmail, validSvixSignature } from "@/server/sheets/inbound-email";

/** ADR-099, Part B: Resend's email.received webhook for the inbound sheets address. Signed (Svix). */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  const raw = await request.text();
  if (!validSvixSignature(raw, request.headers))
    return Response.json({ error: "Signature missing, wrong or expired." }, { status: 401 });
  const sheets = await handleInboundEmail(JSON.parse(raw) as Parameters<typeof handleInboundEmail>[0]);
  return Response.json({ sheets: sheets.length });
}
