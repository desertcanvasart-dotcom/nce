import "server-only";
import { createClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import { tourUrl } from "@/lib/content/tours";
import { env } from "@/lib/env";
import { indexablePaths } from "@/lib/seo/sitemap";
import type { Database } from "@/server/db/database.types";
import { CONTENT_TAG } from "@/server/content/pages";
import { CATALOGUE_SECONDS, CATALOGUE_TAG } from "@/server/marketplace/queries";

/**
 * SEO-019: the public, real (not sample) vessels and tours, for the sitemaps. Showcase vessels are listed too: their
 * pages are public and indexable (only samples are noindex); they just can't be booked yet.
 */
async function load(): Promise<string[]> {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return indexablePaths([], []);
  const db = createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const [vessels, tours] = await Promise.all([
    db.from("vessels").select("slug").in("visibility", ["published", "showcase"]).eq("is_sample", false),
    db.from("tours").select("slug").eq("visibility", "published").eq("is_sample", false),
  ]);
  if (vessels.error) throw vessels.error;
  if (tours.error) throw tours.error;
  return indexablePaths(
    (vessels.data ?? []).map((v) => `/cruises/${v.slug}/`),
    (tours.data ?? []).map((t) => tourUrl(t.slug)),
  );
}

export const sitemapPaths = unstable_cache(load, ["sitemap-paths-v2"], {
  tags: [CATALOGUE_TAG, CONTENT_TAG],
  revalidate: CATALOGUE_SECONDS,
});
