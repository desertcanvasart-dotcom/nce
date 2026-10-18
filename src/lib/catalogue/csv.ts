import Papa from "papaparse";
import { RESERVED_VESSEL_SLUGS, slugify } from "@/lib/data/slugs";

/**
 * DASH-ADM-020–025: the vessel CSV import. Profiles only: no cabins, prices, availability, policies or
 * evaluations (DASH-BND-004). Every row is checked before anything is written; duplicates (same source
 * reference or name) are skipped and existing records are never changed.
 */
export const CSV_COLUMNS = [
  "source_ref",
  "name",
  "type",
  "route",
  "category",
  "cabin_count",
  "max_guests",
  "deck_count",
  "year_built",
  "description_en",
] as const;
type Column = (typeof CSV_COLUMNS)[number];

export const CSV_TEMPLATE =
  CSV_COLUMNS.join(",") +
  "\n" +
  // One example row, marked as an example so it can't be imported by mistake.
  '"EXAMPLE-1","EXAMPLE – delete this row","sail","Esna–Aswan","luxury","6","12","2","2019","Two or three sentences about the vessel."\n';

export type ImportRow = {
  line: number;
  status: "ok" | "error" | "duplicate";
  messages: string[];
  vessel?: {
    source_ref: string;
    name: string;
    slug: string;
    type: "sail" | "motor" | "steam";
    route_text: string | null;
    category: "basic" | "standard" | "superior" | "deluxe" | "luxury" | null;
    cabin_count: number | null;
    max_guests: number | null;
    deck_count: number | null;
    year_built: number | null;
    description_en: string | null;
  };
};

const TYPES = new Set(["sail", "motor", "steam"]);
const CATS = new Set(["basic", "standard", "superior", "deluxe", "luxury"]);
const MAX_ROWS = 2000;

function int(raw: string, label: string, min: number, max: number, msgs: string[]): number | null {
  const v = raw.trim();
  if (!v) return null;
  if (!/^\d+$/.test(v) || Number(v) < min || Number(v) > max) {
    msgs.push(`${label} must be a whole number from ${min} to ${max} (found "${v}").`);
    return null;
  }
  return Number(v);
}

export function parseVesselCsv(
  text: string,
  existing: { sourceRefs: Set<string>; names: Set<string>; slugs: Set<string> },
): { rows: ImportRow[]; fileErrors: string[] } {
  const fileErrors: string[] = [];
  if (text.includes("�")) fileErrors.push("The file is not UTF-8. Save it as “CSV UTF-8” and upload it again.");
  const clean = text.replace(/^﻿/, "");
  const parsed = Papa.parse<Record<string, string>>(clean, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim(),
  });
  const headers = parsed.meta.fields ?? [];
  const missing = CSV_COLUMNS.filter((c) => !headers.includes(c));
  if (missing.length) fileErrors.push(`Missing columns: ${missing.join(", ")}. Use the template.`);
  const extra = headers.filter((h) => !(CSV_COLUMNS as readonly string[]).includes(h));
  if (extra.length) fileErrors.push(`Unknown columns: ${extra.join(", ")}. This import covers vessel profiles only.`);
  for (const e of parsed.errors.slice(0, 5)) fileErrors.push(`Line ${(e.row ?? 0) + 2}: ${e.message}`);
  if (parsed.data.length > MAX_ROWS) fileErrors.push(`At most ${MAX_ROWS} rows per file (found ${parsed.data.length}).`);
  if (fileErrors.length) return { rows: [], fileErrors };

  const seenRefs = new Set<string>();
  const seenNames = new Set<string>();
  const seenSlugs = new Set(existing.slugs);
  const rows: ImportRow[] = parsed.data.map((r, i) => {
    const line = i + 2; // header is line 1
    const get = (c: Column) => (r[c] ?? "").trim();
    const msgs: string[] = [];
    const source_ref = get("source_ref");
    const name = get("name");
    if (/^example/i.test(source_ref) || /^example/i.test(name))
      return { line, status: "error", messages: ["This is the template's example row. Delete it."] };
    if (!source_ref) msgs.push("Source reference is required.");
    if (!name) msgs.push("Name is required.");
    const type = get("type").toLowerCase();
    if (!TYPES.has(type)) msgs.push(`Type must be sail, motor or steam (found "${get("type")}").`);
    const category = get("category").toLowerCase();
    if (category && !CATS.has(category))
      msgs.push(`Category must be basic, standard, superior, deluxe or luxury (found "${get("category")}").`);
    const cabin_count = int(get("cabin_count"), "Cabin count", 1, 400, msgs);
    const max_guests = int(get("max_guests"), "Guest capacity", 1, 800, msgs);
    const deck_count = int(get("deck_count"), "Deck count", 1, 10, msgs);
    const year_built = int(get("year_built"), "Year built", 1850, 2100, msgs);
    const description = get("description_en");
    if (description.length > 4000) msgs.push("The description is longer than 4,000 characters.");
    if (msgs.length) return { line, status: "error", messages: msgs };

    const refKey = source_ref.toLowerCase();
    const nameKey = name.toLowerCase();
    if (existing.sourceRefs.has(refKey) || existing.names.has(nameKey)) {
      return {
        line,
        status: "duplicate",
        messages: ["Already in the catalogue (same source reference or name). Skipped; the existing record is kept."],
      };
    }
    if (seenRefs.has(refKey) || seenNames.has(nameKey)) {
      return { line, status: "duplicate", messages: ["Appears earlier in this file. Skipped."] };
    }
    seenRefs.add(refKey);
    seenNames.add(nameKey);

    let base = slugify(name) || "vessel";
    if ((RESERVED_VESSEL_SLUGS as readonly string[]).includes(base)) base = `${base}-${type === "sail" ? "dahabiya" : "ship"}`;
    let slug = base;
    for (let n = 2; seenSlugs.has(slug); n++) slug = `${base}-${n}`;
    seenSlugs.add(slug);

    return {
      line,
      status: "ok",
      messages: [],
      vessel: {
        source_ref,
        name,
        slug,
        type: type as "sail" | "motor" | "steam",
        route_text: get("route") || null,
        category: (category || null) as NonNullable<ImportRow["vessel"]>["category"],
        cabin_count,
        max_guests,
        deck_count,
        year_built,
        description_en: description || null,
      },
    };
  });
  return { rows, fileErrors };
}
