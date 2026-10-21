import "server-only";
import { FRESHNESS_HOURS, isFresh } from "@/lib/product/pricing";
import { getDb } from "@/server/db";

/** Product reads (RLS applies: operators see their own vessels, admins all). */

export async function vesselsOfOrg(orgId: string) {
  const db = await getDb();
  const { data } = await db.from("vessels").select("id, name, type, visibility").eq("operator_org_id", orgId).order("name");
  const { data: sums } = await db.rpc("vessel_product_summary");
  const byId = new Map((sums ?? []).map((s) => [s.vessel_id, s]));
  return (data ?? []).map((v) => ({ ...v, summary: byId.get(v.id) ?? null }));
}

export async function cabinTypes(vesselId: string) {
  const db = await getDb();
  const { data } = await db
    .from("cabin_types")
    .select("*, cabin_type_translations(locale, name, description), media(id)")
    .eq("vessel_id", vesselId)
    .order("deck")
    .order("sort_order")
    .order("name");
  return data ?? [];
}

export async function cabinType(id: string, vesselId: string) {
  const db = await getDb();
  const { data } = await db
    .from("cabin_types")
    .select(
      "*, cabin_type_translations(locale, name, description), media(id, storage_path, width, height, credit, sort_order, media_translations(locale, alt))",
    )
    .eq("id", id)
    .eq("vessel_id", vesselId)
    .maybeSingle();
  if (!data) return null;
  const media = await Promise.all(
    [...data.media]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(async (m) => {
        const { data: s } = await db.storage.from("media").createSignedUrl(m.storage_path, 3600);
        return { ...m, url: s?.signedUrl ?? null };
      }),
  );
  return { ...data, media };
}

export async function schedulesOf(vesselId: string) {
  const db = await getDb();
  const { data } = await db
    .from("schedules")
    .select("*, schedule_periods(id, starts_on, ends_on), departures(count)")
    .eq("vessel_id", vesselId)
    .order("code");
  return data ?? [];
}

export async function schedule(id: string, vesselId: string) {
  const db = await getDb();
  const { data } = await db
    .from("schedules")
    .select("*, schedule_periods(id, starts_on, ends_on), schedule_days(day_number, locale, title, description)")
    .eq("id", id)
    .eq("vessel_id", vesselId)
    .maybeSingle();
  return data;
}

/** The departures of a schedule in a window, with inventory and rates per cabin type. */
export async function departureGrid(scheduleId: string, from: string, to: string) {
  const db = await getDb();
  const { data } = await db
    .from("departures")
    .select(
      "id, departs_on, returns_on, status, inventory(cabin_type_id, available, confirmed_at, source), rates(id, cabin_type_id, occupancy, rate_plan, currency, amount_minor)",
    )
    .eq("schedule_id", scheduleId)
    .gte("departs_on", from)
    .lte("departs_on", to)
    .order("departs_on");
  return data ?? [];
}

export async function promotionsOf(vesselId: string) {
  const db = await getDb();
  const { data } = await db
    .from("promotions")
    .select(
      "*, promotion_translations(locale, benefit, terms), promotion_rates(count), upgrade:cabin_types!promotions_upgrade_to_cabin_type_id_fkey(name, deck)",
    )
    .eq("vessel_id", vesselId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

/** DASH-OPR-004, 005: what the operator overview shows. */
export async function operatorOverview(orgId: string) {
  const db = await getDb();
  const { data: vessels } = await db.from("vessels").select("id, name").eq("operator_org_id", orgId);
  const ids = (vessels ?? []).map((v) => v.id);
  if (!ids.length) return { upcoming: [], issues: [] as { vessel: string; text: string; href: string }[] };
  const today = new Date().toISOString().slice(0, 10);
  const { data: deps } = await db
    .from("departures")
    .select(
      "id, vessel_id, schedule_id, departs_on, returns_on, status, inventory(available, confirmed_at, source), rates(count), schedule:schedules(origin, destination)",
    )
    .in("vessel_id", ids)
    .gte("departs_on", today)
    .eq("status", "scheduled")
    .order("departs_on")
    .limit(400);
  const name = new Map((vessels ?? []).map((v) => [v.id, v.name]));
  const hours = await freshnessHours();
  const fresh = (i: { confirmed_at: string; source: keyof typeof FRESHNESS_HOURS }) =>
    isFresh(i.confirmed_at, i.source, Date.now(), hours);
  const issues: { vessel: string; text: string; href: string }[] = [];
  for (const d of (deps ?? []).slice(0, 120)) {
    const href = `/dashboard/operator/${orgId}/schedules/${d.vessel_id}/${d.schedule_id}/`;
    const rateCount = (d.rates as unknown as { count: number }[])[0]?.count ?? 0;
    if (!d.inventory.length)
      issues.push({ vessel: name.get(d.vessel_id) ?? "", text: `${d.departs_on}: no availability entered`, href });
    else if (d.inventory.some((i) => !fresh(i)))
      issues.push({ vessel: name.get(d.vessel_id) ?? "", text: `${d.departs_on}: availability needs confirming`, href });
    if (!rateCount) issues.push({ vessel: name.get(d.vessel_id) ?? "", text: `${d.departs_on}: no rates`, href });
  }
  return {
    upcoming: (deps ?? []).slice(0, 12).map((d) => ({
      id: d.id,
      vessel: name.get(d.vessel_id) ?? "",
      departs_on: d.departs_on,
      returns_on: d.returns_on,
      route: d.schedule ? `${d.schedule.origin} → ${d.schedule.destination}` : "",
      available: d.inventory.reduce((a, i) => a + i.available, 0),
    })),
    issues: issues.slice(0, 30),
  };
}

/** ADR-079 thresholds as admins set them (platform_settings), falling back to the decided defaults. */
export async function freshnessHours(): Promise<typeof FRESHNESS_HOURS> {
  const db = await getDb();
  const { data } = await db.from("platform_settings").select("value").eq("key", "freshness_hours").maybeSingle();
  return { ...FRESHNESS_HOURS, ...((data?.value ?? {}) as Partial<typeof FRESHNESS_HOURS>) };
}

/** Approved travel partners by name, for company rates (DASH-B2B-012). Operators and admins only. */
export async function approvedPartners() {
  const db = await getDb();
  const { data } = await db.rpc("approved_partners");
  return data ?? [];
}

/** ADR-102: what an approved vessel's itinerary includes (null until the operator says). */
export async function scheduleSightseeing(scheduleId: string) {
  const db = await getDb();
  const { data } = await db.from("schedule_sightseeing").select("*").eq("schedule_id", scheduleId).maybeSingle();
  return data;
}

/** ADR-102: an approved vessel's own with-sightseeing rates on one departure. */
export async function sightseeingRatesFor(departureId: string) {
  const db = await getDb();
  const { data } = await db
    .from("sightseeing_rates")
    .select("id, cabin_type_id, occupancy, rate_plan, currency, amount_minor")
    .eq("departure_id", departureId)
    .order("occupancy");
  return data ?? [];
}
