/**
 * Nour El Nil public "from" prices (Islam, 25 November 2026): euros per person per night, two sharing, replacing the
 * per-trip figures. Selling figures only; they include our margin, so the pages say so. What each boat includes
 * (sightseeing and the two transfers among it) is not changed.
 *
 *   tsx scripts/apply-nour-el-nil-prices.ts --target=staging            report only
 *   tsx scripts/apply-nour-el-nil-prices.ts --apply --target=staging
 *
 * Production also needs --confirm-production and --operator-approved: a price shows only when the operator has
 * approved it, so that is never assumed there. Every --apply first saves the rows to .import-backups/.
 */
import { createClient } from "@supabase/supabase-js";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Database } from "../src/server/db/database.types";
import { refreshSite } from "./lib/refresh-site";

const STAGING_REF = "fmidxxcadbuzxaxyohtk"; // public project id of the staging database
const CHECKED = "2026-11-25";
const EUROS: Record<string, number> = {
  "nour-el-nil-el-nil": 501,
  "nour-el-nil-malouka": 583,
  "nour-el-nil-meroe": 616,
  "nour-el-nil-agatha": 685,
  "nour-el-nil-adelaide": 685,
  "nour-el-nil-roman": 817,
  "nour-el-nil-poppee": 886,
  "nour-el-nil-najafa": 913,
  "nour-el-nil-dendera": 946,
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
    if (apply && !(args.includes("--confirm-production") && args.includes("--operator-approved")))
      throw new Error("Writing to production needs --confirm-production and --operator-approved.");
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
  const { data: before, error } = await db
    .from("vessels")
    .select("*, vessel_translations(locale, summary, description, good_to_know)")
    .in("slug", Object.keys(EUROS));
  if (error) throw new Error(error.message);
  console.log(target);
  for (const [slug, euros] of Object.entries(EUROS)) {
    const v = before.find((r) => r.slug === slug);
    if (!v) {
      console.log(`! ${slug}: not found, skipped`);
      continue;
    }
    const now = v.from_price_minor ? `€${Number(v.from_price_minor) / 100} ${v.pricing_basis}` : v.public_pricing_mode;
    const quoted = v.vessel_translations.filter((t) => /€\s?\d/.test(JSON.stringify(t))).map((t) => t.locale);
    console.log(
      `~ ${v.name} (${v.visibility}): ${now} → €${euros} per person per night` +
        (v.margin_included ? "" : ' | adds "Includes our margin"') +
        (quoted.length ? ` | its ${quoted.join(", ")} text quotes a euro figure: check it` : ""),
    );
  }
  if (!apply) return console.log("\nReport only; nothing written.");

  mkdirSync(resolve(import.meta.dirname, "../.import-backups"), { recursive: true });
  const backup = resolve(
    import.meta.dirname,
    `../.import-backups/nour-el-nil-prices-${target}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
  );
  writeFileSync(backup, JSON.stringify(before, null, 2));
  console.log(`\nBackup: ${backup}`);
  for (const v of before) {
    const { error: failed } = await db
      .from("vessels")
      .update({
        public_pricing_mode: "from_price",
        from_price_minor: EUROS[v.slug]! * 100,
        pricing_currency: "EUR",
        pricing_basis: "per_person_per_night",
        pricing_trip_nights: null,
        pricing_last_checked: CHECKED,
        operator_pricing_approved: true,
        margin_included: true,
      })
      .eq("id", v.id);
    if (failed) throw new Error(`${v.slug}: ${failed.message}`);
    console.log(`✓ ${v.name}`);
  }
  await refreshSite(target!);
}

run().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
