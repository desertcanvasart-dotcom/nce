import { describe, expect, it } from "vitest";
import {
  deckGroups,
  formatDay,
  perPersonFor,
  pickItinerary,
  preferredPrices,
  requestDefaults,
  availabilityLabel,
  canBook,
  touristTripJsonLd,
  vesselH1,
  type DeparturePrice,
  type VesselCabin,
  type VesselItinerary,
  type VesselPage,
} from "@/lib/marketplace/vessel";

const itin = (code: string, nights: number, origin = "Luxor", destination = "Aswan"): VesselItinerary => ({
  id: code,
  code,
  origin,
  destination,
  nights,
  sailingPeriod: null,
  sailsAt: null,
  days: [],
  departures: [],
});

const cabin = (id: string, deck: string, sizeM2: number | null): VesselCabin => ({
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

const page = (over: Partial<VesselPage> = {}): VesselPage => ({
  id: "v",
  slug: "s",
  name: "Sample Ship",
  type: "motor",
  category: null,
  maxGuests: 60,
  cabinCount: 30,
  deckCount: 3,
  yearBuilt: null,
  sample: false,
  showcase: false,
  summary: "A ship.",
  description: null,
  gratuityUsdMinor: null,
  photos: [],
  cabins: [],
  itineraries: [itin("L4", 4)],
  externalRatings: [],
  from: { amount: 100000, currency: "USD" },
  bookable: true,
  ...over,
});

describe("itineraries and the H1 (PAGE-072, DATA-031)", () => {
  it("picks the itinerary named in the URL, else the shortest", () => {
    const its = [itin("L7", 7), itin("L4", 4), itin("A3", 3, "Aswan", "Luxor")];
    expect(pickItinerary(its, "l7")?.code).toBe("L7");
    expect(pickItinerary(its, "nope")?.code).toBe("A3");
    expect(pickItinerary(its, undefined)?.code).toBe("A3");
    expect(pickItinerary([], "L4")).toBeUndefined();
  });

  it("follows the silo's H1: name — route, nights", () => {
    expect(vesselH1("Sample Ship", itin("L4", 4))).toBe("Sample Ship — Luxor to Aswan, 4 nights");
    expect(vesselH1("Sample Ship", itin("L1", 1))).toBe("Sample Ship — Luxor to Aswan, 1 night");
    expect(vesselH1("Sample Ship", undefined)).toBe("Sample Ship");
  });
});

describe("the deck schematic (DASH-CUS-016, 017)", () => {
  it("groups cabin types by deck, upper decks first, larger cabins first", () => {
    const groups = deckGroups([
      cabin("a", "Lower", 18),
      cabin("b", "Upper", 22),
      cabin("c", "Upper", 30),
      cabin("d", "Main", null),
    ]);
    expect(groups.map((g) => g.deck)).toEqual(["Upper", "Main", "Lower"]);
    expect(groups[0]!.cabins.map((c) => c.id)).toEqual(["c", "b"]);
  });
});

describe("dates in the visitor's language (DATA-004)", () => {
  it("formats the calendar date without shifting it", () => {
    expect(formatDay("2026-12-19", "en")).toBe("Sat, Dec 19, 2026");
    expect(formatDay("2026-12-19", "es")).toMatch(/19 dic 2026/);
    expect(formatDay("2026-12-19", "ja")).toMatch(/2026.*12.*19/);
  });
});

describe("structured data (DATA-034, SEO-026)", () => {
  it("offers only the public 'from' price, and never a rating", () => {
    const json = touristTripJsonLd(page(), itin("L4", 4), "https://x/cruises/s/");
    expect(json).toMatchObject({
      "@type": "TouristTrip",
      name: "Sample Ship — Luxor to Aswan, 4 nights",
      offers: { "@type": "AggregateOffer", lowPrice: "1000.00", priceCurrency: "USD" },
    });
    expect(JSON.stringify(json)).not.toContain("AggregateRating");
  });

  it("has no offer for an information-only vessel", () => {
    expect(touristTripJsonLd(page({ bookable: false }), undefined, "u").offers).toBeUndefined();
  });
});

describe("prices after sign-in (DATA-033, BRAND-003)", () => {
  const row = (over: Partial<DeparturePrice>): DeparturePrice => ({
    departureId: "d",
    scheduleId: "s",
    departsOn: "2026-12-01",
    returnsOn: "2026-12-05",
    cabinTypeId: "c",
    currency: "USD",
    single: 150000,
    double: 100000,
    triple: 90000,
    placesLeft: 4,
    bookable: true,
    mode: "instant",
    ...over,
  });

  it("keeps one currency per departure and cabin, US$ before €", () => {
    const kept = preferredPrices([row({ currency: "EUR", double: 1 }), row({}), row({ cabinTypeId: "x", currency: "EUR" })]);
    expect(kept.map((r) => `${r.cabinTypeId}:${r.currency}`).sort()).toEqual(["c:USD", "x:EUR"]);
  });

  it("prices by guests taking a bed; infants under 3 don't", () => {
    expect(perPersonFor(row({}), [30])).toBe(150000);
    expect(perPersonFor(row({}), [30, 30])).toBe(100000);
    expect(perPersonFor(row({}), [30, 30, 1])).toBe(100000);
    expect(perPersonFor(row({}), [30, 30, 8])).toBe(90000);
  });

  it("says what a cabin's availability is; exact numbers never from manual or sheet data (ADR-099)", () => {
    expect(availabilityLabel(row({ placesLeft: 2 }), 6)).toBe("Last few cabins");
    expect(availabilityLabel(row({ placesLeft: 3 }), 6)).toBe("Instant confirmation");
    expect(availabilityLabel(row({ mode: "request", placesLeft: null }), 6)).toBe("Available · confirmed within 6 h");
    expect(availabilityLabel(row({ mode: "sold_out", placesLeft: 0 }), 6)).toBe("Sold out");
    expect(availabilityLabel(row({ mode: "unconfirmed", placesLeft: null }), 6)).toBe("To be confirmed");
  });

  it("books instant and request cabins; never sold out or unconfirmed ones", () => {
    expect(canBook(row({}))).toBe(true);
    expect(canBook(row({ mode: "request" }))).toBe(true);
    expect(canBook(row({ mode: "sold_out" }))).toBe(false);
    expect(canBook(row({ mode: "unconfirmed" }))).toBe(false);
    expect(canBook(row({ bookable: false }))).toBe(false);
  });
});

describe("'Ask for an offer' (DASH-PUB-010)", () => {
  it("prefills only a route that exists, a two-week window and the nights", () => {
    const routes = [{ origin: "Luxor", destination: "Aswan" }];
    expect(requestDefaults({ route: "Luxor→Aswan", from: "2026-12-30", nights: "4" }, routes)).toEqual({
      route: "Luxor→Aswan",
      earliest: "2026-12-30",
      latest: "2027-01-13",
      nights: 4,
    });
    expect(requestDefaults({ route: "Nowhere→Else", from: "soon", nights: "99" }, routes)).toEqual({
      route: undefined,
      earliest: undefined,
      latest: undefined,
      nights: undefined,
    });
  });
});
