/**
 * SB Feddya's English page texts (Mövenpick, via Islam, 25 November 2026: no set schedule; sails any day on request
 * from one suite; minimum 4 nights; charter-only holiday periods from the 2027 fact sheet).
 *
 *   tsx scripts/apply-feddya-text.ts --target=staging            report only
 *   tsx scripts/apply-feddya-text.ts --apply --target=staging
 *
 * Production also needs --confirm-production. Data only: no deploy needed.
 */
import { createClient } from "@supabase/supabase-js";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Database } from "../src/server/db/database.types";
import { refreshSite } from "./lib/refresh-site";

const STAGING_REF = "fmidxxcadbuzxaxyohtk"; // public project id of the staging database

const TEXT = {
  summary:
    "A four-suite Mövenpick dahabiya for up to eight guests, sailing on request: 4 to 7 nights between Luxor and Aswan, from one suite booked.",
  description: [
    "The Mövenpick SB Feddya is a dahabiya with four suites for up to eight guests: two Senior Suites, each with a patio, and two Panorama Suites, each with a balcony.",
    "It sails on any day, subject to availability, once one suite is booked, for 4 to 7 nights from Luxor or Aswan. Its programmes add lesser-visited places such as El Kab and Gebel El Silsila to the great temples.",
    "From 22 March to 1 April 2027 and from 20 December 2027 to 4 January 2028 it is available only as a whole-boat charter.",
  ].join("\n\n"),
  good_to_know: [
    "Sails on any day, subject to availability, from one suite booked.",
    "22 March to 1 April 2027 and 20 December 2027 to 4 January 2028: whole-boat charter only, up to 8 guests.",
    "Minimum 4 nights; 5 nights over Christmas and New Year.",
    "Embarkation at noon, check-out at 8:00.",
  ],
};

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
    await db.from("vessels").select("id, name, vessel_translations(*)").eq("slug", "movenpick-sb-feddya").single(),
    "Feddya",
  )!;
  const en = v.vessel_translations.find((t) => t.locale === "en");
  if (!en) throw new Error("Feddya has no English texts to update.");
  console.log(`${target}: ${v.name}`);
  for (const k of ["summary", "description", "good_to_know"] as const)
    console.log(`  ${k}\n    now:  ${JSON.stringify(en[k])}\n    new:  ${JSON.stringify(TEXT[k])}`);
  const other = v.vessel_translations.filter((t) => t.locale !== "en").map((t) => t.locale);
  if (other.length) console.log(`  texts in ${other.join(", ")} stay as they are: check them`);
  if (!apply) return console.log("\nReport only; nothing written.");

  mkdirSync(resolve(import.meta.dirname, "../.import-backups"), { recursive: true });
  const backup = resolve(
    import.meta.dirname,
    `../.import-backups/feddya-text-${target}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
  );
  writeFileSync(backup, JSON.stringify(v.vessel_translations, null, 2));
  console.log(`\nBackup: ${backup}`);
  must(await db.from("vessel_translations").update(TEXT).eq("vessel_id", v.id).eq("locale", "en"), "texts");
  console.log("✓ texts updated");
  await refreshSite(target!);
}

run().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
