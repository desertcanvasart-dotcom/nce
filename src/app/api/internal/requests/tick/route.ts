import { verifyRequestsTick } from "@/lib/connections/signature";
import { serverEnv } from "@/server/env";
import { runTick } from "@/server/requests/dispatch";

/**
 * ADR-099: Supabase's scheduler calls this every five minutes while a booking request is past its reply time, and at
 * 09:00 Cairo for the digest (app.request_booking_tick). Signed with the shared secret: HMAC-SHA256 of
 * "requests-tick.<unix time>", within five minutes. Each reminder and alert is marked once sent, so a replay sends
 * nothing twice.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  const secret = serverEnv.FEED_PULL_SECRET;
  if (!secret) return Response.json({ error: "The scheduler is not configured here." }, { status: 503 });
  const ts = request.headers.get("nilecruz-timestamp") ?? "";
  const sig = request.headers.get("nilecruz-signature") ?? "";
  if (!verifyRequestsTick(secret, ts, sig))
    return Response.json({ error: "Signature missing, wrong or expired." }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { digest?: boolean };
  return Response.json(await runTick({ digest: body.digest === true }));
}
