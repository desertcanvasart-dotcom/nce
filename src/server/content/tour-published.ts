import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env, indexingAllowed } from "@/lib/env";
import type { Database } from "@/server/db/database.types";

const SECONDS = 600;
const seen = new Map<string, { published: boolean; until: number }>();

/**
 * Whether a tour's own page exists, read as a visitor (the same rule as `publicTours`), for the proxy's live-site
 * redirects (SEO-022). Kept for 10 minutes, like the catalogue. Unknown (no database, or an error) counts as published,
 * so the visitor lands on the tour's page as normal.
 */
export async function tourPublished(slug: string): Promise<boolean> {
  const hit = seen.get(slug);
  if (hit && hit.until > Date.now()) return hit.published;
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return true;
  const db = createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await db.from("tours").select("is_sample").eq("slug", slug).eq("visibility", "published").maybeSingle();
  if (error) return true;
  const published = !!data && !(indexingAllowed && data.is_sample);
  seen.set(slug, { published, until: Date.now() + SECONDS * 1000 });
  return published;
}
