import { describe, expect, it } from "vitest";
import { groupSearch, parseChildAges, TIER_LABEL, type SearchRow } from "@/lib/partners/search";
import { DEFAULT_CHILD_BANDS } from "@/lib/product/pricing";

const row = (over: Partial<SearchRow>): SearchRow => ({
  departure_id: "d1",
  vessel_name: "Sample Ship",
  origin: "Luxor",
  destination: "Aswan",
  nights: 4,
  departs_on: "2026-12-01",
  returns_on: "2026-12-05",
  sailing_period: null,
  sails_at: null,
  cabin_type_id: "c1",
  cabin_name: "Double",
  deck: "Main",
  max_occupancy: 2,
  available: 3,
  occupancy: 2,
  currency: "USD",
  amount_minor: 80000,
  child_bands: DEFAULT_CHILD_BANDS,
  gratuity_usd_minor: null,
  tier: "trade",
  booking_mode: "instant",
  operator_org_id: "op1",
  supplement_minor: 0,
  confirmed_at: null,
  ...over,
});

describe("partner search results (DASH-B2B-001, 002)", () => {
  it("prices one cabin for the party at the rate the database chose, and says which", () => {
    const [d] = groupSearch([row({}), row({ occupancy: 1, amount_minor: 120000, tier: "company" })], {
      adults: 2,
      childAges: [],
    });
    expect(d!.cabins).toEqual([
      {
        cabinTypeId: "c1",
        name: "Double",
        deck: "Main",
        available: 3,
        mode: "instant",
        operatorOrgId: "op1",
        currency: "USD",
        price: { ok: true, totalMinor: 160000, supplementMinor: 0, tier: "trade" },
        confirmedAt: null,
      },
    ]);
    const [solo] = groupSearch([row({}), row({ occupancy: 1, amount_minor: 120000, tier: "company" })], {
      adults: 1,
      childAges: [],
    });
    expect(solo!.cabins[0]!.price).toEqual({ ok: true, totalMinor: 120000, supplementMinor: 0, tier: "company" });
    expect(TIER_LABEL.company).toBe("Your company rate");
  });
  it("adds supplements per guest with the fare's age bands (ADR-103)", () => {
    const [d] = groupSearch([row({ max_occupancy: 3, occupancy: 3, amount_minor: 70000, supplement_minor: 10000 })], {
      adults: 2,
      childAges: [7, 1],
    });
    // Two adults pay it in full, the 7-year-old half (as of the fare), the infant nothing.
    expect(d!.cabins[0]!.price).toEqual({
      ok: true,
      totalMinor: 70000 * 2 + 35000 + 25000,
      supplementMinor: 25000,
      tier: "trade",
    });
  });
  it("prices children by age band, infants free", () => {
    const [d] = groupSearch([row({ max_occupancy: 3 }), row({ max_occupancy: 3, occupancy: 3, amount_minor: 70000 })], {
      adults: 2,
      childAges: [7, 1],
    });
    // Two adults and a 7-year-old fill 3 places at 70,000 pp; the child pays 50 %; the 1-year-old is free.
    expect(d!.cabins[0]!.price).toEqual({ ok: true, totalMinor: 70000 * 2 + 35000, supplementMinor: 0, tier: "trade" });
  });
  it("says why a cabin can't take the party", () => {
    const [d] = groupSearch([row({})], { adults: 3, childAges: [] });
    expect(d!.cabins[0]!.price).toMatchObject({ ok: false });
  });
  it("groups by departure, sorted by date", () => {
    const out = groupSearch([row({ departure_id: "late", departs_on: "2027-01-01" }), row({})], { adults: 2, childAges: [] });
    expect(out.map((d) => d.departureId)).toEqual(["d1", "late"]);
  });
  it("reads children's ages", () => {
    expect(parseChildAges("7, 4")).toEqual([7, 4]);
    expect(parseChildAges("")).toEqual([]);
    expect(parseChildAges("18")).toBeNull();
    expect(parseChildAges("seven")).toBeNull();
  });
});
