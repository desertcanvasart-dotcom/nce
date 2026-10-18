import { describe, expect, it } from "vitest";
import {
  canAccept,
  expiryProblem,
  gateProblems,
  linePrice,
  offerView,
  passengersProblem,
  requestProblems,
  sameGuests,
} from "@/lib/bookings/bookings";
import { ageOn, DEFAULT_CHILD_BANDS } from "@/lib/product/pricing";

const TODAY = "2027-01-10";
const base = {
  earliest_departure: "2027-03-01",
  latest_departure: "2027-03-31",
  latest_finish: null,
  nights_min: 3,
  nights_max: 5,
  adults: 2,
  child_ages: [7],
  cabins: 1,
};

describe("requests (DASH-CUS-014, DATA-020)", () => {
  it("accepts a sensible request", () => {
    expect(requestProblems(base, TODAY)).toEqual([]);
  });
  it("explains impossible dates and stays", () => {
    expect(requestProblems({ ...base, earliest_departure: TODAY }, TODAY)).toContain("The earliest departure must be after today.");
    expect(requestProblems({ ...base, latest_departure: "2027-02-01" }, TODAY)).toContain("The latest departure can’t be before the earliest one.");
    expect(requestProblems({ ...base, nights_max: 2 }, TODAY)).toContain("The longest stay can’t be shorter than the shortest.");
    expect(requestProblems({ ...base, latest_finish: "2027-03-03" }, TODAY)).toContain(
      "With these dates and nights, no cruise could finish by the latest finish date.",
    );
    expect(requestProblems({ ...base, latest_departure: "2028-03-02" }, TODAY)).toContain("Keep the travel window within a year.");
  });
  it("checks guests against cabins", () => {
    expect(requestProblems({ ...base, child_ages: [18] }, TODAY)).toContain("Children’s ages are whole years from 0 to 17.");
    expect(requestProblems({ ...base, adults: 1, child_ages: [5], cabins: 2 }, TODAY)).toContain("Each cabin needs a guest aged 12 or over.");
    expect(requestProblems({ ...base, adults: 4, child_ages: [], cabins: 1 }, TODAY)).toContain(
      "A cabin sleeps at most 3 (infants under 3 don’t count). Ask for more cabins.",
    );
    expect(requestProblems({ ...base, adults: 2, child_ages: [1], cabins: 1 }, TODAY)).toEqual([]);
  });
});

describe("offer price build-up (DASH-OPR-018, ADR-012)", () => {
  const rates: Record<number, number> = { 1: 150000, 2: 100000, 3: 90000 };
  const lookup = (occ: number) => (rates[occ] ? { amountMinor: rates[occ]!, bands: DEFAULT_CHILD_BANDS } : null);

  it("uses the rate for the cabin's occupancy and children's bands", () => {
    // Two adults and a 7-year-old: occupancy 3 → 90,000 per adult; the child pays 50 %.
    expect(linePrice({ adults: 2, childAges: [7], maxOccupancy: 3 }, lookup)).toEqual({
      ok: true,
      priceMinor: 225000,
      occupancy: 3,
      perGuest: [90000, 90000, 45000],
    });
  });
  it("lets infants under 3 travel free without counting towards occupancy", () => {
    expect(linePrice({ adults: 2, childAges: [1], maxOccupancy: 2 }, lookup)).toMatchObject({ ok: true, priceMinor: 200000, occupancy: 2 });
  });
  it("charges 12–17 year-olds the full share, 3–5 a quarter", () => {
    expect(linePrice({ adults: 1, childAges: [12, 4], maxOccupancy: 3 }, lookup)).toMatchObject({ priceMinor: 90000 + 90000 + 22500 });
  });
  it("refuses cabins that are too full, have no grown-up or have no rate", () => {
    expect(linePrice({ adults: 3, childAges: [], maxOccupancy: 2 }, lookup)).toMatchObject({ ok: false });
    expect(linePrice({ adults: 0, childAges: [8], maxOccupancy: 2 }, lookup)).toMatchObject({ ok: false, reason: /at least one adult/ });
    expect(linePrice({ adults: 1, childAges: [], maxOccupancy: 2 }, () => null)).toMatchObject({ ok: false, reason: /no rate for 1 guest/ });
  });
  it("checks the cabins hold exactly the request's guests", () => {
    expect(sameGuests([{ adults: 2, childAges: [7] }], { adults: 2, child_ages: [7] })).toBe(true);
    expect(sameGuests([{ adults: 1, childAges: [7] }, { adults: 1, childAges: [] }], { adults: 2, child_ages: [7] })).toBe(true);
    expect(sameGuests([{ adults: 2, childAges: [] }], { adults: 2, child_ages: [7] })).toBe(false);
  });
});

describe("offer versions and expiry (DASH-OPR-023, DASH-CUS-007, ADR-088)", () => {
  const now = Date.parse("2027-01-10T12:00:00Z");
  it("only a current, unexpired version can be accepted", () => {
    expect(canAccept({ status: "sent", expires_at: "2027-01-11T12:00:00Z" }, now)).toBe(true);
    expect(offerView({ status: "sent", expires_at: "2027-01-10T11:59:00Z" }, now)).toBe("expired");
    expect(canAccept({ status: "superseded", expires_at: "2027-01-11T12:00:00Z" }, now)).toBe(false);
    expect(canAccept({ status: "withdrawn", expires_at: "2027-01-11T12:00:00Z" }, now)).toBe(false);
  });
  it("offers last 24 hours to 14 days", () => {
    expect(expiryProblem(72)).toBeNull();
    expect(expiryProblem(24)).toBeNull();
    expect(expiryProblem(336)).toBeNull();
    expect(expiryProblem(23)).toMatch(/24 hours to 14 days/);
    expect(expiryProblem(337)).toMatch(/24 hours to 14 days/);
  });
});

describe("passengers at acceptance (ADR-088, DATA-020)", () => {
  const dep = "2027-03-10";
  const people = [
    { full_name: "Sample Lead", date_of_birth: "1980-05-01", nationality: "GB" },
    { full_name: "Sample Partner", date_of_birth: "1982-06-01" },
    { full_name: "Sample Child", date_of_birth: "2020-01-15" },
  ];
  it("accepts guests whose ages on the departure date match", () => {
    expect(passengersProblem(people, dep, { adults: 2, childAges: [7] }, ageOn)).toBeNull();
  });
  it("explains a mismatch, a missing guest or a bad nationality", () => {
    expect(passengersProblem(people, dep, { adults: 2, childAges: [8] }, ageOn)).toMatch(/children aged 8/);
    expect(passengersProblem(people.slice(0, 2), dep, { adults: 2, childAges: [7] }, ageOn)).toMatch(/all 3 guests/);
    expect(passengersProblem([{ ...people[0]!, nationality: "GBR" }, people[1]!, people[2]!], dep, { adults: 2, childAges: [7] }, ageOn)).toMatch(
      /two-letter/,
    );
  });
  it("uses the age on the departure date, not today", () => {
    // Turns 18 the day before departure: an adult on the cruise.
    expect(passengersProblem([{ full_name: "Nearly Adult", date_of_birth: "2009-03-09" }], dep, { adults: 1, childAges: [] }, ageOn)).toBeNull();
  });
});

describe("the bookable gate (DASH-BND-001)", () => {
  const ok = {
    vesselPublished: true,
    operatorApproved: true,
    departureScheduled: true,
    departsOn: "2027-03-10",
    today: TODAY,
    hasPolicy: true,
    sellableCabinTypes: 2,
  };
  it("is open only when everything is complete", () => {
    expect(gateProblems(ok)).toEqual([]);
    expect(gateProblems({ ...ok, hasPolicy: false, sellableCabinTypes: 0 })).toEqual([
      "there is no cancellation policy",
      "no cabin type has a rate and confirmed availability",
    ]);
    expect(gateProblems({ ...ok, departsOn: TODAY })).toEqual(["the departure date has passed"]);
  });
});
