/**
 * "From" prices with sightseeing and two airport transfers for the Nile cruise ships that show a price (Islam,
 * 25 November 2026), and the three inclusion lists to match. Selling figures only. Dahabiyas are not touched: theirs already include sightseeing.
 * Resident prices are not touched either; their own line says sightseeing is not included.
 *
 *   tsx scripts/apply-sightseeing-prices.ts --target=staging                report only
 *   tsx scripts/apply-sightseeing-prices.ts --apply --target=staging
 *
 * Production also needs --confirm-production. Every --apply first saves the affected rows to .import-backups/.
 */
import { createClient } from "@supabase/supabase-js";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Database } from "../src/server/db/database.types";
import { refreshSite } from "./lib/refresh-site";

const STAGING_REF = "fmidxxcadbuzxaxyohtk"; // public project id of the staging database
const CHECKED = "2026-11-25";
const SIGHTSEEING: Record<string, string> = {
  en: "Sightseeing tours, guides and entry tickets",
  es: "Visitas turísticas, guías y entradas",
  ja: "観光ツアー、ガイド、入場券",
};
const TRANSFERS: Record<string, string> = {
  en: "Two airport transfers, at the start and end of your cruise (Luxor or Aswan)",
  es: "Dos traslados de aeropuerto, al inicio y al final del crucero (Lúxor o Asuán)",
  ja: "空港送迎2回（クルーズの開始時と終了時、ルクソールまたはアスワン）",
};
const ABOUT_SIGHTSEEING = /sightseeing|visitas turísticas|観光/i;

// `until`, where given, replaces the last day the figure applies; after it the page shows "Price on request".
const BOATS: { slug: string; euros: number; until?: string }[] = [
  { slug: "movenpick-hamees", euros: 478 },
  { slug: "movenpick-sun-ray", euros: 478 },
  { slug: "movenpick-ss-misr", euros: 980 },
  { slug: "movenpick-darakum", euros: 650, until: "2027-01-11" },
  { slug: "movenpick-royal-lily", euros: 1480 }, // per person per trip
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

const lists = (t: { locale: string; included: unknown; not_included: unknown; optional_extras: unknown }) => {
  const without = (v: unknown) => (Array.isArray(v) ? (v as string[]) : []).filter((x) => !ABOUT_SIGHTSEEING.test(x));
  return {
    included: [...without(t.included).filter((x) => x !== TRANSFERS[t.locale]), SIGHTSEEING[t.locale]!, TRANSFERS[t.locale]!],
    not_included: without(t.not_included),
    optional_extras: without(t.optional_extras),
  };
};

async function run() {
  const db = connect();
  const before = must(
    await db
      .from("vessels")
      .select("*, vessel_translations(*)")
      .in(
        "slug",
        BOATS.map((b) => b.slug),
      ),
    "snapshot",
  )!;
  console.log(target);
  for (const b of BOATS) {
    const v = before.find((r) => r.slug === b.slug);
    if (!v) throw new Error(`${b.slug}: not found`);
    if (v.type === "sail") throw new Error(`${b.slug}: a dahabiya`);
    const until = b.until ?? v.pricing_valid_to;
    console.log(
      `~ ${v.name} (${v.visibility}): €${Number(v.from_price_minor) / 100} → €${b.euros} ${v.pricing_basis}, ` +
        `until ${v.pricing_valid_to ?? "no end"} → ${until ?? "no end"}`,
    );
    for (const t of v.vessel_translations)
      console.log(
        `    ${t.locale}: ${JSON.stringify([t.included, t.not_included, t.optional_extras])}\n      → ${JSON.stringify(Object.values(lists(t)))}`,
      );
  }
  if (!apply) return console.log("\nReport only; nothing written.");

  mkdirSync(resolve(import.meta.dirname, "../.import-backups"), { recursive: true });
  const backup = resolve(
    import.meta.dirname,
    `../.import-backups/sightseeing-prices-${target}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
  );
  writeFileSync(backup, JSON.stringify(before, null, 2));
  console.log(`\nBackup: ${backup}`);

  for (const b of BOATS) {
    const v = before.find((r) => r.slug === b.slug)!;
    must(
      await db
        .from("vessels")
        .update({
          from_price_minor: b.euros * 100,
          pricing_valid_to: b.until ?? v.pricing_valid_to,
          pricing_last_checked: CHECKED,
        })
        .eq("id", v.id),
      b.slug,
    );
    for (const t of v.vessel_translations)
      must(
        await db.from("vessel_translations").update(lists(t)).eq("vessel_id", v.id).eq("locale", t.locale),
        `${b.slug} ${t.locale}`,
      );
    console.log(`✓ ${v.name}`);
  }
  await refreshSite(target!);
}

run().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
