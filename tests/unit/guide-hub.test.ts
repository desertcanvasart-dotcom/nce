import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import ja from "../../messages/ja.json";
import { exploreVessels } from "@/lib/guide/explore";
import { PLANNER, PLANNER_ROUTES, planRoute } from "@/lib/guide/planner";
import type { ListingVessel } from "@/lib/marketplace/listing";
import { allowedLinks, BUILT, expectedLinks } from "@/lib/seo/links";
import { isTranslated } from "@/lib/seo/translations";

/** PAGE-002, Islam's guide brief (4 Nov 2026). */
describe("the guide hub's route planner", () => {
  // The brief's table: nights and travel style decide the route and its wording.
  const TABLE: Record<string, [string, string]> = {
    "upTo3/schedule": ["aswanToLuxor", "Aswan to Luxor, 3 nights."],
    "upTo3/slow": ["aswanToLuxor", "Aswan to Luxor, 3 nights."],
    "four/schedule": ["luxorToAswan", "Luxor to Aswan, 4 nights."],
    "four/slow": ["luxorToAswan", "Luxor to Aswan, 4 nights."],
    "fiveOrMore/schedule": ["luxorToAswan", "Luxor to Aswan, 4 nights."],
    "fiveOrMore/slow": ["esnaToAswan", "Esna to Aswan by dahabiya, 5 nights."],
  };
  const [nights, style, season] = PLANNER.map((q) => q.answers);

  it("answers all 24 combinations with the brief's route", () => {
    let n = 0;
    for (const a of nights!)
      for (const b of style!)
        for (const c of season!) {
          const r = planRoute({ nights: a, style: b, season: c });
          const [route, bold] = TABLE[`${a}/${b}`]!;
          expect(r, `${a}/${b}/${c}`).toMatchObject({ route, season: c });
          const text = en.guideHub.planner.results[r!.text as keyof typeof en.guideHub.planner.results];
          expect(text.startsWith(`<b>${bold}</b>`), `${a}/${b}`).toBe(true);
          n++;
        }
    expect(n).toBe(24);
  });

  it("waits for all three answers", () => {
    expect(planRoute({})).toBeNull();
    expect(planRoute({ nights: "four", style: "slow" })).toBeNull();
    expect(planRoute({ nights: "four", style: "slow", season: "spring" })).toBeNull();
  });

  it("links every route to pages that exist", () => {
    for (const r of Object.values(PLANNER_ROUTES)) {
      expect(BUILT.has(r.article), r.article).toBe(true);
      expect(BUILT.has(r.listing), r.listing).toBe(true);
    }
  });

  it("warns about summer dahabiyas only for May to September, and has no note when unsure", () => {
    const s = en.guideHub.planner.seasons;
    expect(s.summer).toContain("Some dahabiyas don’t sail from June to August");
    expect(s.winter).not.toContain("June");
    expect(s.shoulder).not.toContain("June");
    expect(Object.keys(s)).toEqual(["winter", "shoulder", "summer"]);
  });
});

describe("the guide hub's words", () => {
  const keys = (o: unknown, p = ""): string[] =>
    o && typeof o === "object" ? Object.entries(o).flatMap(([k, v]) => keys(v, `${p}.${k}`)) : [p];
  it("are complete in Spanish and Japanese, and the page is listed as translated", () => {
    expect(keys(es.guideHub)).toEqual(keys(en.guideHub));
    expect(keys(ja.guideHub)).toEqual(keys(en.guideHub));
    expect(isTranslated("/nile-cruise-guide/", "es")).toBe(true);
    expect(isTranslated("/nile-cruise-guide/", "ja")).toBe(true);
  });

  it("keep the brief's title and leave no English behind", () => {
    expect(en.guideHub.meta.title).toBe("Nile cruise guide: routes, seasons and planning");
    for (const [code, m] of [
      ["es", es],
      ["ja", ja],
    ] as const)
      for (const k of keys(m.guideHub)) {
        const get = (o: unknown) =>
          k
            .split(".")
            .slice(1)
            .reduce((x, s) => (x as Record<string, unknown>)[s], o);
        const text = get(m.guideHub) as string;
        // Numbers ("4") are the same in every language.
        if (/^\d+$/.test(text)) continue;
        expect(text, `${code}${k}`).not.toBe(get(en.guideHub));
      }
  });
});

describe("the hub's links", () => {
  it("reaches every child, links /vessels/ and drops only the prices pillar", () => {
    const want = expectedLinks("/nile-cruise-guide/");
    for (const u of ["/nile-cruise-guide/routes/", "/nile-cruise-guide/when-to-go/", "/nile-cruise-guide/planning/", "/vessels/"])
      expect(want).toContain(u);
    expect(want).not.toContain("/nile-cruise-prices/");
    const ok = allowedLinks("/nile-cruise-guide/");
    for (const r of Object.values(PLANNER_ROUTES)) {
      expect(ok.has(r.article)).toBe(true);
      expect(ok.has(r.listing)).toBe(true);
    }
  });
});

describe("vessels to explore on the guide's pages", () => {
  const v = (slug: string, type: ListingVessel["type"], routes: [string, string][]): ListingVessel => ({
    id: slug,
    slug,
    name: slug,
    type,
    propulsion: null,
    category: null,
    maxGuests: null,
    cabinCount: null,
    deckCount: null,
    sample: false,
    showcase: true,
    summary: null,
    price: { mode: "on_request" },
    itineraries: routes.map(([origin, destination]) => ({ origin, destination, nights: 4, departures: [] })),
    bookable: false,
  });
  const all = [
    v("abbas", "motor", []), // a Lake Nasser ship with no Nile itinerary
    v("lily", "motor", [
      ["Luxor", "Aswan"],
      ["Aswan", "Luxor"],
    ]),
    v("amirat", "sail", [["Luxor", "Aswan"]]),
    v("misr", "steam", [["Luxor", "Aswan"]]),
    v("nasser", "steam", [["Aswan", "Abu Simbel"]]),
  ];

  it("shows one of each type that sails the classic stretch, never a Lake Nasser ship", () => {
    expect(exploreVessels(all).map((x) => x.slug)).toEqual(["amirat", "lily", "misr"]);
  });

  it("keeps to the page's route and type", () => {
    expect(exploreVessels(all, { route: { origin: "Aswan", destination: "Luxor" } }).map((x) => x.slug)).toEqual([]);
    expect(
      exploreVessels([...all, v("goddess", "sail", [["Aswan", "Luxor"]])], {
        route: { origin: "Aswan", destination: "Luxor" },
      }).map((x) => x.slug),
    ).toEqual(["goddess", "lily"]);
    expect(exploreVessels(all, { type: "sail" }).map((x) => x.slug)).toEqual(["amirat"]);
  });

  it("hides the row when only one type qualifies", () => {
    expect(exploreVessels([all[1]!])).toEqual([]);
  });
});
