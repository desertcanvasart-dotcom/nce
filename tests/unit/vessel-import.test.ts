import { describe, expect, it } from "vitest";
import {
  EXCLUDED_FIELDS,
  fixLookalikes,
  mapVessel,
  nameKey,
  planImport,
  type SourceVessel,
} from "../../scripts/lib/vessel-import";

const base: SourceVessel = {
  name: "Sample Ship",
  aliases: null,
  type: "powered",
  class_rating: "5* deluxe",
  route: "Luxor–Aswan",
  operator_org: "Sample Operator",
  cabins: 62,
  max_guests: 124,
  decks: 4,
  built: "2014",
  verification: "Directory listing",
  source_urls: "https://a.example/x; https://b.example/y",
  import_flags: null,
  slug: "sample-ship",
  email: "secret@example.test",
  phone: "+200000000000",
  price_from: 555,
  score: { food: 3.5 },
};
const ok = (r: SourceVessel, i = 0) => {
  const m = mapVessel(r, i);
  if ("reason" in m) throw new Error(m.reason);
  return m;
};

describe("type mapping (ADR-051)", () => {
  it.each([
    ["dahabiya", "sail"],
    ["powered", "motor"],
    ["lake_nasser", "motor"],
  ])("%s → %s", (src, want) => expect(ok({ ...base, type: src }).vessel.type).toBe(want));
  it("never guesses a steamer", () => expect(ok({ ...base, name: "SS Sudan" }).vessel.type).toBe("motor"));
  it("skips unknown types", () => expect(mapVessel({ ...base, type: "felucca" }, 3)).toMatchObject({ reason: /unknown type/ }));
});

describe("fields", () => {
  it("imports facts as a private draft and keeps contacts, prices and scores out", () => {
    const m = ok(base);
    expect(m.vessel).toMatchObject({
      visibility: "private",
      is_sample: false,
      cabin_count: 62,
      year_built: 2014,
      source_ref: "ncm:sample-ship",
    });
    expect(m.private.source_urls).toEqual(["https://a.example/x", "https://b.example/y"]);
    const out = JSON.stringify(m);
    for (const leak of ["secret@example.test", "+200000000000", "555", "3.5"]) expect(out).not.toContain(leak);
    expect(EXCLUDED_FIELDS).toEqual(expect.arrayContaining(["email", "phone", "price_from", "score"]));
  });
  it("leaves impossible numbers empty, with a note", () => {
    const m = ok({ ...base, cabins: 0, decks: 40, built: "renovated 2009, built c. 1990" });
    expect(m.vessel).toMatchObject({ cabin_count: null, deck_count: null, year_built: 2009 });
    expect(m.notes.join(" ")).toMatch(/cabins.*decks.*year built/);
  });
});

describe("names and slugs", () => {
  it("replaces Cyrillic look-alike numerals", () => {
    expect(fixLookalikes("Viking ІІІ")).toBe("Viking III");
    const m = ok({ ...base, name: "Beau Rivage ІІ", slug: "beau-rivage-іі" });
    expect(m.vessel).toMatchObject({ name: "Beau Rivage II", slug: "beau-rivage-ii" });
  });
  it("never takes a reserved listing slug (SEO-030)", () => {
    expect(ok({ ...base, name: "Luxury", slug: "luxury" }).vessel.slug).toBe("luxury-ship");
    expect(ok({ ...base, type: "dahabiya", name: "Compare", slug: "compare" }).vessel.slug).toBe("compare-dahabiya");
  });
  it("skips bundled lists of names", () => {
    expect(mapVessel({ ...base, name: "Unverified names (A, B, C)" }, 9)).toMatchObject({ reason: /not one vessel: A, B, C/ });
  });
  it("name keys ignore prefixes and accents", () => expect(nameKey("MS Mövenpick Hayah")).toBe(nameKey("movenpick hayah")));
});

describe("planImport", () => {
  it("drops only exact duplicates and keeps near-matches for review", () => {
    const p = planImport([
      { ...base, type: "dahabiya", name: "Dream", slug: "dream" },
      { ...base, type: "dahabiya", name: "Dahabiya Dream", slug: "dahabiya-dream" },
      { ...base, type: "dahabiya", name: "DREAM", slug: "dream-2" },
      { ...base, name: "Dream", slug: "dream-ship" },
    ]);
    expect(p.mapped.map((m) => m.vessel.slug)).toEqual(["dream", "dahabiya-dream", "dream-ship"]);
    expect(p.duplicates).toEqual([{ name: "DREAM", keptSlug: "dream", droppedSlug: "dream-2" }]);
    expect(p.likelyDuplicates).toEqual([{ slugs: ["dream", "dahabiya-dream"] }]);
  });
  it("makes clashing slugs unique", () => {
    const p = planImport([
      { ...base, name: "A", slug: "same" },
      { ...base, name: "B", slug: "same" },
    ]);
    expect(p.mapped.map((m) => m.vessel.slug)).toEqual(["same", "same-2"]);
  });
  it("lists steamer candidates without changing their type", () => {
    const p = planImport([{ ...base, name: "Historic Steamer Sudan", slug: "sudan" }, base]);
    expect(p.steamCandidates).toEqual([{ slug: "sudan", name: "Historic Steamer Sudan" }]);
    expect(p.byType).toEqual({ motor: 2 });
  });
});
