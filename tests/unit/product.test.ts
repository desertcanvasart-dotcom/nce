import { describe, expect, it } from "vitest";
import { isoWeekday, returnDate, sailingDates } from "@/lib/product/departures";
import {
  hoursText,
  ageOn,
  currenciesFor,
  DEFAULT_CHILD_BANDS,
  fitsCabin,
  gratuityUsdMinor,
  guestPrice,
  isFresh,
  promotedPrice,
  sharePercent,
  validBands,
} from "@/lib/product/pricing";

describe("departures (DASH-ADM-051)", () => {
  it("knows ISO weekdays", () => {
    expect(isoWeekday("2026-10-19")).toBe(1); // Monday
    expect(isoWeekday("2026-10-25")).toBe(7); // Sunday
  });
  it("lists every sailing day inside the periods, from today, up to the horizon", () => {
    const dates = sailingDates([1, 5], [{ starts_on: "2026-10-19", ends_on: "2026-11-15" }], "2026-10-19", "2027-12-31");
    expect(dates).toEqual([
      "2026-10-19",
      "2026-10-23",
      "2026-10-26",
      "2026-10-30",
      "2026-11-02",
      "2026-11-06",
      "2026-11-09",
      "2026-11-13",
    ]);
  });
  it("merges overlapping periods and respects the horizon", () => {
    const dates = sailingDates(
      [3],
      [
        { starts_on: "2026-10-01", ends_on: "2026-10-31" },
        { starts_on: "2026-10-15", ends_on: "2026-11-30" },
      ],
      "2026-10-20",
      "2026-11-10",
    );
    expect(dates).toEqual(["2026-10-21", "2026-10-28", "2026-11-04"]);
  });
  it("returns after the number of nights, across month ends", () => {
    expect(returnDate("2026-10-29", 4)).toBe("2026-11-02");
    expect(returnDate("2028-02-27", 3)).toBe("2028-03-01");
  });
});

describe("child pricing (DATA-019) at every boundary", () => {
  it.each([
    [0, 0],
    [2, 0],
    [3, 25],
    [5, 25],
    [6, 50],
    [11, 50],
    [12, 100],
    [80, 100],
  ])("age %i pays %i%%", (age, pct) => expect(sharePercent(age)).toBe(pct));
  it("uses the age on the departure date", () => {
    expect(ageOn("2024-03-21", "2027-03-20")).toBe(2);
    expect(ageOn("2024-03-21", "2027-03-21")).toBe(3);
    expect(ageOn("2015-10-30", "2027-10-29")).toBe(11);
    expect(ageOn("2015-10-30", "2027-10-30")).toBe(12);
    expect(ageOn("2024-02-29", "2027-02-28")).toBe(2); // leap-day birthday: the birthday comes on 1 March
    expect(ageOn("2024-02-29", "2027-03-01")).toBe(3);
  });
  it("prices a guest from the adult per-person rate, in minor units", () => {
    expect(guestPrice(60_000, 30)).toBe(60_000);
    expect(guestPrice(60_000, 7)).toBe(30_000);
    expect(guestPrice(60_000, 4)).toBe(15_000);
    expect(guestPrice(60_001, 4)).toBe(15_000); // 15,000.25 → rounds half up to whole minor units
    expect(guestPrice(60_002, 4)).toBe(15_001); // 15,000.5 → 15,001
    expect(guestPrice(60_000, 1)).toBe(0);
  });
  it("accepts only complete, gap-free band sets as operator overrides (DATA-022)", () => {
    expect(validBands(DEFAULT_CHILD_BANDS)).toBe(true);
    expect(
      validBands([
        { from: 0, to: 2, percent: 0 },
        { from: 2, to: null, percent: 100 },
      ]),
    ).toBe(true);
    expect(
      validBands([
        { from: 0, to: 3, percent: 0 },
        { from: 4, to: null, percent: 100 },
      ]),
    ).toBe(false); // gap
    expect(
      validBands([
        { from: 0, to: 3, percent: 0 },
        { from: 3, to: 12, percent: 120 },
        { from: 12, to: null, percent: 100 },
      ]),
    ).toBe(false);
    expect(validBands([{ from: 0, to: 3, percent: 0 }])).toBe(false); // not open-ended
  });
});

describe("occupancy (DATA-023)", () => {
  it("infants don't count; children share a parent's cabin; an adult is needed", () => {
    expect(fitsCabin([35, 33], 2).ok).toBe(true);
    expect(fitsCabin([35, 33, 1], 2).ok).toBe(true);
    expect(fitsCabin([35, 33, 4], 2).ok).toBe(false);
    expect(fitsCabin([35, 33, 4], 3).ok).toBe(true);
    expect(fitsCabin([10, 8], 2).ok).toBe(false);
  });
});

describe("crew gratuity (DATA-015)", () => {
  it("counts guests aged 3 and over, per night, at least US$5", () => {
    expect(gratuityUsdMinor(500, 4, [35, 33, 7, 2])).toBe(500 * 4 * 3);
    expect(() => gratuityUsdMinor(499, 4, [35])).toThrow(/US\$5/);
  });
});

describe("currencies by plan (ADR-082)", () => {
  it("E£ only for Egyptian citizens and residents", () => {
    expect(currenciesFor("international")).toEqual(["USD", "EUR"]);
    expect(currenciesFor("trade")).toEqual(["USD", "EUR"]);
    expect(currenciesFor("egyptian_citizen")).toContain("EGP");
    expect(currenciesFor("foreign_resident")).toContain("EGP");
  });
});

describe("promotions (DASH-ADM-074–078)", () => {
  it("percent and fixed discounts in minor units; extras and upgrades keep the price", () => {
    expect(promotedPrice(60_000, "USD", { kind: "percent", percent: 10 })).toBe(54_000);
    expect(promotedPrice(33_333, "USD", { kind: "percent", percent: 15 })).toBe(28_333); // 4,999.95 → 5,000 off
    expect(promotedPrice(60_000, "USD", { kind: "fixed", amountMinor: 5_000, currency: "USD" })).toBe(55_000);
    expect(promotedPrice(3_000, "USD", { kind: "fixed", amountMinor: 5_000, currency: "USD" })).toBe(0);
    expect(promotedPrice(60_000, "USD", { kind: "extra" })).toBe(60_000);
    expect(promotedPrice(60_000, "USD", { kind: "upgrade" })).toBe(60_000);
  });
  it("refuses impossible discounts", () => {
    expect(() => promotedPrice(60_000, "USD", { kind: "percent", percent: 100 })).toThrow();
    expect(() => promotedPrice(60_000, "EUR", { kind: "fixed", amountMinor: 5_000, currency: "USD" })).toThrow(/own currency/);
  });
});

describe("freshness (ADR-079)", () => {
  const now = Date.parse("2026-10-18T12:00:00Z");
  it("feed and API data expire after 2 hours, manual and pasted after 7 days (ADR-095)", () => {
    expect(isFresh("2026-10-18T10:30:00Z", "feed", now)).toBe(true);
    expect(isFresh("2026-10-18T09:59:00Z", "api", now)).toBe(false);
    expect(isFresh("2026-10-11T13:00:00Z", "manual", now)).toBe(true);
    expect(isFresh("2026-10-11T11:00:00Z", "manual", now)).toBe(false);
    expect(isFresh("2026-10-11T11:00:00Z", "paste", now)).toBe(false);
  });
  it("says a threshold in words", () => {
    expect([hoursText(1), hoursText(2), hoursText(24), hoursText(168)]).toEqual(["1 hour", "2 hours", "24 hours", "7 days"]);
  });
});
