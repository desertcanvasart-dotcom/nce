/**
 * ADR-097: load the filled-in tour rate sheet.
 *
 *   pnpm import:tour-rates path/to/rates.xlsx --target=local              dry run against the local database's tours
 *   pnpm import:tour-rates path/to/rates.xlsx --apply --target=local      into the local Docker database
 *   pnpm import:tour-rates path/to/rates.xlsx --apply --target=staging    into staging, after a dry run
 *
 * Production is refused. Each row sets its tour's office and replaces that tour's rate for the mode (and direction);
 * the Seasons tab replaces all seasons. Tours are not published here: an admin publishes each one when it's ready.
 * The Programs tab (ADR-102) also links each programme to the itineraries its name gives, adding to any links there.
 */
import { createClient } from "@supabase/supabase-js";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import type { Database, Json } from "../src/server/db/database.types";
import { planTourRates, type Sheet } from "./lib/tour-rates";

const STAGING_REF = "fmidxxcadbuzxaxyohtk"; // public project id of the staging database
const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
const apply = args.includes("--apply");
const target = args.find((a) => a.startsWith("--target="))?.split("=")[1];
if (!file) {
  console.error("Give the filled-in rate sheet: pnpm import:tour-rates path/to/rates.xlsx --target=local");
  process.exit(1);
}

function connect() {
  if (target === "local") {
    const status = JSON.parse(execFileSync("supabase", ["status", "-o", "json"], { encoding: "utf8" })) as Record<string, string>;
    return createClient<Database>(status.API_URL!, status.SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  }
  if (target === "staging") {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const key = process.env.SUPABASE_SECRET_KEY ?? "";
    if (new URL(url).hostname !== `${STAGING_REF}.supabase.co`)
      throw new Error("Refusing: NEXT_PUBLIC_SUPABASE_URL is not the staging project.");
    if (!key) throw new Error("SUPABASE_SECRET_KEY is not set.");
    return createClient<Database>(url, key, { auth: { persistSession: false } });
  }
  throw new Error("Say where: --target=local or --target=staging. Production is never a target.");
}

async function main() {
  const sheet = JSON.parse(
    execFileSync("/usr/local/bin/python3", ["-I", resolve(import.meta.dirname, "tour-rates.py"), resolve(file!)], {
      encoding: "utf8",
    }),
  ) as Sheet;
  const db = connect();
  const [{ data: tours, error: e1 }, { data: offices, error: e2 }, { data: schedules, error: e6 }] = await Promise.all([
    db.from("tours").select("id, name"),
    db.from("organisations").select("id, display_name").eq("kind", "tour_office"),
    db.from("schedules").select("id, origin, destination, nights, vessel:vessels(name)").eq("active", true),
  ]);
  if (e1 ?? e2 ?? e6) throw e1 ?? e2 ?? e6;
  const plan = planTourRates(sheet, tours ?? [], offices ?? []);
  const name = new Map((tours ?? []).map((t) => [t.id, t.name]));
  if (plan.answers.length) console.log(`Answers on the Questions tab:\n- ${plan.answers.join("\n- ")}\n`);
  if (plan.problems.length) {
    console.error(`Not imported; fix these in the sheet first:\n- ${plan.problems.join("\n- ")}`);
    process.exit(1);
  }
  console.log(
    `${plan.rates.length} rates for ${plan.offices.size} tours, ${plan.seasons.length} seasons:\n` +
      plan.rates.map((r) => `- ${name.get(r.tour_id)}: ${r.mode}${r.label ? ` (${r.label})` : ""}`).join("\n"),
  );
  const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
  const links = plan.programmes.flatMap((p) =>
    (schedules ?? [])
      .filter((x) => x.nights === p.nights && same(x.origin, p.origin) && same(x.destination, p.destination))
      .map((x) => ({ tour_id: p.tour_id, schedule_id: x.id })),
  );
  for (const p of plan.programmes) {
    const n = links.filter((l) => l.tour_id === p.tour_id).length;
    console.log(
      `- ${name.get(p.tour_id)} goes with ${n} itinerar${n === 1 ? "y" : "ies"} (${p.nights} nights, ${p.origin} to ${p.destination})`,
    );
  }
  if (!apply) {
    console.log(`\nDry run: nothing changed. Add --apply to load them into ${target}.`);
    return;
  }
  for (const [tourId, officeId] of plan.offices) {
    const { error } = await db.from("tours").update({ office_id: officeId }).eq("id", tourId);
    if (error) throw error;
  }
  const { error: e3 } = await db.from("tour_rates").upsert(
    plan.rates.map((r) => ({ ...r, prices: r.prices as Json, active: true })),
    { onConflict: "tour_id,mode,label" },
  );
  if (e3) throw e3;
  const { error: e4 } = await db.from("tour_seasons").delete().gte("starts_on", "1900-01-01");
  if (e4) throw e4;
  if (plan.seasons.length) {
    const { error: e5 } = await db.from("tour_seasons").insert(plan.seasons);
    if (e5) throw e5;
  }
  if (links.length) {
    const { error: e7 } = await db
      .from("tour_schedules")
      .upsert(links, { onConflict: "tour_id,schedule_id", ignoreDuplicates: true });
    if (e7) throw e7;
  }
  console.log(`\nLoaded into ${target}. Publish each tour in the dashboard when its page is ready; then refresh the catalogue.`);
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
