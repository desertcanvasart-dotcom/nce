import { describe, expect, it } from "vitest";
import { openDays, placesLeft, quoteTour, seasonPct, type TourRate } from "@/lib/tours/calendar";

const shared: TourRate = { mode: "shared", adult: 6000, child611: 3000, child35: 1500, maxGuests: 8, minGuests: 2 };
const priv: TourRate = {
  mode: "private",
  tiers: [
    { min: 1, max: 1, pp: 20000 },
    { min: 2, max: 2, pp: 12000 },
    { min: 3, max: 4, pp: 9000 },
    { min: 5, max: 8, pp: 7000 },
    { min: 9, max: 14, pp: 6000 },
    { min: 15, max: null, pp: 5000 },
  ],
  childPct: 50,
};
const transfer: TourRate = {
  mode: "transfer",
  vehicles: [
    { name: "Minibus", max: 12, price: 6000 },
    { name: "Car", max: 3, price: 2500 },
    { name: "Van", max: 7, price: 4000 },
  ],
  nightExtra: 1000,
};
const assist: TourRate = { mode: "assist", tiers: [{ max: 2, price: 3000 }, { max: 6, price: 4500 }] };

describe("tour prices by basis (ADR-097)", () => {
  it("prices shared per person, children by age, under 3s free", () => {
    const q = quoteTour(shared, [40, 38, 8, 4, 1], "2027-01-10", "08:00");
    expect(q).toMatchObject({ ok: true, total: 6000 * 2 + 3000 + 1500 });
  });
  it("prices private by party tier, children at their percentage", () => {
    expect(quoteTour(priv, [40, 38], "2027-01-10", "08:00")).toMatchObject({ ok: true, total: 24000 });
    // party of 3 counts the 5-year-old; the infant is free and not counted
    expect(quoteTour(priv, [40, 38, 5, 1], "2027-01-10", "08:00")).toMatchObject({ ok: true, total: 9000 * 2 + 4500 });
    expect(quoteTour(priv, Array(15).fill(30), "2027-01-10", "08:00")).toMatchObject({ ok: true, total: 15 * 5000 });
  });
  it("prices a transfer by the smallest vehicle that seats everyone, with a night extra", () => {
    expect(quoteTour(transfer, [40, 38], "2027-01-10", "14:00")).toMatchObject({ ok: true, total: 2500, vehicle: "Car" });
    expect(quoteTour(transfer, Array(5).fill(30), "2027-01-10", "23:30")).toMatchObject({ total: 5000, vehicle: "Van" });
    expect(quoteTour(transfer, Array(13).fill(30), "2027-01-10", "14:00")).toMatchObject({ ok: false });
  });
  it("prices meet and assist per party", () => {
    expect(quoteTour(assist, [40, 38, 10], "2027-01-10", "03:00")).toMatchObject({ ok: true, total: 4500 });
  });
  it("applies the season percentage to its group only", () => {
    const seasons = [
      { from: "2026-12-20", to: "2027-01-05", pct: 20, applies: "all" as const },
      { from: "2027-01-01", to: "2027-01-31", pct: 10, applies: "transfers" as const },
    ];
    expect(seasonPct(seasons, "shared", "2027-01-10")).toBe(0);
    expect(seasonPct(seasons, "transfer", "2027-01-02")).toBe(20);
    expect(quoteTour(shared, [40], "2026-12-25", "08:00", seasons)).toMatchObject({ total: 7200 });
    expect(quoteTour(assist, [40], "2027-01-10", "08:00", seasons)).toMatchObject({ total: 3300 });
  });
});

describe("party rules", () => {
  it("sends parties of 9 or more to the private tour", () => {
    expect(quoteTour(shared, Array(9).fill(30), "2027-01-10", "08:00")).toEqual({
      ok: false,
      problem: "Parties of 9 or more book the private tour.",
    });
    expect(quoteTour(shared, Array(8).fill(30), "2027-01-10", "08:00")).toMatchObject({ ok: true });
  });
  it("needs a guest aged 12 or over", () => {
    expect(quoteTour(shared, [10, 8], "2027-01-10", "08:00")).toMatchObject({ ok: false });
    expect(quoteTour(shared, [], "2027-01-10", "08:00")).toMatchObject({ ok: false });
  });
  it("counts places left on a shared slot", () => {
    expect(placesLeft(8, 6)).toBe(2);
    expect(placesLeft(8, 9)).toBe(0);
  });
});

describe("open days", () => {
  it("keeps the lead time and the tour's weekdays", () => {
    // Tuesday 20 Oct 2026, 15:00; tour runs Mondays and Thursdays
    const days = openDays({ today: "2026-10-20", days: [1, 4], leadHours: 24, nowHour: 15 });
    expect(days[0]).toBe("2026-10-22");
    expect(days[1]).toBe("2026-10-26");
    expect(days.at(-1)! <= "2027-10-20").toBe(true);
  });
  it("skips tomorrow when the lead time is 48 hours", () => {
    const days = openDays({ today: "2026-10-20", days: [1, 2, 3, 4, 5, 6, 7], leadHours: 48, nowHour: 15 });
    expect(days[0]).toBe("2026-10-23");
  });
});
