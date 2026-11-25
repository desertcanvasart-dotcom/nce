/**
 * Mövenpick MS Hamees's "from" price for Egyptians and foreign residents (Islam, 25 November 2026; ADR-113): a selling
 * figure in Egyptian pounds per person per night, sightseeing not included. No operator rate belongs here.
 * Needs migration 20261125000100_resident_price on the target first.
 *
 *   tsx scripts/apply-resident-price.ts --target=staging            report only
 *   tsx scripts/apply-resident-price.ts --apply --target=staging
 *
 * Production also needs --confirm-production.
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/server/db/database.types";
import { refreshSite } from "./lib/refresh-site";

const STAGING_REF = "fmidxxcadbuzxaxyohtk"; // public project id of the staging database
const BOATS = [{ slug: "movenpick-hamees", pounds: 14410, until: "2027-05-02" }];

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

async function run() {
  const db = connect();
  for (const b of BOATS) {
    const { data: v, error } = await db
      .from("vessels")
      .select("id, name, resident_from_minor, resident_pricing_valid_to")
      .eq("slug", b.slug)
      .single();
    if (error) throw new Error(`${b.slug}: ${error.message} (is the migration applied to ${target}?)`);
    const now = v.resident_from_minor ? `E£${Number(v.resident_from_minor) / 100}` : "none";
    console.log(`${target}: ${v.name}: resident price ${now} → from E£${b.pounds} per person per night, until ${b.until}`);
    if (!apply) continue;
    const { error: failed } = await db
      .from("vessels")
      .update({
        resident_from_minor: b.pounds * 100,
        resident_pricing_basis: "per_person_per_night",
        resident_pricing_valid_to: b.until,
        resident_pricing_approved: true,
      })
      .eq("id", v.id);
    if (failed) throw new Error(`${b.slug}: ${failed.message}`);
    console.log("✓ set");
  }
  if (!apply) return console.log("\nReport only; nothing written.");
  await refreshSite(target!);
}

run().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
