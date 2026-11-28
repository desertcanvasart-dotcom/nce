/**
 * Add the Japanese that database content lacked (docs/imports/ja-content-missing.json): vessel texts, cabin type
 * names, beds, views and descriptions, photo alt texts and itinerary days.
 *
 *   pnpm apply:ja-content                              checks the file, reads and writes nothing
 *   pnpm apply:ja-content --target=staging             report: reads staging, lists what would be added
 *   pnpm apply:ja-content --apply --target=staging
 *
 * Production also needs --confirm-production. It only ever *adds* "ja" rows: a row that already has Japanese is left
 * alone (insert, ignoring duplicates), and a row whose English no longer matches the English the translation was made
 * from is skipped and listed. Rows are matched by vessel slug, cabin code, schedule code, day number and photo file
 * name, never by database id. Every --apply first writes the keys it is about to add to .import-backups/
 * (git-ignored). It can be run again: the second run adds nothing.
 */
import { createClient } from "@supabase/supabase-js";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Database } from "../src/server/db/database.types";
import { refreshSite } from "./lib/refresh-site";

const STAGING_REF = "fmidxxcadbuzxaxyohtk"; // public project id of the staging database
const root = resolve(import.meta.dirname, "..");

type Text = Record<string, string | string[] | null>;
type Entry = { vessel: string; en: Text; ja: Text };
type Content = {
  vessel_translations: Entry[];
  cabin_type_translations: (Entry & { code: string })[];
  media_translations: (Entry & { file: string })[];
  schedule_days: (Entry & { schedule: string; day_number: number })[];
};
type Table = keyof Content;
type Insert<T extends Table> = Database["public"]["Tables"][T]["Insert"];
type Row = { locale: string } & Record<string, unknown>;

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const target = args.find((a) => a.startsWith("--target="))?.split("=")[1];
const content = JSON.parse(readFileSync(resolve(root, "docs/imports/ja-content-missing.json"), "utf8")) as Content;
const tables: Table[] = ["vessel_translations", "cabin_type_translations", "media_translations", "schedule_days"];

const keyOf = (e: Entry & { code?: string; file?: string; schedule?: string; day_number?: number }) =>
  [e.vessel, e.code, e.file, e.schedule, e.day_number].filter((x) => x !== undefined).join(" / ");

/** Same fields in both languages, lists of the same length, and each row named once. */
const problems = tables.flatMap((t) => {
  const seen = new Set<string>();
  return content[t].flatMap((e) => {
    const at = `${t} ${keyOf(e)}`;
    const p: string[] = [];
    if (seen.has(keyOf(e))) p.push(`${at}: listed twice`);
    seen.add(keyOf(e));
    if (Object.keys(e.en).join() !== Object.keys(e.ja).join()) p.push(`${at}: not the same fields`);
    for (const [k, en] of Object.entries(e.en)) {
      const ja = e.ja[k];
      if (Array.isArray(en)) {
        if (!Array.isArray(ja) || ja.length !== en.length) p.push(`${at}: ${k} is not a list of ${en.length}`);
      } else if (!en !== !ja) p.push(`${at}: ${k} is filled in one language only`);
    }
    return p;
  });
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

const must = <T>(r: { data: T; error: { message: string } | null }, what: string): T => {
  if (r.error) throw new Error(`${what}: ${r.error.message}`);
  return r.data;
};

async function run() {
  const db = connect();
  const slugs = [...new Set(tables.flatMap((t) => content[t].map((e) => e.vessel)))];
  const vessels =
    must(
      await db
        .from("vessels")
        .select(
          "id, slug, vessel_translations(*), cabin_types(id, code, name, bed_configuration, view, cabin_type_translations(*)), schedules(id, code, schedule_days(*)), media(id, storage_path, media_translations(*))",
        )
        .in("slug", slugs),
      "read",
    ) ?? [];
  const vesselOf = (slug: string) => vessels.find((v) => v.slug === slug);

  type Counts = { add: number; has: number; missing: string[]; changed: string[] };
  const counts = Object.fromEntries(tables.map((t) => [t, { add: 0, has: 0, missing: [], changed: [] }])) as unknown as Record<
    Table,
    Counts
  >;
  const added: string[] = [];

  /** The row to add, or null: no such record here, Japanese already there, or the English has changed since. */
  function plan<R extends { locale: string }, K>(t: Table, e: Entry, found: { rows: R[]; key: K } | undefined) {
    const c = counts[t];
    const en = (found?.rows as Row[] | undefined)?.find((r) => r.locale === "en");
    if (!found || !en) {
      c.missing.push(keyOf(e));
      return null;
    }
    if (found.rows.some((r) => r.locale === "ja")) {
      c.has++;
      return null;
    }
    const differs = Object.entries(e.en).filter(([k, v]) => JSON.stringify(en[k] ?? null) !== JSON.stringify(v));
    if (differs.length) {
      c.changed.push(`${keyOf(e)} (${differs.map(([k]) => k).join(", ")})`);
      return null;
    }
    c.add++;
    added.push(`${t} ${keyOf(e)}`);
    return { ...e.ja, ...found.key, locale: "ja" as const };
  }
  const present = <T>(x: T | null): x is T => x !== null;

  const vesselRows = content.vessel_translations
    .map((e) => {
      const v = vesselOf(e.vessel);
      return plan("vessel_translations", e, v && { rows: v.vessel_translations, key: { vessel_id: v.id } });
    })
    .filter(present) as unknown as Insert<"vessel_translations">[];

  const cabinRows = content.cabin_type_translations
    .map((e) => {
      const c = vesselOf(e.vessel)?.cabin_types.find((x) => x.code === e.code);
      // The English name, bed and view sit on the cabin type itself unless the English row overrides them.
      const rows = c?.cabin_type_translations.map((r) =>
        r.locale === "en"
          ? {
              ...r,
              name: r.name ?? c.name,
              bed_configuration: r.bed_configuration ?? c.bed_configuration,
              view: r.view ?? c.view,
            }
          : r,
      );
      return plan("cabin_type_translations", e, c && { rows: rows!, key: { cabin_type_id: c.id } });
    })
    .filter(present) as unknown as Insert<"cabin_type_translations">[];

  const mediaRows = content.media_translations
    .map((e) => {
      const m = vesselOf(e.vessel)?.media.find((x) => x.storage_path.split("/").at(-1) === e.file);
      return plan("media_translations", e, m && { rows: m.media_translations, key: { media_id: m.id } });
    })
    .filter(present) as unknown as Insert<"media_translations">[];

  const dayRows = content.schedule_days
    .map((e) => {
      const s = vesselOf(e.vessel)?.schedules.find((x) => x.code === e.schedule);
      return plan(
        "schedule_days",
        e,
        s && {
          rows: s.schedule_days.filter((d) => d.day_number === e.day_number),
          key: { schedule_id: s.id, day_number: e.day_number },
        },
      );
    })
    .filter(present) as unknown as Insert<"schedule_days">[];

  console.log(`\n${apply ? "Applying to" : "Dry run against"} ${target}`);
  for (const t of tables) {
    const c = counts[t];
    console.log(
      `${t}: ${c.add} to add, ${c.has} already in Japanese, ${c.changed.length} skipped (English differs), ${c.missing.length} not found`,
    );
    for (const x of c.changed) console.log(`    English differs: ${x}`);
    for (const x of c.missing) console.log(`    not found: ${x}`);
  }

  // A vessel page shows an itinerary in Japanese only when every day of it is: say which would still show English.
  const partly = vessels.flatMap((v) =>
    v.schedules.flatMap((s) => {
      const en = s.schedule_days.filter((d) => d.locale === "en").length;
      const ja = s.schedule_days.filter((d) => d.locale === "ja").length + dayRows.filter((d) => d.schedule_id === s.id).length;
      return en && ja && ja !== en ? [`${v.slug} / ${s.code}: ${ja} of ${en} days`] : [];
    }),
  );
  if (partly.length) console.log(`\nItineraries that would stay in English:\n- ${partly.join("\n- ")}`);

  if (!apply) {
    console.log("\nNothing written. Add --apply to add these rows.");
    return;
  }
  if (!added.length) {
    console.log("\nNothing to add.");
    return;
  }

  mkdirSync(resolve(root, ".import-backups"), { recursive: true });
  const record = resolve(root, `.import-backups/ja-content-${target}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  writeFileSync(record, JSON.stringify({ added }, null, 1));
  console.log(`\nKeys being added are listed in ${record}`);

  // ignoreDuplicates: an existing row is never overwritten, even one written since the read above.
  const keep = { ignoreDuplicates: true };
  if (vesselRows.length)
    must(
      await db.from("vessel_translations").upsert(vesselRows, { ...keep, onConflict: "vessel_id,locale" }),
      "vessel_translations",
    );
  if (cabinRows.length)
    must(
      await db.from("cabin_type_translations").upsert(cabinRows, { ...keep, onConflict: "cabin_type_id,locale" }),
      "cabin_type_translations",
    );
  if (mediaRows.length)
    must(await db.from("media_translations").upsert(mediaRows, { ...keep, onConflict: "media_id,locale" }), "media_translations");
  if (dayRows.length)
    must(
      await db.from("schedule_days").upsert(dayRows, { ...keep, onConflict: "schedule_id,day_number,locale" }),
      "schedule_days",
    );
  console.log(`Added ${added.length} Japanese rows to ${target}.`);
  await refreshSite(target!);
}

const file = tables.map((t) => `${t} ${content[t].length}`).join(", ");
if (apply && !target) {
  console.error("--apply needs --target=staging or production.");
  process.exit(1);
} else if (target) {
  console.log(`File: ${file}`);
  run().catch((e: unknown) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
} else {
  console.log(`File is valid: ${file}. Nothing read or written.`);
}
