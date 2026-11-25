/**
 * Mövenpick public "from" prices (Islam, 25 November 2026: euros per person per night, sightseeing not included and
 * sold separately) and the three inclusion lists on each boat's page. Selling figures only: no operator rate, margin
 * or rate list belongs here.
 *
 *   tsx scripts/apply-movenpick-prices.ts --target=staging                report only
 *   tsx scripts/apply-movenpick-prices.ts --apply --target=staging
 *
 * Production also needs --confirm-production and --operator-approved: the site shows a price only when the operator
 * has approved it, so that is never assumed there. Staging is marked approved to preview it. Every --apply first
 * saves the affected rows to .import-backups/ (git-ignored).
 */
import { createClient } from "@supabase/supabase-js";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Database } from "../src/server/db/database.types";
import { refreshSite } from "./lib/refresh-site";

const STAGING_REF = "fmidxxcadbuzxaxyohtk"; // public project id of the staging database
const CHECKED = "2026-11-25";

const FULL_BOARD = ["Full board", "Service charge and VAT"];
const SOFT_ALL_INCLUSIVE = ["Soft all-inclusive, with local alcoholic and non-alcoholic drinks", "Service charge and VAT"];
const EXTRAS = ["Sightseeing package, sold separately: ask for it with your offer"];
const NOT_INCLUDED = ["Sightseeing tours, guides and entry tickets"];

// `until` is the last day the lowest figure applies; after it the page shows "Price on request" until updated.
const BOATS: { slug: string; euros: number | null; until: string | null; included: string[] }[] = [
  { slug: "movenpick-darakum", euros: 422, until: "2027-05-27", included: FULL_BOARD },
  { slug: "movenpick-hamees", euros: 378, until: "2028-04-30", included: FULL_BOARD },
  { slug: "movenpick-sun-ray", euros: 378, until: "2027-04-29", included: FULL_BOARD },
  { slug: "movenpick-ss-misr", euros: 880, until: "2027-12-23", included: FULL_BOARD },
  { slug: "movenpick-sb-feddya", euros: null, until: null, included: SOFT_ALL_INCLUSIVE },
];

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

const must = <T>(r: { data: T; error: { message: string } | null }, what: string): T => {
  if (r.error) throw new Error(`${what}: ${r.error.message}`);
  return r.data;
};

async function run() {
  const db = connect();
  const before =
    must(
      await db
        .from("vessels")
        .select("*, vessel_translations(*)")
        .in(
          "slug",
          BOATS.map((b) => b.slug),
        ),
      "snapshot",
    ) ?? [];

  console.log(target);
  for (const b of BOATS) {
    const e = before.find((r) => r.slug === b.slug);
    if (!e) throw new Error(`${b.slug}: not found in ${target}`);
    const en = e.vessel_translations.find((t) => t.locale === "en");
    const now = e.from_price_minor ? `€${Number(e.from_price_minor) / 100}` : e.public_pricing_mode;
    const next = b.euros ? `from €${b.euros} per person per night, shown until ${b.until}` : "unchanged";
    console.log(`~ ${e.name} (${e.visibility})\n    price: ${now} → ${next}`);
    console.log(`    included: ${JSON.stringify(en?.included ?? [])} → ${JSON.stringify(b.included)}`);
    console.log(`    optional: ${JSON.stringify(en?.optional_extras ?? [])} → ${JSON.stringify(EXTRAS)}`);
    console.log(`    not included: ${JSON.stringify(en?.not_included ?? [])} → ${JSON.stringify(NOT_INCLUDED)}`);
    if (e.sightseeing_approved_at) throw new Error(`${b.slug}: marked as selling sightseeing included; check that first`);
  }
  if (!apply) return console.log("\nReport only; nothing written.");

  mkdirSync(resolve(import.meta.dirname, "../.import-backups"), { recursive: true });
  const backup = resolve(
    import.meta.dirname,
    `../.import-backups/movenpick-prices-${target}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
  );
  writeFileSync(backup, JSON.stringify(before, null, 2));
  console.log(`\nBackup: ${backup}`);

  for (const b of BOATS) {
    const e = before.find((r) => r.slug === b.slug)!;
    if (b.euros)
      must(
        await db
          .from("vessels")
          .update({
            public_pricing_mode: "from_price",
            from_price_minor: b.euros * 100,
            pricing_currency: "EUR",
            pricing_basis: "per_person_per_night",
            pricing_trip_nights: null,
            pricing_valid_from: null,
            pricing_valid_to: b.until,
            pricing_last_checked: CHECKED,
            operator_pricing_approved: true,
          })
          .eq("id", e.id),
        `${b.slug}: price`,
      );
    const lists = { included: b.included, optional_extras: EXTRAS, not_included: NOT_INCLUDED };
    const table = db.from("vessel_translations");
    must(
      e.vessel_translations.some((t) => t.locale === "en")
        ? await table.update(lists).eq("vessel_id", e.id).eq("locale", "en")
        : await table.insert({ vessel_id: e.id, locale: "en", ...lists }),
      `${b.slug}: inclusions`,
    );
    console.log(`✓ ${e.name}`);
  }
  await refreshSite(target!);
}

run().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
