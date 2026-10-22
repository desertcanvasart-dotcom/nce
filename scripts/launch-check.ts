/**
 * DATA-025 (Batch 11): run before switching indexing on (docs/LAUNCH.md). Reads, with the public key, what any visitor
 * can see, and fails if a sample vessel or tour, or a showcase exception, is still public.
 *   NEXT_PUBLIC_SUPABASE_URL=… NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=… pnpm launch:check
 * Read-only, so it is safe against production.
 */
import { createClient } from "@supabase/supabase-js";
import { launchProblems } from "../src/lib/launch/showcase";
import type { Database } from "../src/server/db/database.types";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY for the target.");
  const db = createClient<Database>(url, key, { auth: { persistSession: false } });
  const [vessels, tours] = await Promise.all([
    db.from("vessels").select("slug, visibility, is_sample"),
    db.from("tours").select("slug, is_sample").eq("visibility", "published"),
  ]);
  if (vessels.error) throw vessels.error;
  if (tours.error) throw tours.error;
  const problems = launchProblems({ vessels: vessels.data ?? [], tours: tours.data ?? [] });
  console.log(
    `${new URL(url).hostname}: ${vessels.data?.length ?? 0} public vessels, ${tours.data?.length ?? 0} published tours.`,
  );
  if (problems.length) {
    console.error(`Not ready for launch:\n- ${problems.join("\n- ")}`);
    process.exit(1);
  }
  console.log("Ready: no sample data or showcase exception is public.");
}

void main();
