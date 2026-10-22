import { describe, expect, it } from "vitest";
import { MOORING, MOORING_TEXT, SHARED_SPACES } from "@/lib/catalogue/mooring";
import { DECK_STATE_TEXT, deckState, sharedText } from "@/lib/marketplace/deck-view";
import { deckGroups, type VesselCabin } from "@/lib/marketplace/vessel";

const cabin = (id: string, deck: string, sizeM2: number | null = null): VesselCabin => ({
  id,
  name: id,
  deck,
  sizeM2,
  bed: null,
  maxOccupancy: 2,
  view: null,
  balcony: false,
  amenities: [],
});

describe("EXP-002 the deck view", () => {
  it("colours each cabin type by how it books on the sailing (ADR-099)", () => {
    expect([deckState("instant"), deckState("request"), deckState("unconfirmed"), deckState("sold_out")]).toEqual([
      "instant",
      "confirm",
      "confirm",
      "sold_out",
    ]);
    expect(DECK_STATE_TEXT.confirm).toBe("The operator confirms within a set time");
  });
  it("says how many guests share the shared spaces", () => {
    expect(sharedText(16, ["sun_deck", "dining_room", "lounge"])).toBe(
      "Up to 16 guests share the sun deck, dining room and lounge.",
    );
    expect(sharedText(16, ["pool"])).toBe("Up to 16 guests share the pool.");
    expect(sharedText(120, [])).toBe("Up to 120 guests share the vessel’s public spaces.");
    expect(sharedText(null, [])).toBeNull();
  });
  it("places every cabin type on its deck, upper decks first", () => {
    const groups = deckGroups([cabin("a", "Main", 20), cabin("b", "Upper", 28), cabin("c", "Main", 24)]);
    expect(groups.map((g) => g.deck)).toEqual(["Upper", "Main"]);
    expect(groups.flatMap((g) => g.cabins.map((c) => c.id)).sort()).toEqual(["a", "b", "c"]);
    expect(groups[1]!.cabins.map((c) => c.id)).toEqual(["c", "a"]);
  });
});

describe("EXP-005 mooring", () => {
  it("has words for every practice and the database's list of spaces", () => {
    for (const m of MOORING) expect(MOORING_TEXT[m.value]).toMatch(/^This vessel moors/);
    expect(SHARED_SPACES.map((s) => s.value)).toEqual([
      "sun_deck",
      "pool",
      "jacuzzi",
      "dining_room",
      "lounge",
      "bar",
      "spa",
      "gym",
      "library",
    ]);
  });
});
