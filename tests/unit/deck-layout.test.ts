import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { areaBox, cabinShare, deckSummary, decksOf, hullPath, toneOf } from "@/lib/marketplace/deck-layout";
import { layoutProblems, parseLayout } from "@/lib/marketplace/deck-layout-schema";

const lily = JSON.parse(
  readFileSync(resolve(import.meta.dirname, "../../docs/imports/deck-plans/movenpick-royal-lily.json"), "utf8"),
).layout as unknown;
const darakum = JSON.parse(
  readFileSync(resolve(import.meta.dirname, "../../docs/imports/deck-plans/movenpick-darakum.json"), "utf8"),
) as { layout: unknown; cabin_types_needed: { types: { code: string; cabin_count: number }[] } };
const hamees = JSON.parse(
  readFileSync(resolve(import.meta.dirname, "../../docs/imports/deck-plans/movenpick-hamees.json"), "utf8"),
) as { layout: unknown; cabin_types_needed: { types: { code: string; cabin_count: number; max_occupancy: number }[] } };
const abbas = JSON.parse(
  readFileSync(resolve(import.meta.dirname, "../../docs/imports/deck-plans/movenpick-prince-abbas.json"), "utf8"),
) as { layout: unknown; cabin_types_needed: { types: { code: string; cabin_count: number | null }[] } };
const lotus = JSON.parse(
  readFileSync(resolve(import.meta.dirname, "../../docs/imports/deck-plans/movenpick-royal-lotus.json"), "utf8"),
) as { layout: unknown; uses_existing_cabin_types: string[] };
const sunRay = JSON.parse(
  readFileSync(resolve(import.meta.dirname, "../../docs/imports/deck-plans/movenpick-sun-ray.json"), "utf8"),
) as { layout: unknown; uses_existing_cabin_types: string[] };
const misr = JSON.parse(
  readFileSync(resolve(import.meta.dirname, "../../docs/imports/deck-plans/movenpick-ss-misr.json"), "utf8"),
) as { layout: unknown; uses_existing_cabin_types: string[] };
const names: Record<string, string> = { STD: "Standard Cabin", RS: "Royal Suite" };

describe("deck layouts (EXP-002, 9-2b)", () => {
  it("reads SS Misr's drawing with its existing codes, where Mövenpick's numbered plan puts each category", () => {
    const layout = parseLayout(misr.layout)!;
    expect(layout.decks.map((d) => d.name)).toEqual(["5", "4", "3", "2"]);
    expect(layoutProblems(misr.layout, misr.uses_existing_cabin_types)).toEqual([]);
    expect(decksOf(layout, "OUT")).toEqual(["4", "3", "2"]);
    expect(decksOf(layout, "STE")).toEqual(["4", "3"]);
    expect(decksOf(layout, "PAN")).toEqual(["3"]);
    expect(decksOf(layout, "SGL")).toEqual(["2"]);
  });

  it("reads Sun Ray's drawing with its existing codes: Classic on deck 1, both suites on deck 4, not 'To be confirmed'", () => {
    const layout = parseLayout(sunRay.layout)!;
    expect(layout.decks.map((d) => d.name)).toEqual(["Sun", "4", "3", "2", "1"]);
    expect(layoutProblems(sunRay.layout, sunRay.uses_existing_cabin_types)).toEqual([]);
    expect(decksOf(layout, "CLASSIC")).toEqual(["1"]);
    expect(decksOf(layout, "UPPER")).toEqual(["4", "3", "2"]);
    expect(decksOf(layout, "JS")).toEqual(["4"]);
    expect(decksOf(layout, "SS")).toEqual(["4"]);
  });

  it("reads Royal Lotus's drawing with the cabin types it already has: Deluxe on D, C and B, Royal Suites forward on B", () => {
    const layout = parseLayout(lotus.layout)!;
    expect(layout.decks.map((d) => d.name)).toEqual(["E", "D", "C", "B", "A"]);
    expect(layoutProblems(lotus.layout, lotus.uses_existing_cabin_types)).toEqual([]);
    expect(decksOf(layout, "STD")).toEqual(["D", "C", "B"]);
    expect(decksOf(layout, "RS")).toEqual(["B"]);
  });

  it("reads Prince Abbas's drawing: six decks, suites forward, and no Standard Cabin count until Mövenpick gives one", () => {
    const layout = parseLayout(abbas.layout)!;
    const types = abbas.cabin_types_needed.types;
    expect(layout.decks.map((d) => d.name)).toEqual(["6", "5", "4", "3", "2", "1"]);
    expect(
      layoutProblems(
        abbas.layout,
        types.map((t) => t.code),
      ),
    ).toEqual([]);
    expect(decksOf(layout, "RS")).toEqual(["3", "2"]);
    expect(decksOf(layout, "JS")).toEqual(["4", "3", "2"]);
    expect(decksOf(layout, "STD")).toEqual(["4", "3", "2"]);
    expect(types.map((t) => [t.code, t.cabin_count])).toEqual([
      ["RS", 4],
      ["JS", 18],
      ["STD", null],
    ]);
  });

  it("reads Hamees's drawing: decks A to E, 72 cabins and 142 guests as Mövenpick's fact sheet gives, no suites", () => {
    const layout = parseLayout(hamees.layout)!;
    const types = hamees.cabin_types_needed.types;
    expect(layout.decks.map((d) => d.name)).toEqual(["E", "D", "C", "B", "A"]);
    expect(
      layoutProblems(
        hamees.layout,
        types.map((t) => t.code),
      ),
    ).toEqual([]);
    expect(decksOf(layout, "SUP")).toEqual(["D", "C"]);
    expect(decksOf(layout, "STD")).toEqual(["B", "A"]);
    expect(decksOf(layout, "SGL")).toEqual(["B"]);
    expect(types.reduce((n, t) => n + t.cabin_count, 0)).toBe(72);
    expect(types.reduce((n, t) => n + t.cabin_count * t.max_occupancy, 0)).toBe(142);
  });

  it("reads Darakum's drawing: five decks, its three cabin types where the plan puts them, 52 cabins in all", () => {
    const layout = parseLayout(darakum.layout)!;
    const types = darakum.cabin_types_needed.types;
    expect(layout.decks.map((d) => d.name)).toEqual(["5", "4", "3", "2", "1"]);
    expect(
      layoutProblems(
        darakum.layout,
        types.map((t) => t.code),
      ),
    ).toEqual([]);
    expect(decksOf(layout, "STD")).toEqual(["3", "2", "1"]);
    expect(decksOf(layout, "SS")).toEqual(["4", "3"]);
    expect(decksOf(layout, "PS")).toEqual(["3"]);
    expect(types.reduce((n, t) => n + t.cabin_count, 0)).toBe(52);
  });

  it("reads Royal Lily's drawing: five decks, top first, every cabin code known", () => {
    const layout = parseLayout(lily)!;
    expect(layout.decks.map((d) => d.name)).toEqual(["E", "D", "C", "B", "A"]);
    expect(layoutProblems(lily, ["STD", "RS"])).toEqual([]);
  });

  it("finds each cabin type's decks, top deck first", () => {
    const layout = parseLayout(lily)!;
    expect(decksOf(layout, "STD")).toEqual(["D", "C", "B"]);
    expect(decksOf(layout, "RS")).toEqual(["D", "B"]);
    expect(decksOf(layout, "XX")).toEqual([]);
  });

  it("measures how much of the plan each cabin type covers, so the biggest is drawn lightest", () => {
    const layout = parseLayout(lily)!;
    expect(cabinShare(layout, "STD")).toBeGreaterThan(cabinShare(layout, "RS"));
    expect(cabinShare(layout, "XX")).toBe(0);
  });

  it("names what each deck holds, stern to bow, without repeats", () => {
    const deckB = parseLayout(lily)!.decks[3]!;
    expect(deckSummary(deckB, (c) => names[c])).toEqual([
      "Crew only",
      "Lounge",
      "Reception",
      "Standard Cabin",
      "Royal Suite",
      "Open deck",
    ]);
  });

  it("refuses a malformed drawing rather than break the page", () => {
    expect(parseLayout(null)).toBeNull();
    expect(parseLayout({ decks: [] })).toBeNull();
    expect(
      parseLayout({ decks: [{ name: "A", length: 100, bow: "round", areas: [{ from: 10, to: 5, space: "lounge" }] }] }),
    ).toBeNull();
    // An area is a cabin type or a space, never both.
    expect(
      parseLayout({
        decks: [{ name: "A", length: 100, bow: "round", areas: [{ from: 0, to: 5, space: "lounge", cabin: "STD" }] }],
      }),
    ).toBeNull();
  });

  it("tells an editor about unknown cabin codes and areas past the bow", () => {
    const raw = { decks: [{ name: "A", length: 80, bow: "square", areas: [{ from: 0, to: 90, cabin: "DLX" }] }] };
    expect(layoutProblems(raw, ["STD"])).toEqual([
      "Deck A: an area runs past the bow (90 > 80)",
      "Deck A: no cabin type with the code DLX",
    ]);
  });

  it("draws port and starboard either side of the corridor, and full-beam areas across it", () => {
    expect(areaBox({ from: 10, to: 20, side: "port", cabin: "STD" })).toEqual({ x: 100, y: 10, w: 100, h: 36 });
    expect(areaBox({ from: 10, to: 20, side: "starboard", cabin: "STD" })).toEqual({ x: 100, y: 54, w: 100, h: 36 });
    expect(areaBox({ from: 10, to: 20, space: "lounge" })).toEqual({ x: 100, y: 10, w: 100, h: 80 });
    expect(toneOf({ from: 0, to: 1, space: "crew" })).toBe("crew");
    expect(toneOf({ from: 0, to: 1, space: "pool" })).toBe("water");
    expect(hullPath(90, "round")).toMatch(/^M6 10H820C880 10 900 34 900 50/);
  });
});
