/**
 * The Oberoi Zahra, from Oberoi's own fact sheet, deck plan, itineraries, sailing date sheets and photos (Islam,
 * 25 November 2026): cabin counts and decks, facilities, the dining text, the four- and seven-night programmes, when
 * guests embark, the dates for December 2026 and 2028, and on the deck drawing the two-bedroom suite at the front of
 * Deck C, with the library beside the theatre on Deck B. The 2027 dates on the site already match, and so does the
 * three-night programme. Prices are left as they are.
 *
 *   tsx scripts/apply-oberoi-zahra.ts --target=staging            report only
 *   tsx scripts/apply-oberoi-zahra.ts --apply --target=staging
 *
 * Production also needs --confirm-production. Every --apply first saves the boat's rows to .import-backups/.
 */
import { createClient } from "@supabase/supabase-js";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { layoutProblems } from "../src/lib/marketplace/deck-layout-schema";
import type { Database, Json } from "../src/server/db/database.types";
import { refreshSite } from "./lib/refresh-site";

const STAGING_REF = "fmidxxcadbuzxaxyohtk"; // public project id of the staging database

type Day = [title: string, description: string];
const WEST_KINGS = "the Valley of the Kings, Medinet Habu and the Colossi of Memnon";
const OUT = (port: string): Day => [`Disembarkation in ${port}`, "Breakfast and disembarkation."];
const KARNAK_MUSEUM: Day = [
  "Luxor: Karnak and the Luxor Museum",
  "Visit the Karnak Temple and the Luxor Museum. Tea, dinner and overnight in Luxor.",
];
const WEST_DENDERA: Day = [
  "Luxor West Bank and Dendera",
  `Visit ${WEST_KINGS} early, then sail to Qena for the Temple of Dendera and back to Luxor.`,
];
const NOBLES: Day = [
  "Luxor: the Tombs of the Nobles and Hatshepsut",
  "Visit the Valley of the Nobles, Deir el-Medina and the Temple of Hatshepsut, and Luxor Temple in the afternoon. Cocktails with entertainment as the boat sails in Luxor.",
];
const ISLAND = "Visit the Botanical Garden, then sunset cocktails with entertainment on a private island.";
const ABU_SIMBEL: Day = [
  "A day in Aswan",
  "A day on board in Aswan, with an optional visit to Abu Simbel. An afternoon sail around Aswan.",
];

const PROGRAMMES: Record<string, Day[]> = {
  ZLA4: [
    [
      "Luxor: Karnak and Luxor Temples",
      "Embark at noon and have lunch on board. Visit the Luxor and Karnak Temples. Cocktails with entertainment as the boat sails in Luxor.",
    ],
    [
      "Luxor West Bank and Esna",
      "Visit the Valley of the Kings, Deir el-Medina, the Temple of Hatshepsut and the Colossi of Memnon, then sail to Esna.",
    ],
    [
      "Edfu and Kom Ombo",
      "Sail to Edfu and visit the Temple of Horus, then sail to Kom Ombo and visit its temple in the evening.",
    ],
    ["Aswan", "Sail to Aswan. Visit the High Dam, Philae Temple and the Botanical Garden. Overnight in Aswan."],
    OUT("Aswan"),
  ],
  ZLA7: [
    [
      "Luxor: Karnak and the Luxor Museum",
      "Embark at noon and have lunch on board. Visit the Karnak Temple and the Luxor Museum. Overnight in Luxor.",
    ],
    WEST_DENDERA,
    NOBLES,
    ["Edfu", "Sail to Edfu and visit the Temple of Horus in the afternoon. Overnight in Edfu."],
    ["Aswan: High Dam and Philae", "Sail to Aswan. Visit the High Dam and Philae Temple."],
    ["Kom Ombo and a private island", `Sail to Kom Ombo and visit its temple, then return to Aswan. ${ISLAND}`],
    ABU_SIMBEL,
    OUT("Aswan"),
  ],
  ZAL7: [
    [
      "Aswan: High Dam and Philae",
      "Embark at noon and have lunch on board. Visit the High Dam and Philae Temple. Overnight in Aswan.",
    ],
    ABU_SIMBEL,
    ["Kom Ombo and a private island", `Sail to Kom Ombo and visit its temple, then return to Aswan. ${ISLAND}`],
    ["Edfu", "Sail to Edfu and visit the Temple of Horus in the afternoon. Overnight in Edfu."],
    KARNAK_MUSEUM,
    WEST_DENDERA,
    NOBLES,
    OUT("Luxor"),
  ],
};
// { year: { month: [days] } }; June is each year's dry dock.
type Sheet = Record<number, Record<number, number[]>>;
const DATES: Record<string, Sheet> = {
  ZAL3: {
    2026: { 12: [5, 12, 19, 26] },
    2028: {
      1: [15, 22, 29],
      2: [5, 12, 19],
      3: [11, 18, 25],
      4: [1, 8, 15],
      5: [6, 13, 20, 27],
      7: [8, 15, 22, 29],
      8: [5, 12, 19],
      9: [9, 16, 23, 30],
      10: [7, 14, 21],
      11: [11, 18, 25],
      12: [2, 9, 16, 23, 30],
    },
  },
  ZLA4: {
    2026: { 12: [1, 8, 15, 22] },
    2028: {
      1: [11, 18, 25],
      2: [1, 8, 15],
      3: [7, 14, 21, 28],
      4: [4, 11],
      5: [2, 9, 16, 23],
      7: [4, 11, 18, 25],
      8: [1, 8, 15],
      9: [5, 12, 19, 26],
      10: [3, 10, 17],
      11: [7, 14, 21, 28],
      12: [5, 12, 19, 26],
    },
  },
  ZLA7: { 2028: { 2: [22], 4: [18], 8: [22], 10: [24] } },
  ZAL7: { 2028: { 1: [4], 2: [29], 4: [25], 8: [29], 10: [31] } },
};
const dates = (sheet: Sheet) =>
  Object.entries(sheet).flatMap(([y, months]) =>
    Object.entries(months).flatMap(([m, days]) => days.map((d) => `${y}-${m.padStart(2, "0")}-${String(d).padStart(2, "0")}`)),
  );
const plus = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

const NIGHTS: Record<string, number> = { ZAL3: 3, ZLA4: 4, ZLA7: 7, ZAL7: 7 };
const SPACES = ["bar", "spa", "library", "pool", "gym"] as const;
const CABINS: Record<string, { count: number; deck: string }> = {
  LC: { count: 25, deck: "Decks B, C and D" },
  LS: { count: 2, deck: "Deck D" },
  LS2: { count: 1, deck: "Deck C" },
};
type Area = { from: number; to: number; side?: "port" | "starboard"; cabin?: string; space?: string; label?: string };
type Layout = { decks: { name: string; areas: Area[] }[] };
const LIBRARY = "Library and cigar lounge";

/** The two-bedroom suite goes where the drawing had the library; the library shares the theatre's stretch below. */
function redraw(old: Layout) {
  const layout = structuredClone(old);
  const deck = (name: string) => layout.decks.find((d) => d.name === name)!;
  const c = deck("C");
  const was = c.areas.findIndex((a) => a.space === "library");
  if (was >= 0) c.areas[was] = { from: c.areas[was]!.from, to: c.areas[was]!.to, cabin: "LS2" };
  const b = deck("B");
  const theatre = b.areas.findIndex((a) => a.label === "Theatre" && !a.side);
  if (theatre >= 0) {
    const { from, to } = b.areas[theatre]!;
    b.areas.splice(
      theatre,
      1,
      { from, to, side: "port", space: "lounge", label: "Theatre" },
      { from, to, side: "starboard", space: "library", label: LIBRARY },
    );
  }
  return layout;
}

const DINING =
  "The Restaurant serves freshly prepared international cuisine from a daily changing menu, 7 am to 10 pm. The Club Lounge serves high tea and drinks, 10 am to 11 pm, and hosts two cocktail receptions with live music and a Nubian performance on each cruise. The Library and Cigar Lounge is open day and night, with drinks until midnight.";

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

async function run() {
  for (const [code, days] of Object.entries(PROGRAMMES))
    if (days.length !== NIGHTS[code]! + 1) throw new Error(`${code}: ${days.length} days for ${NIGHTS[code]} nights`);
  const db = connect();
  const v = must(
    await db
      .from("vessels")
      .select("*, deck_plans(*), vessel_translations(*), cabin_types(*), schedules(*, schedule_days(*), departures(departs_on))")
      .eq("slug", "oberoi-zahra")
      .single(),
    "Zahra",
  )!;
  console.log(`${target}: ${v.name} (${v.visibility})`);
  const spaces = SPACES.filter((s) => !v.shared_spaces.includes(s as never));
  console.log(`  shared spaces added: ${spaces.join(", ") || "none"}`);
  for (const [code, want] of Object.entries(CABINS)) {
    const c = v.cabin_types.find((x) => x.code === code);
    if (!c) throw new Error(`No cabin type ${code}.`);
    console.log(`  cabin ${code}: ${c.cabin_count ?? "–"} → ${want.count}, ${c.deck} → ${want.deck}`);
  }
  const en = v.vessel_translations.find((t) => t.locale === "en");
  if (!en) throw new Error("No English text.");
  const before = v.deck_plans?.layout as unknown as Layout | undefined;
  if (!before) throw new Error("No deck drawing to change.");
  const drawing = redraw(before);
  const problems = layoutProblems(
    drawing as unknown as Json,
    v.cabin_types.map((c) => c.code),
  );
  if (problems.length) throw new Error(`Drawing: ${problems.join("; ")}`);
  const changed = JSON.stringify(drawing) !== JSON.stringify(before);
  console.log(`  deck drawing: ${changed ? "two-bedroom suite and library moved" : "already right"}`);
  console.log(`  dining text: ${en.dining ? "replaced" : "added"}`);
  for (const [code, nights] of Object.entries(NIGHTS)) {
    const s = v.schedules.find((x) => x.code === code);
    if (!s || s.nights !== nights) throw new Error(`${code}: expected a ${nights}-night schedule.`);
    const had = s.schedule_days.filter((d) => d.locale === "en").length;
    const foreign = s.schedule_days.length - had;
    console.log(
      `  ${code}: embark ${s.sailing_period ?? "–"} → noon, ` +
        (PROGRAMMES[code] ? `programme ${had ? "replaced" : "added"}` : "programme kept") +
        (foreign ? `, ${foreign} translated days kept: check them` : ""),
    );
  }
  // One boat: no sailing may start before the one before it ends.
  const all = v.schedules
    .flatMap((s) => {
      const days = new Set([...s.departures.map((d) => d.departs_on), ...dates(DATES[s.code] ?? {})]);
      return [...days].map((from) => ({ code: s.code, from, to: plus(from, s.nights) }));
    })
    .sort((a, b) => a.from.localeCompare(b.from));
  const overlaps = all.flatMap((a, i) =>
    all[i + 1] && all[i + 1]!.from < a.to ? [`${a.code} ${a.from} / ${all[i + 1]!.code} ${all[i + 1]!.from}`] : [],
  );
  console.log(`  overlapping sailings: ${overlaps.join("; ") || "none"}`);
  for (const [code, sheet] of Object.entries(DATES)) {
    const have = new Set(v.schedules.find((x) => x.code === code)!.departures.map((d) => d.departs_on));
    console.log(`  ${code}: ${dates(sheet).filter((d) => !have.has(d)).length} of ${dates(sheet).length} dates to add`);
  }
  if (!apply) return console.log("\nReport only; nothing written.");

  mkdirSync(resolve(import.meta.dirname, "../.import-backups"), { recursive: true });
  const backup = resolve(
    import.meta.dirname,
    `../.import-backups/oberoi-zahra-${target}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
  );
  writeFileSync(backup, JSON.stringify(v, null, 2));
  console.log(`\nBackup: ${backup}`);

  must(
    await db
      .from("vessels")
      .update({ shared_spaces: [...v.shared_spaces, ...(spaces as unknown as typeof v.shared_spaces)] })
      .eq("id", v.id),
    "spaces",
  );
  for (const [code, want] of Object.entries(CABINS))
    must(
      await db.from("cabin_types").update({ cabin_count: want.count, deck: want.deck }).eq("vessel_id", v.id).eq("code", code),
      code,
    );
  if (changed)
    must(
      await db
        .from("deck_plans")
        .update({ layout: drawing as unknown as Json })
        .eq("vessel_id", v.id),
      "drawing",
    );
  must(await db.from("vessel_translations").update({ dining: DINING }).eq("vessel_id", v.id).eq("locale", "en"), "dining");

  for (const code of Object.keys(NIGHTS)) {
    const s = v.schedules.find((x) => x.code === code)!;
    must(await db.from("schedules").update({ sailing_period: "noon" }).eq("id", s.id), `${code}: embarkation`);
    const days = PROGRAMMES[code];
    if (days) {
      must(await db.from("schedule_days").delete().eq("schedule_id", s.id).eq("locale", "en"), `${code}: old days`);
      must(
        await db.from("schedule_days").insert(
          days.map(([title, description], i) => ({
            schedule_id: s.id,
            day_number: i + 1,
            locale: "en" as const,
            title,
            description,
          })),
        ),
        `${code}: days`,
      );
    }
    const rows = dates(DATES[code]!).map((departs_on) => ({
      schedule_id: s.id,
      vessel_id: v.id,
      departs_on,
      returns_on: plus(departs_on, s.nights),
    }));
    must(
      await db.from("departures").upsert(rows, { onConflict: "schedule_id,departs_on", ignoreDuplicates: true }),
      `${code}: dates`,
    );
    console.log(`✓ ${code}`);
  }
  await refreshSite(target!);
}

run().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
