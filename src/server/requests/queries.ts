import "server-only";
import { getDb } from "@/server/db";
import { requestSummary } from "./dispatch";

/** ADR-099: booking requests in the dashboards, read as the signed-in person (RLS decides who sees which). */
export const REQUEST_STATUS: Record<string, { tone: "neutral" | "accent" | "success" | "danger"; text: string }> = {
  waiting: { tone: "accent", text: "Waiting for the operator" },
  held: { tone: "accent", text: "Held for 72 hours" },
  confirmed: { tone: "success", text: "Confirmed" },
  declined: { tone: "neutral", text: "Declined" },
  alternative_offered: { tone: "accent", text: "Other offer" },
  expired: { tone: "neutral", text: "Expired" },
  withdrawn: { tone: "neutral", text: "Withdrawn" },
};

const LIST =
  "id, reference, status, created_at, responded_at, hold_until, escalated_at, guest_count, vessel:vessels(name), departure:departures(departs_on)";

export async function orgBookingRequests(orgId: string) {
  const db = await getDb();
  const { data, error } = await db
    .from("booking_requests")
    .select(LIST)
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data ?? [];
}

export async function myBookingRequests(customerId: string) {
  const db = await getDb();
  const { data, error } = await db
    .from("booking_requests")
    .select(LIST)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}

/** One request, if this person may see it, with its readable summary and any other offer spelt out. */
export async function bookingRequest(id: string) {
  const db = await getDb();
  const { data: r } = await db
    .from("booking_requests")
    .select(
      "id, org_id, customer_id, vessel_id, status, alternative, reservation_id, total_minor, currency, hold_until, response, responded_at, created_at",
    )
    .eq("id", id)
    .maybeSingle();
  if (!r) return null;
  const summary = await requestSummary(id);
  if (!summary) return null;
  const alt = r.alternative as { departure_id?: string; cabin_type_id?: string; cabins: number; note?: string } | null;
  let alternative: { departsOn: string | null; cabin: string | null; cabins: number; note: string | null } | null = null;
  if (alt) {
    const [{ data: d }, { data: c }] = await Promise.all([
      alt.departure_id
        ? db.from("departures").select("departs_on").eq("id", alt.departure_id).maybeSingle()
        : Promise.resolve({ data: null }),
      alt.cabin_type_id
        ? db.from("cabin_types").select("name").eq("id", alt.cabin_type_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    alternative = { departsOn: d?.departs_on ?? null, cabin: c?.name ?? null, cabins: alt.cabins, note: alt.note ?? null };
  }
  return { ...r, summary, alternative };
}

export async function replyStats(orgId: string) {
  const db = await getDb();
  const { data } = await db.rpc("operator_reply_stats", { target_org: orgId });
  return data?.[0] ?? null;
}

export async function operatorContacts(orgId: string) {
  const db = await getDb();
  const { data } = await db.from("operator_contacts").select("*").eq("org_id", orgId).order("name");
  return data ?? [];
}

export async function replySla(orgId: string) {
  const db = await getDb();
  const { data } = await db.from("operator_settings").select("reply_sla_hours").eq("org_id", orgId).maybeSingle();
  return data?.reply_sla_hours ?? 6;
}
