// @vitest-environment jsdom
import { cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderEn } from "./setup";
import { VesselView } from "@/components/marketplace/VesselView";
import type { VesselPage } from "@/lib/marketplace/vessel";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/cruises/x/",
  useRouter: () => ({ replace: () => {}, push: () => {} }),
}));

afterEach(cleanup);

const itinerary = (code: string, origin: string, destination: string, nights: number) => ({
  id: code,
  code,
  origin,
  destination,
  nights,
  sailingPeriod: null,
  sailsAt: null,
  boardingNote: null,
  days: [],
  departures: [],
  sailingDays: [],
  periods: [],
  sailings: [],
});

/** A vessel as the page receives it; each test changes what it checks. */
const vessel = (over: Partial<VesselPage> = {}): VesselPage => ({
  id: "v",
  slug: "movenpick-royal-lily",
  name: "Mövenpick MS Royal Lily",
  displayName: null,
  type: "motor",
  propulsion: "motor",
  category: null,
  maxGuests: null,
  cabinCount: 66,
  deckCount: null,
  lengthM: null,
  beamM: null,
  mooring: null,
  sharedSpaces: [],
  yearBuilt: null,
  yearRenovated: null,
  sample: false,
  showcase: true,
  summary: null,
  description: null,
  gratuityUsdMinor: null,
  photos: [],
  cabins: [],
  itineraries: [itinerary("LXR-ASW-4", "Luxor", "Aswan", 4), itinerary("ASW-LXR-3", "Aswan", "Luxor", 3)],
  // Islam, 6 Nov 2026: the lowest starting price across its sailings, tied to no cruise length.
  price: {
    mode: "from_price",
    from: { amount: 112000, currency: "EUR" },
    basis: "per_person_per_trip",
    nights: null,
    lastChecked: "2026-11-06",
  },
  rateDisplay: "offer_by_adviser",
  externalRatings: [],
  bookable: false,
  ...over,
});

describe("Royal Lily's starting price (Islam's review, 6 Nov 2026)", () => {
  it("says 'From €1,120 per person', with sightseeing, and no per-night figure or per-cruise total", () => {
    renderEn(<VesselView locale="en" v={vessel()} today="2026-11-06" />);
    const text = document.body.textContent ?? "";
    expect(text).toContain("From €1,120 per person. Includes sightseeing. A guide, not a quote.");
    expect(text).toContain("Per person, per trip.");
    expect(text).not.toMatch(/€[\d,]+ (a|per) night|per person, per night\.|for the [34]-night cruise|US\$|\$\d/i);
  });
});

describe("a boat that sails on request (SB Feddya, 25 Nov 2026)", () => {
  const boat = (sailings: VesselPage["itineraries"][number]["sailings"]) =>
    vessel({
      name: "Mövenpick SB Feddya",
      showcase: false,
      itineraries: [{ ...itinerary("LXR-ASW-4", "Luxor", "Aswan", 4), sailings }, itinerary("ASW-LXR-7", "Aswan", "Luxor", 7)],
    });

  it("says so once, instead of promising published or weekly dates", () => {
    renderEn(<VesselView locale="en" v={boat([])} today="2026-11-25" />);
    const text = document.body.textContent ?? "";
    expect(text).toContain("Cruises of 4 and 7 nights between Luxor and Aswan, on request: there are no set sailing dates.");
    expect(text).toContain("There are no set sailing dates: this boat sails on request.");
    expect(text).toContain("On request");
    expect(text).not.toMatch(/On published dates|dates the operator publishes|usual weekly sailings/);
  });

  it("keeps the dated wording once any of its cruises has a date", () => {
    renderEn(
      <VesselView
        locale="en"
        v={boat([{ id: "d", departsOn: "2027-01-04", returnsOn: "2027-01-08", status: "scheduled" }])}
        today="2026-11-25"
      />,
    );
    expect(document.body.textContent).not.toContain("there are no set sailing dates");
  });
});

describe("the resident price in Egyptian pounds (ADR-113)", () => {
  const line = "For Egyptians and foreign residents: from E£14,410 per person, per night. Sightseeing not included.";

  it("shows under the euro price when the vessel has one", () => {
    const residentPrice = { from: { amount: 1441000, currency: "EGP" as const }, basis: "per_person_per_night" as const };
    renderEn(<VesselView locale="en" v={vessel({ residentPrice })} today="2026-11-25" />);
    const text = (document.body.textContent ?? "").replace(/ /g, " ");
    expect(text).toContain(line);
    expect(text).toContain("From €1,120 per person.");
  });

  it("is left out when there is none", () => {
    renderEn(<VesselView locale="en" v={vessel()} today="2026-11-25" />);
    expect(document.body.textContent).not.toContain("For Egyptians and foreign residents");
  });
});
