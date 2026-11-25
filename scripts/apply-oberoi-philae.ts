/**
 * The Oberoi Philae, from Oberoi's own fact sheet, programmes and cruise date sheets for 2026, 2027 and 2028 (Islam,
 * 25 November 2026): cabin counts and decks, facilities, the deck drawing, the four- and six-night programmes in both
 * directions, and their dates.
 * Dates start on 2 December 2026 (that week's sailing is left out). The six-night cruises are on the 2026 sheet only.
 *
 *   tsx scripts/apply-oberoi-philae.ts --target=staging            report only
 *   tsx scripts/apply-oberoi-philae.ts --apply --target=staging
 *
 * Production also needs --confirm-production. It never deletes a date; running it again adds nothing twice. Every
 * --apply first saves the boat's rows to .import-backups/.
 */
import { createClient } from "@supabase/supabase-js";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { layoutProblems } from "../src/lib/marketplace/deck-layout-schema";
import type { Database, Json } from "../src/server/db/database.types";
import { refreshSite } from "./lib/refresh-site";

const STAGING_REF = "fmidxxcadbuzxaxyohtk"; // public project id of the staging database

// { year: { month: [days] } }; June is each year's dry dock.
type Sheet = Record<number, Record<number, number[]>>;
const dates = (sheet: Sheet) =>
  Object.entries(sheet).flatMap(([y, months]) =>
    Object.entries(months).flatMap(([m, days]) => days.map((d) => `${y}-${m.padStart(2, "0")}-${String(d).padStart(2, "0")}`)),
  );

const FROM_LUXOR_4: Sheet = {
  2026: { 12: [8, 26] },
  2027: {
    1: [5, 13, 21, 29],
    2: [6, 14, 22],
    3: [2, 10, 18, 26],
    4: [3, 11, 19, 27],
    5: [5, 13, 21, 29],
    7: [8, 16, 24],
    8: [1, 9, 17, 25],
    9: [2, 10, 18, 26],
    10: [4, 12, 20, 28],
    11: [5, 13, 21, 29],
    12: [7, 15, 23, 31],
  },
  2028: {
    1: [8, 16, 24],
    2: [1, 9, 17, 25],
    3: [4, 12, 20, 28],
    4: [5, 13, 21, 29],
    5: [7, 15, 23],
    7: [10, 18, 26],
    8: [3, 11, 19, 27],
    9: [4, 12, 20, 28],
    10: [6, 14, 22, 30],
    11: [7, 15, 23],
    12: [1, 9, 17, 25],
  },
};
const FROM_ASWAN_4: Sheet = {
  2026: { 12: [12, 22] },
  2027: {
    1: [9, 17, 25],
    2: [2, 10, 18, 26],
    3: [6, 14, 22, 30],
    4: [7, 15, 23],
    5: [1, 9, 17, 25],
    7: [12, 20, 28],
    8: [5, 13, 21, 29],
    9: [6, 14, 22, 30],
    10: [8, 16, 24],
    11: [1, 9, 17, 25],
    12: [3, 11, 19, 27],
  },
  2028: {
    1: [4, 12, 20, 28],
    2: [5, 13, 21, 29],
    3: [8, 16, 24],
    4: [1, 9, 17, 25],
    5: [3, 11, 19, 27],
    7: [14, 22, 30],
    8: [7, 15, 23, 31],
    9: [8, 16, 24],
    10: [2, 10, 18, 26],
    11: [3, 11, 19, 27],
    12: [5, 13, 21, 29],
  },
};

type Day = [title: string, description: string];
const WEST =
  "the Valley of the Kings, including the tombs of Tutankhamun and Ramesses VI, then Deir el-Medina, Medinet Habu and the Colossi of Memnon";
const OUT = (port: string): Day => [`Disembarkation in ${port}`, "Breakfast and disembarkation."];
const NUBIAN: Day = [
  "Aswan: Nubian Museum",
  "Embark at noon, have lunch on board and visit the Nubian Museum. Cocktail reception, dinner and overnight in Aswan.",
];
const TO_EDFU: Day = [
  "Philae, High Dam and Kom Ombo",
  "Visit Philae Temple and the High Dam, then sail to Kom Ombo and visit its twin temple. Sail on to Edfu.",
];

type Plan = {
  code: string;
  origin: string;
  destination: string;
  nights: number;
  period: "morning" | "noon";
  dates: string[];
  /** Left out where the programme on the site already matches Oberoi's. */
  days?: Day[];
};
const PLANS: Plan[] = [
  { code: "ASW-LXR-4", origin: "Aswan", destination: "Luxor", nights: 4, period: "noon", dates: dates(FROM_ASWAN_4) },
  {
    code: "LXR-ASW-4",
    origin: "Luxor",
    destination: "Aswan",
    nights: 4,
    period: "noon",
    dates: dates(FROM_LUXOR_4),
    days: [
      [
        "Luxor: Karnak and Luxor Temples",
        "Embark at noon and have lunch on board. Visit the Karnak and Luxor Temples. Cocktail reception, dinner and overnight in Luxor.",
      ],
      ["Luxor West Bank and Esna", `Visit ${WEST}. Sail to Esna and pass through the lock.`],
      [
        "Edfu and Kom Ombo",
        "Sail to Edfu and visit the Temple of Horus, then sail to Kom Ombo and visit its twin temple. Overnight in Kom Ombo.",
      ],
      ["Aswan", "Sail to Aswan. Visit the High Dam and Philae Temple, then the Nubian Museum."],
      OUT("Aswan"),
    ],
  },
  {
    code: "ASW-LXR-6",
    origin: "Aswan",
    destination: "Luxor",
    nights: 6,
    period: "noon",
    dates: dates({ 2026: { 12: [2, 30] } }),
    days: [
      NUBIAN,
      TO_EDFU,
      ["Edfu and the Esna lock", "Visit the Temple of Horus at Edfu, then sail to Luxor through the Esna lock."],
      ["Luxor", `Visit ${WEST}, then the Karnak and Luxor Temples.`],
      ["Dendera", "Sail to Qena and visit the Temple of Dendera. Overnight in Qena."],
      ["Abydos and Luxor", "Visit the Temple of Abydos, then sail back to Luxor and visit the Luxor Museum."],
      OUT("Luxor"),
    ],
  },
  {
    code: "LXR-ASW-6",
    origin: "Luxor",
    destination: "Aswan",
    nights: 6,
    period: "morning",
    dates: dates({ 2026: { 12: [16] } }),
    days: [
      ["Dendera", "Embark in the morning, sail to Qena and visit the Temple of Dendera. Overnight in Qena."],
      ["Abydos and Luxor", "Visit the Temple of Abydos, then sail to Luxor and visit the Luxor Museum."],
      [
        "Luxor: Karnak and Luxor Temples",
        "A free morning for the spa, then visit the Luxor and Karnak Temples. Cocktail reception.",
      ],
      ["Luxor West Bank", `Visit ${WEST}. Sail to Esna.`],
      ["Edfu and Kom Ombo", "Sail to Edfu and visit the Temple of Horus, then continue to Kom Ombo and visit its twin temple."],
      ["Aswan", "Sail to Aswan. Visit the High Dam and Philae Temple, then the Nubian Museum."],
      OUT("Aswan"),
    ],
  },
];

const SPACES = ["bar", "spa", "library", "pool", "gym"] as const;
const COUNTS: Record<string, number> = { LC: 18, LS: 2, LST: 2 };
const TERRACE =
  "Two suites of 55 m² with a 30 m² private terrace and a jacuzzi: a king-size bedroom, a living room, a bathroom with a standalone bathtub and a shower, and a private changing room.";

const DECKS: Record<string, string> = { LC: "Decks B, C and D", LS: "Deck D", LST: "Deck D" };
const drawing = JSON.parse(
  readFileSync(resolve(import.meta.dirname, "../docs/imports/deck-plans/oberoi-philae.json"), "utf8"),
) as {
  layout: Json;
  credit: string;
};

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
  for (const p of PLANS)
    if (p.days && p.days.length !== p.nights + 1) throw new Error(`${p.code}: ${p.days.length} days for ${p.nights} nights`);
  const problems = layoutProblems(drawing.layout, Object.keys(COUNTS));
  if (problems.length) throw new Error(`Drawing: ${problems.join("; ")}`);
  const db = connect();
  const v = must(
    await db
      .from("vessels")
      .select(
        "*, deck_plans(*), cabin_types(*, cabin_type_translations(*)), schedules(*, schedule_days(*), departures(departs_on))",
      )
      .eq("slug", "oberoi-philae")
      .single(),
    "Philae",
  )!;
  console.log(`${target}: ${v.name} (${v.visibility})`);
  const spaces = SPACES.filter((s) => !v.shared_spaces.includes(s as never));
  console.log(`  shared spaces added: ${spaces.join(", ") || "none"}`);
  for (const [code, n] of Object.entries(COUNTS)) {
    const c = v.cabin_types.find((x) => x.code === code);
    if (!c) throw new Error(`No cabin type ${code}.`);
    console.log(`  cabin ${code}: ${c.cabin_count ?? "–"} → ${n}, ${c.deck} → ${DECKS[code]}`);
  }
  for (const p of PLANS) {
    const s = v.schedules.find((x) => x.code === p.code);
    const have = new Set(s?.departures.map((d) => d.departs_on) ?? []);
    const foreign = s?.schedule_days.filter((d) => d.locale !== "en").length ?? 0;
    console.log(
      `  ${p.code}: ${s ? "there" : "added"}, ${p.dates.filter((d) => !have.has(d)).length} of ${p.dates.length} dates to add, ` +
        `${p.days ? "English programme replaced" : "programme kept"}${foreign ? `, ${foreign} translated days kept: check them` : ""}`,
    );
  }
  console.log(`  deck drawing: ${v.deck_plans?.layout ? "replaced" : "added"}`);
  if (!apply) return console.log("\nReport only; nothing written.");

  mkdirSync(resolve(import.meta.dirname, "../.import-backups"), { recursive: true });
  const backup = resolve(
    import.meta.dirname,
    `../.import-backups/oberoi-philae-${target}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
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
  for (const [code, n] of Object.entries(COUNTS))
    must(
      await db.from("cabin_types").update({ cabin_count: n, deck: DECKS[code]! }).eq("vessel_id", v.id).eq("code", code),
      code,
    );
  const terrace = v.cabin_types.find((x) => x.code === "LST")!;
  must(
    await db
      .from("cabin_type_translations")
      .upsert({ cabin_type_id: terrace.id, locale: "en", description: TERRACE }, { onConflict: "cabin_type_id,locale" }),
    "terrace suite",
  );

  must(
    await db
      .from("deck_plans")
      .upsert({ vessel_id: v.id, layout: drawing.layout, credit: v.deck_plans?.credit ?? drawing.credit }),
    "drawing",
  );

  for (const p of PLANS) {
    const s = must(
      await db
        .from("schedules")
        .upsert(
          {
            vessel_id: v.id,
            code: p.code,
            origin: p.origin,
            destination: p.destination,
            nights: p.nights,
            sailing_days: [],
            sailing_period: p.period,
            active: true,
          },
          { onConflict: "vessel_id,code" },
        )
        .select("id")
        .single(),
      p.code,
    )!;
    if (p.days) {
      must(await db.from("schedule_days").delete().eq("schedule_id", s.id).eq("locale", "en"), `${p.code}: old days`);
      must(
        await db.from("schedule_days").insert(
          p.days.map(([title, description], i) => ({
            schedule_id: s.id,
            day_number: i + 1,
            locale: "en" as const,
            title,
            description,
          })),
        ),
        `${p.code}: days`,
      );
    }
    const rows = p.dates.map((departs_on) => ({
      schedule_id: s.id,
      vessel_id: v.id,
      departs_on,
      returns_on: new Date(Date.parse(`${departs_on}T00:00:00Z`) + p.nights * 86_400_000).toISOString().slice(0, 10),
    }));
    must(
      await db.from("departures").upsert(rows, { onConflict: "schedule_id,departs_on", ignoreDuplicates: true }),
      `${p.code}: dates`,
    );
    console.log(`✓ ${p.code}`);
  }
  await refreshSite(target!);
}

run().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
