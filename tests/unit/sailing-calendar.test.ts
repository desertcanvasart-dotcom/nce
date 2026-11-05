import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import ja from "../../messages/ja.json";
import {
  calendarMonths,
  calendarSailings,
  headingOf,
  horizonOf,
  monthDays,
  nightsOnBoard,
  patternLines,
  usualLines,
  type CalendarItinerary,
} from "@/lib/marketplace/sailing-calendar";

// 2 Nov 2026 is a Monday.
const TODAY = "2026-11-03";
const lxr = (over: Partial<CalendarItinerary> = {}): CalendarItinerary => ({
  code: "LXR4",
  origin: "Luxor",
  destination: "Aswan",
  nights: 4,
  sailingDays: [1],
  periods: [{ startsOn: "2026-10-01", endsOn: "2026-11-30" }],
  sailings: [],
  ...over,
});
const asw = (over: Partial<CalendarItinerary> = {}): CalendarItinerary => ({
  code: "ASW3",
  origin: "Aswan",
  destination: "Luxor",
  nights: 3,
  sailingDays: [5],
  periods: [{ startsOn: "2026-10-01", endsOn: "2026-11-30" }],
  sailings: [],
  ...over,
});

describe("sailing calendar: the two ways a ship's dates come", () => {
  it("projects a weekly pattern into its periods, after today only", () => {
    const s = calendarSailings([lxr()], TODAY);
    expect(s.map((x) => x.departsOn)).toEqual(["2026-11-09", "2026-11-16", "2026-11-23", "2026-11-30"]);
    expect(s.every((x) => x.status === "pattern" && x.id === null)).toBe(true);
    expect(s[0]).toMatchObject({ returnsOn: "2026-11-13", nights: 4, heading: "south" });
  });

  it("shows departure rows as confirmed or cancelled, and never repeats their dates from the pattern", () => {
    const s = calendarSailings(
      [
        lxr({
          sailings: [
            { id: "d1", departsOn: "2026-11-09", returnsOn: "2026-11-13", status: "scheduled" },
            { id: "d2", departsOn: "2026-11-16", returnsOn: "2026-11-20", status: "cancelled" },
          ],
        }),
      ],
      TODAY,
    );
    expect(s.map((x) => [x.departsOn, x.status])).toEqual([
      ["2026-11-09", "confirmed"],
      ["2026-11-16", "cancelled"],
      ["2026-11-23", "pattern"],
      ["2026-11-30", "pattern"],
    ]);
    expect(s[0]!.id).toBe("d1");
  });

  it("shows only published dates for a vessel without a pattern (tailor-made or dated sailings)", () => {
    const s = calendarSailings(
      [
        lxr({
          sailingDays: [1, 2, 3, 4, 5, 6, 7],
          periods: [],
          sailings: [{ id: "x", departsOn: "2027-01-14", returnsOn: "2027-01-18", status: "scheduled" }],
        }),
      ],
      TODAY,
    );
    expect(s).toHaveLength(1);
    expect(s[0]).toMatchObject({ status: "confirmed", departsOn: "2027-01-14" });
  });

  it("stops at the twelve-month horizon and sorts both directions together", () => {
    expect(horizonOf(TODAY)).toBe("2027-10-31");
    const s = calendarSailings([lxr({ periods: [{ startsOn: "2026-11-01", endsOn: "2028-01-01" }] }), asw()], TODAY);
    expect(s.at(-1)!.departsOn <= "2027-10-31").toBe(true);
    expect(s.slice(0, 2).map((x) => [x.departsOn, x.code])).toEqual([
      ["2026-11-06", "ASW3"],
      ["2026-11-09", "LXR4"],
    ]);
  });

  it("reads the direction off the river", () => {
    expect(headingOf("Luxor", "Aswan")).toBe("south");
    expect(headingOf("aswan", "Luxor")).toBe("north");
    expect(headingOf("Esna", "Aswan")).toBe("south");
    expect(headingOf("Luxor", "Luxor")).toBeNull();
    expect(headingOf("Lake Nasser", "Aswan")).toBeNull();
  });

  it("writes the weekly pattern only while a period is still running", () => {
    expect(patternLines([lxr({ sailingDays: [5, 1, 1] })], TODAY)[0]).toMatchObject({ days: [1, 5], heading: "south" });
    expect(patternLines([lxr({ periods: [{ startsOn: "2026-01-01", endsOn: "2026-04-30" }] })], TODAY)).toEqual([]);
    expect(patternLines([lxr({ periods: [] })], TODAY)).toEqual([]);
  });

  it("lists the usual weekdays of an itinerary with no period to draw, so the page never says there are none", () => {
    // A luxury ship: weekdays only, no periods and no departures.
    const asw = lxr({ code: "ASW3", origin: "Aswan", destination: "Luxor", nights: 3, sailingDays: [5], periods: [] });
    expect(usualLines([lxr({ periods: [] }), asw], TODAY)).toEqual([
      expect.objectContaining({ code: "LXR4", days: [1], periods: [], heading: "south" }),
      expect.objectContaining({ code: "ASW3", days: [5], periods: [], heading: "north" }),
    ]);
    // A pattern already drawn from its periods isn't repeated; an itinerary without weekdays has nothing to list.
    expect(usualLines([lxr(), lxr({ code: "X", sailingDays: [], periods: [] })], TODAY)).toEqual([]);
  });
});

describe("sailing calendar: months, days and nights on board", () => {
  it("runs from this month to the last month with a sailing, and is empty without sailings", () => {
    expect(
      calendarMonths(calendarSailings([lxr({ periods: [{ startsOn: "2027-01-01", endsOn: "2027-02-10" }] })], TODAY), TODAY),
    ).toEqual(["2026-11", "2026-12", "2027-01", "2027-02"]);
    expect(calendarMonths([], TODAY)).toEqual([]);
  });

  it("lays a month out Monday first", () => {
    const nov = monthDays("2026-11");
    expect(nov.offset).toBe(6); // 1 Nov 2026 is a Sunday
    expect(nov.days).toHaveLength(30);
    expect(monthDays("2027-02").days.at(-1)).toBe("2027-02-28");
  });

  it("marks each night once, a confirmed sailing over the pattern, never a cancelled one", () => {
    const s = calendarSailings(
      [
        lxr({ sailings: [{ id: "c", departsOn: "2026-11-16", returnsOn: "2026-11-20", status: "cancelled" }] }),
        asw({ sailings: [{ id: "a", departsOn: "2026-11-13", returnsOn: "2026-11-16", status: "scheduled" }] }),
      ],
      TODAY,
    );
    const n = nightsOnBoard(s);
    expect(n.get("2026-11-09")?.code).toBe("LXR4");
    expect(n.get("2026-11-12")?.code).toBe("LXR4");
    expect(n.has("2026-11-13")).toBe(true);
    expect(n.get("2026-11-13")).toMatchObject({ code: "ASW3", status: "confirmed" });
    expect(n.get("2026-11-16")).toBeUndefined();
  });
});

describe("sailing calendar copy (EN, ES, JA)", () => {
  const keys = (o: object, p = ""): string[] =>
    Object.entries(o).flatMap(([k, v]) => (typeof v === "object" ? keys(v, `${p}${k}.`) : [`${p}${k}`]));
  it("has the same keys in every language", () => {
    expect(keys(es.sailingCalendar).sort()).toEqual(keys(en.sailingCalendar).sort());
    expect(keys(ja.sailingCalendar).sort()).toEqual(keys(en.sailingCalendar).sort());
  });
  it("says the weekly pattern is not live availability", () => {
    expect(en.sailingCalendar.patternNote).toMatch(/not live availability/);
    expect(en.sailingCalendar.patternNote).toMatch(/Only confirmed departures can be booked/);
  });
});
