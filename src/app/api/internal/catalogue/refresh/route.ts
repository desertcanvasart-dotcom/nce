import { verifyRefresh } from "@/lib/connections/signature";
import { serverEnv } from "@/server/env";
import { revalidateCatalogue } from "@/server/marketplace/revalidate";

/**
 * PERF-010: refreshes the public marketplace now, for changes made outside the app (the scheduler, data imports and
 * the end-to-end tests). Signed with the scheduler's secret: HMAC-SHA256 of "catalogue-refresh.<unix time>", within
 * five minutes. It takes no input; at most it makes the next visitor wait for a fresh page.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const secret = serverEnv.FEED_PULL_SECRET;
  if (!secret) return Response.json({ error: "Refreshing is not configured here." }, { status: 503 });
  const ts = request.headers.get("nilecruz-timestamp") ?? "";
  const sig = request.headers.get("nilecruz-signature") ?? "";
  if (!verifyRefresh(secret, ts, sig)) return Response.json({ error: "Signature missing, wrong or expired." }, { status: 401 });
  revalidateCatalogue();
  return Response.json({ refreshed: true });
}
