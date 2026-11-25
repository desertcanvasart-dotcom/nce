/**
 * Apply Mövenpick's 2027/28 fact sheets (docs/imports/movenpick-2027.json and the four deck drawings) to five boats:
 * facts, cabin types, schedules with their days, seasons and published dates, and the drawings.
 *
 *   tsx scripts/apply-movenpick-2027.ts                            checks the files, reads and writes nothing
 *   tsx scripts/apply-movenpick-2027.ts --target=staging           report: reads staging, lists what would change
 *   tsx scripts/apply-movenpick-2027.ts --apply --target=staging
 *
 * --only=<slug> limits it to one boat. Production also needs --confirm-production. Unlike import:luxury-vessels, this one *replaces* what it names: cabin
 * types are edited, and each listed schedule's English days and seasons become the file's. It never deletes a cabin
 * type, schedule or departure: cabin types the file doesn't list are made inactive, other things are only reported.
 * Every --apply first saves the affected rows to .import-backups/ (git-ignored). Visibility is never changed.
 * It can be run again: the same file gives the same result.
 */
import { createClient } from "@supabase/supabase-js";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { layoutProblems } from "../src/lib/marketplace/deck-layout-schema";
import type { Database, Json } from "../src/server/db/database.types";
import { refreshSite } from "./lib/refresh-site";

const STAGING_REF = "fmidxxcadbuzxaxyohtk"; // public project id of the staging database
const root = resolve(import.meta.dirname, "..");

type Cabin = {
  code: string;
  name: string;
  deck: string | null;
  cabin_count: number;
  size_m2: number | null;
  bed_configuration: string | null;
  max_occupancy: number;
  balcony: boolean;
  view?: string;
  amenities: string[];
  description: string;
};
type Schedule = {
  code: string;
  origin: string;
  destination: string;
  nights: number;
  sailing_period: "morning" | "noon" | "evening";
  sailing_days?: number[];
  periods?: [string, string][];
  departures?: string[];
  /** No set dates or weekdays: the boat sails when booked. */
  on_request?: boolean;
  days: { title: string; description: string }[];
};
type Vessel = {
  slug: string;
  facts: { cabin_count: number; length_m?: number; beam_m?: number; deck_count?: number; max_guests?: number };
  shared_spaces: string[];
  cabins: Cabin[];
  schedules: Schedule[];
};

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const target = args.find((a) => a.startsWith("--target="))?.split("=")[1];
const only = args.find((a) => a.startsWith("--only="))?.split("=")[1];
const { vessels: all } = JSON.parse(readFileSync(resolve(root, "docs/imports/movenpick-2027.json"), "utf8")) as {
  vessels: Vessel[];
};

const vessels = all.filter((v) => !only || v.slug === only);
if (!vessels.length) {
  console.error(`No boat called ${only} in the file.`);
  process.exit(1);
}

const drawingOf = (slug: string) => {
  const name = slug.replace("movenpick-", "");
  if (name === "sb-feddya") return null; // its sheet has no plan
  return JSON.parse(readFileSync(resolve(root, `docs/imports/deck-plans/movenpick-${name}.json`), "utf8")) as {
    layout: Json;
    credit: string;
  };
};

const problems = vessels.flatMap((v) => {
  const p: string[] = [];
  const counted = v.cabins.reduce((n, c) => n + c.cabin_count, 0);
  if (counted !== v.facts.cabin_count) p.push(`${v.slug}: cabin types add up to ${counted}, not ${v.facts.cabin_count}`);
  for (const s of v.schedules) {
    if (s.days.length !== s.nights + 1) p.push(`${v.slug}/${s.code}: ${s.days.length} days for ${s.nights} nights`);
    if ([s.departures, s.sailing_days, s.on_request].filter(Boolean).length !== 1)
      p.push(`${v.slug}/${s.code}: needs dates, weekdays or on request, one of them`);
    if (s.sailing_days && !s.periods?.length) p.push(`${v.slug}/${s.code}: weekdays without a season`);
  }
  const drawing = drawingOf(v.slug);
  if (drawing)
    p.push(
      ...layoutProblems(
        drawing.layout,
        v.cabins.map((c) => c.code),
      ).map((x) => `${v.slug}: ${x}`),
    );
  return p;
});
if (problems.length) {
  console.error(`Nothing applied; fix these first:\n- ${problems.join("\n- ")}`);
  process.exit(1);
}

function connect() {
  let url: string;
  let key: string;
  if (target === "staging") {
    url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    key = process.env.SUPABASE_SECRET_KEY ?? "";
    if (new URL(url).hostname !== `${STAGING_REF}.supabase.co`)
      throw new Error("Refusing: NEXT_PUBLIC_SUPABASE_URL is not the staging project.");
  } else if (target === "production") {
    if (apply && !args.includes("--confirm-production"))
      throw new Error("Writing to production also needs --confirm-production. Run without --apply for the report.");
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
type Db = ReturnType<typeof connect>;

const must = <T>(r: { data: T; error: { message: string } | null }, what: string): T => {
  if (r.error) throw new Error(`${what}: ${r.error.message}`);
  return r.data;
};

async function snapshotOf(db: Db) {
  return (
    must(
      await db
        .from("vessels")
        .select(
          "*, vessel_private(*), deck_plans(*), cabin_types(*, cabin_type_translations(*)), schedules(*, schedule_days(*), schedule_periods(*), departures(*))",
        )
        .in(
          "slug",
          vessels.map((v) => v.slug),
        ),
      "snapshot",
    ) ?? []
  );
}
type Row = Awaited<ReturnType<typeof snapshotOf>>[number];

const today = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" });

function reportOf(v: Vessel, e: Row | undefined): string {
  if (!e) return `! ${v.slug}: not found, the apply would stop here`;
  const lines: string[] = [];
  for (const [k, next] of Object.entries(v.facts)) {
    const now = e[k as keyof typeof v.facts];
    if (Number(now) !== next) lines.push(`${k}: ${String(now ?? "–")} → ${next}`);
  }
  const spaces = v.shared_spaces.filter((s) => !e.shared_spaces.includes(s as never));
  if (spaces.length) lines.push(`shared spaces added: ${spaces.join(", ")}`);
  for (const c of v.cabins) {
    const x = e.cabin_types.find((t) => t.code === c.code);
    if (!x) lines.push(`cabin ${c.code} added: ${c.name} × ${c.cabin_count}`);
    else
      lines.push(
        `cabin ${c.code}: "${x.name}" × ${x.cabin_count ?? "–"}, ${x.deck} → "${c.name}" × ${c.cabin_count}, ${c.deck ?? x.deck}`,
      );
  }
  for (const x of e.cabin_types.filter((t) => !v.cabins.some((c) => c.code === t.code)))
    lines.push(`cabin ${x.code} "${x.name}" × ${x.cabin_count ?? "–"}: not in the file, made inactive (was ${x.active})`);
  const foreign = e.cabin_types.flatMap((t) => t.cabin_type_translations.filter((r) => r.locale !== "en"));
  if (foreign.length) lines.push(`${foreign.length} Spanish/Japanese cabin texts stay as they are: check them`);
  for (const s of v.schedules) {
    const x = e.schedules.find((t) => t.code === s.code);
    const dates = s.departures?.filter((d) => d > today);
    const next = s.on_request ? "on request" : dates ? `${dates.length} dates` : `weekdays ${s.sailing_days!.join(",")}`;
    if (!x) lines.push(`itinerary ${s.code} added: ${s.days.length} days, ${next}`);
    else {
      lines.push(
        `itinerary ${s.code}: weekdays [${x.sailing_days.join(",")}], active ${x.active}, ${x.departures.length} dates → ${next}, English days replaced`,
      );
      const extra = x.departures.filter((d) => d.departs_on > today && !(s.departures ?? []).includes(d.departs_on));
      if (extra.length) lines.push(`  ${extra.length} future dates already there and not in the file (kept): check them`);
      const other = new Set(x.schedule_days.filter((d) => d.locale !== "en").map((d) => d.locale));
      if (other.size) lines.push(`  days in ${[...other].join(", ")} stay as they are: check them`);
    }
  }
  for (const x of e.schedules.filter((t) => !v.schedules.some((s) => s.code === t.code)))
    lines.push(`itinerary ${x.code} (${x.origin} → ${x.destination}, active ${x.active}): not in the file (kept)`);
  lines.push(drawingOf(v.slug) ? `deck drawing: ${e.deck_plans?.layout ? "replaced" : "added"}` : "no deck drawing");
  return `~ ${e.name} (${e.visibility})\n    ${lines.join("\n    ")}`;
}

async function applyVessel(db: Db, v: Vessel, e: Row) {
  const id = e.id;
  must(
    await db
      .from("vessels")
      .update({ ...v.facts, shared_spaces: [...new Set([...e.shared_spaces, ...(v.shared_spaces as typeof e.shared_spaces)])] })
      .eq("id", id),
    `${v.slug}: facts`,
  );

  for (const [i, c] of v.cabins.entries()) {
    const old = e.cabin_types.find((t) => t.code === c.code);
    const row = must(
      await db
        .from("cabin_types")
        .upsert(
          {
            vessel_id: id,
            code: c.code,
            name: c.name,
            // A value the sheet doesn't give keeps what is there.
            deck: c.deck ?? old?.deck ?? "To be confirmed",
            size_m2: c.size_m2 ?? old?.size_m2 ?? null,
            bed_configuration: c.bed_configuration ?? old?.bed_configuration ?? null,
            view: c.view ?? old?.view ?? null,
            max_occupancy: c.max_occupancy,
            balcony: c.balcony,
            amenities: c.amenities,
            cabin_count: c.cabin_count,
            sort_order: i,
            active: true,
          },
          { onConflict: "vessel_id,code" },
        )
        .select("id")
        .single(),
      `${v.slug}/${c.code}`,
    )!;
    must(
      await db
        .from("cabin_type_translations")
        .upsert({ cabin_type_id: row.id, locale: "en", description: c.description }, { onConflict: "cabin_type_id,locale" }),
      `${v.slug}/${c.code}: text`,
    );
  }
  const gone = e.cabin_types.filter((t) => !v.cabins.some((c) => c.code === t.code)).map((t) => t.id);
  if (gone.length) must(await db.from("cabin_types").update({ active: false }).in("id", gone), `${v.slug}: retire`);

  for (const s of v.schedules) {
    const row = must(
      await db
        .from("schedules")
        .upsert(
          {
            vessel_id: id,
            code: s.code,
            origin: s.origin,
            destination: s.destination,
            nights: s.nights,
            sailing_days: s.sailing_days ?? [],
            sailing_period: s.sailing_period,
            active: true,
          },
          { onConflict: "vessel_id,code" },
        )
        .select("id")
        .single(),
      `${v.slug}/${s.code}`,
    )!;
    must(await db.from("schedule_days").delete().eq("schedule_id", row.id).eq("locale", "en"), `${v.slug}/${s.code}: old days`);
    must(
      await db
        .from("schedule_days")
        .insert(s.days.map((d, i) => ({ schedule_id: row.id, day_number: i + 1, locale: "en" as const, ...d }))),
      `${v.slug}/${s.code}: days`,
    );
    must(await db.from("schedule_periods").delete().eq("schedule_id", row.id), `${v.slug}/${s.code}: old seasons`);
    if (s.periods)
      must(
        await db
          .from("schedule_periods")
          .insert(s.periods.map(([starts_on, ends_on]) => ({ schedule_id: row.id, starts_on, ends_on }))),
        `${v.slug}/${s.code}: seasons`,
      );
    const rows = (s.departures ?? [])
      .filter((d) => d > today)
      .map((d) => ({
        schedule_id: row.id,
        vessel_id: id,
        departs_on: d,
        returns_on: new Date(Date.parse(`${d}T00:00:00Z`) + s.nights * 86_400_000).toISOString().slice(0, 10),
      }));
    if (rows.length)
      must(
        await db.from("departures").upsert(rows, { onConflict: "schedule_id,departs_on", ignoreDuplicates: true }),
        `${v.slug}/${s.code}: dates`,
      );
  }

  const drawing = drawingOf(v.slug);
  if (drawing)
    must(
      await db
        .from("deck_plans")
        .upsert({ vessel_id: id, layout: drawing.layout, credit: e.deck_plans?.credit ?? drawing.credit }),
      `${v.slug}: drawing`,
    );

  const note = "Mövenpick 2027/28 fact sheet and itinerary applied (checked 25 November 2026).";
  const now = e.vessel_private?.verification_note ?? "";
  if (!now.includes(note))
    must(
      await db.from("vessel_private").upsert({ vessel_id: id, verification_note: [now, note].filter(Boolean).join("\n\n") }),
      `${v.slug}: note`,
    );
  console.log(`✓ ${e.name}: ${v.cabins.length} cabin types, ${v.schedules.length} itineraries`);
}

async function run() {
  const db = connect();
  const before = await snapshotOf(db);
  const rowOf = (v: Vessel) => before.find((r) => r.slug === v.slug);
  console.log(`${target}\n${vessels.map((v) => reportOf(v, rowOf(v))).join("\n")}`);
  if (!apply) return console.log("\nReport only; nothing written.");
  const missing = vessels.filter((v) => !rowOf(v)).map((v) => v.slug);
  if (missing.length) throw new Error(`Nothing applied: not found in ${target}: ${missing.join(", ")}`);

  mkdirSync(resolve(root, ".import-backups"), { recursive: true });
  const backup = resolve(root, `.import-backups/movenpick-2027-${target}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  writeFileSync(backup, JSON.stringify(before, null, 2));
  console.log(`\nBackup: ${backup}\n`);
  for (const v of vessels) await applyVessel(db, v, rowOf(v)!);
  console.log(`Done: ${vessels.length} boats in ${target}. Visibility unchanged.`);
  await refreshSite(target!);
}

if (apply && !target) {
  console.error("--apply needs --target=staging or production.");
  process.exit(1);
} else if (target) {
  run().catch((e: unknown) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
} else {
  console.log(`Files are valid: ${vessels.length} boats. Nothing read or written.`);
}
