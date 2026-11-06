/**
 * Import an operator's fleet file and its translations into the catalogue, for the existing vessel page
 * (scripts/lib/fleet-import.ts has the rules). The Nour El Nil fleet is the first:
 *
 *   pnpm import:fleet                                    dry run: checks both files, changes nothing
 *   pnpm import:fleet --apply --target=local             into the local Docker database
 *   pnpm import:fleet --apply --target=staging           into staging
 *   pnpm import:fleet --target=production                report only: reads production, lists what would change
 *   pnpm import:fleet --apply --target=production --confirm-production
 *
 * Other files: pnpm import:fleet docs/imports/x-fleet-data.json docs/imports/x-fleet-i18n.json …
 * Every --apply first saves the affected rows to .import-backups/ (git-ignored), then writes. The file owns these
 * boats: their facts, texts, cabin types, itinerary and photos are set from it on every run. Each boat is shown as
 * information only (showcase, never bookable). Photos are copied from the operator's site into Nilecruz storage once
 * (never hotlinked); a photo already stored is not downloaded again.
 */
import { createClient } from "@supabase/supabase-js";
import { imageSize } from "image-size";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Database } from "../src/server/db/database.types";
import { NO_DECK, planFleetImport, type FleetFile, type FleetI18n, type VesselPlan } from "./lib/fleet-import";
import { refreshSite } from "./lib/refresh-site";

const STAGING_REF = "fmidxxcadbuzxaxyohtk"; // public project id of the staging database
const SHOWCASE_DAYS = 365;

const args = process.argv.slice(2);
const files = args.filter((a) => !a.startsWith("--"));
const dataFile = files[0] ?? resolve(import.meta.dirname, "../docs/imports/nour-el-nil-fleet-data.json");
const i18nFile = files[1] ?? resolve(import.meta.dirname, "../docs/imports/nour-el-nil-fleet-i18n.json");
const apply = args.includes("--apply");
const target = args.find((a) => a.startsWith("--target="))?.split("=")[1];
const today = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" });
const plan = planFleetImport(
  JSON.parse(readFileSync(resolve(dataFile), "utf8")) as FleetFile,
  JSON.parse(readFileSync(resolve(i18nFile), "utf8")) as FleetI18n,
  today,
);

if (plan.problems.length) {
  console.error(`Not imported; fix these first:\n- ${plan.problems.join("\n- ")}`);
  process.exit(1);
}

const must = <T>(r: { data: T; error: { message: string } | null }, what: string): T => {
  if (r.error) throw new Error(`${what}: ${r.error.message}`);
  return r.data;
};
/** One row that must come back (an insert or upsert with .single()). */
const one = <T>(r: { data: T; error: { message: string } | null }, what: string): NonNullable<T> => {
  const row = must(r, what);
  if (!row) throw new Error(`${what}: no row returned`);
  return row;
};

function connect() {
  let url: string;
  let key: string;
  if (target === "local") {
    const status = JSON.parse(execFileSync("supabase", ["status", "-o", "json"], { encoding: "utf8" })) as Record<string, string>;
    url = status.API_URL!;
    key = status.SERVICE_ROLE_KEY ?? status.SECRET_KEY!;
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

async function snapshotOf(db: Db) {
  const slugs = [...plan.vessels.flatMap((v) => [v.slug, v.renameFrom]), ...plan.skipped.map((s) => s.slug)];
  return (
    must(
      await db
        .from("vessels")
        .select(
          "*, vessel_translations(*), vessel_private(*), cabin_types(*, cabin_type_translations(*)), schedules(*, schedule_periods(*), schedule_days(*), schedule_translations(*)), media(*, media_translations(*))",
        )
        .in("slug", slugs),
      "snapshot",
    ) ?? []
  );
}
type Row = Awaited<ReturnType<typeof snapshotOf>>[number];

/** The boat's row: by its address, else its earlier address when the name matches (never another boat's). */
const rowOf = (rows: Row[], v: VesselPlan) =>
  rows.find((r) => r.slug === v.slug) ?? rows.find((r) => r.slug === v.renameFrom && r.name === v.name);

function reportOf(v: VesselPlan, e: Row | undefined): string {
  const head = `${v.displayName ?? v.name} → /cruises/${v.slug}/`;
  const lines = [
    e ? (e.slug === v.slug ? `updates the ${e.visibility} record` : `renames ${e.slug} (${e.visibility})`) : "creates it",
    `information only (showcase until ${showcaseUntil()}), ${v.propulsion}, ${v.cabinCount ?? "?"} units, ${v.maxGuests ?? "?"} guests`,
    v.indicative
      ? `guide price ${v.indicative.currency} ${v.indicative.amountMinor / 100} per person for ${v.indicative.nights} nights`
      : "no price shown",
    `${v.cabins.filter((c) => c.active).length} cabin types shown${v.cabins.some((c) => !c.active) ? `, ${v.cabins.filter((c) => !c.active).length} hidden` : ""}`,
    v.itineraries.length
      ? v.itineraries
          .map(
            (it) =>
              `${it.code}: ${it.sailingDays.length ? `weekly, ${it.periods.map((p) => `${p.starts_on}–${p.ends_on}`).join(", ")}` : "no dates (departure day not confirmed)"}`,
          )
          .join("; ")
      : "no itinerary",
    `${v.photos.length} photos (${v.photos.filter((p) => p.cabin).length} on cabin cards)`,
  ];
  return `~ ${head}\n    ${lines.join("\n    ")}`;
}

function showcaseUntil() {
  const d = new Date(`${today}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + SHOWCASE_DAYS);
  return d.toISOString().slice(0, 10);
}

async function importVessel(db: Db, v: VesselPlan, existing: Row | undefined) {
  // The row: renamed from its earlier address, or created (private until the end of this function).
  if (existing && existing.slug !== v.slug)
    must(await db.from("vessels").update({ slug: v.slug }).eq("id", existing.id), `${v.slug}: rename`);
  const id =
    existing?.id ??
    one(await db.from("vessels").insert({ slug: v.slug, name: v.name, type: v.type }).select("id").single(), `${v.slug}: create`)
      .id;

  must(
    await db
      .from("vessels")
      .update({
        name: v.name,
        display_name: v.displayName,
        type: v.type,
        propulsion: v.propulsion,
        category: null,
        cabin_count: v.cabinCount,
        max_guests: v.maxGuests,
        year_built: v.yearBuilt,
        year_renovated: v.yearRenovated,
        length_m: v.lengthM,
        beam_m: v.beamM,
        deck_count: null,
        shared_spaces: v.sharedSpaces as Database["public"]["Tables"]["vessels"]["Row"]["shared_spaces"],
        is_sample: false,
        // ADR-109: the guide price becomes the public starting price, in euros only (never converted). Islam confirmed
        // these figures for now (6 Nov 2026), without "Includes our margin" until he confirms they include it.
        ...(v.indicative?.currency === "EUR"
          ? {
              public_pricing_mode: "from_price" as const,
              from_price_minor: v.indicative.amountMinor,
              pricing_currency: "EUR",
              pricing_basis: "per_person_per_trip",
              pricing_trip_nights: v.indicative.nights || null,
              pricing_last_checked: v.checkedOn,
              operator_pricing_approved: true,
              price_includes_margin: false,
            }
          : { public_pricing_mode: "on_request" as const, from_price_minor: null, operator_pricing_approved: false }),
        indicative_per_night_minor: null,
        indicative_per_trip_minor: null,
        indicative_trip_nights: null,
        indicative_currency: null,
        indicative_basis: null,
        indicative_status: null,
        booking_availability: v.booking.availability,
        commercial_relationship: v.booking.relationship,
        enquiry_partner_name: v.booking.enquiry?.name ?? null,
        enquiry_partner_email: v.booking.enquiry?.email ?? null,
      })
      .eq("id", id),
    `${v.slug}: facts`,
  );
  must(
    await db
      .from("vessel_private")
      .upsert({ vessel_id: id, source_urls: v.sourceUrls, verification_note: v.verificationNote.slice(0, 4000) }),
    `${v.slug}: notes`,
  );
  must(
    await db.from("vessel_translations").upsert(
      v.translations.map((t) => ({ vessel_id: id, ...t })),
      { onConflict: "vessel_id,locale" },
    ),
    `${v.slug}: texts`,
  );

  // Cabin types: the file's, in its order; any other type on the record stops being shown.
  must(
    await db.from("cabin_types").upsert(
      v.cabins.map((c) => ({
        vessel_id: id,
        code: c.code,
        name: c.name,
        deck: NO_DECK,
        size_m2: c.size_m2,
        size_includes_bathroom: c.size_m2 !== null,
        bed_configuration: c.bed_configuration,
        max_occupancy: c.max_occupancy,
        view: c.view,
        balcony: false,
        amenities: [],
        cabin_count: c.cabin_count,
        active: c.active,
        unverified_fields: [],
        sort_order: c.sort_order,
      })),
      { onConflict: "vessel_id,code" },
    ),
    `${v.slug}: cabin types`,
  );
  must(
    await db
      .from("cabin_types")
      .update({ active: false })
      .eq("vessel_id", id)
      .not("code", "in", `(${v.cabins.map((c) => c.code).join(",")})`),
    `${v.slug}: other cabin types`,
  );
  const cabinIds = new Map(
    (must(await db.from("cabin_types").select("id, code").eq("vessel_id", id), `${v.slug}: cabin ids`) ?? []).map((c) => [
      c.code,
      c.id,
    ]),
  );
  const cabinWords = v.cabins.flatMap((c) => c.translations.map((t) => ({ cabin_type_id: cabinIds.get(c.code)!, ...t })));
  if (cabinWords.length)
    must(
      await db.from("cabin_type_translations").upsert(cabinWords, { onConflict: "cabin_type_id,locale" }),
      `${v.slug}: cabin texts`,
    );

  // Each itinerary: its weekly day inside the open months, its days and boarding note in each language. Any other
  // itinerary on the record stops being shown.
  for (const it of v.itineraries) {
    const schedule = one(
      await db
        .from("schedules")
        .upsert(
          {
            vessel_id: id,
            code: it.code,
            origin: it.origin,
            destination: it.destination,
            nights: it.nights,
            sailing_days: it.sailingDays,
            active: true,
          },
          { onConflict: "vessel_id,code" },
        )
        .select("id")
        .single(),
      `${v.slug}: itinerary ${it.code}`,
    );
    must(await db.from("schedule_periods").delete().eq("schedule_id", schedule.id), `${v.slug}: old periods`);
    if (it.periods.length)
      must(
        await db.from("schedule_periods").insert(it.periods.map((p) => ({ schedule_id: schedule.id, ...p }))),
        `${v.slug}: periods`,
      );
    must(
      await db.from("schedule_days").upsert(
        it.days.map((d) => ({ schedule_id: schedule.id, ...d })),
        { onConflict: "schedule_id,day_number,locale" },
      ),
      `${v.slug}: days`,
    );
    if (it.boarding.length)
      must(
        await db.from("schedule_translations").upsert(
          it.boarding.map((b) => ({ schedule_id: schedule.id, ...b })),
          { onConflict: "schedule_id,locale" },
        ),
        `${v.slug}: boarding note`,
      );
  }
  if (v.itineraries.length)
    must(
      await db
        .from("schedules")
        .update({ active: false })
        .eq("vessel_id", id)
        .not("code", "in", `(${v.itineraries.map((it) => it.code).join(",")})`),
      `${v.slug}: other itineraries`,
    );

  // Photos, copied into Nilecruz storage once. A photo of a cabin type shows on its card instead of the gallery.
  const stored = new Map((existing?.media ?? []).map((m) => [m.storage_path, m.id]));
  for (const p of v.photos) {
    const path = `vessels/${id}/${p.file}`;
    let mediaId = stored.get(path);
    const row = { sort_order: p.sort_order, credit: v.credit, shows_cabin_type_id: p.cabin ? cabinIds.get(p.cabin)! : null };
    if (!mediaId) {
      // A photo kept in this repository is read from disk; one on the operator's site is downloaded.
      let bytes: Buffer;
      if (p.path) bytes = readFileSync(resolve(import.meta.dirname, "..", p.path));
      else {
        const res = await fetch(p.url!, { headers: { "User-Agent": "Nilecruz fleet import (photos used with permission)" } });
        if (!res.ok) throw new Error(`${v.slug}: photo ${p.file}: ${res.status}`);
        bytes = Buffer.from(await res.arrayBuffer());
      }
      const size = imageSize(bytes);
      if (!size.width || !size.height) throw new Error(`${v.slug}: photo ${p.file}: not an image`);
      const type = size.type === "png" ? "image/png" : size.type === "webp" ? "image/webp" : "image/jpeg";
      const up = await db.storage.from("media").upload(path, bytes, { contentType: type, upsert: true });
      if (up.error) throw new Error(`${v.slug}: photo ${p.file}: ${up.error.message}`);
      mediaId = one(
        await db
          .from("media")
          .insert({ vessel_id: id, storage_path: path, width: size.width, height: size.height, ...row })
          .select("id")
          .single(),
        `${v.slug}: photo ${p.file}`,
      ).id;
    } else {
      must(await db.from("media").update(row).eq("id", mediaId), `${v.slug}: photo ${p.file}`);
    }
    must(
      await db.from("media_translations").upsert(
        (["en", "es", "ja"] as const).map((locale) => ({ media_id: mediaId!, locale, alt: p.alt[locale] })),
        { onConflict: "media_id,locale" },
      ),
      `${v.slug}: photo ${p.file} alt text`,
    );
  }

  // Last, so a boat half imported is never shown: information only, never bookable.
  must(
    await db
      .from("vessels")
      .update({ visibility: "showcase", showcase_until: showcaseUntil(), showcase_reason: v.showcaseReason })
      .eq("id", id),
    `${v.slug}: showcase`,
  );
}

async function run() {
  const db = connect();
  const before = await snapshotOf(db);
  console.log(
    `${target}: ${plan.vessels.length} boats\n${plan.vessels.map((v) => reportOf(v, rowOf(before, v))).join("\n")}` +
      (plan.skipped.length
        ? `\nSkipped (left as they are): ${plan.skipped.map((s) => `${s.slug}: ${s.reason}`).join("; ")}`
        : ""),
  );
  if (!apply) return console.log("\nReport only; nothing written.");

  mkdirSync(resolve(import.meta.dirname, "../.import-backups"), { recursive: true });
  const backup = resolve(
    import.meta.dirname,
    `../.import-backups/fleet-${target}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
  );
  writeFileSync(backup, JSON.stringify(before, null, 2));
  console.log(`\nBackup of ${before.length} boats: ${backup}\n`);
  for (const v of plan.vessels) {
    await importVessel(db, v, rowOf(before, v));
    console.log(`✓ ${v.displayName ?? v.name}`);
  }
  console.log(`Done: ${plan.vessels.length} boats in ${target}, information only.`);
  await refreshSite(target!);
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
    `Dry run (no database): ${plan.vessels.length} boats, all valid.\n${plan.vessels.map((v) => reportOf(v, undefined)).join("\n")}` +
      (plan.skipped.length ? `\nSkipped: ${plan.skipped.map((s) => `${s.slug}: ${s.reason}`).join("; ")}` : "") +
      `\n\nNot shown, per boat:\n${plan.vessels.map((v) => `- ${v.name}: ${v.hidden.join("; ")}`).join("\n")}`,
  );
}
