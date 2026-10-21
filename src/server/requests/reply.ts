import "server-only";
import { readToken, tokenHash, type Action } from "@/lib/requests/tokens";
import { getAdminDb } from "@/server/db/admin";
import { serverEnv } from "@/server/env";
import { requestSummary } from "./dispatch";

/**
 * ADR-099: the page behind a signed link. Nobody signs in: the link is the permission, checked here on every view and
 * again when the button is pressed. A used, expired or answered link shows the recorded answer, never an error.
 */
export type ReplyState =
  | { kind: "invalid" }
  | { kind: "expired"; summary: Awaited<ReturnType<typeof requestSummary>> }
  | {
      kind: "answered";
      summary: NonNullable<Awaited<ReturnType<typeof requestSummary>>>;
      respondedAt: string | null;
      response: string | null;
    }
  | {
      kind: "ready";
      action: Action;
      summary: NonNullable<Awaited<ReturnType<typeof requestSummary>>>;
      sailings: { id: string; departsOn: string }[];
      cabinTypes: { id: string; name: string }[];
    };

async function answered(requestId: string) {
  const { data } = await getAdminDb().from("booking_requests").select("responded_at, response").eq("id", requestId).maybeSingle();
  return { respondedAt: data?.responded_at ?? null, response: data?.response ?? null };
}

export async function replyState(token: string): Promise<ReplyState> {
  const secret = serverEnv.ACTION_LINK_SECRET;
  if (!secret) return { kind: "invalid" };
  const t = readToken(secret, token);
  if (!t.ok) {
    if (t.reason === "expired" && t.requestId) {
      const summary = await requestSummary(t.requestId);
      if (summary && !["waiting", "held"].includes(summary.status))
        return { kind: "answered", summary, ...(await answered(t.requestId)) };
      return { kind: "expired", summary };
    }
    return { kind: "invalid" };
  }
  const summary = await requestSummary(t.requestId);
  if (!summary) return { kind: "invalid" };
  const db = getAdminDb();
  const { data: used } = await db
    .from("used_action_tokens")
    .select("token_hash")
    .eq("token_hash", tokenHash(token))
    .maybeSingle();
  const closed = !["waiting", "held"].includes(summary.status) || (t.action === "hold" && summary.status === "held");
  if (used || closed) return { kind: "answered", summary, ...(await answered(t.requestId)) };
  // Offer other: the ship's other coming sailings and its cabin types.
  const { data: r } = await db.from("booking_requests").select("vessel_id, departure_id").eq("id", t.requestId).single();
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" });
  const [{ data: deps }, { data: cabins }] = await Promise.all([
    db
      .from("departures")
      .select("id, departs_on")
      .eq("vessel_id", r!.vessel_id)
      .eq("status", "scheduled")
      .gt("departs_on", today)
      .order("departs_on")
      .limit(60),
    db.from("cabin_types").select("id, name").eq("vessel_id", r!.vessel_id).eq("active", true).order("name"),
  ]);
  return {
    kind: "ready",
    action: t.action,
    summary,
    sailings: (deps ?? []).map((d) => ({ id: d.id, departsOn: d.departs_on })),
    cabinTypes: cabins ?? [],
  };
}

export type AnswerResult = { ok: true; status: string; changed: boolean } | { ok: false; message: string };

/** The button on the page: checks the link again, then answers through the database (single use). */
export async function answerFromLink(
  token: string,
  channel: "email" | "whatsapp",
  alt?: { departure_id?: string; cabin_type_id?: string; cabins: number; note?: string },
): Promise<AnswerResult> {
  const secret = serverEnv.ACTION_LINK_SECRET;
  const t = secret ? readToken(secret, token) : null;
  if (!t?.ok) return { ok: false, message: "This link has expired or isn't valid. Please contact Nilecruz." };
  const { data, error } = await getAdminDb().rpc("service_answer_booking_request", {
    req: t.requestId,
    act: t.action,
    channel,
    alt: alt ?? undefined,
    token_hash: tokenHash(token),
  });
  if (error) return { ok: false, message: error.message };
  const out = data as { status: string; changed: boolean };
  return { ok: true, status: out.status, changed: out.changed };
}
