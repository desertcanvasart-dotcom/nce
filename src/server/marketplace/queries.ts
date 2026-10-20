import "server-only";
import { createClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import { env, indexingAllowed } from "@/lib/env";
import type { ListingVessel } from "@/lib/marketplace/listing";
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
