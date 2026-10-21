import "server-only";
import { createClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import { env, indexingAllowed } from "@/lib/env";
import type { ListingVessel } from "@/lib/marketplace/listing";
import type { VesselPage } from "@/lib/marketplace/vessel";
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

async function loadListing(): Promise<ListingVessel[]> {
  const db = visitorDb();
  // Builds without a database (Lighthouse in CI) render an empty marketplace; it fills on the first refresh.
  if (!db) return [];
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" });
  const [{ data: vessels, error }, { data: prices, error: pe }] = await Promise.all([
    db
      .from("vessels")
      .select(
        "id, slug, name, type, category, max_guests, cabin_count, deck_count, is_sample, visibility, vessel_translations(locale, summary), media(storage_path, width, height, sort_order, media_translations(locale, alt)), evaluations(overall_score, published_at), schedules(origin, destination, nights, active, departures(departs_on, status))",
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
    const photo = [...v.media].sort((a, b) => a.sort_order - b.sort_order)[0];
    let image: ListingVessel["image"];
    if (photo) {
      const { data: s } = await db.storage.from("media").createSignedUrl(photo.storage_path, PHOTO_SECONDS);
      const alt = photo.media_translations.find((t) => t.locale === "en")?.alt;
      if (s?.signedUrl && alt) image = { src: s.signedUrl, alt, width: photo.width, height: photo.height };
    }
    const evaluation = [...v.evaluations].sort((a, b) => (b.published_at ?? "").localeCompare(a.published_at ?? ""))[0];
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
      evaluation: evaluation ? Number(evaluation.overall_score) : undefined,
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
    });
  }
  return out;
}

export const publicListing = unstable_cache(loadListing, ["public-listing-v2"], {
  tags: [CATALOGUE_TAG],
  revalidate: CATALOGUE_SECONDS,
});

async function loadVessel(slug: string): Promise<VesselPage | null> {
  const db = visitorDb();
  if (!db) return null;
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" });
  const [{ data: v, error }, { data: prices, error: pe }] = await Promise.all([
    db
      .from("vessels")
      .select(
        "id, slug, name, type, category, max_guests, cabin_count, deck_count, year_built, gratuity_usd_minor, is_sample, visibility, vessel_translations(locale, summary, description), media(storage_path, width, height, sort_order, cabin_type_id, media_translations(locale, alt)), evaluations(overall_score, verdict, assessed_on, evaluator, dimension_results, published_at), external_ratings(source_name, rating, scale, review_count, url, retrieved_on), cabin_types(id, name, deck, size_m2, bed_configuration, max_occupancy, view, balcony, amenities, active), schedules(id, code, origin, destination, nights, active, sailing_period, sails_at, schedule_days(day_number, locale, title, description), departures(departs_on, status))",
      )
      .eq("slug", slug)
      .in("visibility", ["published", "showcase"])
      .maybeSingle(),
    db.rpc("public_vessel_prices"),
  ]);
  if (error ?? pe) throw error ?? pe;
  if (!v || (indexingAllowed && v.is_sample)) return null;
  const photos: VesselPage["photos"] = [];
  for (const m of [...v.media].filter((m) => !m.cabin_type_id).sort((a, b) => a.sort_order - b.sort_order)) {
    const alt = m.media_translations.find((t) => t.locale === "en")?.alt;
    const { data: s } = await db.storage.from("media").createSignedUrl(m.storage_path, PHOTO_SECONDS);
    if (s?.signedUrl && alt) photos.push({ src: s.signedUrl, alt, width: m.width, height: m.height });
  }
  const ev = [...v.evaluations].sort((a, b) => (b.published_at ?? "").localeCompare(a.published_at ?? ""))[0];
  const p = (prices ?? []).find((x) => x.vessel_id === v.id);
  const en = v.vessel_translations.find((t) => t.locale === "en");
  return {
    id: v.id,
    slug: v.slug,
    name: v.name,
    type: v.type,
    category: v.category,
    maxGuests: v.max_guests,
    cabinCount: v.cabin_count,
    deckCount: v.deck_count,
    yearBuilt: v.year_built,
    sample: v.is_sample,
    showcase: v.visibility === "showcase",
    summary: en?.summary ?? null,
    description: en?.description ?? null,
    gratuityUsdMinor: v.gratuity_usd_minor === null ? null : Number(v.gratuity_usd_minor),
    photos,
    cabins: v.cabin_types
      .filter((c) => c.active)
      .map((c) => ({
        id: c.id,
        name: c.name,
        deck: c.deck,
        sizeM2: c.size_m2 === null ? null : Number(c.size_m2),
        bed: c.bed_configuration,
        maxOccupancy: c.max_occupancy,
        view: c.view,
        balcony: c.balcony,
        amenities: c.amenities,
      })),
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
        days: s.schedule_days
          .filter((d) => d.locale === "en")
          .sort((a, b) => a.day_number - b.day_number)
          .map((d) => ({ day: d.day_number, title: d.title, body: d.description ?? "" })),
        departures: s.departures
          .filter((d) => d.status === "scheduled" && d.departs_on > today)
          .map((d) => d.departs_on)
          .sort(),
      })),
    evaluation: ev
      ? {
          score: Number(ev.overall_score),
          verdict: ev.verdict,
          assessedOn: ev.assessed_on,
          evaluator: ev.evaluator,
          dimensions: Object.fromEntries(
            Object.entries((ev.dimension_results ?? {}) as Record<string, number>).map(([k, n]) => [k, Number(n)]),
          ),
        }
      : undefined,
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
  };
}

/** One vessel's public page data, cached like the listing (the slug is part of the cache key). */
export const publicVessel = unstable_cache(loadVessel, ["public-vessel-v1"], {
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
