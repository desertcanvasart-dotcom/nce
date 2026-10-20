import { describe, expect, it } from "vitest";
import { cruiseDays, placeIn, shipIn } from "@/lib/tours/cruise-days";

const sailing = {
  reference: "NC-SAMPL1",
  vessel: "Sample Ship",
  departsOn: "2026-11-02",
  returnsOn: "2026-11-06",
  origin: "Luxor",
  destination: "Aswan",
  morning: false,
  titles: {} as Record<number, string>,
};

describe("where the ship is on each day (Faris, 21 Oct)", () => {
  it("reads the first place a day's title names", () => {
    expect(placeIn("Edfu and Kom Ombo")).toBe("Edfu");
    expect(placeIn("Sail through the lock, then Kom Ombo by night")).toBe("Kom Ombo");
    expect(placeIn("A day of sailing")).toBeNull();
  });

  it("uses the itinerary's day titles, and the route's ends when a title is missing", () => {
    const days = cruiseDays({ ...sailing, titles: { 2: "The West Bank, then sail", 3: "Edfu and Kom Ombo", 4: "Aswan" } });
    expect(days.map((d) => [d.date, d.place])).toEqual([
      ["2026-11-02", "Luxor"],
      ["2026-11-03", null],
      ["2026-11-04", "Edfu"],
      ["2026-11-05", "Aswan"],
      ["2026-11-06", "Aswan"],
    ]);
    expect(days[2]!.label).toBe("Day 3: Edfu and Kom Ombo");
    expect(days[1]!.label).toBe("Day 2: The West Bank, then sail");
  });

  it("adds the arrival day before a morning sailing", () => {
    const days = cruiseDays({ ...sailing, origin: "Aswan", destination: "Luxor", morning: true, returnsOn: "2026-11-05" });
    expect(days[0]).toMatchObject({
      date: "2026-11-01",
      place: "Aswan",
      label: "Arrive in Aswan: your cruise sails the next morning",
    });
    expect(days).toHaveLength(5);
  });

  it("marks the days the ship is in the tour's city", () => {
    const days = cruiseDays({ ...sailing, titles: { 4: "Aswan" } });
    expect(days.filter((d) => shipIn(d, "Aswan")).map((d) => d.date)).toEqual(["2026-11-05", "2026-11-06"]);
    expect(days.filter((d) => shipIn(d, "Luxor–Aswan")).length).toBe(3);
  });
});
