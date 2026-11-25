/**
 * Mövenpick SS Misr is a steamship (Islam, 25 November 2026): its type and propulsion are steam, and its English texts
 * don't call it a "Nile cruiser".
 *
 *   tsx scripts/apply-misr-steamship.ts --target=staging            report only
 *   tsx scripts/apply-misr-steamship.ts --apply --target=staging
 *
 * Production also needs --confirm-production.
 */
import { createClient } from "@supabase/supabase-js";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Database } from "../src/server/db/database.types";
import { refreshSite } from "./lib/refresh-site";

const STAGING_REF = "fmidxxcadbuzxaxyohtk"; // public project id of the staging database
const reword = (text: string | null) => text?.replace("heritage Nile cruiser", "heritage Nile steamship") ?? text;

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const target = args.find((a) => a.startsWith("--target="))?.split("=")[1];

function connect() {
  let url: string;
  let key: string;
  if (target === "staging") {
    url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    key = process.env.SUPABASE_SECRET_KEY ?? "";
    if (new URL(url).hostname !== `${STAGING_REF}.supabase.co`)
      throw new Error("Refusing: NEXT_PUBLIC_SUPABASE_URL is not the staging project.");
  } else if (target === "production") {
    if (apply && !args.includes("--confirm-production")) throw new Error("Writing to production needs --confirm-production.");
    url = process.env.PRODUCTION_SUPABASE_URL ?? "";
    key = process.env.PRODUCTION_SUPABASE_SECRET_KEY ?? "";
    const ref = process.env.PRODUCTION_SUPABASE_PROJECT_REF ?? "";
    if (!ref || ref === STAGING_REF || new URL(url).hostname !== `${ref}.supabase.co`)
      throw new Error("Refusing: PRODUCTION_SUPABASE_URL does not match PRODUCTION_SUPABASE_PROJECT_REF.");
  } else {
    throw new Error("--target must be staging or production.");
  }
  if (!key) throw new Error(`No secret key set for ${target}.`);
  return createClient<Database>(url, key, { auth: { persistSession: false } });
}

const must = <T>(r: { data: T; error: { message: string } | null }, what: string): T => {
  if (r.error) throw new Error(`${what}: ${r.error.message}`);
  return r.data;
};

async function run() {
  const db = connect();
  const v = must(
    await db
      .from("vessels")
      .select("id, name, type, propulsion, vessel_translations(*)")
      .eq("slug", "movenpick-ss-misr")
      .single(),
    "SS Misr",
  )!;
  const en = v.vessel_translations.find((t) => t.locale === "en");
  console.log(`${target}: ${v.name}\n  type ${v.type} → steam, propulsion ${v.propulsion} → steam`);
  for (const k of ["summary", "description"] as const)
    if (en && en[k] !== reword(en[k])) console.log(`  ${k}\n    now: ${en[k]}\n    new: ${reword(en[k])}`);
  if (!apply) return console.log("\nReport only; nothing written.");

  mkdirSync(resolve(import.meta.dirname, "../.import-backups"), { recursive: true });
  const backup = resolve(
    import.meta.dirname,
    `../.import-backups/misr-steamship-${target}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
  );
  writeFileSync(backup, JSON.stringify(v, null, 2));
  console.log(`\nBackup: ${backup}`);
  must(await db.from("vessels").update({ type: "steam", propulsion: "steam" }).eq("id", v.id), "type");
  if (en)
    must(
      await db
        .from("vessel_translations")
        .update({ summary: reword(en.summary), description: reword(en.description) })
        .eq("vessel_id", v.id)
        .eq("locale", "en"),
      "texts",
    );
  console.log("✓ marked as a steamship");
  await refreshSite(target!);
}

run().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
