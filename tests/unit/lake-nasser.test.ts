import { describe, expect, it } from "vitest";
import { exploreVessels } from "@/lib/guide/explore";
import {
  facetBySlug,
  facetLive,
  GATED_PAGES,
  livePages,
  routeId,
  searchRoutes,
  type ListingVessel,
} from "@/lib/marketplace/listing";
import { indexablePaths } from "@/lib/seo/sitemap";
import { allowedLinks, BUILT, bridges, children, closingListing, expectedLinks, LINK_MAP } from "@/lib/seo/links";
import { DRAFT_PAGES } from "@/content/pages";
import { houseStyleProblems } from "@/lib/content/editorial";

/** ADR-113: Lake Nasser cruises, a gated listing and route guide that go live with the first real sailing. */
const v = (slug: string, routes: [string, string][], over: Partial<ListingVessel> = {}): ListingVessel => ({
  id: slug,
  slug,
  name: slug,
  type: "motor",
  propulsion: null,
  category: null,
  maxGuests: null,
  cabinCount: null,
  deckCount: null,
  sample: false,
  showcase: true,
  summary: null,
  price: { mode: "on_request" },
  itineraries: routes.map(([origin, destination]) => ({ origin, destination, nights: 3, departures: ["2027-01-10"] })),
  bookable: false,
  ...over,
});

const LISTING = "/cruises/lake-nasser/";
const GUIDE = "/nile-cruise-guide/routes/lake-nasser/";
const nile = v("lily", [["Luxor", "Aswan"]]);
const lake = v("abbas", [["Aswan", "Abu Simbel"]]);
const lakeBack = v("kasr", [["Abu Simbel", "Aswan"]]);
const facet = facetBySlug("lake-nasser")!;

describe("the Lake Nasser facet (PAGE-069)", () => {
  it("is the silo row's H1 and matches itineraries that start or end at Abu Simbel, in either direction", () => {
    expect(facet.h1).toBe(LINK_MAP[LISTING]!.h1);
    expect(facet.gated).toBe(true);
    expect(facet.match(lake)).toBe(true);
    expect(facet.match(lakeBack)).toBe(true);
    expect(facet.match(v("lake-named", [["Aswan", "Lake Nasser"]]))).toBe(true);
    expect(facet.match(nile)).toBe(false);
  });

  it("goes by the itinerary, never the vessel's name", () => {
    expect(facet.match(v("lake-nasser-queen", [["Luxor", "Aswan"]], { name: "Lake Nasser Queen" }))).toBe(false);
    expect(facet.match(v("no-schedule", []))).toBe(false);
  });

  it("is live only once a real (not sample) vessel matches", () => {
    expect(facetLive(facet, [nile])).toBe(false);
    expect(facetLive(facet, [nile, { ...lake, sample: true }])).toBe(false);
    expect(facetLive(facet, [nile, lake])).toBe(true);
    // Ungated facets are always live, even when empty.
    expect(facetLive(facetBySlug("luxor-to-aswan")!, [])).toBe(true);
  });
});

describe("gated pages (ADR-113)", () => {
  it("are the listing and the route guide, both in the silo workbook but not in BUILT", () => {
    expect(Object.keys(GATED_PAGES).sort()).toEqual([LISTING, GUIDE]);
    for (const p of Object.keys(GATED_PAGES)) {
      expect(LINK_MAP[p], p).toBeDefined();
      expect(BUILT.has(p), p).toBe(false);
    }
    expect(livePages([nile])).toEqual(new Set());
    expect(livePages([nile, lake])).toEqual(new Set([LISTING, GUIDE]));
  });

  it("are left out of the sitemap until live", () => {
    expect(indexablePaths([], [])).not.toContain(GUIDE);
    expect(indexablePaths([], [])).not.toContain(LISTING);
    const live = indexablePaths([], [], [], [...livePages([lake])]);
    expect(live).toContain(GUIDE);
    expect(live).toContain(LISTING);
  });

  it("aren't linked from the routes hub or Abu Simbel until live, then are", () => {
    const routes = "/nile-cruise-guide/routes/";
    const abu = "/destinations/abu-simbel/";
    expect(children(routes).map((l) => l.href)).not.toContain(GUIDE);
    expect(bridges(abu).map((l) => l.href)).not.toContain(GUIDE);
    expect(expectedLinks(routes)).not.toContain(GUIDE);

    const live = livePages([lake]);
    expect(children(routes, live).map((l) => l.href)).toContain(GUIDE);
    expect(bridges(abu, live)).toContainEqual({ href: GUIDE, anchor: "Lake Nasser cruise" });
    expect(expectedLinks(abu, live)).toContain(GUIDE);
    expect(allowedLinks(abu)).toContain(GUIDE);
  });

  it("the guide closes on its own listing once live", () => {
    expect(closingListing(GUIDE, livePages([lake])).href).toBe(LISTING);
    expect(expectedLinks(GUIDE, livePages([lake]))).toEqual(
      expect.arrayContaining(["/nile-cruise-guide/routes/", LISTING, "/destinations/abu-simbel/"]),
    );
  });
});

describe("the Lake Nasser route guide (PAGE-008)", () => {
  const page = DRAFT_PAGES.P008!;

  it("is a draft with the workbook's H1, in house style, with no nights or prices of its own", () => {
    expect(page.title).toBe(LINK_MAP[GUIDE]!.h1);
    expect(page.review).toBe("draft");
    expect(page.standfirst).toContain("[[up]]");
    expect(houseStyleProblems(page)).toEqual([]);
    const text = JSON.stringify(page);
    expect(text).not.toMatch(/€|\$|US\$|\b\d+[- ]nights?\b/i);
  });

  it("shows only Lake Nasser vessels to explore, never a Luxor–Aswan ship", () => {
    const sail = v("amirat", [["Luxor", "Aswan"]], { type: "sail" });
    const all = [nile, sail, lake];
    expect(exploreVessels(all, { match: facet.match, type: "motor" }).map((x) => x.slug)).toEqual(["abbas"]);
    // One type alone isn't a choice: the guide then links its listing instead.
    expect(exploreVessels(all, { match: facet.match })).toEqual([]);
  });
});

describe("search (DATA-012)", () => {
  it("lists Aswan → Abu Simbel only once such sailings exist", () => {
    expect(searchRoutes([nile]).map((r) => r.id)).not.toContain("aswan-to-abu-simbel");
    const routes = searchRoutes([nile, lake, lakeBack]);
    expect(routes.find((r) => r.id === "aswan-to-abu-simbel")?.label).toBe("Aswan → Abu Simbel");
    expect(routes.find((r) => r.id === "abu-simbel-to-aswan")?.label).toBe("Abu Simbel → Aswan");
    expect(routeId("Aswan", "Abu Simbel")).toBe("aswan-to-abu-simbel");
    // A vessel with no future departures adds no route.
    const none = v("eugenie", [["Aswan", "Abu Simbel"]]);
    none.itineraries[0]!.departures = [];
    expect(searchRoutes([none]).map((r) => r.id)).toEqual(["any"]);
  });
});
