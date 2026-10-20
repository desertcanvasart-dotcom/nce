import "server-only";
import { createClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import { env, indexingAllowed } from "@/lib/env";
import type { PublicTour } from "@/lib/content/tours";
import { priceLine, rateFromRow } from "@/lib/tours/calendar";
import type { Database } from "@/server/db/database.types";
import { CATALOGUE_SECONDS, CATALOGUE_TAG } from "@/server/marketplace/queries";

/** Published tours, read as a visitor (Batch 7-1), cached with the catalogue. Sample tours never reach production. */
async function loadTours(): Promise<PublicTour[]> {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return [];
  const db = createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await db
    .from("tours")
    .select(
      "id, slug, kind, name, location, duration_minutes, adults_only, is_sample, office_id, tour_translations(locale, description, itinerary, inclusions, exclusions, meeting_point, cancellation_terms), tour_rates(id, mode, label, days, start_times, lead_hours, max_guests, min_guests, prices, active)",
    )
    .eq("visibility", "published")
    .order("name");
  if (error) throw error;
  return (data ?? [])
    .filter((t) => !(indexingAllowed && t.is_sample))
    .map((t) => {
      const en = t.tour_translations.find((x) => x.locale === "en");
      const rates = t.tour_rates.filter((r) => r.active);
      const lines = [...new Map(rates.map((r) => [priceLine(rateFromRow(r)).text, priceLine(rateFromRow(r)).from])).entries()];
      const bookable = Boolean(t.office_id) && rates.length > 0;
      return {
        id: t.id,
        slug: t.slug,
        name: t.name,
        kind: t.kind,
        location: t.location,
        durationMinutes: t.duration_minutes,
        adultsOnly: t.adults_only,
        sample: t.is_sample,
        description: en?.description ?? null,
        itinerary: en?.itinerary ?? [],
        inclusions: en?.inclusions ?? [],
        exclusions: en?.exclusions ?? [],
        meetingPoint: en?.meeting_point ?? null,
        cancellationTerms: en?.cancellation_terms ?? null,
        bookable,
        prices: bookable ? lines.map(([text]) => text) : [],
        fromMinor: bookable ? Math.min(...lines.map(([, from]) => from)) : null,
      };
    });
}

export const publicTours = unstable_cache(loadTours, ["public-tours-v2"], {
  tags: [CATALOGUE_TAG],
  revalidate: CATALOGUE_SECONDS,
});
