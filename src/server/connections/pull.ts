import "server-only";
import { FormatError, LIMITS, parseInventory } from "@/lib/connections/format";
import { FetchProblem, safeFetch } from "@/lib/connections/safe-fetch";
import { getAdminDb } from "@/server/db/admin";
import { revalidateCatalogue } from "@/server/marketplace/revalidate";
import { FEED_LIMITS, fetchPolicy } from "./policy";

type Feed = { id: string; org_id: string; url: string };
export type PullOutcome = { ok: true; changed: number; failed: number } | { ok: false; error: string };

/**
 * Pulls one approved feed (DASH-OPR-025, SEC-007) and applies it through the same checks as a paste.
 * Runs with the service role: the caller has already established that this pull is allowed
 * (the signed scheduler call, or a catalogue admin's approval).
 */
export async function pullFeed(feed: Feed): Promise<PullOutcome> {
  const db = getAdminDb();
  let error: string;
  try {
    const res = await safeFetch(feed.url, {
      maxBytes: LIMITS.feedBytes,
      timeoutMs: FEED_LIMITS.timeoutMs,
      policy: fetchPolicy(),
    });
    const rows = parseInventory(res.body, { maxBytes: LIMITS.feedBytes, contentType: res.contentType });
    const { data, error: dbError } = await db.rpc("service_apply_inventory", {
      target_org: feed.org_id,
      src: "feed",
      input: rows,
      feed: feed.id,
      run_label: "Feed pull",
    });
    if (dbError) throw dbError;
    const out = data as { changed: number; failed: number };
    if (out.changed) revalidateCatalogue();
    return { ok: true, changed: out.changed, failed: out.failed };
  } catch (e) {
    if (e instanceof FetchProblem) error = e.message;
    else if (e instanceof FormatError) error = `The feed isn’t in the Nilecruz inventory format: ${e.message}`;
    else {
      console.error("feed pull failed", { feed: feed.id, error: e instanceof Error ? e.message : e });
      error = "Nilecruz couldn’t apply the feed because of a problem on our side. We’ll try again at the next pull.";
    }
  }
  await db.rpc("service_record_feed_failure", { feed: feed.id, problem: error });
  return { ok: false, error };
}

/** The scheduler's hourly work (ADR-081): pull every due feed, one at a time, within the request's time. */
export async function pullDueFeeds(budgetMs = 50_000): Promise<{ pulled: number; failed: number }> {
  const started = Date.now();
  const db = getAdminDb();
  const { data, error } = await db.rpc("service_claim_due_feeds", { max_feeds: 10 });
  if (error) throw error;
  let pulled = 0;
  let failed = 0;
  for (const feed of data ?? []) {
    // A claimed feed that isn't reached now is due again when its 15-minute hold ends.
    if (Date.now() - started > budgetMs - FEED_LIMITS.timeoutMs) break;
    const r = await pullFeed(feed);
    pulled++;
    if (!r.ok) failed++;
  }
  return { pulled, failed };
}
