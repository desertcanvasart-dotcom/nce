/**
 * Import the 14 luxury ships' content (docs/imports/luxury-vessels.json, from the November 2026 research file):
 * facts, English summary and description, cabin types and day-by-day itineraries. Another file in the same shape can
 * be named first. (The vessels pillar's sample dahabiya, Malouka, now comes from the Nour El Nil fleet import, ADR-107.)
 *
 *   pnpm import:luxury-vessels                              dry run: checks the file, changes nothing
 *   pnpm import:luxury-vessels --apply --target=local       into the local Docker database
 *   pnpm import:luxury-vessels --apply --target=staging     into staging
 *   pnpm import:luxury-vessels --target=production          report only: reads production, lists what would change
 *   pnpm import:luxury-vessels --apply --target=production --confirm-production
 *
 * With a target and no --apply, it reads that database and reports ship by ship; nothing is written.
 * Every --apply first saves the affected rows to .import-backups/ (git-ignored), then writes.
 * Visibility is never changed and no departures are created: weekly days are the usual pattern only, and
 * tailor-made or dated ships are imported with their itineraries inactive.
 * The ship's name, type, category, cabins and year are set on every run; shared spaces and source links are
 * merged with what is there, and the note is appended. Texts, cabin types, itineraries and days are only added
 * when missing, so existing and admin-edited content survives.
 */
import { createClient } from "@supabase/supabase-js";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Database } from "../src/server/db/database.types";

const STAGING_REF = "fmidxxcadbuzxaxyohtk"; // public project id of the staging database
const SPACES = ["sun_deck", "pool", "jacuzzi", "dining_room", "lounge", "bar", "spa", "gym", "library"];
const CODE = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,39}$/;
const NO_DECK = "To be confirmed";

type Cabin = {
  code: string;
  name: string;
  deck?: string;
  size_m2?: number;
  bed_configuration?: string;
  max_occupancy: number;
  view?: string;
  balcony: boolean;
  cabin_count?: number;
  amenities: string[];
  description: string;
};
type Itinerary = {
  code: string;
  origin: string;
  destination: string;
  nights: number;
  sailing_days: number[];
  active: boolean;
  days: { title: string; description: string }[];
};
type Vessel = {
  slug: string;
  rename_from?: string;
  create?: boolean;
  name: string;
  type: "motor" | "sail" | "steam";
  /** Defaults to luxury (the research file's ships); null leaves a ship unrated. */
  category?: "luxury" | null;
  cabin_count: number;
  max_guests?: number;
  year_built?: number;
  shared_spaces: string[];
  summary: string;
  description: string;
  source_urls: string[];
  verification_note: string;
  cabins: Cabin[];
  itineraries: Itinerary[];
};

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--")) ?? resolve(import.meta.dirname, "../docs/imports/luxury-vessels.json");
const apply = args.includes("--apply");
const target = args.find((a) => a.startsWith("--target="))?.split("=")[1];
const vessels = (JSON.parse(readFileSync(resolve(file), "utf8")) as { vessels: Vessel[] }).vessels;

function problemsOf(v: Vessel): string[] {
  const p: string[] = [];
  const bad = v.shared_spaces.filter((s) => !SPACES.includes(s));
  if (bad.length) p.push(`${v.slug}: unknown shared spaces ${bad.join(", ")}`);
  const counted = v.cabins.reduce((n, c) => n + (c.cabin_count ?? 0), 0);
  if (counted > v.cabin_count) p.push(`${v.slug}: cabin types add up to ${counted}, more than ${v.cabin_count}`);
  for (const c of v.cabins) {
    if (!CODE.test(c.code)) p.push(`${v.slug}/${c.code}: bad cabin code`);
    if (c.max_occupancy < 1 || c.max_occupancy > 3) p.push(`${v.slug}/${c.code}: occupancy must be 1–3`);
    if (c.description.length > 4000) p.push(`${v.slug}/${c.code}: description too long`);
  }
  for (const it of v.itineraries) {
    if (!CODE.test(it.code)) p.push(`${v.slug}/${it.code}: bad itinerary code`);
    if (it.days.length !== it.nights + 1) p.push(`${v.slug}/${it.code}: ${it.days.length} days for ${it.nights} nights`);
    if (!it.sailing_days.length || it.sailing_days.some((d) => d < 1 || d > 7)) p.push(`${v.slug}/${it.code}: bad sailing days`);
    for (const d of it.days)
      if (d.title.length > 160 || d.description.length > 4000) p.push(`${v.slug}/${it.code}: day text too long`);
  }
  return p;
}

const problems = vessels.flatMap(problemsOf);
if (problems.length) {
  console.error(`Not imported; fix these first:\n- ${problems.join("\n- ")}`);
  process.exit(1);
}

const must = <T>(r: { data: T; error: { message: string } | null }, what: string): T => {
  if (r.error) throw new Error(`${what}: ${r.error.message}`);
  return r.data;
};

function connect() {
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
  } else if (target === "production") {
    if (apply && !args.includes("--confirm-production"))
      throw new Error("Writing to production also needs --confirm-production. Run without --apply for the report.");
    url = process.env.PRODUCTION_SUPABASE_URL ?? "";
    key = process.env.PRODUCTION_SUPABASE_SECRET_KEY ?? "";
    const ref = process.env.PRODUCTION_SUPABASE_PROJECT_REF ?? "";
    if (!ref || ref === STAGING_REF || new URL(url).hostname !== `${ref}.supabase.co`)
      throw new Error("Refusing: PRODUCTION_SUPABASE_URL does not match PRODUCTION_SUPABASE_PROJECT_REF.");
  } else {
    throw new Error("--target must be local, staging or production.");
  }
  if (!key) throw new Error(`No secret key set for ${target}.`);
  return createClient<Database>(url, key, { auth: { persistSession: false } });
}
type Db = ReturnType<typeof connect>;

// Every row the import can touch, for the report and the backup.
async function snapshotOf(db: Db) {
  const slugs = vessels.flatMap((v) => [v.slug, ...(v.rename_from ? [v.rename_from] : [])]);
  return (
    must(
      await db
        .from("vessels")
        .select(
          "*, vessel_translations(*), vessel_private(*), cabin_types(*, cabin_type_translations(*)), schedules(*, schedule_days(*))",
        )
        .in("slug", slugs),
      "snapshot",
    ) ?? []
  );
}
type Row = Awaited<ReturnType<typeof snapshotOf>>[number];

const rowOf = (rows: Row[], v: Vessel) =>
  rows.find((r) => r.slug === v.slug) ?? (v.rename_from ? rows.find((r) => r.slug === v.rename_from) : undefined);

function reportOf(v: Vessel, e: Row | undefined): string {
  if (!e) return v.create ? `+ ${v.name}: new ship (private)` : `! ${v.name}: not found, the import would stop here`;
  const lines: string[] = [];
  if (e.slug !== v.slug) lines.push(`address ${e.slug} → ${v.slug}`);
  const facts: [string, unknown, unknown][] = [
    ["name", e.name, v.name],
    ["type", e.type, v.type],
    ["category", e.category, v.category === undefined ? "luxury" : v.category],
    ["cabins", e.cabin_count, v.cabin_count],
    ["guests", e.max_guests, v.max_guests ?? e.max_guests],
    ["year built", e.year_built, v.year_built ?? e.year_built],
  ];
  for (const [k, now, next] of facts) if (now !== next) lines.push(`${k}: ${String(now ?? "–")} → ${String(next)}`);
  const spaces = v.shared_spaces.filter((s) => !e.shared_spaces.includes(s as never));
  if (spaces.length) lines.push(`shared spaces added: ${spaces.join(", ")}`);
  const en = e.vessel_translations.find((t) => t.locale === "en");
  lines.push(en ? "English texts: keeps the existing ones" : "English texts: adds the file's");
  const cabins = v.cabins.filter((c) => !e.cabin_types.some((x) => x.code === c.code)).map((c) => c.code);
  if (cabins.length) lines.push(`cabin types added: ${cabins.join(", ")}`);
  const kept = e.cabin_types.filter((x) => !v.cabins.some((c) => c.code === x.code)).map((x) => x.code);
  if (kept.length) lines.push(`cabin types already there, not in the file (kept): ${kept.join(", ")}`);
  for (const it of v.itineraries) {
    const s = e.schedules.find((x) => x.code === it.code);
    if (!s) lines.push(`itinerary added: ${it.code}${it.active ? "" : " (inactive)"}`);
    else {
      const missing = it.days.filter((_, i) => !s.schedule_days.some((d) => d.locale === "en" && d.day_number === i + 1));
      lines.push(`itinerary ${it.code} already there${missing.length ? `, ${missing.length} days added` : ""}`);
    }
  }
  const other = e.schedules.filter((x) => !v.itineraries.some((it) => it.code === x.code)).map((x) => x.code);
  if (other.length) lines.push(`itineraries already there, not in the file (kept): ${other.join(", ")}`);
  return `~ ${v.name} (${e.visibility})\n    ${lines.join("\n    ")}`;
}

async function run() {
  const db = connect();
  const before = await snapshotOf(db);
  console.log(`${target}: ${vessels.length} ships\n${vessels.map((v) => reportOf(v, rowOf(before, v))).join("\n")}`);
  if (!apply) return console.log("\nReport only; nothing written.");

  mkdirSync(resolve(import.meta.dirname, "../.import-backups"), { recursive: true });
  const backup = resolve(
    import.meta.dirname,
    `../.import-backups/luxury-vessels-${target}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
  );
  writeFileSync(backup, JSON.stringify(before, null, 2));
  console.log(`\nBackup of ${before.length} ships: ${backup}\n`);

  for (const v of vessels) {
    // Find the ship: by its slug, else under its old staging slug (renamed to match production), else create it.
    let row = must(await db.from("vessels").select("id, slug, shared_spaces").eq("slug", v.slug).maybeSingle(), v.slug);
    if (!row && v.rename_from) {
      row = must(
        await db
          .from("vessels")
          .update({ slug: v.slug })
          .eq("slug", v.rename_from)
          .select("id, slug, shared_spaces")
          .maybeSingle(),
        `${v.slug}: rename`,
      );
    }
    if (!row && v.create) {
      row = must(
        await db.from("vessels").insert({ slug: v.slug, name: v.name, type: v.type }).select("id, slug, shared_spaces").single(),
        `${v.slug}: create`,
      );
    }
    if (!row) throw new Error(`${v.slug}: not found in ${target}`);
    const id = row.id;

    must(
      await db
        .from("vessels")
        .update({
          name: v.name,
          type: v.type,
          category: v.category === undefined ? "luxury" : v.category,
          cabin_count: v.cabin_count,
          ...(v.max_guests ? { max_guests: v.max_guests } : {}),
          shared_spaces: [...new Set([...row.shared_spaces, ...(v.shared_spaces as typeof row.shared_spaces)])],
          ...(v.year_built ? { year_built: v.year_built } : {}),
        })
        .eq("id", id),
      `${v.slug}: facts`,
    );
    const notes = must(
      await db.from("vessel_private").select("source_urls, verification_note").eq("vessel_id", id).maybeSingle(),
      `${v.slug}: notes`,
    );
    const note = notes?.verification_note ?? "";
    must(
      await db.from("vessel_private").upsert({
        vessel_id: id,
        source_urls: [...new Set([...(notes?.source_urls ?? []), ...v.source_urls])],
        verification_note: note.includes(v.verification_note) ? note : [note, v.verification_note].filter(Boolean).join("\n\n"),
      }),
      `${v.slug}: notes`,
    );
    must(
      await db
        .from("vessel_translations")
        .upsert(
          { vessel_id: id, locale: "en", summary: v.summary, description: v.description },
          { onConflict: "vessel_id,locale", ignoreDuplicates: true },
        ),
      `${v.slug}: texts`,
    );

    must(
      await db.from("cabin_types").upsert(
        v.cabins.map((c, i) => ({
          vessel_id: id,
          code: c.code,
          name: c.name,
          deck: c.deck ?? NO_DECK,
          size_m2: c.size_m2 ?? null,
          bed_configuration: c.bed_configuration ?? null,
          max_occupancy: c.max_occupancy,
          view: c.view ?? null,
          balcony: c.balcony,
          amenities: c.amenities,
          cabin_count: c.cabin_count ?? null,
          sort_order: i,
        })),
        { onConflict: "vessel_id,code", ignoreDuplicates: true },
      ),
      `${v.slug}: cabin types`,
    );
    const cabinIds =
      must(
        await db
          .from("cabin_types")
          .select("id, code")
          .eq("vessel_id", id)
          .in(
            "code",
            v.cabins.map((c) => c.code),
          ),
        `${v.slug}: cabin ids`,
      ) ?? [];
    must(
      await db.from("cabin_type_translations").upsert(
        cabinIds.map((c) => ({
          cabin_type_id: c.id,
          locale: "en" as const,
          description: v.cabins.find((x) => x.code === c.code)!.description,
        })),
        { onConflict: "cabin_type_id,locale", ignoreDuplicates: true },
      ),
      `${v.slug}: cabin texts`,
    );

    must(
      await db.from("schedules").upsert(
        v.itineraries.map((it) => ({
          vessel_id: id,
          code: it.code,
          origin: it.origin,
          destination: it.destination,
          nights: it.nights,
          sailing_days: it.sailing_days,
          active: it.active,
        })),
        { onConflict: "vessel_id,code", ignoreDuplicates: true },
      ),
      `${v.slug}: itineraries`,
    );
    const scheduleIds =
      must(
        await db
          .from("schedules")
          .select("id, code")
          .eq("vessel_id", id)
          .in(
            "code",
            v.itineraries.map((it) => it.code),
          ),
        `${v.slug}: itinerary ids`,
      ) ?? [];
    must(
      await db.from("schedule_days").upsert(
        scheduleIds.flatMap((s) =>
          v.itineraries
            .find((it) => it.code === s.code)!
            .days.map((d, i) => ({
              schedule_id: s.id,
              day_number: i + 1,
              locale: "en" as const,
              title: d.title,
              description: d.description,
            })),
        ),
        { onConflict: "schedule_id,day_number,locale", ignoreDuplicates: true },
      ),
      `${v.slug}: days`,
    );
    console.log(`✓ ${v.name}: ${v.cabins.length} cabin types, ${v.itineraries.length} itineraries`);
  }
  console.log(`Done: ${vessels.length} ships in ${target}. Visibility unchanged; no departures created.`);
}

if (apply && !target) {
  console.error("--apply needs --target=local, staging or production.");
  process.exit(1);
} else if (target) {
  run().catch((e: unknown) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
} else {
  console.log(
    `Dry run (no database): ${vessels.length} ships, all valid:\n` +
      vessels
        .map((v) => {
          const off = v.itineraries.filter((it) => !it.active).length;
          return `- ${v.name}${v.create ? " (new)" : v.rename_from ? ` (was ${v.rename_from})` : ""}: ${v.cabins.length} cabin types, ${v.itineraries.length} itineraries${off ? ` (${off} inactive)` : ""}`;
        })
        .join("\n"),
  );
}
