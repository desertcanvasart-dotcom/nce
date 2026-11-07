import "server-only";
import { createClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import { blogPaths } from "@/lib/content/blog";
import { tourUrl } from "@/lib/content/tours";
import { env } from "@/lib/env";
import { indexablePaths } from "@/lib/seo/sitemap";
import type { Database } from "@/server/db/database.types";
import { CONTENT_TAG } from "@/server/content/pages";
import { blogPosts } from "@/server/content/posts";
import { livePages } from "@/lib/marketplace/listing";
import { CATALOGUE_SECONDS, CATALOGUE_TAG, publicListing } from "@/server/marketplace/queries";

/**
 * SEO-019: the public, real (not sample) vessels and tours, for the sitemaps. Showcase vessels are listed too: their
 * pages are public and indexable (only samples are noindex); they just can't be booked yet. Blog posts come from Sanity
 * (ADR-105); English decides the paths, and each language's sitemap keeps only what's translated.
 */
async function load(): Promise<string[]> {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const blog = blogPaths(await blogPosts("en"));
  if (!url || !key) return indexablePaths([], [], blog);
  const db = createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const [vessels, tours, listing] = await Promise.all([
    db.from("vessels").select("slug").in("visibility", ["published", "showcase"]).eq("is_sample", false),
    db.from("tours").select("slug").eq("visibility", "published").eq("is_sample", false),
    publicListing(),
  ]);
  if (vessels.error) throw vessels.error;
  if (tours.error) throw tours.error;
  return indexablePaths(
    (vessels.data ?? []).map((v) => `/cruises/${v.slug}/`),
    (tours.data ?? []).map((t) => tourUrl(t.slug)),
    blog,
    // ADR-113: gated pages (Lake Nasser) join once the catalogue has a real vessel for them.
    [...livePages(listing)],
  );
}

export const sitemapPaths = unstable_cache(load, ["sitemap-paths-v4"], {
  tags: [CATALOGUE_TAG, CONTENT_TAG],
  revalidate: CATALOGUE_SECONDS,
});
