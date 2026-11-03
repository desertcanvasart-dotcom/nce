import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { areaBox, deckSummary, decksOf, hullPath, layoutProblems, parseLayout, toneOf } from "@/lib/marketplace/deck-layout";

const lily = JSON.parse(
  readFileSync(resolve(import.meta.dirname, "../../docs/imports/deck-plans/movenpick-royal-lily.json"), "utf8"),
).layout as unknown;
const names: Record<string, string> = { STD: "Standard Cabin", RS: "Royal Suite" };

describe("deck layouts (EXP-002, 9-2b)", () => {
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
