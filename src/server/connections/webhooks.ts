import "server-only";
import { FetchProblem, safePost } from "@/lib/connections/safe-fetch";
import { signWebhook } from "@/lib/connections/signature";
import { webhookBody, webhookProblem, type Delivery } from "@/lib/connections/webhooks";
import { getAdminDb } from "@/server/db/admin";
import { serverEnv } from "@/server/env";
import { fetchPolicy } from "./policy";

/**
 * ADR-103: sends the webhooks the database queued (inventory.changed, hold.expired, booking.confirmed) to operators'
 * addresses, on the scheduler's tick. Each claim holds a delivery for two minutes, so overlapping ticks don't send it
 * twice; the database decides when to try again and when to give up (24 hours).
 */
export const WEBHOOK_LIMITS = { timeoutMs: 10_000, maxBytes: 64_000, batch: 50 } as const;

export async function sendDueWebhooks(budgetMs = 40_000): Promise<{ sent: number; failed: number }> {
  const db = getAdminDb();
  const { data, error } = await db.rpc("service_claim_webhooks", { n: WEBHOOK_LIMITS.batch });
  if (error) throw error;
  const key = serverEnv.WEBHOOK_SIGNING_KEY;
  const until = Date.now() + budgetMs;
  let sent = 0;
  let failed = 0;
  for (const d of (data ?? []) as Delivery[]) {
    let ok = false;
    let status = 0;
    let problem: string | null = null;
    if (!key) problem = "Nilecruz hasn't set its webhook signing key yet.";
    else if (Date.now() > until) problem = "Not sent in time on this run; trying again shortly.";
    else {
      const body = webhookBody(d);
      try {
        status = await safePost(d.url, body, {
          maxBytes: WEBHOOK_LIMITS.maxBytes,
          timeoutMs: WEBHOOK_LIMITS.timeoutMs,
          policy: fetchPolicy(),
          headers: { "Content-Type": "application/json", "User-Agent": "Nilecruz-Webhooks/1.0", ...signWebhook(key, d.id, body) },
        });
        ok = status >= 200 && status < 300;
        if (!ok) problem = webhookProblem(status);
      } catch (e) {
        problem =
          e instanceof FetchProblem ? webhookProblem(e.code) : "Nilecruz couldn't send it because of a problem on our side.";
        if (!(e instanceof FetchProblem))
          console.error("webhook send failed", { id: d.id, error: e instanceof Error ? e.message : e });
      }
    }
    await db.rpc("service_webhook_result", { target: d.id, ok, http_status: status, error: problem ?? undefined });
    if (ok) sent++;
    else failed++;
  }
  return { sent, failed };
}
