import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  dimensions,
  hiddenPaths,
  openPeriods,
  planFleetImport,
  shown,
  type FleetFile,
  type FleetI18n,
} from "../../scripts/lib/fleet-import";

const read = <T>(f: string) => JSON.parse(readFileSync(resolve(import.meta.dirname, "../../docs/imports", f), "utf8")) as T;
const file = read<FleetFile>("nour-el-nil-fleet-data.json");
const i18n = read<FleetI18n>("nour-el-nil-fleet-i18n.json");
const plan = planFleetImport(file, i18n, "2026-11-04");
const boat = (id: string) => plan.vessels.find((v) => v.renameFrom === id)!;
/** Every word a visitor can read, in every language. */
const visible = (id: string) => {
  const v = boat(id);
  return JSON.stringify([
    v.displayName,
    v.translations,
    v.cabins.filter((c) => c.active).map((c) => [c.name, c.bed_configuration, c.view, c.translations]),
    v.itineraries[0]?.days,
    v.itineraries[0]?.boarding,
    v.photos.map((p) => p.alt),
  ]);
};

describe("Nour El Nil fleet import", () => {
  it("is valid, and skips Assouan, which isn't operating", () => {
    expect(plan.problems).toEqual([]);
    expect(plan.vessels.map((v) => v.slug)).toEqual([
      "nour-el-nil-dendera",
      "nour-el-nil-najafa",
      "nour-el-nil-poppee",
      "nour-el-nil-roman",
      "nour-el-nil-adelaide",
      "nour-el-nil-agatha",
      "nour-el-nil-meroe",
      "nour-el-nil-malouka",
      "nour-el-nil-el-nil",
    ]);
    expect(plan.skipped).toEqual([expect.objectContaining({ slug: "nour-el-nil-assouan" })]);
  });

  it("applies the fleet defaults, then each boat's own values", () => {
    for (const v of plan.vessels) {
      expect(v.type).toBe("sail");
      expect(v.propulsion).toBe("wind");
      expect(v.itineraries[0]?.code).toBe("ESN-ASW-5");
      expect(v.translations[0]!.propulsion_note).toBe(
        "Sails when the wind allows, with no engine on board. A towboat is used when needed.",
      );
    }
    expect(boat("roman").itineraries[0]?.sailingDays).toEqual([2]);
    expect(boat("najafa").itineraries[0]?.sailingDays).toEqual([1]);
    expect(boat("najafa")).toMatchObject({ cabinCount: 10, maxGuests: 24, yearBuilt: 2025, lengthM: 60, beamM: 8.5 });
    expect(boat("malouka")).toMatchObject({ cabinCount: 10, maxGuests: 20, yearBuilt: 2008, lengthM: 50, beamM: 7.7 });
    expect(boat("meroe")).toMatchObject({ cabinCount: 10, maxGuests: 20, yearBuilt: 2017, lengthM: 52, beamM: 8 });
    expect(boat("najafa").cabins.map((c) => [c.code, c.cabin_count, c.size_m2])).toEqual([
      ["panoramic_suite", 2, 28],
      ["deluxe_suite", 2, 34.7],
      ["luxury_room", 6, 17.35],
    ]);
    // Poppee's Luxury Rooms have a king bed only (the operator's Poppee page); the fleet's other Luxury Rooms keep twin or king.
    const poppee = boat("poppee").cabins.find((c) => c.code === "luxury_room")!;
    expect(poppee.bed_configuration).toBe("1 king bed");
    expect(poppee.translations.map((t) => t.bed_configuration)).toEqual([null, "1 cama king", "キングベッド1台"]);
    expect(boat("najafa").cabins.find((c) => c.code === "luxury_room")!.bed_configuration).toBe("2 twin beds or 1 king bed");
  });

  it("merges a boat's own on-board values into the fleet's: Adelaïde adds its library, and keeps the shared notes", () => {
    expect(boat("adelaide").sharedSpaces).toEqual(["sun_deck", "lounge", "library"]);
    expect(boat("adelaide").translations[0]!.on_board).toEqual(boat("agatha").translations[0]!.on_board);
    expect(boat("agatha").sharedSpaces).toEqual(["sun_deck", "lounge"]);
    expect(boat("adelaide")).toMatchObject({ cabinCount: 10, maxGuests: 24, lengthM: 55, beamM: 8 });
    expect(boat("agatha")).toMatchObject({ cabinCount: 10, maxGuests: 20, yearBuilt: 2020, lengthM: 52, beamM: 8 });
  });

  it("merges the cabin defaults under each cabin type's own values", () => {
    const deluxe = boat("najafa").cabins.find((c) => c.code === "deluxe_suite")!;
    expect(deluxe).toMatchObject({ name: "Deluxe Suite", max_occupancy: 4, size_m2: 34.7, cabin_count: 2 });
    expect(deluxe.translations.find((t) => t.locale === "en")?.description).toContain("Sold as one unit");
    const panoramic = boat("dendera").cabins.find((c) => c.code === "panoramic_suite")!;
    expect(panoramic).toMatchObject({ size_m2: 24.5, cabin_count: 2, view: "180-degree Nile view" });
    // Dendera's split is on the operator's boat page: 2 Panoramic Suites and 8 Luxury Rooms.
    expect(boat("dendera").cabins.map((c) => [c.code, c.cabin_count])).toEqual([
      ["panoramic_suite", 2],
      ["luxury_room", 8],
    ]);
  });

  it("lists El Nil's tenth cabin with its charter-only rule, so the cards add up to the 10 units", () => {
    const elNil = boat("el-nil");
    expect(elNil.cabinCount).toBe(10);
    expect(elNil.cabins.map((c) => [c.code, c.active, c.cabin_count])).toEqual([
      ["panoramic_room", true, 2],
      ["room", true, 7],
      ["privatization_cabin", true, 1],
    ]);
    const cabin = elNil.cabins.find((c) => c.code === "privatization_cabin")!;
    // The operator publishes no size or beds for it, so none is shown.
    expect(cabin).toMatchObject({ name: "Cabin", size_m2: null, bed_configuration: null });
    expect(cabin.translations.map((t) => t.description)).toEqual([
      "Available only when the whole boat is privately chartered.",
      "Solo disponible cuando se alquila el barco entero en privado.",
      "船全体を貸し切る場合のみ利用できます。",
    ]);
  });

  it("shows a per-trip guide price where the data has one, and none for Dendera", () => {
    expect(boat("najafa").indicative).toEqual({ amountMinor: 337500, currency: "EUR", nights: 5 });
    expect(boat("el-nil").indicative).toEqual({ amountMinor: 177500, currency: "EUR", nights: 5 });
    expect(boat("dendera").indicative).toBeNull();
  });

  it("states nothing that is held back: facilities, gratuities, the €900 price, crew, or Dendera as the largest", () => {
    for (const v of plan.vessels) {
      const words = visible(v.renameFrom);
      expect(words).not.toMatch(/\b(pools?|hot tubs?|spas?|gyms?|balcon(y|ies))\b/i);
      expect(words).not.toMatch(/gratuit|propina|チップ|\btips?\b/i);
      expect(words).not.toMatch(/900/);
      expect(words).not.toMatch(/\bcrew of\b|\d+ crew/i);
      expect(v.hidden).toEqual(
        expect.arrayContaining([
          "on_board.facilities_reported: needs confirmation",
          "inclusions.needs_confirmation.crew_and_guide_gratuities: needs confirmation",
          "fleet_from_price_stated: needs confirmation",
          "operator_terms: display false",
          "operator_rate_model: display false",
        ]),
      );
    }
    expect(visible("dendera")).not.toMatch(/largest|most spacious|más grande|最大/i);
  });

  it("writes every visitor text in Spanish and Japanese", () => {
    for (const v of plan.vessels)
      for (const t of v.translations.slice(1)) {
        expect(t.summary).toBeTruthy();
        expect(t.included).toHaveLength(6);
        expect(t.on_board).toHaveLength(4);
        expect(t.good_to_know).toHaveLength(5);
      }
    expect(boat("najafa").translations.find((t) => t.locale === "ja")?.seo_title).toBe(
      "ダハビヤNajafa:エスナからアスワンへの5泊クルーズ",
    );
    expect(boat("najafa").translations[0]!.seo_title).toBe("Najafa dahabiya: 5-night Esna to Aswan cruise");
    expect(boat("najafa").translations[0]!.seo_description).toMatch(/See the cabins, itinerary and what’s included\.$/);
  });

  it("generates weekly dates only inside the open months", () => {
    expect(boat("najafa").itineraries[0]?.periods).toEqual([
      { starts_on: "2026-11-04", ends_on: "2027-05-26" },
      { starts_on: "2027-09-01", ends_on: "2028-05-26" },
    ]);
  });

  it("generates no dates when the departure day needs confirmation", () => {
    const own = { ...file.vessels[1]!, departure_day: { value: "Monday", status: "needs_confirmation" } };
    const p = planFleetImport({ ...file, vessels: [own] }, i18n, "2026-11-04");
    expect(p.vessels[0]!.itineraries[0]).toMatchObject({ sailingDays: [], periods: [] });
  });

  it("takes propulsion from the data and refuses a boat without it", () => {
    const own = { ...file.vessels[1]!, propulsion: "sails" };
    expect(planFleetImport({ ...file, vessels: [own] }, i18n, "2026-11-04").problems).toContain(
      "nour-el-nil-najafa: propulsion must be motor, wind or steam, not sails",
    );
  });

  it("puts each cabin photo on its card, with alt text in every language", () => {
    const najafa = boat("najafa");
    expect(najafa.photos.filter((p) => p.cabin).map((p) => p.cabin)).toEqual(["panoramic_suite", "deluxe_suite", "luxury_room"]);
    for (const v of plan.vessels) for (const p of v.photos) expect(Object.values(p.alt).every((a) => a.length > 10)).toBe(true);
    expect(boat("malouka").photos).toHaveLength(2);
  });
});

describe("fleet import rules", () => {
  it("hides null, needs_confirmation and display: false fields", () => {
    expect(shown(null)).toBe(false);
    expect(shown({ value: 1, status: "needs_confirmation" })).toBe(false);
    expect(shown({ display: false })).toBe(false);
    expect(shown({ value: 1, status: "confirmed" })).toBe(true);
    expect(hiddenPaths({ a: null, b: { c: { display: false } }, d: { status: "confirmed" } })).toEqual([
      "a: empty",
      "b.c: display false",
    ]);
  });

  it("reads dimensions", () => {
    expect(dimensions({ display: "52 × 8.2", status: "confirmed" })).toEqual([52, 8.2]);
    expect(dimensions({ display: "52 × 8.2", status: "needs_confirmation" })).toBeNull();
  });

  it("ends each open stretch early enough that a cruise is back before a closed month", () => {
    expect(openPeriods("2027-05-20", [6, 7, 8], 5, 4)).toEqual([
      { starts_on: "2027-05-20", ends_on: "2027-05-26" },
      { starts_on: "2027-09-01", ends_on: "2027-09-30" },
    ]);
    expect(openPeriods("2027-07-10", [6, 7, 8], 5, 2)).toEqual([{ starts_on: "2027-09-01", ends_on: "2027-09-30" }]);
  });
});

describe("Steam Ship Sudan (the featured paddle steamer)", () => {
  const sudan = planFleetImport(
    read<FleetFile>("steam-ship-sudan-data.json"),
    read<FleetI18n>("steam-ship-sudan-i18n.json"),
    "2026-11-04",
  );
  const v = sudan.vessels[0]!;

  it("is valid, a steam-driven paddle steamer, information only, with both itineraries", () => {
    expect(sudan.problems).toEqual([]);
    expect(v).toMatchObject({ slug: "steam-ship-sudan", type: "steam", propulsion: "steam", cabinCount: 24, indicative: null });
    expect(v.itineraries.map((it) => [it.code, it.origin, it.destination, it.nights])).toEqual([
      ["ASW-LXR-5", "Aswan", "Luxor", 5],
      ["LXR-ASW-5", "Luxor", "Aswan", 5],
    ]);
    for (const it of v.itineraries) expect(it).toMatchObject({ sailingDays: [], periods: [] });
    expect(v.itineraries[1]!.days.filter((d) => d.locale === "ja")).toHaveLength(6);
  });

  it("shows nothing unconfirmed: no guest count, build year, length, areas, Wi-Fi or photos", () => {
    expect(v).toMatchObject({ maxGuests: null, yearBuilt: null, lengthM: null, beamM: null });
    expect(v.cabins.map((c) => [c.code, c.cabin_count, c.size_m2])).toEqual([
      ["cabin", 18, null],
      ["suite", 6, null],
    ]);
    expect(v.photos).toEqual([]);
    expect(JSON.stringify(v.translations)).not.toMatch(/wi-?fi|48|pool|1885/i);
    expect(v.translations[0]!.summary).toContain("according to its operator");
  });
});
