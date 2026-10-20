import "server-only";
import {
  journeyState,
  suggestTours,
  type JRequest,
  type JReservation,
  type JTourOrder,
  type TourOption,
} from "@/lib/journey/journey";
import { getDb } from "@/server/db";

/** My journey (Batch 4g): one customer's records, read under RLS, shaped for journeyState(). */
export async function journeyRecords(userId: string) {
  const db = await getDb();
  const [{ data: res, error: e1 }, { data: tours, error: e2 }, { data: reqs, error: e3 }] = await Promise.all([
    db
      .from("reservations")
      .select(
        "id, reference, status, currency, rate_plan, payment_due_at, departure:departures(departs_on, returns_on, schedule_id, schedule:schedules(origin, destination, sailing_period, sails_at)), vessel:vessels(name), eligibility_proofs(status, created_at), cancellation_requests(status)",
      )
      .eq("customer_id", userId)
      .order("created_at", { ascending: false }),
    db
      .from("tour_orders")
      .select(
        "id, reference, status, total_minor, currency, hold_until, cancel_state, tour:tours(name), session:tour_sessions(starts_at)",
      )
      .eq("customer_id", userId),
    db
      .from("cruise_requests")
      .select("id, status, origin, destination, earliest_departure, latest_departure, offers(status, expires_at)")
      .eq("customer_id", userId)
      .order("created_at", { ascending: false }),
  ]);
  if (e1 ?? e2 ?? e3) throw e1 ?? e2 ?? e3;

  const reservations: (JReservation & { scheduleId: string | null })[] = await Promise.all(
    (res ?? []).map(async (r) => {
      const { data: bal } = await db.rpc("reservation_balance", { res: r.id });
      const proof = [...r.eligibility_proofs].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
      const s = r.departure?.schedule;
      return {
        id: r.id,
        reference: r.reference,
        status: r.status,
        vessel: r.vessel?.name ?? "Nile cruise",
        route: s ? `${s.origin} → ${s.destination}` : "",
        departsOn: r.departure?.departs_on ?? "",
        returnsOn: r.departure?.returns_on ?? "",
        paymentDueAt: r.payment_due_at,
        outstandingMinor: Number(bal?.[0]?.outstanding_minor ?? 0),
        reportedMinor: Number(bal?.[0]?.reported_minor ?? 0),
        currency: r.currency,
        localRate: r.rate_plan === "egyptian_citizen" || r.rate_plan === "foreign_resident",
        proof: proof?.status ?? "none",
        cancellationOpen: r.cancellation_requests.some((c) => c.status === "requested" || c.status === "refund_due"),
        scheduleId: r.departure?.schedule_id ?? null,
        origin: s?.origin,
        sailingPeriod: s?.sailing_period ?? null,
        sailsAt: s?.sails_at ?? null,
      };
    }),
  );
  const tourOrders: JTourOrder[] = (tours ?? []).map((o) => ({
    id: o.id,
    reference: o.reference,
    status: o.status,
    tourName: o.tour?.name ?? "Tour",
    startsAt: o.session?.starts_at ?? o.hold_until,
    holdUntil: o.hold_until,
    totalMinor: Number(o.total_minor),
    currency: o.currency,
    cancelState: o.cancel_state,
  }));
  const month = (d: string) =>
    new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
  const requests: JRequest[] = (reqs ?? []).map((q) => ({
    id: q.id,
    status: q.status,
    label: `${q.origin && q.destination ? `${q.origin} → ${q.destination}` : "Flexible route"}, ${month(q.earliest_departure)}`,
    latestDeparture: q.latest_departure,
    offers: q.offers.map((f) => ({ status: f.status, expiresAt: f.expires_at })),
  }));
  return { reservations, tourOrders, requests };
}

/** Published tours linked to cruise schedules, with upcoming sessions and places left (for suggestTours). */
export async function tourOptions(scheduleIds: string[]): Promise<TourOption[]> {
  if (!scheduleIds.length) return [];
  const db = await getDb();
  const { data } = await db
    .from("tour_schedules")
    .select("schedule_id, tour:tours!inner(id, slug, name, kind, visibility, tour_sessions(id, starts_at, status))")
    .in("schedule_id", scheduleIds);
  const byTour = new Map<string, TourOption>();
  const now = Date.now();
  for (const row of data ?? []) {
    const t = row.tour;
    if (!t || t.visibility !== "published") continue;
    const { data: ok } = await db.rpc("tour_is_bookable", { target: t.id });
    if (!ok) continue;
    if (!byTour.has(t.id)) {
      const sessions = await Promise.all(
        t.tour_sessions
          .filter((s) => s.status === "scheduled" && Date.parse(s.starts_at) > now)
          .map(async (s) => {
            const { data: left } = await db.rpc("session_places_left", { sess: s.id });
            return { startsAt: s.starts_at, placesLeft: Number(left ?? 0) };
          }),
      );
      byTour.set(t.id, {
        id: t.id,
        name: t.name,
        airportService: t.kind === "transfer" || t.slug.startsWith("meet-and-assist"),
        scheduleIds: [],
        sessions,
      });
    }
    byTour.get(t.id)!.scheduleIds.push(row.schedule_id);
  }
  return [...byTour.values()];
}

/** The whole My journey picture for one customer, as of now (the clock is read here, never while rendering). */
export async function journey(userId: string) {
  const records = await journeyRecords(userId);
  const now = new Date();
  const state = journeyState(records, now);
  const upcomingIds = new Set(state.upcoming.filter((u) => u.kind === "cruise").map((u) => u.id));
  const current = records.reservations.filter((r) => upcomingIds.has(r.id) && r.scheduleId);
  const options = await tourOptions([...new Set(current.map((r) => r.scheduleId!))]);
  const suggestions = current
    .map((r) => ({
      reservation: r,
      tours: suggestTours(
        { scheduleId: r.scheduleId!, departsOn: r.departsOn, returnsOn: r.returnsOn, morning: r.sailingPeriod === "morning" },
        options,
        now,
      ),
    }))
    .filter((x) => x.tours.length);
  return { ...state, suggestions };
}
