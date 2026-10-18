import { verifyPull } from "@/lib/connections/signature";
import { pullDueFeeds } from "@/server/connections/pull";
import { serverEnv } from "@/server/env";

/**
 * ADR-081: Supabase's scheduler calls this every five minutes when a feed is due (app.request_feed_pull).
 * Signed with the shared secret: HMAC-SHA256 of "feed-pull.<unix time>", within five minutes.
 * It takes no input, so a replayed call can at most pull the feeds that are due anyway.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  const secret = serverEnv.FEED_PULL_SECRET;
  if (!secret) return Response.json({ error: "Feed pulls are not configured here." }, { status: 503 });
  const ts = request.headers.get("nilecruz-timestamp") ?? "";
  const sig = request.headers.get("nilecruz-signature") ?? "";
  if (!verifyPull(secret, ts, sig)) return Response.json({ error: "Signature missing, wrong or expired." }, { status: 401 });
  const result = await pullDueFeeds();
  return Response.json(result);
}
