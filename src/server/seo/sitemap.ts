import "server-only";
import { createClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import { blogPaths, postUrl } from "@/lib/content/blog";
import { tourUrl } from "@/lib/content/tours";
import { env } from "@/lib/env";
import { indexablePaths } from "@/lib/seo/sitemap";
import type { Database } from "@/server/db/database.types";
import { CONTENT_TAG } from "@/server/content/pages";
import { blogPosts } from "@/server/content/posts";
import { CATALOGUE_SECONDS, CATALOGUE_TAG } from "@/server/marketplace/queries";

/**
 * SEO-019: the public, real (not sample) vessels and tours, for the sitemaps. Showcase vessels are listed too: their
 * pages are public and indexable (only samples are noindex); they just can't be booked yet. Blog posts come from Sanity
 * (ADR-105); English decides the paths, and each language's sitemap keeps only what's translated. `modified` is the date
 * each vessel, tour and post last changed, for the sitemaps' lastmod.
 */
export type SitemapPaths = { paths: string[]; modified: Record<string, string> };

async function load(): Promise<SitemapPaths> {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const posts = await blogPosts("en");
  const blog = blogPaths(posts);
  const modified: Record<string, string> = {};
  for (const p of posts) if (!p.sample) modified[postUrl(p.slug)] = p.updatedAt ?? p.publishedAt;
  if (!url || !key) return { paths: indexablePaths([], [], blog), modified };
  const db = createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const [vessels, tours] = await Promise.all([
    db.from("vessels").select("slug, updated_at").in("visibility", ["published", "showcase"]).eq("is_sample", false),
    db.from("tours").select("slug, updated_at").eq("visibility", "published").eq("is_sample", false),
  ]);
  if (vessels.error) throw vessels.error;
  if (tours.error) throw tours.error;
  for (const v of vessels.data ?? []) modified[`/cruises/${v.slug}/`] = v.updated_at;
  for (const t of tours.data ?? []) modified[tourUrl(t.slug)] = t.updated_at;
  return {
    paths: indexablePaths(
      (vessels.data ?? []).map((v) => `/cruises/${v.slug}/`),
      (tours.data ?? []).map((t) => tourUrl(t.slug)),
      blog,
    ),
    modified,
  };
}

export const sitemapPaths = unstable_cache(load, ["sitemap-paths-v4"], {
  tags: [CATALOGUE_TAG, CONTENT_TAG],
  revalidate: CATALOGUE_SECONDS,
});
