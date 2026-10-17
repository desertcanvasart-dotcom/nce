/**
 * DATA-014 / DATA-045: map the 609-record vessel directory (nile-cruise-marketplace/data/vessels.json)
 * to Nilecruz rows. Pure functions, unit-tested; scripts/import-vessels.ts does the reading and writing.
 *
 * Imported: name, aliases, type, route text, cabins, guests, decks, year built, star band (as raw text),
 * source links, verification note, import flags.
 * Never imported (ADR-013, Q26): emails, phones, websites, contact intermediaries, prices, scores, "best for".
 */
import { RESERVED_VESSEL_SLUGS, SLUG_PATTERN, slugify } from "../../src/lib/data/slugs";

export type SourceVessel = {
  name: string;
  aliases: string | null;
  type: string;
  class_rating: string | null;
  route: string | null;
  operator_org: string | null;
  cabins: number | null;
  max_guests: number | null;
  decks: number | null;
  built: string | null;
  verification: string | null;
  source_urls: string | null;
  import_flags: string | null;
  slug: string | null;
  [other: string]: unknown;
};

export type MappedVessel = {
  vessel: {
    slug: string;
    source_ref: string;
    name: string;
    type: "sail" | "motor" | "steam";
    visibility: "private";
    cabin_count: number | null;
    max_guests: number | null;
    deck_count: number | null;
    year_built: number | null;
    route_text: string | null;
    is_sample: false;
  };
  private: {
    aliases: string[];
    claimed_operator_name: string | null;
    raw_type: string;
    raw_class_rating: string | null;
    verification_note: string | null;
    source_urls: string[];
    import_flags: string | null;
  };
  notes: string[];
};

export type Skipped = { index: number; name: string; reason: string };

/** Type mapping approved by Faris (ADR-051): dahabiyas sail; everything else is a motor ship until an admin marks a steamer. */
const TYPE_MAP: Record<string, "sail" | "motor"> = { dahabiya: "sail", powered: "motor", lake_nasser: "motor" };

/** Cyrillic and Greek letters that look Latin, found in the source ("Beau Rivage ІІ"). */
const LOOKALIKES: Record<string, string> = {
  і: "i",
  І: "I",
  ј: "j",
  а: "a",
  А: "A",
  е: "e",
  Е: "E",
  о: "o",
  О: "O",
  с: "c",
  С: "C",
  р: "p",
  Р: "P",
  х: "x",
  Х: "X",
  у: "y",
  В: "B",
  Н: "H",
  К: "K",
  М: "M",
  Т: "T",
  Ι: "I",
  Ο: "O",
};
const LOOKALIKE_RE = new RegExp(`[${Object.keys(LOOKALIKES).join("")}]`, "g");

export function fixLookalikes(text: string): string {
  return text.replace(LOOKALIKE_RE, (c) => LOOKALIKES[c] ?? c);
}

const clean = (v: string | null | undefined) => {
  const t = v?.replace(/\s+/g, " ").trim();
  return t ? t : null;
};
const splitList = (v: string | null) =>
  (v ?? "")
    .split(/;\s*/)
    .map((s) => s.trim())
    .filter(Boolean);

function count(v: unknown, max: number, label: string, notes: string[]): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).trim());
  if (Number.isInteger(n) && n > 0 && n <= max) return n;
  notes.push(`${label} "${String(v)}" left empty: not a whole number between 1 and ${max}`);
  return null;
}

function year(v: string | null, notes: string[]): number | null {
  if (!v) return null;
  const m = /\b(1[89]\d\d|20\d\d)\b/.exec(v);
  if (m) {
    if (m[0] !== v.trim()) notes.push(`year built "${v}" read as ${m[0]}`);
    return Number(m[0]);
  }
  notes.push(`year built "${v}" left empty: no year found`);
  return null;
}

/** Normalised name for duplicate detection: case, accents, look-alikes, "MS"/"M/S"/"Dahabiya" prefixes ignored. */
export function nameKey(name: string): string {
  return slugify(fixLookalikes(name))
    .replace(/^(ms|m-s|ms-|dahabiya|dahabeya|dahabia|the)-/, "")
    .replace(/-(nile-cruise|cruise|dahabiya|dahabeya)$/, "");
}

// Candidates only, for Faris to confirm (ADR-051): names that suggest a paddle steamer, including the historic SS Sudan, SS Misr and SS Karim.
const STEAM_HINT = /steam|\bS\.?S\.?\b|\bsudan\b|\bmisr\b|\bkarim\b/i;

export function steamCandidate(r: SourceVessel): boolean {
  return STEAM_HINT.test(`${r.name} ${r.aliases ?? ""}`);
}

export function mapVessel(r: SourceVessel, index: number): MappedVessel | Skipped {
  const rawName = clean(r.name);
  if (!rawName) return { index, name: String(r.name ?? ""), reason: "no name" };
  const bundle = /^unverified names\s*\((.*)\)\s*$/i.exec(rawName);
  if (bundle) return { index, name: rawName, reason: `a list of unverified names, not one vessel: ${bundle[1]}` };
  const type = TYPE_MAP[r.type];
  if (!type) return { index, name: rawName, reason: `unknown type "${r.type}"` };

  const notes: string[] = [];
  const name = fixLookalikes(rawName);
  if (name !== rawName) notes.push(`name had look-alike Cyrillic/Greek letters, replaced with Latin: "${rawName}" → "${name}"`);

  const fromSource = r.slug ? slugify(fixLookalikes(r.slug)) : "";
  let slug = fromSource && SLUG_PATTERN.test(fromSource) ? fromSource : slugify(name);
  if (r.slug && slug !== r.slug) notes.push(`slug "${r.slug}" normalised to "${slug}"`);
  if (!slug) return { index, name, reason: "no usable slug" };
  if ((RESERVED_VESSEL_SLUGS as readonly string[]).includes(slug)) {
    const was = slug;
    slug = `${slug}-${type === "sail" ? "dahabiya" : "ship"}`;
    notes.push(`slug "${was}" is a reserved listing address; changed to "${slug}"`);
  }

  return {
    vessel: {
      slug,
      source_ref: `ncm:${r.slug ?? slug}`,
      name,
      type,
      visibility: "private",
      cabin_count: count(r.cabins, 400, "cabins", notes),
      max_guests: count(r.max_guests, 800, "guests", notes),
      deck_count: count(r.decks, 10, "decks", notes),
      year_built: year(r.built, notes),
      route_text: clean(r.route),
      is_sample: false,
    },
    private: {
      aliases: splitList(r.aliases).map(fixLookalikes),
      claimed_operator_name: clean(r.operator_org),
      raw_type: r.type,
      raw_class_rating: clean(r.class_rating),
      verification_note: clean(r.verification),
      source_urls: splitList(r.source_urls).filter((u) => /^https?:\/\//.test(u)),
      import_flags: clean(r.import_flags),
    },
    notes,
  };
}

export type ImportPlan = {
  read: number;
  mapped: MappedVessel[];
  skipped: Skipped[];
  duplicates: { name: string; keptSlug: string; droppedSlug: string }[];
  likelyDuplicates: { slugs: string[] }[];
  flaggedDuplicates: { slug: string; flag: string }[];
  steamCandidates: { slug: string; name: string }[];
  byType: Record<string, number>;
};

/**
 * Maps every record. Exact duplicates (identical name once case, accents and look-alike letters are ignored,
 * and the same type) keep the first and are reported. Near-matches ("Dahabiya Dream" / "Dream") are all kept
 * and listed for an admin to merge: no record is dropped on a guess.
 */
export function planImport(records: SourceVessel[]): ImportPlan {
  const mapped: MappedVessel[] = [];
  const skipped: Skipped[] = [];
  const duplicates: ImportPlan["duplicates"] = [];
  const seenKey = new Map<string, MappedVessel>();
  const seenSlug = new Set<string>();

  records.forEach((r, i) => {
    const m = mapVessel(r, i);
    if ("reason" in m) return void skipped.push(m);
    const key = `${m.vessel.type}:${slugify(m.vessel.name)}`;
    const first = seenKey.get(key);
    if (first) {
      duplicates.push({ name: m.vessel.name, keptSlug: first.vessel.slug, droppedSlug: m.vessel.slug });
      skipped.push({ index: i, name: m.vessel.name, reason: `duplicate of ${first.vessel.slug}` });
      return;
    }
    let slug = m.vessel.slug;
    for (let n = 2; seenSlug.has(slug); n++) slug = `${m.vessel.slug}-${n}`;
    if (slug !== m.vessel.slug) m.notes.push(`slug "${m.vessel.slug}" already taken; using "${slug}"`);
    m.vessel.slug = slug;
    seenKey.set(key, m);
    seenSlug.add(slug);
    mapped.push(m);
  });

  const byType: Record<string, number> = {};
  for (const m of mapped) byType[m.vessel.type] = (byType[m.vessel.type] ?? 0) + 1;

  const near = new Map<string, string[]>();
  for (const m of mapped) {
    const k = `${m.vessel.type}:${nameKey(m.vessel.name)}`;
    near.set(k, [...(near.get(k) ?? []), m.vessel.slug]);
  }

  return {
    read: records.length,
    likelyDuplicates: [...near.values()].filter((s) => s.length > 1).map((slugs) => ({ slugs })),
    mapped,
    skipped,
    duplicates,
    flaggedDuplicates: mapped
      .filter((m) => m.private.import_flags?.startsWith("possible-duplicate-of:"))
      .map((m) => ({ slug: m.vessel.slug, flag: m.private.import_flags! })),
    steamCandidates: records
      .filter(steamCandidate)
      .map((r) => mapped.find((m) => m.private.raw_type === r.type && nameKey(m.vessel.name) === nameKey(fixLookalikes(r.name))))
      .filter((m): m is MappedVessel => !!m)
      .filter((m, i, all) => all.findIndex((o) => o.vessel.slug === m.vessel.slug) === i)
      .map((m) => ({ slug: m.vessel.slug, name: m.vessel.name })),
    byType,
  };
}

/** Fields that must never leave the source file (checked by the tests and by the script before writing). */
export const EXCLUDED_FIELDS = [
  "email",
  "phone",
  "website",
  "contact_org",
  "contact_type",
  "price_from",
  "price_note",
  "score",
  "best_for",
  "facilities",
  "notes",
  "status",
] as const;
