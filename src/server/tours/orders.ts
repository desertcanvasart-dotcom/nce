import "server-only";
import { getDb } from "@/server/db";

/** Tour orders (Batch 4f-2c: DASH-PAY-014, DATA-027, 041). RLS: customers see their own orders, admins all. */

/** Published tours that can be ordered now, with their next session. */
export async function bookableTours() {
  const db = await getDb();
  const { data } = await db
    .from("tours")
    .select("id, name, kind, location, duration_minutes, tour_sessions(starts_at, status)")
    .eq("visibility", "published")
    .order("name");
  const now = Date.now();
  const out = [];
  for (const t of data ?? []) {
    const next = t.tour_sessions
      .filter((s) => s.status === "scheduled" && Date.parse(s.starts_at) > now)
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at))[0];
    if (!next) continue;
    const { data: ok } = await db.rpc("tour_is_bookable", { target: t.id });
    if (ok) out.push({ ...t, nextStart: next.starts_at });
  }
  return out;
}

/** One tour for ordering: its English text, bands and upcoming sessions with places left. */
export async function tourForOrdering(tourId: string) {
  const db = await getDb();
  const { data: t } = await db
    .from("tours")
    .select(
      "id, name, kind, location, duration_minutes, adults_only, cancellation_bands, tour_translations(locale, description, meeting_point, cancellation_terms), tour_sessions(id, starts_at, ends_at, kind, pricing, capacity, currency, price_minor, status)",
    )
    .eq("id", tourId)
    .eq("visibility", "published")
    .maybeSingle();
  if (!t) return null;
  const now = Date.now();
  const upcoming = t.tour_sessions
    .filter((s) => s.status === "scheduled" && Date.parse(s.starts_at) > now)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
    .slice(0, 60);
  const sessions = await Promise.all(
    upcoming.map(async (s) => {
      const { data: left } = await db.rpc("session_places_left", { sess: s.id });
      return { ...s, placesLeft: Number(left ?? 0) };
    }),
  );
  const en = t.tour_translations.find((x) => x.locale === "en");
  return { ...t, en, sessions };
}

const ORDER =
  "*, tour:tours(id, name, kind, location), session:tour_sessions(starts_at, ends_at, kind, pricing), tour_payments(id, status, amount_minor, currency, receipt_number, stripe_payment_intent_id, note, created_at), tour_refunds(id, method, amount_minor, currency, how, reference, created_at)";

export async function myTourOrders(customerId: string) {
  const db = await getDb();
  const { data, error } = await db
    .from("tour_orders")
    .select("id, reference, status, total_minor, currency, cancel_state, tour:tours(name), session:tour_sessions(starts_at)")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function tourOrder(id: string) {
  const db = await getDb();
  const { data } = await db.from("tour_orders").select(ORDER).eq("id", id).maybeSingle();
  // Whether the places are still held for payment, worked out here rather than while rendering.
  return data ? { ...data, held: data.status === "awaiting_payment" && Date.parse(data.hold_until) > Date.now() } : null;
}

export async function tourCancelQuote(id: string) {
  const db = await getDb();
  const { data, error } = await db.rpc("tour_cancel_quote", { target: id });
  if (error) return null;
  return data?.[0] ?? null;
}

/** Admin: cancellations waiting for a decision or a refund, and the latest orders. */
export async function adminTourOrders() {
  const db = await getDb();
  const { data, error } = await db
    .from("tour_orders")
    .select(
      "id, reference, status, total_minor, currency, cancel_state, cancel_refund_minor, created_at, tour:tours(name), session:tour_sessions(starts_at), tour_refunds(amount_minor)",
    )
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  const rows = data ?? [];
  const refundLeft = (o: (typeof rows)[number]) =>
    o.cancel_state === "approved"
      ? Number(o.cancel_refund_minor ?? 0) - o.tour_refunds.reduce((n, r) => n + Number(r.amount_minor), 0)
      : 0;
  return {
    waiting: rows
      .filter((o) => o.cancel_state === "requested" || refundLeft(o) > 0)
      .map((o) => ({ ...o, refundLeft: refundLeft(o) })),
    latest: rows,
  };
}
