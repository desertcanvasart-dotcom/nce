import "server-only";
import { tourReadiness, type CancellationBand } from "@/lib/tours/tours";
import { getDb } from "@/server/db";

/** Tours and sightseeing reads for the admin workspace (DASH-ADM-058–071, 073). RLS limits drafts to admins. */

export async function toursList() {
  const db = await getDb();
  const now = new Date().toISOString();
  const [{ data: tours, error }, { data: programs }, { data: sessions }] = await Promise.all([
    db
      .from("tours")
      .select(
        "id, slug, kind, name, location, visibility, is_sample, supplier_id, office_id, cancellation_bands, tour_translations(locale, description), tour_rates(active)",
      )
      .order("name"),
    db
      .from("programs")
      .select("id, name, days, visibility, is_sample, program_schedules(count), program_items(count)")
      .order("name"),
    db.from("tour_sessions").select("tour_id").eq("status", "scheduled").gt("starts_at", now),
  ]);
  if (error) throw error;
  const future = new Map<string, number>();
  for (const s of sessions ?? []) future.set(s.tour_id, (future.get(s.tour_id) ?? 0) + 1);
  return {
    tours: (tours ?? []).map((t) => ({
      ...t,
      futureSessions: future.get(t.id) ?? 0,
      readiness: tourReadiness({
        published: t.visibility === "published",
        hasSupplier: !!t.supplier_id,
        bands: t.cancellation_bands as CancellationBand[],
        futureSessions: future.get(t.id) ?? 0,
        hasEnglishDescription: !!t.tour_translations.find((x) => x.locale === "en")?.description,
        hasOffice: !!t.office_id,
        activeRates: t.tour_rates.filter((r) => r.active).length,
      }),
    })),
    programs: (programs ?? []).map((p) => ({
      ...p,
      schedules: (p.program_schedules as unknown as { count: number }[])[0]?.count ?? 0,
      items: (p.program_items as unknown as { count: number }[])[0]?.count ?? 0,
    })),
  };
}

export async function suppliers() {
  const db = await getDb();
  const { data, error } = await db.from("tour_suppliers").select("*").order("name");
  if (error) throw error;
  return data ?? [];
}

export async function destinationsList() {
  const db = await getDb();
  const { data } = await db.from("destinations").select("id, name").order("name");
  return data ?? [];
}

/** Every schedule of every vessel, for assigning tours and programs to cruises (DASH-ADM-066, 070). */
export async function allSchedules() {
  const db = await getDb();
  const { data } = await db
    .from("schedules")
    .select("id, code, origin, destination, nights, active, vessel:vessels(id, name)")
    .order("code");
  return (data ?? [])
    .map((s) => ({ ...s, label: `${s.vessel?.name ?? "?"}: ${s.origin} → ${s.destination}, ${s.nights} nights (${s.code})` }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export async function tourForEditor(id: string) {
  const db = await getDb();
  const { data: t, error } = await db
    .from("tours")
    .select(
      "*, supplier:tour_suppliers(id, name), office:organisations(id, display_name), tour_rates(id, mode, label, days, start_times, lead_hours, max_guests, min_guests, prices, active, tickets_included), tour_translations(*), tour_schedules(schedule_id), media(id, storage_path, width, height, credit, sort_order, media_translations(locale, alt))",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!t) return null;
  const media = [...(t.media ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const signed = await Promise.all(
    media.map(async (m) => {
      const { data } = await db.storage.from("media").createSignedUrl(m.storage_path, 3600);
      return { ...m, url: data?.signedUrl ?? null };
    }),
  );
  const { count } = await db
    .from("tour_sessions")
    .select("id", { count: "exact", head: true })
    .eq("tour_id", id)
    .eq("status", "scheduled")
    .gt("starts_at", new Date().toISOString());
  const tr = (l: string) => t.tour_translations.find((x) => x.locale === l);
  return {
    ...t,
    media: signed,
    tr,
    futureSessions: count ?? 0,
    readiness: tourReadiness({
      published: t.visibility === "published",
      hasSupplier: !!t.supplier_id,
      bands: t.cancellation_bands as CancellationBand[],
      futureSessions: count ?? 0,
      hasEnglishDescription: !!tr("en")?.description,
      hasOffice: !!t.office_id,
      activeRates: t.tour_rates.filter((r) => r.active).length,
    }),
  };
}

/** ADR-097: the tour offices admins can put in charge of a tour. */
export async function tourOffices() {
  const db = await getDb();
  const { data } = await db.from("organisations").select("id, display_name").eq("kind", "tour_office").order("display_name");
  return data ?? [];
}

export type EditorTour = NonNullable<Awaited<ReturnType<typeof tourForEditor>>>;

export async function sessionsOf(tourId: string, from: string, to: string) {
  const db = await getDb();
  const { data, error } = await db
    .from("tour_sessions")
    .select("*")
    .eq("tour_id", tourId)
    .gte("starts_at", from)
    .lte("starts_at", to)
    .order("starts_at")
    .limit(500);
  if (error) throw error;
  return data ?? [];
}

export async function programForEditor(id: string) {
  const db = await getDb();
  const { data: p, error } = await db
    .from("programs")
    .select("*, program_translations(*), program_items(day_number, tour_id, tour:tours(name)), program_schedules(schedule_id)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return p;
}

/** Departures of the linked schedules and the sessions of the included tours over a window (DASH-ADM-071). */
export async function programAvailabilityData(scheduleIds: string[], tourIds: string[], from: string, to: string, days: number) {
  const db = await getDb();
  if (!scheduleIds.length) return { departures: [], sessions: [] };
  const { data: departures } = await db
    .from("departures")
    .select("id, departs_on, status, schedule:schedules(code, vessel:vessels(name))")
    .in("schedule_id", scheduleIds)
    .eq("status", "scheduled")
    .gte("departs_on", from)
    .lte("departs_on", to)
    .order("departs_on")
    .limit(60);
  const until = new Date(Date.parse(`${to}T00:00:00Z`) + (days + 1) * 86_400_000).toISOString();
  const { data: sessions } = tourIds.length
    ? await db
        .from("tour_sessions")
        .select("tour_id, starts_at, capacity, status")
        .in("tour_id", tourIds)
        .gte("starts_at", `${from}T00:00:00Z`)
        .lte("starts_at", until)
        .limit(5000)
    : { data: [] };
  return {
    departures: (departures ?? []).map((d) => ({
      id: d.id,
      departs_on: d.departs_on,
      label: `${d.schedule?.vessel?.name ?? ""} (${d.schedule?.code ?? ""})`,
    })),
    sessions: sessions ?? [],
  };
}
