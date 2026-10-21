import { describe, expect, it } from "vitest";
import {
  cairoInstant,
  flexibleTimes,
  openDays,
  placesLeft,
  quoteTour,
  rateFromRow,
  seasonPct,
  type TourRate,
} from "@/lib/tours/calendar";
import { parseDays, parseTimes, planTourRates } from "../../scripts/lib/tour-rates";

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
  child35Pct: 25,
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
const assist: TourRate = {
  mode: "assist",
  tiers: [
    { max: 2, price: 3000 },
    { max: 6, price: 4500 },
  ],
};

describe("tour prices by basis (ADR-097)", () => {
  it("prices shared per person, children by age, under 3s free", () => {
    const q = quoteTour(shared, [40, 38, 8, 4, 1], "2027-01-10", "08:00");
    expect(q).toMatchObject({ ok: true, total: 6000 * 2 + 3000 + 1500 });
  });
  it("prices private by party tier, children at their percentage", () => {
    expect(quoteTour(priv, [40, 38], "2027-01-10", "08:00")).toMatchObject({ ok: true, total: 24000 });
    // party of 3 counts the 5-year-old; the infant is free and not counted
    // Faris, 21 Oct: 6–11 pay 50 %, 3–5 pay 25 %; the 5-year-old counts towards the party of 3.
    expect(quoteTour(priv, [40, 38, 5, 1], "2027-01-10", "08:00")).toMatchObject({ ok: true, total: 9000 * 2 + 2250 });
    expect(quoteTour(priv, [40, 38, 8, 4], "2027-01-10", "08:00")).toMatchObject({ ok: true, total: 9000 * 2 + 4500 + 2250 });
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

describe("from the database to the page", () => {
  it("turns a Cairo day and time into the instant the database stores, in winter and summer time", () => {
    expect(cairoInstant("2026-12-01", "08:00")).toBe("2026-12-01T06:00:00.000Z");
    expect(cairoInstant("2027-07-01", "08:00")).toBe("2027-07-01T05:00:00.000Z");
  });
  it("reads a rate's snake_case prices", () => {
    const row = { id: "r", label: "", days: [1], start_times: [], lead_hours: 24, max_guests: 8, min_guests: 1 };
    expect(rateFromRow({ ...row, mode: "private", prices: { tiers: [{ min: 1, max: null, pp: 100 }], child_pct: 50 } })).toEqual({
      mode: "private",
      tiers: [{ min: 1, max: null, pp: 100 }],
      childPct: 50,
      child35Pct: 25,
    });
    expect(rateFromRow({ ...row, mode: "transfer", prices: { vehicles: [], night_extra: 5 } })).toMatchObject({ nightExtra: 5 });
  });
  it("offers quarter hours for flexible starts, round the clock for transfers", () => {
    expect(flexibleTimes("private")[0]).toBe("05:00");
    expect(flexibleTimes("transfer")).toHaveLength(96);
  });
});

describe("the rate sheet (pnpm import:tour-rates)", () => {
  const tours = [
    { id: "t1", name: "Abu Simbel Day Trip from Aswan by Road" },
    { id: "t2", name: "Aswan Airport Private Transfer" },
  ];
  const offices = [
    { id: "lx", display_name: "Nilecruz Luxor Office" },
    { id: "as", display_name: "Nilecruz Aswan Office" },
  ];
  const empty = { "Shared tours": [], "Private tours": [], Transfers: [], "Meet and assist": [], Seasons: [], Questions: [] };
  const row = (n: number, r: Record<string, string | number | null>) => ({ row: n, ...r });

  it("reads days and start times as written", () => {
    expect(parseDays("Every day")).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(parseDays("Mon, Wed, Fri")).toEqual([1, 3, 5]);
    expect(parseDays("Mon-Fri")).toEqual([1, 2, 3, 4, 5]);
    expect(parseDays("Fri to Mon")).toEqual([1, 5, 6, 7]);
    expect(parseDays("someday")).toBeNull();
    expect(parseTimes("08:00, 13:30")).toEqual(["08:00", "13:30"]);
    expect(parseTimes("flexible")).toEqual([]);
    expect(parseTimes("8am")).toBeNull();
  });

  it("turns dollars into cents, percentages either way, and sets each tour's office", () => {
    const plan = planTourRates(
      {
        ...empty,
        "Shared tours": [
          row(5, {
            tour: "Abu Simbel Day Trip from Aswan by Road",
            office: "Aswan",
            days: "Every day",
            times: "04:00",
            adult: 60,
            child611: 30,
            child35: null,
            max: 8,
            min: 2,
            lead: 24,
            tickets: "Yes",
          }),
        ],
        "Private tours": [
          row(5, {
            tour: "Abu Simbel Day Trip from Aswan by Road",
            office: "Aswan",
            days: "Every day",
            times: "flexible",
            p1: 200,
            p2: 120,
            p34: null,
            p58: null,
            p914: 60,
            p15: null,
            child_pct: 0.5,
            lead: null,
          }),
        ],
        Transfers: [
          row(5, {
            tour: "Aswan Airport Private Transfer",
            office: "Aswan",
            label: "Airport → hotel",
            car: 25,
            van: 40,
            minibus: null,
            night: 10,
            lead: null,
          }),
        ],
        Seasons: [row(5, { name: "Christmas", from: "2026-12-24", to: "2027-01-07", pct: 0.2, applies: "All" })],
      },
      tours,
      offices,
    );
    expect(plan.problems).toEqual([]);
    expect(plan.offices).toEqual(
      new Map([
        ["t1", "as"],
        ["t2", "as"],
      ]),
    );
    expect(plan.rates[0]).toMatchObject({
      mode: "shared",
      start_times: ["04:00"],
      min_guests: 2,
      tickets_included: true,
      prices: { adult: 6000, child611: 3000, child35: 0 },
    });
    expect(plan.rates[1]).toMatchObject({
      mode: "private",
      start_times: [],
      lead_hours: 24,
      prices: {
        child_pct: 50,
        child35_pct: 25,
        tiers: [
          { min: 1, max: 1, pp: 20000 },
          { min: 2, max: 2, pp: 12000 },
          { min: 9, max: 14, pp: 6000 },
        ],
      },
    });
    expect(plan.rates[2]).toMatchObject({
      mode: "transfer",
      label: "Airport → hotel",
      lead_hours: 12,
      prices: {
        night_extra: 1000,
        vehicles: [
          { name: "Car", max: 3, price: 2500 },
          { name: "Van", max: 8, price: 4000 },
        ],
      },
    });
    expect(plan.seasons).toEqual([
      { name: "Christmas", starts_on: "2026-12-24", ends_on: "2027-01-07", pct: 20, applies: "all" },
    ]);
  });

  it("explains what to fix, by tab and row", () => {
    const plan = planTourRates(
      {
        ...empty,
        "Shared tours": [
          row(7, {
            tour: "Felucca at sunset",
            office: "Cairo",
            days: "Every day",
            times: "8am",
            adult: "sixty",
            max: 12,
            min: 1,
            lead: 24,
          }),
        ],
      },
      tours,
      offices,
    );
    expect(plan.problems).toEqual([
      'Shared tours, row 7: no tour is called "Felucca at sunset" (names must match the tours list)',
      'Shared tours, row 7: the adult price should be a price in US$, not "sixty"',
      "Shared tours, row 7: a shared group takes 1 to 8 guests",
    ]);
  });
});

describe("Nilecruz's sightseeing programmes (ADR-102)", () => {
  const programme: TourRate = {
    mode: "program",
    tiers: [
      { min: 1, max: 1, pp: 33700 },
      { min: 2, max: 2, pp: 21600 },
      { min: 3, max: 4, pp: 17800 },
      { min: 5, max: 8, pp: 14400 },
      { min: 9, max: 14, pp: 12800 },
    ],
    childPct: 50,
    child35Pct: 25,
  };
  it("prices a party like a private tour: by party size, children by age, under 3 free", () => {
    const q = quoteTour(programme, [40, 38, 8, 4, 1], "2027-02-12", "08:00");
    expect(q).toMatchObject({ ok: true, total: 17800 * 2 + 8900 + 4450 });
  });
  it("sends groups over 14 to Nilecruz for a quote", () => {
    const q = quoteTour(
      programme,
      Array.from({ length: 15 }, () => 30),
      "2027-02-12",
      "08:00",
    );
    expect(q).toEqual({ ok: false, problem: "For a group this size, ask us: Nilecruz quotes the sightseeing by hand." });
  });
  it("reads a programme row from the database like a private one", () => {
    const r = rateFromRow({
      id: "r",
      mode: "program",
      label: "",
      days: [1, 2, 3, 4, 5, 6, 7],
      start_times: [],
      lead_hours: 24,
      max_guests: 8,
      min_guests: 1,
      prices: { tiers: [{ min: 1, max: null, pp: 10000 }], child_pct: 50 },
    });
    expect(r).toEqual({ mode: "program", tiers: [{ min: 1, max: null, pp: 10000 }], childPct: 50, child35Pct: 25 });
  });
  it("loads the Programs tab: prices by party size, entrance fees included, the first office named, its itineraries", () => {
    const plan = planTourRates(
      {
        "Shared tours": [],
        "Private tours": [],
        Transfers: [],
        "Meet and assist": [],
        Seasons: [],
        Questions: [],
        Programs: [
          {
            row: 6,
            tour: "3-Night Nile Cruise Sightseeing: Aswan to Luxor",
            office: "Aswan + Luxor",
            p1: 337,
            p2: 216,
            p34: 178,
            p58: 144,
            p914: 128,
            child_pct: 0.5,
            notes: null,
          },
          {
            row: 7,
            tour: "Unknown programme",
            office: "Cairo",
            p1: null,
            p2: null,
            p34: null,
            p58: null,
            p914: null,
            child_pct: null,
          },
        ],
      },
      [{ id: "p3", name: "3-Night Nile Cruise Sightseeing: Aswan to Luxor" }],
      [
        { id: "lx", display_name: "Nilecruz Luxor Office" },
        { id: "as", display_name: "Nilecruz Aswan Office" },
      ],
    );
    expect(plan.rates).toEqual([
      expect.objectContaining({
        tour_id: "p3",
        mode: "program",
        tickets_included: true,
        prices: {
          tiers: [
            { min: 1, max: 1, pp: 33700 },
            { min: 2, max: 2, pp: 21600 },
            { min: 3, max: 4, pp: 17800 },
            { min: 5, max: 8, pp: 14400 },
            { min: 9, max: 14, pp: 12800 },
          ],
          child_pct: 50,
          child35_pct: 25,
        },
      }),
    ]);
    expect(plan.offices.get("p3")).toBe("as");
    expect(plan.programmes).toEqual([{ tour_id: "p3", nights: 3, origin: "Aswan", destination: "Luxor" }]);
    expect(plan.problems).toEqual([
      'Programs, row 7: no tour is called "Unknown programme" (names must match the tours list)',
      'Programs, row 7: offices "Cairo" should name Luxor or Aswan',
      "Programs, row 7: no party-size prices",
    ]);
  });
});
