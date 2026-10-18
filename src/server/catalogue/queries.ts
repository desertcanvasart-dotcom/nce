import "server-only";
import { readiness, type ReadinessInput } from "@/lib/catalogue/readiness";
import { getDb } from "@/server/db";

/** Catalogue reads for the admin workspace. Every query runs as the signed-in admin, so RLS still applies. */

export const PAGE_SIZE = 50;

export type VesselFilter = {
  q?: string;
  type?: string;
  visibility?: string;
  ready?: "complete" | "incomplete";
  page?: number;
};

type ListRow = {
  id: string;
  slug: string;
  name: string;
  type: "sail" | "motor" | "steam";
  visibility: "private" | "showcase" | "published";
  category: string | null;
  route_text: string | null;
  cabin_count: number | null;
  max_guests: number | null;
  is_sample: boolean;
  updated_at: string;
  operator: { display_name: string; status: string } | null;
  vessel_translations: { locale: string; description: string | null }[];
  media: { credit: string | null; media_translations: { locale: string; alt: string }[] }[];
  vessel_private: { aliases: string[] } | null;
};

type Summary = { cabin_types: number; bookable_departures: number };

function readinessOf(v: ListRow, sum?: Summary) {
  const input: ReadinessInput = {
    name: v.name,
    type: v.type,
    route_text: v.route_text,
    category: v.category,
    cabin_count: v.cabin_count,
    max_guests: v.max_guests,
    description_en: v.vessel_translations.find((t) => t.locale === "en")?.description ?? null,
    photos: v.media.map((m) => ({ credit: m.credit, alt_en: m.media_translations.find((t) => t.locale === "en")?.alt ?? null })),
    operator: v.operator,
    cabin_types: sum?.cabin_types ?? 0,
    bookable_departures: sum?.bookable_departures ?? 0,
  };
  return readiness(input);
}

async function productSummaries(only?: string): Promise<Map<string, Summary>> {
  const db = await getDb();
  const { data, error } = await db.rpc("vessel_product_summary", only ? { only_vessel: only } : {});
  if (error) throw error;
  return new Map((data ?? []).map((r) => [r.vessel_id, r]));
}

/** DASH-ADM-010–012: search by name or alias, filter by type, visibility and readiness. */
export async function listVessels(f: VesselFilter) {
  const db = await getDb();
  let query = db
    .from("vessels")
    .select(
      "id, slug, name, type, visibility, category, route_text, cabin_count, max_guests, is_sample, updated_at, operator:organisations(display_name, status), vessel_translations(locale, description), media(credit, media_translations(locale, alt)), vessel_private(aliases)",
    )
    .order("name");
  if (f.type) query = query.eq("type", f.type as "sail");
  if (f.visibility) query = query.eq("visibility", f.visibility as "private");
  const { data, error } = await query.returns<ListRow[]>();
  if (error) throw error;

  const q = f.q?.trim().toLowerCase();
  const sums = await productSummaries();
  let rows = (data ?? []).map((v) => ({ ...v, readiness: readinessOf(v, sums.get(v.id)) }));
  if (q) {
    rows = rows.filter(
      (v) => v.name.toLowerCase().includes(q) || (v.vessel_private?.aliases ?? []).some((a) => a.toLowerCase().includes(q)),
    );
  }
  if (f.ready === "complete") rows = rows.filter((v) => v.readiness.complete);
  if (f.ready === "incomplete") rows = rows.filter((v) => !v.readiness.complete);
  const page = Math.max(1, f.page ?? 1);
  return {
    total: rows.length,
    page,
    pages: Math.max(1, Math.ceil(rows.length / PAGE_SIZE)),
    rows: rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
  };
}

/** DASH-ADM-001, 002: the overview's queue counters. */
export async function overviewCounts() {
  const db = await getDb();
  const [applications, drafts, submissions] = await Promise.all([
    db.from("organisations").select("id", { count: "exact", head: true }).eq("kind", "operator").eq("status", "applied"),
    db.from("vessels").select("id", { count: "exact", head: true }).eq("visibility", "private"),
    db.from("vessel_submissions").select("id", { count: "exact", head: true }).eq("status", "submitted"),
  ]);
  return { applications: applications.count ?? 0, drafts: drafts.count ?? 0, submissions: submissions.count ?? 0 };
}

export async function approvedOperators() {
  const db = await getDb();
  const { data } = await db
    .from("organisations")
    .select("id, display_name")
    .eq("kind", "operator")
    .eq("status", "approved")
    .order("display_name");
  return data ?? [];
}

/** Everything the vessel editor shows. Photos get short-lived signed links (the bucket is private). */
export async function vesselForEditor(id: string) {
  const db = await getDb();
  const { data: v, error } = await db
    .from("vessels")
    .select(
      "*, operator:organisations(id, display_name, status), vessel_translations(locale, summary, description), vessel_private(*), media(id, storage_path, width, height, credit, sort_order, media_translations(locale, alt)), evaluations(id, assessed_on, evaluator, verdict, overall_score, published, method_version), external_ratings(*), safety_observations(*)",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!v) return null;
  const media = [...(v.media ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const signed = await Promise.all(
    media.map(async (m) => {
      const { data } = await db.storage.from("media").createSignedUrl(m.storage_path, 3600);
      return { ...m, url: data?.signedUrl ?? null };
    }),
  );
  const desc = (l: string) => v.vessel_translations.find((t) => t.locale === l)?.description ?? null;
  const sum = (await productSummaries(id)).get(id);
  const ready = readiness({
    cabin_types: sum?.cabin_types ?? 0,
    bookable_departures: sum?.bookable_departures ?? 0,
    name: v.name,
    type: v.type,
    route_text: v.route_text,
    category: v.category,
    cabin_count: v.cabin_count,
    max_guests: v.max_guests,
    description_en: desc("en"),
    photos: media.map((m) => ({ credit: m.credit, alt_en: m.media_translations.find((t) => t.locale === "en")?.alt ?? null })),
    operator: v.operator,
  });
  return { ...v, media: signed, readiness: ready, product: sum ?? null };
}

export type EditorVessel = NonNullable<Awaited<ReturnType<typeof vesselForEditor>>>;
