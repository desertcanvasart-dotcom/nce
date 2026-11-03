import "server-only";
import { createClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import { env, indexingAllowed } from "@/lib/env";
import { parseLayout } from "@/lib/marketplace/deck-layout-schema";
import type { ListingVessel } from "@/lib/marketplace/listing";
import { evaluationPublishable, type CabinFact, type VesselEvaluation, type VesselPage } from "@/lib/marketplace/vessel";
import type { Locale } from "@/i18n/routing";
import type { Database } from "@/server/db/database.types";

/**
 * Public marketplace data (Batch 5-1, PERF-010). Read as an anonymous visitor, with no cookies, so row-level security
 * shows exactly what the public may see and the result can be cached for everyone. Cached under the "catalogue" tag:
 * operators' and admins' changes, feeds and the inventory API refresh it (revalidateCatalogue); otherwise every
 * ten minutes, because confirmed inventory goes stale with time rather than with an edit.
 */
export const CATALOGUE_TAG = "catalogue";
export const CATALOGUE_SECONDS = 600;

function visitorDb() {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  return createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

// Signed photo links outlive the cache many times over, so a cached page never shows a broken picture.
const PHOTO_SECONDS = 24 * 60 * 60;

/** The columns an evaluation needs to be judged publishable, and its words in every language. */
const EVALUATION =
  "overall_score, verdict, assessed_on, evaluator, dimension_results, published_at, verified, evaluator_role, assessment_method, evaluation_translations(locale, verdict_summary, strengths, watch_points, dimension_notes)";

type EvaluationRow = {
  overall_score: number;
  verdict: VesselEvaluation["verdict"];
  assessed_on: string;
  evaluator: string;
  dimension_results: unknown;
  published_at: string | null;
  verified: boolean;
  evaluator_role: string | null;
  assessment_method: string | null;
  evaluation_translations: {
    locale: string;
    verdict_summary: string | null;
    strengths: string[];
    watch_points: string[];
    dimension_notes: unknown;
  }[];
};

/** The latest published evaluation in a language (English words when it has none), only if it may be published. */
function publishable(rows: EvaluationRow[], locale: Locale): VesselEvaluation | undefined {
  const ev = [...rows].sort((a, b) => (b.published_at ?? "").localeCompare(a.published_at ?? ""))[0];
  if (!ev) return undefined;
  const words =
    ev.evaluation_translations.find((t) => t.locale === locale) ?? ev.evaluation_translations.find((t) => t.locale === "en");
  const out: VesselEvaluation = {
    score: Number(ev.overall_score),
    verdict: ev.verdict,
    assessedOn: ev.assessed_on,
    evaluator: ev.evaluator,
    dimensions: Object.fromEntries(
      Object.entries((ev.dimension_results ?? {}) as Record<string, number>).map(([k, n]) => [k, Number(n)]),
    ),
    verified: ev.verified,
    evaluatorRole: ev.evaluator_role,
    method: ev.assessment_method as VesselEvaluation["method"],
    verdictSummary: words?.verdict_summary ?? null,
    strengths: words?.strengths ?? [],
    watchPoints: words?.watch_points ?? [],
    dimensionNotes: (words?.dimension_notes ?? {}) as Record<string, string>,
  };
  return evaluationPublishable(out) ? out : undefined;
}

const indicative = (v: {
  indicative_price_per_night: number | null;
  indicative_price_currency: string | null;
}): VesselPage["indicativePrice"] =>
  v.indicative_price_per_night !== null && v.indicative_price_currency
    ? {
        perNight: { amount: Math.round(Number(v.indicative_price_per_night) * 100), currency: v.indicative_price_currency },
        basis: "per_person_per_night",
        status: "indicative",
      }
    : undefined;

async function loadListing(): Promise<ListingVessel[]> {
  const db = visitorDb();
  // Builds without a database (Lighthouse in CI) render an empty marketplace; it fills on the first refresh.
  if (!db) return [];
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" });
  const [{ data: vessels, error }, { data: prices, error: pe }] = await Promise.all([
    db
      .from("vessels")
      .select(
        `id, slug, name, type, category, max_guests, cabin_count, deck_count, is_sample, visibility, indicative_price_per_night, indicative_price_currency, vessel_translations(locale, summary), media(storage_path, width, height, sort_order, shows_cabin_type_id, media_translations(locale, alt)), evaluations(${EVALUATION}), schedules(origin, destination, nights, active, departures(departs_on, status))`,
      )
      .in("visibility", ["published", "showcase"])
      .order("name"),
    db.rpc("public_vessel_prices"),
  ]);
  if (error ?? pe) throw error ?? pe;
  const price = new Map((prices ?? []).map((p) => [p.vessel_id, p]));
  const out: ListingVessel[] = [];
  for (const v of vessels ?? []) {
    if (indexingAllowed && v.is_sample) continue; // sample records never reach production
    const photo = [...v.media].filter((m) => !m.shows_cabin_type_id).sort((a, b) => a.sort_order - b.sort_order)[0];
    let image: ListingVessel["image"];
    if (photo) {
      const { data: s } = await db.storage.from("media").createSignedUrl(photo.storage_path, PHOTO_SECONDS);
      const alt = photo.media_translations.find((t) => t.locale === "en")?.alt;
      if (s?.signedUrl && alt) image = { src: s.signedUrl, alt, width: photo.width, height: photo.height };
    }
    const evaluation = publishable(v.evaluations as EvaluationRow[], "en");
    const p = price.get(v.id);
    out.push({
      id: v.id,
      slug: v.slug,
      name: v.name,
      type: v.type,
      category: v.category,
      maxGuests: v.max_guests,
      cabinCount: v.cabin_count,
      deckCount: v.deck_count,
      sample: v.is_sample,
      showcase: v.visibility === "showcase",
      summary: v.vessel_translations.find((t) => t.locale === "en")?.summary ?? null,
      image,
      evaluation: evaluation?.score,
      indicativePerNight: indicative(v)?.perNight,
      itineraries: v.schedules
        .filter((s) => s.active)
        .map((s) => ({
          origin: s.origin,
          destination: s.destination,
          nights: s.nights,
          departures: s.departures
            .filter((d) => d.status === "scheduled" && d.departs_on > today)
            .map((d) => d.departs_on)
            .sort(),
        })),
      from: p?.amount_minor && p.currency ? { amount: Number(p.amount_minor), currency: p.currency } : undefined,
      bookable: !!p?.bookable,
      fromWithSightseeing:
        p?.sightseeing_amount_minor && p.sightseeing_currency
          ? { amount: Number(p.sightseeing_amount_minor), currency: p.sightseeing_currency }
          : undefined,
      sightseeingBy: (p?.sightseeing_by as "vessel" | "nilecruz" | null) ?? undefined,
    });
  }
  return out;
}

export const publicListing = unstable_cache(loadListing, ["public-listing-v3"], {
  tags: [CATALOGUE_TAG],
  revalidate: CATALOGUE_SECONDS,
});

/** One vessel's page in a language: its own words where they exist, else English. */
async function loadVessel(slug: string, locale: Locale = "en"): Promise<VesselPage | null> {
  const db = visitorDb();
  if (!db) return null;
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" });
  const [{ data: v, error }, { data: prices, error: pe }] = await Promise.all([
    db
      .from("vessels")
      .select(
        `id, slug, name, type, category, max_guests, cabin_count, deck_count, year_built, gratuity_usd_minor, mooring, shared_spaces, dietary_options, is_sample, visibility, sightseeing_approved_at, indicative_price_per_night, indicative_price_currency, vessel_translations(locale, summary, description, dining, good_for, less_suited_to, included, optional_extras, not_included), media(storage_path, width, height, sort_order, cabin_type_id, shows_cabin_type_id, media_translations(locale, alt)), evaluations(${EVALUATION}), external_ratings(source_name, rating, scale, review_count, url, retrieved_on), deck_plans(layout, source_path, source_name, source_bytes, credit), cabin_types(id, code, name, deck, size_m2, bed_configuration, max_occupancy, view, balcony, amenities, active, cabin_count, unverified_fields, sort_order, cabin_type_translations(locale, name)), schedules(id, code, origin, destination, nights, sailing_days, active, sailing_period, sails_at, schedule_periods(starts_on, ends_on), schedule_days(day_number, locale, title, description), departures(id, departs_on, returns_on, status))`,
      )
      .eq("slug", slug)
      .in("visibility", ["published", "showcase"])
      .maybeSingle(),
    db.rpc("public_vessel_prices"),
  ]);
  if (error ?? pe) throw error ?? pe;
  if (!v || (indexingAllowed && v.is_sample)) return null;
  // The gallery, and the photos that show a cabin type (on that cabin's card instead).
  const photos: VesselPage["photos"] = [];
  const cabinPhotos = new Map<string, VesselPage["photos"]>();
  for (const m of [...v.media].filter((m) => !m.cabin_type_id).sort((a, b) => a.sort_order - b.sort_order)) {
    const alt =
      m.media_translations.find((t) => t.locale === locale)?.alt ?? m.media_translations.find((t) => t.locale === "en")?.alt;
    const { data: s } = await db.storage.from("media").createSignedUrl(m.storage_path, PHOTO_SECONDS);
    if (!s?.signedUrl || !alt) continue;
    const photo = { src: s.signedUrl, alt, width: m.width, height: m.height };
    if (m.shows_cabin_type_id) cabinPhotos.set(m.shows_cabin_type_id, [...(cabinPhotos.get(m.shows_cabin_type_id) ?? []), photo]);
    else photos.push(photo);
  }
  // EXP-002 (9-2b): the drawing, and a link that downloads the operator's original under its own file name.
  const plan = v.deck_plans;
  // A stable address on the site that signs a fresh link when clicked: a cached page never offers an expired one.
  const original: NonNullable<VesselPage["deckPlan"]>["original"] =
    plan?.source_path && plan.source_name
      ? { url: `/api/vessel-files/${v.slug}/deck-plan/`, name: plan.source_name, bytes: plan.source_bytes, credit: plan.credit }
      : null;
  const layout = plan ? parseLayout(plan.layout) : null;
  const p = (prices ?? []).find((x) => x.vessel_id === v.id);
  const en = v.vessel_translations.find((t) => t.locale === "en");
  const own = v.vessel_translations.find((t) => t.locale === locale);
  // Each text in the page's language when it has been written, else in English.
  const say = <K extends "summary" | "description" | "dining" | "good_for" | "less_suited_to">(k: K) =>
    own?.[k] ?? en?.[k] ?? null;
  const listed = (k: "included" | "optional_extras" | "not_included") => (own?.[k]?.length ? own[k] : (en?.[k] ?? []));
  // ADR-102: Nilecruz's sightseeing programme for each itinerary (published, with an office and an active programme
  // rate); none for a vessel that sells its own. Priced per person for a party of two (the database prices the party).
  const { data: progs } = await db
    .from("tour_schedules")
    .select("schedule_id, tour:tours!inner(name, slug, visibility, office_id, tour_rates(mode, active, prices))")
    .in(
      "schedule_id",
      v.schedules.map((s) => s.id),
    );
  const programmeFor = (scheduleId: string) => {
    for (const row of progs ?? []) {
      if (row.schedule_id !== scheduleId || row.tour.visibility !== "published" || !row.tour.office_id) continue;
      const rate = row.tour.tour_rates.find((r) => r.mode === "program" && r.active);
      const tiers = (rate?.prices as { tiers?: { min: number; max: number | null; pp: number }[] } | undefined)?.tiers ?? [];
      const two = tiers.find((t) => 2 >= t.min && (t.max === null || 2 <= t.max));
      if (two) return { name: row.tour.name, slug: row.tour.slug, ppForTwoMinor: two.pp };
    }
    return undefined;
  };
  // ADR-102: what an approved vessel's sightseeing includes (row-level security shows approved vessels' only).
  const { data: incl } = await db
    .from("schedule_sightseeing")
    .select("schedule_id, guide, tickets_included, sites, note")
    .in(
      "schedule_id",
      v.schedules.map((s) => s.id),
    );
  return {
    id: v.id,
    slug: v.slug,
    name: v.name,
    type: v.type,
    category: v.category,
    maxGuests: v.max_guests,
    cabinCount: v.cabin_count,
    deckCount: v.deck_count,
    mooring: v.mooring,
    sharedSpaces: v.shared_spaces,
    yearBuilt: v.year_built,
    sample: v.is_sample,
    showcase: v.visibility === "showcase",
    summary: say("summary"),
    description: say("description"),
    dining: say("dining"),
    goodFor: say("good_for"),
    lessSuitedTo: say("less_suited_to"),
    inclusions: { included: listed("included"), optional: listed("optional_extras"), notIncluded: listed("not_included") },
    indicativePrice: indicative(v),
    dietaryOptions: v.dietary_options,
    gratuityUsdMinor: v.gratuity_usd_minor === null ? null : Number(v.gratuity_usd_minor),
    photos,
    cabins: v.cabin_types
      .filter((c) => c.active)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((c) => ({
        id: c.id,
        code: c.code,
        name: c.cabin_type_translations.find((t) => t.locale === locale)?.name ?? c.name,
        deck: c.deck,
        sizeM2: c.size_m2 === null ? null : Number(c.size_m2),
        bed: c.bed_configuration,
        maxOccupancy: c.max_occupancy,
        view: c.view,
        balcony: c.balcony,
        amenities: c.amenities,
        count: c.cabin_count,
        unverified: c.unverified_fields as CabinFact[],
        photos: cabinPhotos.get(c.id) ?? [],
      })),
    deckPlan: plan ? { layout, original } : null,
    itineraries: v.schedules
      .filter((s) => s.active)
      .map((s) => ({
        id: s.id,
        code: s.code,
        origin: s.origin,
        destination: s.destination,
        nights: s.nights,
        sailingPeriod: s.sailing_period,
        sailsAt: s.sails_at,
        // The programme in the page's language when every day is written in it, else in English.
        days: s.schedule_days
          .filter(
            (d) =>
              d.locale ===
              (s.schedule_days.filter((x) => x.locale === locale).length ===
              s.schedule_days.filter((x) => x.locale === "en").length
                ? locale
                : "en"),
          )
          .sort((a, b) => a.day_number - b.day_number)
          .map((d) => ({ day: d.day_number, title: d.title, body: d.description ?? "" })),
        departures: s.departures
          .filter((d) => d.status === "scheduled" && d.departs_on > today)
          .map((d) => d.departs_on)
          .sort(),
        sailingDays: s.sailing_days,
        periods: s.schedule_periods.map((p) => ({ startsOn: p.starts_on, endsOn: p.ends_on })),
        sailings: s.departures
          .filter((d) => d.departs_on > today)
          .map((d) => ({ id: d.id, departsOn: d.departs_on, returnsOn: d.returns_on, status: d.status }))
          .sort((a, b) => a.departsOn.localeCompare(b.departsOn)),
        sightseeing: (() => {
          const x = (incl ?? []).find((i) => i.schedule_id === s.id);
          return x ? { guide: x.guide, ticketsIncluded: x.tickets_included, sites: x.sites, note: x.note } : undefined;
        })(),
        programme: v.sightseeing_approved_at ? undefined : programmeFor(s.id),
      })),
    evaluation: publishable(v.evaluations as EvaluationRow[], locale),
    externalRatings: v.external_ratings.map((r) => ({
      source: r.source_name,
      rating: Number(r.rating),
      scale: Number(r.scale),
      count: r.review_count,
      url: r.url,
      retrievedOn: r.retrieved_on,
    })),
    from: p?.amount_minor && p.currency ? { amount: Number(p.amount_minor), currency: p.currency } : undefined,
    bookable: !!p?.bookable,
    fromWithSightseeing:
      p?.sightseeing_amount_minor && p.sightseeing_currency
        ? { amount: Number(p.sightseeing_amount_minor), currency: p.sightseeing_currency }
        : undefined,
    sightseeingBy: (p?.sightseeing_by as "vessel" | "nilecruz" | null) ?? undefined,
  };
}

/** One vessel's public page data, cached like the listing (the slug and language are part of the cache key). */
export const publicVessel = unstable_cache(loadVessel, ["public-vessel-v3"], {
  tags: [CATALOGUE_TAG],
  revalidate: CATALOGUE_SECONDS,
});

async function loadSailingModes(vesselId: string) {
  const db = visitorDb();
  if (!db) return [];
  const { data, error } = await db.rpc("public_sailing_modes", { target: vesselId });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    scheduleId: r.schedule_id,
    departsOn: r.departs_on,
    returnsOn: r.returns_on,
    mode: r.booking_mode,
  }));
}

/** DASH-PUB-011: each sailing's booking mode as a visitor may see it (no prices, no counts), cached like the listing. */
export const publicSailingModes = unstable_cache(loadSailingModes, ["public-sailing-modes-v1"], {
  tags: [CATALOGUE_TAG],
  revalidate: CATALOGUE_SECONDS,
});

/**
 * A vessel's main photo or its official deck plan, found as a visitor finds them (row-level security decides), as a
 * fresh signed link. Behind the stable addresses /api/vessel-files/{slug}/photo/ and …/deck-plan/, so shared links,
 * og:image and cached pages never point at a link that has expired.
 */
export async function vesselFileUrl(slug: string, file: "photo" | "deck-plan"): Promise<string | null> {
  const db = visitorDb();
  if (!db) return null;
  const { data: v } = await db
    .from("vessels")
    .select("is_sample, media(storage_path, sort_order, shows_cabin_type_id), deck_plans(source_path, source_name)")
    .eq("slug", slug)
    .in("visibility", ["published", "showcase"])
    .maybeSingle();
  if (!v || (indexingAllowed && v.is_sample)) return null;
  if (file === "deck-plan") {
    const plan = v.deck_plans;
    if (!plan?.source_path || !plan.source_name) return null;
    const { data: s } = await db.storage
      .from("deck-plans")
      .createSignedUrl(plan.source_path, 300, { download: plan.source_name });
    return s?.signedUrl ?? null;
  }
  const photo = [...v.media].filter((m) => !m.shows_cabin_type_id).sort((a, b) => a.sort_order - b.sort_order)[0];
  if (!photo) return null;
  const { data: s } = await db.storage.from("media").createSignedUrl(photo.storage_path, 300);
  return s?.signedUrl ?? null;
}
