import { describe, expect, it } from "vitest";
import { callsAt, onLakeNasser, RIVER_NEIGHBOUR_LINKS, riverNeighbours, RIVER_STOPS, stopByPath } from "@/content/river-stops";
import { allowedLinks } from "@/lib/seo/links";

const stop = (key: string) => RIVER_STOPS.find((s) => s.key === key)!;
const locales = ["en", "es", "ja"] as const;

describe("the stops along the Nile (Islam's destinations brief)", () => {
  it("are in river order, with Abu Simbel apart beyond Aswan", () => {
    expect(RIVER_STOPS.map((s) => s.key)).toEqual([
      "luxor",
      "esna",
      "el-kab",
      "edfu",
      "gebel-silsila",
      "kom-ombo",
      "aswan",
      "abu-simbel",
    ]);
    expect(RIVER_STOPS.map((s) => s.orderOnRiver)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(RIVER_STOPS.filter((s) => s.beyond).map((s) => s.key)).toEqual(["abu-simbel"]);
  });

  it("light up the right stops for each route", () => {
    const on = (r: "classic" | "dahabiya") => RIVER_STOPS.filter((s) => s.onMap[r]).map((s) => s.key);
    expect(on("classic")).toEqual(["luxor", "edfu", "kom-ombo", "aswan"]);
    expect(on("dahabiya")).toEqual(["esna", "el-kab", "edfu", "gebel-silsila", "kom-ombo", "aswan"]);
    expect(stop("aswan").onMap.dahabiya).toBe("end");
  });

  it("say who stops where as the brief's table does", () => {
    expect(RIVER_STOPS.map((s) => [s.key, s.routes.classic, s.routes.dahabiya])).toEqual([
      ["luxor", "yes", "notOnItinerary"],
      ["esna", "check", "yes"],
      ["el-kab", "check", "yes"],
      ["edfu", "yes", "yes"],
      ["gebel-silsila", "noLargeShips", "yes"],
      ["kom-ombo", "yes", "yes"],
      ["aswan", "yes", "notOnItinerary"],
      ["abu-simbel", "optionalFromAswan", "optionalSeparate"],
    ]);
  });

  it("have every visitor text in English, Spanish and Japanese, and nothing invented", () => {
    for (const s of RIVER_STOPS)
      for (const l of locales) {
        expect(s.name[l].trim()).not.toBe("");
        expect(s.summary[l].trim()).not.toBe("");
        expect(s.description[l].trim()).not.toBe("");
        expect(s.mainSights[l].length).toBe(s.mainSights.en.length);
        if (s.linkText) expect(s.linkText[l].trim()).not.toBe("");
      }
    // Only Edfu's visit length is confirmed; no team notes or licensed photos yet.
    expect(RIVER_STOPS.filter((s) => s.visitLength).map((s) => s.key)).toEqual(["edfu"]);
    expect(RIVER_STOPS.filter((s) => s.insiderNote)).toEqual([]);
    expect(RIVER_STOPS.filter((s) => s.image)).toEqual([]);
    expect(JSON.stringify(RIVER_STOPS.map((s) => [s.name, s.summary, s.description, s.mainSights]))).not.toMatch(/Silsileh/);
  });

  it("only link the stops whose pages exist (no thin pages for Esna, El Kab or Gebel Silsila)", () => {
    expect(RIVER_STOPS.filter((s) => !s.path).map((s) => s.key)).toEqual(["esna", "el-kab", "gebel-silsila"]);
    expect(stopByPath("/destinations/edfu/")?.key).toBe("edfu");
  });

  it("give each destination page its neighbours with pages, which the silo check allows", () => {
    expect(riverNeighbours(stop("edfu"))).toMatchObject({ previous: { key: "luxor" }, next: { key: "kom-ombo" } });
    expect(riverNeighbours(stop("luxor")).previous).toBeNull();
    expect(riverNeighbours(stop("abu-simbel"))).toMatchObject({ previous: { key: "aswan" }, next: null });
    for (const [url, links] of Object.entries(RIVER_NEIGHBOUR_LINKS))
      for (const href of links) expect(allowedLinks(url).has(href), `${url} → ${href}`).toBe(true);
  });

  it("find the cruises that call at a stop from their programme, never from a guess", () => {
    const dahabiya = {
      origin: "Esna",
      destination: "Aswan",
      places: ["Esna", "El Kab and Edfu", "A day on the river", "Gebel Silsileh", "Kom Ombo", "Disembarkation in Aswan"],
    };
    expect(RIVER_STOPS.filter((s) => callsAt(dahabiya, s)).map((s) => s.key)).toEqual([
      "esna",
      "el-kab",
      "edfu",
      "gebel-silsila",
      "kom-ombo",
      "aswan",
    ]);
    // Without its days written, an itinerary only counts at its two ends.
    const ship = { origin: "Luxor", destination: "Aswan" };
    expect(RIVER_STOPS.filter((s) => callsAt(ship, s)).map((s) => s.key)).toEqual(["luxor", "aswan"]);
    expect(onLakeNasser({ origin: "Aswan", destination: "Abu Simbel" })).toBe(true);
    expect(onLakeNasser(ship)).toBe(false);
  });
});
