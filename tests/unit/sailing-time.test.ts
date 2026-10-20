import { describe, expect, it } from "vitest";
import { suggestTours } from "@/lib/journey/journey";
import { arriveDayBefore, dayBefore, dayBeforeTip, periodOf, sailingTimeText } from "@/lib/product/sailing-time";

describe("sailing time of day (PROPOSED-019)", () => {
  it.each([
    ["00:00", "morning"],
    ["08:00", "morning"],
    ["11:59", "morning"],
    ["12:00", "noon"],
    ["15:59", "noon"],
    ["16:00", "evening"],
    ["23:30", "evening"],
    ["08:00:00", "morning"],
  ])("%s is %s", (t, p) => expect(periodOf(t)).toBe(p));
  it("refuses times that aren't HH:MM", () => {
    for (const t of ["8:00", "24:00", "12:60", "noon", ""]) expect(periodOf(t)).toBeNull();
  });
  it("says it in words, with the exact time when given", () => {
    expect(sailingTimeText("morning", "08:00:00", "Aswan")).toBe("Sails from Aswan in the morning (08:00 Cairo time)");
    expect(sailingTimeText("evening", null, "Luxor")).toBe("Sails from Luxor in the evening");
    expect(sailingTimeText(null, null, "Luxor")).toBeNull();
  });
  it("tells morning travellers to arrive the day before", () => {
    expect(arriveDayBefore("morning")).toBe(true);
    expect(arriveDayBefore("noon")).toBe(false);
    expect(arriveDayBefore(null)).toBe(false);
    expect(dayBeforeTip("Aswan")).toMatch(/arrive in Aswan the day before/);
    expect(dayBefore("2027-03-01")).toBe("2027-02-28");
  });
});

describe("tours for a morning sailing include the day before", () => {
  const at = (day: string) => `${day}T07:00:00Z`;
  const tours = [
    {
      id: "x",
      name: "Philae",
      airportService: false,
      scheduleIds: ["s"],
      sessions: [{ startsAt: at("2026-11-30"), placesLeft: 2 }],
    },
    {
      id: "t",
      name: "Aswan Airport Private Transfer",
      airportService: true,
      scheduleIds: ["s"],
      sessions: [{ startsAt: at("2026-11-30"), placesLeft: 1 }],
    },
  ];
  const NOW = new Date("2026-10-20T07:00:00Z");
  it("not for a noon or evening sailing", () => {
    expect(suggestTours({ scheduleId: "s", departsOn: "2026-12-01", returnsOn: "2026-12-05" }, tours, NOW)).toEqual([]);
  });
  it("sightseeing and an arrival transfer on the day before a morning sailing", () => {
    expect(
      suggestTours({ scheduleId: "s", departsOn: "2026-12-01", returnsOn: "2026-12-05", morning: true }, tours, NOW),
    ).toEqual([
      { id: "t", name: "Aswan Airport Private Transfer", days: ["2026-11-30"] },
      { id: "x", name: "Philae", days: ["2026-11-30"] },
    ]);
  });
});
