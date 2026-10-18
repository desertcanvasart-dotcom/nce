import "server-only";
import type { Band } from "@/lib/product/pricing";
import { getDb } from "@/server/db";

/**
 * Requests, offers and reservations (Batch 4e). Every read runs as the signed-in person, so RLS decides what each
 * sees: customers their own, operators matching requests and their own offers and bookings, admins everything.
 */

const OFFER_SELECT =
  "id, thread_id, version, status, rate_plan, currency, total_minor, list_total_minor, pricing_note, gratuity_usd_minor, inclusions, terms, eligibility_conditions, expires_at, created_at, org_id, departure_id, offer_cabins(line, cabin_type_id, deck, cabin_name, adults, child_ages, price_minor), departure:departures(id, departs_on, returns_on, schedule:schedules(code, origin, destination, nights), vessel:vessels(id, name, slug))";

export type OfferRow = {
  id: string;
  thread_id: string;
  version: number;
  status: "sent" | "superseded" | "withdrawn" | "accepted" | "closed";
  rate_plan: string;
  currency: string;
  total_minor: number;
  list_total_minor: number | null;
  pricing_note: string | null;
  gratuity_usd_minor: number | null;
  inclusions: string | null;
  terms: string;
  eligibility_conditions: string;
  expires_at: string;
  created_at: string;
  org_id: string;
  departure_id: string;
  offer_cabins: { line: number; cabin_type_id: string; deck: string; cabin_name: string; adults: number; child_ages: number[]; price_minor: number }[];
  departure: {
    id: string;
    departs_on: string;
    returns_on: string;
    schedule: { code: string; origin: string; destination: string; nights: number } | null;
    vessel: { id: string; name: string; slug: string } | null;
  } | null;
};

/** Routes people can ask for: those of published vessels (DASH-CUS-014). */
export async function routeOptions() {
  const db = await getDb();
  const { data } = await db.from("schedules").select("origin, destination, vessel:vessels!inner(visibility)").eq("active", true).eq("vessel.visibility", "published");
  const seen = new Map<string, { origin: string; destination: string }>();
  for (const s of data ?? []) seen.set(`${s.origin}→${s.destination}`, { origin: s.origin, destination: s.destination });
  return [...seen.values()].sort((a, b) => `${a.origin}${a.destination}`.localeCompare(`${b.origin}${b.destination}`));
}

export async function myRequests() {
  const db = await getDb();
  const { data, error } = await db.from("cruise_requests").select("*, offers(id, status, expires_at)").order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function request(id: string) {
  const db = await getDb();
  const { data, error } = await db.from("cruise_requests").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function offersForRequest(requestId: string, orgId?: string): Promise<OfferRow[]> {
  const db = await getDb();
  let q = db.from("offers").select(OFFER_SELECT).eq("request_id", requestId).order("created_at", { ascending: true });
  if (orgId) q = q.eq("org_id", orgId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as OfferRow[];
}

export async function offer(id: string): Promise<(OfferRow & { request_id: string }) | null> {
  const db = await getDb();
  const { data, error } = await db.from("offers").select(`${OFFER_SELECT}, request_id`).eq("id", id).maybeSingle();
  if (error) throw error;
  return data as unknown as (OfferRow & { request_id: string }) | null;
}

/** The cancellation policy that applies to a departure (the schedule's own, else the vessel's). */
export async function policyFor(departureId: string) {
  const db = await getDb();
  const { data: dep } = await db.from("departures").select("vessel_id, schedule_id").eq("id", departureId).maybeSingle();
  if (!dep) return null;
  const { data } = await db
    .from("cancellation_policies")
    .select("id, schedule_id, bands, cancellation_policy_translations(locale, terms)")
    .eq("vessel_id", dep.vessel_id)
    .or(`schedule_id.is.null,schedule_id.eq.${dep.schedule_id}`);
  const best = (data ?? []).sort((a, b) => (a.schedule_id ? 0 : 1) - (b.schedule_id ? 0 : 1))[0];
  return best ?? null;
}

const RES_SELECT =
  "*, reservation_cabins(*), passengers(position, full_name, date_of_birth, nationality), eligibility_proofs(id, storage_path, status, note, created_at, reviewed_at), departure:departures(departs_on, returns_on, schedule:schedules(code, origin, destination, nights)), vessel:vessels(name, slug)";

export async function reservations(filter: { orgId?: string; customer?: boolean } = {}) {
  const db = await getDb();
  let q = db
    .from("reservations")
    .select("id, reference, status, currency, total_minor, created_at, org_id, departure:departures(departs_on), vessel:vessels(name)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (filter.orgId) q = q.eq("org_id", filter.orgId);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function reservation(id: string) {
  const db = await getDb();
  const { data, error } = await db.from("reservations").select(RES_SELECT).eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const proofs = await Promise.all(
    (data.eligibility_proofs ?? []).map(async (p) => {
      const { data: s } = await db.storage.from("eligibility").createSignedUrl(p.storage_path, 600);
      return { ...p, url: s?.signedUrl ?? null };
    }),
  );
  return { ...data, eligibility_proofs: proofs, passengers: [...data.passengers].sort((a, b) => a.position - b.position) };
}

// ── Operator side ─────────────────────────────────────────────────────────────────────────────────────────
/** Requests this person may answer or has answered (RLS), newest first. */
export async function visibleRequests() {
  const db = await getDb();
  const { data, error } = await db.from("cruise_requests").select("*, offers(id, org_id, status)").order("created_at", { ascending: false }).limit(200);
  if (error) throw error;
  return data ?? [];
}

/** The company's departures that fit a request (the same rules as app.request_orgs), with whether each is bookable. */
export async function departuresForRequest(orgId: string, r: NonNullable<Awaited<ReturnType<typeof request>>>) {
  const db = await getDb();
  const { data } = await db
    .from("departures")
    .select("id, departs_on, returns_on, status, schedule:schedules!inner(code, origin, destination, nights, active), vessel:vessels!inner(id, name, visibility, operator_org_id, gratuity_usd_minor)")
    .eq("vessel.operator_org_id", orgId)
    .eq("vessel.visibility", "published")
    .eq("status", "scheduled")
    .gte("departs_on", r.earliest_departure)
    .lte("departs_on", r.latest_departure)
    .gte("schedule.nights", r.nights_min)
    .lte("schedule.nights", r.nights_max)
    .order("departs_on")
    .limit(60);
  const fits = (data ?? []).filter(
    (d) =>
      d.schedule?.active &&
      (!r.latest_finish || d.returns_on <= r.latest_finish) &&
      (!r.origin || d.schedule?.origin.toLowerCase() === r.origin.toLowerCase()) &&
      (!r.destination || d.schedule?.destination.toLowerCase() === r.destination.toLowerCase()),
  );
  return Promise.all(
    fits.map(async (d) => {
      const { data: ok } = await db.rpc("departure_bookable", { dep: d.id });
      return { ...d, bookable: !!ok };
    }),
  );
}

/** Cabin types of a departure's vessel with their rates in one plan and currency, and cabins left. */
export async function cabinsForDeparture(departureId: string, plan: string, currency: string) {
  const db = await getDb();
  const { data: dep } = await db.from("departures").select("vessel_id, departs_on").eq("id", departureId).single();
  const [{ data: cabins }, { data: rates }, { data: inv }] = await Promise.all([
    db.from("cabin_types").select("id, name, deck, max_occupancy, active").eq("vessel_id", dep!.vessel_id).eq("active", true).order("sort_order"),
    db
      .from("rates")
      .select("cabin_type_id, occupancy, amount_minor, child_bands")
      .eq("departure_id", departureId)
      .eq("rate_plan", plan as "international")
      .eq("currency", currency),
    db.from("inventory").select("cabin_type_id, available, confirmed_at, source").eq("departure_id", departureId),
  ]);
  return (cabins ?? []).map((c) => ({
    ...c,
    available: inv?.find((i) => i.cabin_type_id === c.id)?.available ?? 0,
    rates: (rates ?? [])
      .filter((r) => r.cabin_type_id === c.id)
      .map((r) => ({ occupancy: r.occupancy, amountMinor: Number(r.amount_minor), bands: r.child_bands as Band[] })),
  }));
}

export async function orgOffers(orgId: string) {
  const db = await getDb();
  const { data, error } = await db
    .from("offers")
    .select("id, request_id, version, status, currency, total_minor, expires_at, created_at, departure:departures(departs_on, vessel:vessels(name))")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return data ?? [];
}

// ── Notices (ADR-088) ─────────────────────────────────────────────────────────────────────────────────────
export async function notices(scope: { orgId?: string; userId?: string }) {
  const db = await getDb();
  let q = db.from("notifications").select("id, kind, title, link, read_at, created_at").order("created_at", { ascending: false }).limit(10);
  q = scope.orgId ? q.eq("org_id", scope.orgId) : q.eq("user_id", scope.userId!);
  const { data } = await q;
  return data ?? [];
}

// ── Admin supervision (DASH-ADM-004, 090–096) ─────────────────────────────────────────────────────────────
export async function adminBookingCounts() {
  const db = await getDb();
  const today = new Date().toISOString().slice(0, 10);
  const { count } = await db
    .from("reservations")
    .select("id, departure:departures!inner(returns_on)", { count: "exact", head: true })
    .neq("status", "cancelled")
    .gte("departure.returns_on", today);
  return { currentAndUpcoming: count ?? 0 };
}

export type BookingSearch = { q?: string; operator?: string; route?: string; from?: string; to?: string };

export async function searchBookings(s: BookingSearch) {
  const db = await getDb();
  let res = db
    .from("reservations")
    .select(
      "id, reference, status, currency, total_minor, created_at, org:organisations(id, display_name), vessel:vessels(name), departure:departures!inner(departs_on, schedule:schedules!inner(origin, destination))",
    )
    .order("created_at", { ascending: false })
    .limit(100);
  if (s.q) res = res.ilike("reference", `%${s.q.replace(/[%_]/g, "")}%`);
  if (s.operator) res = res.eq("org_id", s.operator);
  if (s.from) res = res.gte("departure.departs_on", s.from);
  if (s.to) res = res.lte("departure.departs_on", s.to);
  if (s.route) {
    const [origin, destination] = s.route.split("→");
    if (origin && destination) res = res.eq("departure.schedule.origin", origin).eq("departure.schedule.destination", destination);
  }
  const [{ data: found, error }, { data: requests }, { data: offers }] = await Promise.all([
    res,
    db.from("cruise_requests").select("id, origin, destination, earliest_departure, latest_departure, adults, child_ages, status, created_at, offers(count)").order("created_at", { ascending: false }).limit(100),
    db
      .from("offers")
      .select("id, request_id, version, status, currency, total_minor, expires_at, created_at, org:organisations(display_name), departure:departures(departs_on)")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);
  if (error) throw error;
  return { reservations: found ?? [], requests: requests ?? [], offers: offers ?? [] };
}
