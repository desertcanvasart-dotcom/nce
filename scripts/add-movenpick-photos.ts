/**
 * Mövenpick photos (Islam, 25 November 2026: cabins of each type, restaurant, sun deck, reception; at most 10 per boat,
 * counting those already there). Web-sized copies are read from --photos=<folder>; the originals are not in this
 * repository. A cabin type's photo shows on its card, the others in the gallery, after what is already there.
 *
 *   tsx scripts/add-movenpick-photos.ts --boat=sun-ray|darakum --photos=<folder> --target=staging            report only
 *   tsx scripts/add-movenpick-photos.ts --boat=… --photos=<folder> --apply --target=staging
 *
 * Production also needs --confirm-production. Running it again adds nothing twice.
 */
import { createClient } from "@supabase/supabase-js";
import { imageSize } from "image-size";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Database } from "../src/server/db/database.types";
import { refreshSite } from "./lib/refresh-site";

const STAGING_REF = "fmidxxcadbuzxaxyohtk"; // public project id of the staging database
const CREDIT = "Mövenpick Nile Cruises";
const LIMIT = 10;

const alt = (en: string, es: string, ja: string) => ({ en, es, ja });
type Photo = { file: string; cabin: string | null; alt: { en: string; es: string; ja: string } };
const named = (name: string) => ({
  cabin: (file: string, code: string, en: string, es: string, ja: string): Photo => ({
    file,
    cabin: code,
    alt: alt(`${name}: ${en}`, `${name}: ${es}`, `${name}：${ja}`),
  }),
  room: (file: string, en: string, es: string, ja: string): Photo => ({
    file,
    cabin: null,
    alt: alt(`${name}: ${en}`, `${name}: ${es}`, `${name}：${ja}`),
  }),
});
const sunRay = named("Mövenpick MS Sun Ray");
const darakum = named("Mövenpick MS Darakum");

// A cabin type with no photo had none supplied that could be told apart: Sun Ray's Junior Upper Suite; Darakum's Water
// Level Cabin and Top Deck Senior Suite.
const BOATS: Record<string, Photo[]> = {
  "sun-ray": [
    sunRay.room("restaurant.jpg", "restaurant", "restaurante", "レストラン"),
    sunRay.room("sun-deck.jpg", "sun deck and pool", "cubierta solar y piscina", "サンデッキとプール"),
    sunRay.room("reception.jpg", "reception", "recepción", "レセプション"),
    sunRay.cabin("classic-cabin.jpg", "CLASSIC", "Classic Cabin", "camarote Classic", "クラシックキャビン"),
    sunRay.cabin("superior-cabin.jpg", "UPPER", "Superior Cabin", "camarote Superior", "スーペリアキャビン"),
    sunRay.cabin("deluxe-cabin.jpg", "DLX", "Deluxe Cabin", "camarote Deluxe", "デラックスキャビン"),
    sunRay.cabin("junior-suite.jpg", "JS", "Junior Suite", "Junior Suite", "ジュニアスイート"),
    sunRay.cabin("deluxe-suite.jpg", "DS", "Deluxe Suite", "Deluxe Suite", "デラックススイート"),
    sunRay.cabin("executive-suite.jpg", "ES", "Executive Suite", "Executive Suite", "エグゼクティブスイート"),
  ],
  darakum: [
    darakum.room("exterior.jpg", "on the Nile", "en el Nilo", "ナイル川を行く船"),
    darakum.room("restaurant.jpg", "restaurant", "restaurante", "レストラン"),
    darakum.room("sun-deck.jpg", "sun deck and pool", "cubierta solar y piscina", "サンデッキとプール"),
    darakum.room("reception.jpg", "reception lobby", "vestíbulo de recepción", "レセプションロビー"),
    darakum.cabin("main-deck-cabin.jpg", "SUP", "Main Deck Cabin", "camarote de la cubierta principal", "メインデッキキャビン"),
    darakum.cabin(
      "upper-deck-cabin.jpg",
      "UPD",
      "Upper Deck Cabin",
      "camarote de la cubierta superior",
      "アッパーデッキキャビン",
    ),
    darakum.cabin("junior-suite.jpg", "JS", "Junior Suite", "Junior Suite", "ジュニアスイート"),
    darakum.cabin("senior-suite.jpg", "SS", "Senior Suite", "Senior Suite", "シニアスイート"),
    darakum.cabin("panorama-suite.jpg", "PS", "Panorama Suite", "Panorama Suite", "パノラマスイート"),
  ],
};

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const target = args.find((a) => a.startsWith("--target="))?.split("=")[1];
const boat = args.find((a) => a.startsWith("--boat="))?.split("=")[1] ?? "";
const folder = args.find((a) => a.startsWith("--photos="))?.slice("--photos=".length);

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
  const PHOTOS = BOATS[boat];
  if (!PHOTOS) throw new Error(`--boat must be one of: ${Object.keys(BOATS).join(", ")}.`);
  const slug = `movenpick-${boat}`;
  if (!folder) throw new Error("--photos=<folder> is needed.");
  const missing = PHOTOS.filter((p) => !existsSync(join(folder, p.file)));
  if (missing.length) throw new Error(`Missing photos: ${missing.map((p) => p.file).join(", ")}`);
  const db = connect();
  const v = must(
    await db.from("vessels").select("id, name, cabin_types(id, code), media(storage_path, sort_order)").eq("slug", slug).single(),
    slug,
  )!;
  const path = (file: string) => `vessels/${v.id}/2027-${file}`;
  const fresh = PHOTOS.filter((p) => !v.media.some((m) => m.storage_path === path(p.file)));
  if (v.media.length + fresh.length > LIMIT)
    throw new Error(`${v.media.length} there + ${fresh.length} new is over the limit of ${LIMIT}.`);
  for (const p of PHOTOS)
    if (p.cabin && !v.cabin_types.some((c) => c.code === p.cabin)) throw new Error(`No cabin type ${p.cabin}.`);
  console.log(`${target}: ${v.name} has ${v.media.length} photos; ${fresh.length} to add`);
  for (const p of fresh) console.log(`  ${p.file} → ${p.cabin ? `cabin card ${p.cabin}` : "gallery"}`);
  if (!apply) return console.log("\nReport only; nothing written.");

  let order = Math.max(-1, ...v.media.map((m) => m.sort_order));
  for (const p of fresh) {
    const bytes = readFileSync(join(folder, p.file));
    const size = imageSize(bytes);
    if (!size.width || !size.height) throw new Error(`${p.file}: not an image`);
    const up = await db.storage.from("media").upload(path(p.file), bytes, { contentType: "image/jpeg", upsert: true });
    if (up.error) throw new Error(`${p.file}: ${up.error.message}`);
    const m = must(
      await db
        .from("media")
        .insert({
          vessel_id: v.id,
          storage_path: path(p.file),
          width: size.width,
          height: size.height,
          sort_order: ++order,
          credit: CREDIT,
          shows_cabin_type_id: p.cabin ? v.cabin_types.find((c) => c.code === p.cabin)!.id : null,
        })
        .select("id")
        .single(),
      p.file,
    )!;
    must(
      await db
        .from("media_translations")
        .insert((["en", "es", "ja"] as const).map((locale) => ({ media_id: m.id, locale, alt: p.alt[locale] }))),
      `${p.file}: description`,
    );
    console.log(`✓ ${p.file}`);
  }
  await refreshSite(target!);
}

run().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
