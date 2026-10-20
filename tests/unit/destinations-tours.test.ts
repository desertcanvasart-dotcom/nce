import { describe, expect, it } from "vitest";
import { durationText, tourUrl, WORKBOOK_TOURS } from "@/lib/content/tours";
import { stopsFor } from "@/lib/marketplace/vessel";
import { BUILT, expectedLinks, LINK_MAP, NO_CLOSING } from "@/lib/seo/links";

describe("stops on a vessel's itinerary (SEO-013)", () => {
  it("lists the classic stretch in sailing order, either way", () => {
    expect(stopsFor("Luxor", "Aswan").map((s) => s.name)).toEqual(["Luxor", "Edfu", "Kom Ombo", "Aswan"]);
    expect(stopsFor("Aswan", "Luxor").map((s) => s.name)).toEqual(["Aswan", "Kom Ombo", "Edfu", "Luxor"]);
    expect(stopsFor("Esna", "Aswan").map((s) => s.href)).toEqual([
      "/destinations/esna/",
      "/destinations/edfu/",
      "/destinations/kom-ombo/",
      "/destinations/aswan/",
    ]);
  });
  it("keeps unknown places to their known ends", () => {
    expect(stopsFor("Cancel Port 1", "Cancel Harbour 1")).toEqual([]);
  });
});

describe("tour pages (DASH-ADM-072, SEO-022)", () => {
  it("gives each tour one page: its workbook page, or its own", () => {
    expect(tourUrl("abu-simbel-day-trip-from-aswan-by-road")).toBe("/tours-extras/abu-simbel-day-trip/");
    expect(tourUrl("meet-and-assist-luxor-airport")).toBe("/tours-extras/transfers/");
    expect(tourUrl("dendera-temple-half-day-trip-from-luxor")).toBe("/tours-extras/dendera-temple-half-day-trip-from-luxor/");
    for (const page of Object.keys(WORKBOOK_TOURS)) expect(BUILT.has(page), page).toBe(true);
  });
  it("says how long a tour takes in words", () => {
    expect([durationText(40), durationText(60), durationText(600), durationText(5760)]).toEqual([
      "40 minutes",
      "about an hour",
      "about 10 hours",
      "4 nights",
    ]);
  });
});

describe("trust pages (ADR-022)", () => {
  it("use the brand Nilecruz, never nilecrz", () => {
    expect(LINK_MAP["/about/"]!.h1).toBe("About Nilecruz");
    expect(JSON.stringify(LINK_MAP)).not.toMatch(/nilecrz/i);
  });
  it("Contact doesn't end with the cruise row", () => {
    expect(NO_CLOSING.has("/contact/")).toBe(true);
    expect(expectedLinks("/contact/")).not.toContain("/cruises/");
  });
});
