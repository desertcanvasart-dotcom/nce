import { describe, expect, it } from "vitest";
import { pullSignature, refreshSignature, verifyPull, verifyRefresh } from "@/lib/connections/signature";
import { RESERVED_VESSEL_SLUGS } from "@/lib/data/slugs";
import {
  applySearch,
  breadcrumbJsonLd,
  collectionJsonLd,
  compareSlugs,
  facetBySlug,
  FACETS,
  isSearching,
  jsonLdScript,
  parseSearch,
  routeId,
  searchRoutes,
  sortListing,
  toCard,
  type ListingVessel,
} from "@/lib/marketplace/listing";

const vessel = (over: Partial<ListingVessel> = {}): ListingVessel => ({
  id: "v",
  slug: "sample",
  name: "Sample",
  type: "motor",
  category: null,
  maxGuests: 80,
  cabinCount: 40,
  deckCount: 4,
  sample: false,
  showcase: false,
  summary: null,
  itineraries: [{ origin: "Luxor", destination: "Aswan", nights: 4, departures: ["2026-12-01", "2026-12-05"] }],
  bookable: true,
  from: { amount: 70000, currency: "USD" },
  ...over,
});

const sail = vessel({ id: "a", slug: "dahabiya-a", name: "Dahabiya A", type: "sail", category: "luxury", maxGuests: 12 });
const ship = vessel({ id: "b", slug: "ship-b", name: "Ship B", from: { amount: 50000, currency: "USD" } });
const back = vessel({
  id: "c",
  slug: "ship-c",
  name: "Ship C",
  category: "deluxe",
  itineraries: [{ origin: "Aswan", destination: "Luxor", nights: 3, departures: ["2026-12-03"] }],
});
const info = vessel({ id: "d", slug: "info-d", name: "Info D", bookable: false, from: undefined, showcase: true, sample: true });

describe("facets (PAGE-061–067, SEO-016)", () => {
  it("are the five Phase 1 filtered listings, none of them a possible vessel slug", () => {
    expect(FACETS.map((f) => f.slug)).toEqual(["dahabiyas", "motor-ships", "luxury", "luxor-to-aswan", "aswan-to-luxor"]);
    for (const f of FACETS) expect(RESERVED_VESSEL_SLUGS).toContain(f.slug);
    expect(facetBySlug("value")).toBeUndefined(); // a Phase 2 row: not built, not indexable
  });

  it("filter by type, the luxury category only, and direction", () => {
    const all = [sail, ship, back, info];
    const pick = (slug: string) => all.filter(facetBySlug(slug)!.match).map((v) => v.id);
    expect(pick("dahabiyas")).toEqual(["a"]);
    expect(pick("motor-ships")).toEqual(["b", "c", "d"]);
    expect(pick("luxury")).toEqual(["a"]); // deluxe isn't luxury (ADR-093)
    expect(pick("luxor-to-aswan")).toEqual(["a", "b", "d"]);
    expect(pick("aswan-to-luxor")).toEqual(["c"]);
  });

  it("list bookable vessels first, cheapest first, information-only last", () => {
    expect(sortListing([info, sail, back, ship]).map((v) => v.id)).toEqual(["b", "a", "c", "d"]);
  });
});

describe("cards (BRAND-026, 028, ADR-025, DASH-PUB-010)", () => {
  it("show guests, the published score and the one public price; never stars", () => {
    const c = toCard(vessel({ evaluation: 86.4 }));
    expect(c).toMatchObject({
      guests: 80,
      evaluation: 86.4,
      price: { amount: 70000, currency: "USD" },
      route: ["Luxor", "Aswan"],
    });
    expect(c.rating).toBeUndefined();
    expect(c.href).toBe("/cruises/sample/");
  });

  it("show no price and say 'Information only' when nothing can be booked; flag sample data", () => {
    const c = toCard(vessel({ bookable: false, sample: true }));
    expect(c.price).toBeUndefined();
    expect(c.badges?.map((b) => b.label)).toEqual(["Information only", "Sample data"]);
  });
});

describe("search (DATA-012)", () => {
  it("offers only routes with real departures, their dates merged, 'Any route' first", () => {
    const routes = searchRoutes([
      sail,
      ship,
      back,
      vessel({ id: "e", itineraries: [{ origin: "Esna", destination: "Aswan", nights: 3, departures: [] }] }),
    ]);
    expect(routes.map((r) => r.id)).toEqual(["any", "aswan-to-luxor", "luxor-to-aswan"]);
    expect(routes[2]).toMatchObject({ label: "Luxor → Aswan", sub: "4 nights", dates: ["2026-12-01", "2026-12-05"] });
    expect(routes[0]!.dates).toEqual(["2026-12-01", "2026-12-03", "2026-12-05"]);
    expect(routeId("Kom Ombo", "Luxor")).toBe("kom-ombo-to-luxor");
  });

  it("reads the search form and ignores anything unknown", () => {
    expect(parseSearch({ route: "luxor-to-aswan", vessel: "sail", date: "2026-12-01", adults: "2", ages: "7,4" })).toEqual({
      route: "luxor-to-aswan",
      vessel: "sail",
      date: "2026-12-01",
      guests: 4,
    });
    expect(parseSearch({ route: "any", vessel: "any", date: "soon", adults: "x" })).toEqual({});
    expect(isSearching(parseSearch({}))).toBe(false);
    expect(parseSearch({ route: "<script>" }).route).toBeUndefined();
  });

  it("counts the departures that fit, never more", () => {
    const all = [sail, ship, back];
    expect(applySearch(all, { route: "luxor-to-aswan" })).toMatchObject({ departures: 4 });
    expect(applySearch(all, { route: "luxor-to-aswan", date: "2026-12-05" }).departures).toBe(2);
    expect(applySearch(all, { vessel: "sail" }).vessels.map((v) => v.id)).toEqual(["a"]);
    expect(applySearch(all, { guests: 20 }).vessels.map((v) => v.id)).toEqual(["b", "c"]); // the dahabiya sleeps 12
    expect(applySearch(all, { date: "2027-01-01" })).toEqual({ vessels: [], departures: 0 });
  });
});

describe("structured data (SEO-004, 026, DATA-034)", () => {
  it("builds a BreadcrumbList in order", () => {
    expect(
      breadcrumbJsonLd([
        { name: "Home", url: "https://x/" },
        { name: "Cruises", url: "https://x/cruises/" },
      ]),
    ).toEqual({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://x/" },
        { "@type": "ListItem", position: 2, name: "Cruises", item: "https://x/cruises/" },
      ],
    });
  });

  it("lists vessels on a CollectionPage with no ratings or offers", () => {
    const json = JSON.stringify(collectionJsonLd({ name: "N", description: "D", url: "u" }, [{ name: "A", url: "a" }]));
    expect(json).toContain('"@type":"ItemList"');
    expect(json).not.toMatch(/AggregateRating|Offer|ratingValue/);
  });

  it("can't break out of its script tag", () => {
    expect(jsonLdScript({ name: "</script><script>alert(1)</script>" })).not.toContain("</script>");
  });
});

describe("comparison (DASH-PUB-004)", () => {
  it("takes up to three known vessels, in order, without repeats", () => {
    const known = new Set(["a", "b", "c", "d"]);
    expect(compareSlugs("b,a,b,zzz,c,d", known)).toEqual(["b", "a", "c"]);
    expect(compareSlugs(["a"], known)).toEqual([]);
    expect(compareSlugs(undefined, known)).toEqual([]);
  });
});

describe("refreshing the marketplace (PERF-010)", () => {
  it("is signed apart from feed pulls, so one can't be replayed as the other", () => {
    const secret = "s".repeat(40);
    const now = 1_800_000_000;
    const ts = String(now);
    expect(verifyRefresh(secret, ts, refreshSignature(secret, ts), now)).toBe(true);
    expect(verifyRefresh(secret, ts, pullSignature(secret, ts), now)).toBe(false);
    expect(verifyPull(secret, ts, refreshSignature(secret, ts), now)).toBe(false);
    expect(verifyRefresh(secret, String(now - 600), refreshSignature(secret, String(now - 600)), now)).toBe(false);
  });
});
