import "server-only";
import type { Season } from "@/lib/tours/calendar";
import { cruiseDays, type CruiseDay } from "@/lib/tours/cruise-days";
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
    // ADR-097: tours with rates are booked on the calendar and have no next session.
    const { data: ok } = await db.rpc("tour_is_bookable", { target: t.id });
    if (ok) out.push({ ...t, nextStart: next?.starts_at ?? null });
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
  return { ...t, en, sessions, ...(await calendarFor(t.id)) };
}

/**
 * ADR-097: a tour's rates for the calendar, the seasons, and the guests already on each shared start in the next two
 * months (keyed by the start's UTC instant). The database checks places again when the order is made.
 */
export async function calendarFor(tourId: string) {
  const db = await getDb();
  const [{ data: rates }, { data: seasons }] = await Promise.all([
    db
      .from("tour_rates")
      .select("id, mode, label, days, start_times, lead_hours, max_guests, min_guests, prices")
      .eq("tour_id", tourId)
      .eq("active", true)
      // ADR-102: a programme is booked with its cruise, never on the tour's own calendar.
      .neq("mode", "program")
      .order("mode")
      .order("label"),
    db.from("tour_seasons").select("starts_on, ends_on, pct, applies"),
  ]);
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" });
  const until = new Date(Date.now() + 62 * 86_400_000).toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" });
  const taken: Record<string, number> = {};
  const closed: string[] = [];
  for (const r of rates ?? []) {
    const { data } = await db.rpc("tour_slots", { rate: r.id, from_day: today, to_day: until });
    for (const x of data ?? []) {
      const key = `${r.id}|${new Date(x.starts_at).toISOString()}`;
      taken[key] = x.taken;
      if (x.closed) closed.push(key);
    }
  }
  return {
    rates: (rates ?? []).map((r) => ({ ...r, start_times: r.start_times.map((x) => x.slice(0, 5)) })),
    seasons: (seasons ?? []).map((x) => ({
      from: x.starts_on,
      to: x.ends_on,
      pct: x.pct,
      applies: x.applies as Season["applies"],
    })),
    taken,
    closed,
  };
}

const ORDER =
  "*, tour:tours(id, name, kind, location), session:tour_sessions(starts_at, ends_at, kind, pricing), tour_payments(id, status, amount_minor, currency, receipt_number, stripe_payment_intent_id, note, created_at), tour_refunds(id, method, amount_minor, currency, how, reference, created_at)";

export async function myTourOrders(customerId: string) {
  const db = await getDb();
  const { data, error } = await db
    .from("tour_orders")
    .select("id, reference, status, total_minor, currency, cancel_state, starts_at, tour:tours(name)")
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
      "id, reference, status, total_minor, currency, cancel_state, cancel_refund_minor, created_at, starts_at, tour:tours(name), tour_refunds(amount_minor)",
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

/** The customer's own upcoming cruises, day by day, so the tour calendar can show where their ship is (Faris, 21 Oct). */
export async function myCruiseDays(customerId: string): Promise<CruiseDay[]> {
  const db = await getDb();
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" });
  const { data, error } = await db
    .from("reservations")
    .select(
      "reference, status, vessel:vessels(name), departure:departures!inner(departs_on, returns_on, schedule:schedules(origin, destination, sailing_period, schedule_days(day_number, locale, title)))",
    )
    .eq("customer_id", customerId)
    .neq("status", "cancelled")
    .gte("departure.returns_on", today);
  if (error) throw error;
  return (data ?? []).flatMap((r) => {
    const d = r.departure;
    const s = d?.schedule;
    if (!d || !s) return [];
    const titles = Object.fromEntries(s.schedule_days.filter((x) => x.locale === "en").map((x) => [x.day_number, x.title]));
    return cruiseDays({
      reference: r.reference,
      vessel: r.vessel?.name ?? "your ship",
      departsOn: d.departs_on,
      returnsOn: d.returns_on,
      origin: s.origin,
      destination: s.destination,
      morning: s.sailing_period === "morning",
      titles,
    });
  });
}
