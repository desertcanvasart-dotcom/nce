import { describe, expect, it } from "vitest";
import {
  bandsProblem,
  cairoDate,
  cairoToUtc,
  cancellationPercent,
  programAvailability,
  programDate,
  quoteSession,
  sessionStarts,
  tourReadiness,
} from "@/lib/tours/tours";

describe("sessions in Cairo time (DASH-ADM-067, DATA-003)", () => {
  it("converts Cairo time to UTC in winter and in Egyptian summer time", () => {
    expect(cairoToUtc("2027-01-15", "09:00").toISOString()).toBe("2027-01-15T07:00:00.000Z");
    expect(cairoToUtc("2027-07-15", "09:00").toISOString()).toBe("2027-07-15T06:00:00.000Z");
    expect(cairoToUtc("2027-01-15", "00:30").toISOString()).toBe("2027-01-14T22:30:00.000Z");
  });

  it("creates every chosen weekday at each time, across the change to summer time", () => {
    // 2027: summer time starts on Friday 30 April. Thursdays and Saturdays around it.
    const starts = sessionStarts({ from: "2027-04-28", to: "2027-05-02", weekdays: [4, 6], times: ["06:00", "17:30"] });
    expect(starts.map((d) => d.toISOString())).toEqual([
      "2027-04-29T04:00:00.000Z",
      "2027-04-29T15:30:00.000Z",
      "2027-05-01T03:00:00.000Z",
      "2027-05-01T14:30:00.000Z",
    ]);
  });

  it("never repeats a start and refuses bad input", () => {
    expect(sessionStarts({ from: "2027-01-04", to: "2027-01-04", weekdays: [1], times: ["09:00", "09:00"] })).toHaveLength(1);
    expect(() => sessionStarts({ from: "2027-01-05", to: "2027-01-04", weekdays: [1], times: ["09:00"] })).toThrow(
      /start and an end/,
    );
    expect(() => sessionStarts({ from: "2027-01-04", to: "2027-01-10", weekdays: [], times: ["09:00"] })).toThrow(/weekday/);
    expect(() => sessionStarts({ from: "2027-01-04", to: "2027-01-10", weekdays: [1], times: ["9am"] })).toThrow(/HH:MM/);
    expect(() =>
      sessionStarts({ from: "2027-01-01", to: "2029-12-31", weekdays: [1, 2, 3, 4, 5, 6, 7], times: ["08:00", "12:00"] }),
    ).toThrow(/more than 1000/);
  });

  it("reads the Cairo date of a late-evening session correctly", () => {
    expect(cairoDate("2027-07-15T22:30:00Z")).toBe("2027-07-16");
    expect(cairoDate("2027-01-15T21:30:00Z")).toBe("2027-01-15");
  });
});

describe("cancellation bands (DASH-ADM-065)", () => {
  const good = [
    { from_days: 7, percent: 0 },
    { from_days: 2, percent: 50 },
    { from_days: 0, percent: 100 },
  ];
  it("accepts complete, non-decreasing bands", () => {
    expect(bandsProblem(good)).toBeNull();
    expect(bandsProblem([])).toBeNull();
  });
  it("explains what is wrong", () => {
    expect(bandsProblem([{ from_days: 7, percent: 50 }])).toMatch(/from 0 days/);
    expect(
      bandsProblem([
        { from_days: 7, percent: 50 },
        { from_days: 0, percent: 20 },
      ]),
    ).toMatch(/can’t go down/);
    expect(
      bandsProblem([
        { from_days: 0, percent: 10 },
        { from_days: 0, percent: 20 },
      ]),
    ).toMatch(/different number/);
    expect(bandsProblem([{ from_days: 0, percent: 120 }])).toMatch(/0 to 100/);
    expect(
      bandsProblem([
        { from_days: 1.5, percent: 10 },
        { from_days: 0, percent: 20 },
      ]),
    ).toMatch(/whole numbers/);
  });
  it("finds the charge for a cancellation date", () => {
    expect(cancellationPercent(good, 30)).toBe(0);
    expect(cancellationPercent(good, 7)).toBe(0);
    expect(cancellationPercent(good, 6)).toBe(50);
    expect(cancellationPercent(good, 0)).toBe(100);
  });
});

describe("tour prices (DASH-ADM-068, 069, ADR-087)", () => {
  const shared = { kind: "shared" as const, pricing: "per_guest" as const, priceMinor: 5000, capacity: 20 };
  const privateGroup = { kind: "private" as const, pricing: "per_group" as const, priceMinor: 40000, capacity: 6 };
  const privateGuest = { kind: "private" as const, pricing: "per_guest" as const, priceMinor: 9000, capacity: 4 };

  it("charges every guest of 3 and over per guest; under-3s are free", () => {
    expect(quoteSession(shared, [40, 38, 7, 2])).toEqual({ ok: true, totalMinor: 15000, paying: 3 });
    expect(quoteSession(shared, [3])).toEqual({ ok: true, totalMinor: 5000, paying: 1 });
    expect(quoteSession(shared, [2.9])).toEqual({ ok: true, totalMinor: 0, paying: 0 });
  });
  it("charges a group price once for a private party", () => {
    expect(quoteSession(privateGroup, [40, 38, 7, 2])).toEqual({ ok: true, totalMinor: 40000, paying: 3 });
    expect(quoteSession(privateGuest, [40, 38])).toEqual({ ok: true, totalMinor: 18000, paying: 2 });
  });
  it("respects capacity (infants count) and adults-only", () => {
    expect(quoteSession(privateGroup, [30, 30, 30, 30, 30, 30, 1])).toMatchObject({ ok: false, reason: /up to 6 guests/ });
    expect(quoteSession(shared, [30, 17], { adultsOnly: true })).toMatchObject({ ok: false, reason: /adults only/ });
    expect(quoteSession(shared, [30, 18], { adultsOnly: true })).toMatchObject({ ok: true });
    expect(quoteSession(shared, [])).toMatchObject({ ok: false });
  });
});

describe("readiness: information-only until sellable (DASH-ADM-073)", () => {
  const base = {
    published: true,
    hasSupplier: true,
    bands: [{ from_days: 0, percent: 100 }],
    futureSessions: 1,
    hasEnglishDescription: true,
  };
  it("is bookable with a supplier, bands and a future session", () => {
    expect(tourReadiness(base)).toEqual({ state: "bookable", missing: [] });
  });
  it("is information-only when published without them, and lists what is missing", () => {
    expect(tourReadiness({ ...base, futureSessions: 0, bands: [] })).toEqual({
      state: "information",
      missing: ["cancellation bands", "a future session with a price"],
    });
  });
  it("is a draft until published", () => {
    expect(tourReadiness({ ...base, published: false }).state).toBe("draft");
  });
  it("is bookable on the calendar with an office and rates, no supplier or sessions needed [ADR-097]", () => {
    const cal = { ...base, hasSupplier: false, bands: [], futureSessions: 0 };
    expect(tourReadiness({ ...cal, hasOffice: true, activeRates: 2 })).toEqual({ state: "bookable", missing: [] });
    expect(tourReadiness({ ...cal, hasOffice: true, activeRates: 0 })).toEqual({
      state: "information",
      missing: ["rates (from the rate sheet)"],
    });
  });
});

describe("programs (DASH-ADM-070, 071)", () => {
  it("puts day N on the departure date + N − 1", () => {
    expect(programDate("2027-03-12", 1)).toBe("2027-03-12");
    expect(programDate("2027-03-12", 3)).toBe("2027-03-14");
    expect(programDate("2027-02-27", 3)).toBe("2027-03-01");
  });

  it("checks every included tour has a session on its day", () => {
    const items = [
      { day_number: 1, tour_id: "karnak", tour_name: "Karnak" },
      { day_number: 3, tour_id: "edfu", tour_name: "Edfu" },
    ];
    const departures = [
      { id: "d1", departs_on: "2027-03-12", label: "12 Mar" },
      { id: "d2", departs_on: "2027-03-19", label: "19 Mar" },
    ];
    const sessions = [
      { tour_id: "karnak", starts_at: "2027-03-12T14:00:00Z", capacity: 20, status: "scheduled" },
      { tour_id: "edfu", starts_at: "2027-03-14T05:00:00Z", capacity: 20, status: "scheduled" },
      { tour_id: "karnak", starts_at: "2027-03-19T14:00:00Z", capacity: 20, status: "scheduled" },
      { tour_id: "edfu", starts_at: "2027-03-21T05:00:00Z", capacity: 20, status: "cancelled" },
    ];
    const [first, second] = programAvailability(departures, items, sessions);
    expect(first!.missing).toEqual([]);
    expect(first!.days.map((d) => d.date)).toEqual(["2027-03-12", "2027-03-14"]);
    expect(second!.missing).toEqual(["No Edfu session on 2027-03-21 (day 3)"]);
  });

  it("counts only sessions large enough for the party", () => {
    const items = [{ day_number: 1, tour_id: "t", tour_name: "Balloon" }];
    const deps = [{ id: "d", departs_on: "2027-03-12", label: "" }];
    const small = [{ tour_id: "t", starts_at: "2027-03-12T03:00:00Z", capacity: 2, status: "scheduled" }];
    expect(programAvailability(deps, items, small, 4)[0]!.missing).toHaveLength(1);
    expect(programAvailability(deps, items, small, 2)[0]!.missing).toHaveLength(0);
  });
});

describe("bands in words", () => {
  it("describes each band as a range", async () => {
    const { bandLines } = await import("@/lib/tours/tours");
    expect(
      bandLines(
        [
          { from_days: 0, percent: 100 },
          { from_days: 30, percent: 20 },
        ],
        "departure",
      ),
    ).toEqual([
      "Cancelled 30 days or more before departure: 20 % charged",
      "Cancelled less than 30 days before departure: 100 % charged",
    ]);
    expect(
      bandLines([
        { from_days: 7, percent: 0 },
        { from_days: 2, percent: 50 },
        { from_days: 0, percent: 100 },
      ]),
    ).toEqual([
      "Cancelled 7 days or more before the start: 0 % charged",
      "Cancelled 2 to 6 days before the start: 50 % charged",
      "Cancelled less than 2 days before the start: 100 % charged",
    ]);
    expect(bandLines([{ from_days: 0, percent: 100 }])).toEqual(["Cancelled at any time: 100 % charged"]);
  });
});
