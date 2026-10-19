/**
 * CONTENT-NEEDED #39: import the tours and extras from nilecruz.com/tours as PRIVATE drafts.
 *
 *   pnpm import:tours                                   dry run: checks docs/imports/nilecruz-tours.json, changes nothing
 *   pnpm import:tours --apply --target=local            into the local Docker database
 *   pnpm import:tours --apply --target=staging          into staging, only after Faris approves
 *
 * Production is refused. Existing tours (same slug) are never overwritten, so admin edits survive a re-run.
 * Tours stay unbookable until an admin adds a supplier, cancellation bands and sessions (DASH-ADM-073).
 */
import { createClient } from "@supabase/supabase-js";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Database } from "../src/server/db/database.types";
import { planTourImport, type SourceTour } from "./lib/tour-import";

const STAGING_REF = "fmidxxcadbuzxaxyohtk"; // public project id of the staging database
const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--")) ?? resolve(import.meta.dirname, "../docs/imports/nilecruz-tours.json");
const apply = args.includes("--apply");
const target = args.find((a) => a.startsWith("--target="))?.split("=")[1];

const plan = planTourImport(JSON.parse(readFileSync(resolve(file), "utf8")) as SourceTour[]);
if (plan.problems.length) {
  console.error(`Not imported; fix these first:\n- ${plan.problems.join("\n- ")}`);
  process.exit(1);
}

async function write() {
  let url: string;
  let key: string;
  if (target === "local") {
    const status = JSON.parse(execFileSync("supabase", ["status", "-o", "json"], { encoding: "utf8" })) as Record<string, string>;
    url = status.API_URL!;
    key = status.SERVICE_ROLE_KEY!;
  } else if (target === "staging") {
    url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    key = process.env.SUPABASE_SECRET_KEY ?? "";
    if (new URL(url).hostname !== `${STAGING_REF}.supabase.co`)
      throw new Error("Refusing: NEXT_PUBLIC_SUPABASE_URL is not the staging project.");
    if (!key) throw new Error("SUPABASE_SECRET_KEY is not set.");
  } else {
    throw new Error("--apply needs --target=local or --target=staging. Production is never a target.");
  }
  const db = createClient<Database>(url, key, { auth: { persistSession: false } });
  const { data, error } = await db
    .from("tours")
    .upsert(
      plan.tours.map((t) => ({ ...t, visibility: "private" as const })),
      { onConflict: "slug", ignoreDuplicates: true },
    )
    .select("id, slug");
  if (error) throw error;
  if (data.length) {
    const { error: e2 } = await db.from("tour_translations").upsert(
      data.map((t) => ({ tour_id: t.id, locale: "en" as const, ...plan.translations.get(t.slug)! })),
      { onConflict: "tour_id,locale", ignoreDuplicates: true },
    );
    if (e2) throw e2;
  }
  console.log(`Inserted ${data.length} new private tours into ${target}; ${plan.tours.length - data.length} were already there.`);
}

if (apply) {
  write().catch((e: unknown) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
} else {
  console.log(
    `Dry run: ${plan.tours.length} tours, all valid:\n` +
      plan.tours.map((t) => `- ${t.name} (${t.kind}, ${t.location}, ${t.duration_minutes} min)`).join("\n"),
  );
}
