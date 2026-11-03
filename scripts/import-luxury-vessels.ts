/**
 * Import the 14 luxury ships' content (docs/imports/luxury-vessels.json, from the November 2026 research file):
 * facts, English summary and description, cabin types and day-by-day itineraries.
 *
 *   pnpm import:luxury-vessels                              dry run: checks the file, changes nothing
 *   pnpm import:luxury-vessels --apply --target=local       into the local Docker database
 *   pnpm import:luxury-vessels --apply --target=staging     into staging
 *
 * Production is refused. Visibility is never changed and no departures are created: weekly days are the usual
 * pattern only, and tailor-made or dated ships are imported with their itineraries inactive.
 * The ship's facts (name, type, cabins, year, shared spaces) and private notes are updated on every run; texts,
 * cabin types, itineraries and days are only added when missing, so admin edits survive a re-run.
 */
import { createClient } from "@supabase/supabase-js";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
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
  type: "motor" | "sail";
  cabin_count: number;
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
  const must = <T>(r: { data: T; error: { message: string } | null }, what: string): T => {
    if (r.error) throw new Error(`${what}: ${r.error.message}`);
    return r.data;
  };

  for (const v of vessels) {
    // Find the ship: by its slug, else under its old staging slug (renamed to match production), else create it.
    let row = must(await db.from("vessels").select("id, slug").eq("slug", v.slug).maybeSingle(), v.slug);
    if (!row && v.rename_from) {
      row = must(
        await db.from("vessels").update({ slug: v.slug }).eq("slug", v.rename_from).select("id, slug").maybeSingle(),
        `${v.slug}: rename`,
      );
    }
    if (!row && v.create) {
      row = must(
        await db.from("vessels").insert({ slug: v.slug, name: v.name, type: v.type }).select("id, slug").single(),
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
          category: "luxury",
          cabin_count: v.cabin_count,
          shared_spaces: v.shared_spaces,
          ...(v.year_built ? { year_built: v.year_built } : {}),
        })
        .eq("id", id),
      `${v.slug}: facts`,
    );
    must(
      await db
        .from("vessel_private")
        .upsert({ vessel_id: id, source_urls: v.source_urls, verification_note: v.verification_note }),
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

if (apply) {
  write().catch((e: unknown) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
} else {
  console.log(
    `Dry run: ${vessels.length} ships, all valid:\n` +
      vessels
        .map((v) => {
          const off = v.itineraries.filter((it) => !it.active).length;
          return `- ${v.name}${v.create ? " (new)" : v.rename_from ? ` (was ${v.rename_from})` : ""}: ${v.cabins.length} cabin types, ${v.itineraries.length} itineraries${off ? ` (${off} inactive)` : ""}`;
        })
        .join("\n"),
  );
}
