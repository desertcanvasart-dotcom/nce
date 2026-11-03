// @vitest-environment jsdom
import { cleanup, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderEn } from "./setup";
import { VesselView } from "@/components/marketplace/VesselView";
import type { VesselPage } from "@/lib/marketplace/vessel";

// The page reads ?itinerary= and the section bar uses the router: plain stand-ins in a test.
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/cruises/nour-el-nil-najafa/",
  useRouter: () => ({ replace: () => {}, push: () => {} }),
}));

afterEach(cleanup);

/** An information-only sailing dahabiya, as the fleet import leaves it. */
const dahabiya = (over: Partial<VesselPage> = {}): VesselPage => ({
  id: "v",
  slug: "nour-el-nil-najafa",
  name: "Najafa",
  displayName: "Najafa, by Nour El Nil",
  type: "sail",
  propulsion: "wind",
  category: null,
  maxGuests: 24,
  cabinCount: 10,
  deckCount: null,
  lengthM: 60,
  beamM: 8.5,
  mooring: null,
  sharedSpaces: [],
  yearBuilt: 2025,
  sample: false,
  showcase: true,
  summary: "A 2025 dahabiya with spacious cabins.",
  description: null,
  gratuityUsdMinor: null,
  photos: [],
  cabins: [
    {
      id: "c1",
      code: "deluxe_suite",
      name: "Deluxe Suite",
      deck: "To be confirmed",
      sizeM2: 34.7,
      sizeIncludesBathroom: true,
      bed: "2 king beds",
      maxOccupancy: 4,
      view: null,
      balcony: false,
      amenities: [],
      count: 2,
      description: "Sold as one unit.",
    },
  ],
  itineraries: [
    {
      id: "s1",
      code: "ESN-ASW-5",
      origin: "Esna",
      destination: "Aswan",
      nights: 5,
      sailingPeriod: null,
      sailsAt: null,
      boardingNote: "The operator collects guests from Luxor city hotels.",
      days: [1, 2, 3, 4, 5, 6].map((day) => ({ day, title: `Day ${day}`, body: "" })),
      departures: [],
      sailingDays: [1],
      periods: [{ startsOn: "2026-11-04", endsOn: "2027-05-26" }],
      sailings: [],
    },
  ],
  indicativePrice: {
    perTrip: { amount: 337500, currency: "EUR" },
    nights: 5,
    basis: "per_person_per_trip",
    status: "indicative",
  },
  propulsionNote: "Sails when the wind allows, with no engine on board.",
  onBoard: ["A fan in every room"],
  goodToKnow: ["Children are welcome."],
  externalRatings: [],
  bookable: false,
  ...over,
});

describe("the vessel page for a wind-driven dahabiya", () => {
  it("shows the propulsion badge beside the vessel type, as a word and an icon", () => {
    renderEn(<VesselView locale="en" v={dahabiya()} today="2026-11-04" />);
    const eyebrow = screen.getByText("Sailing dahabiya").closest("p")!;
    const badge = within(eyebrow).getByText("Wind");
    expect(badge.closest("span")!.querySelector("svg")).not.toBeNull();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Najafa, by Nour El Nil");
  });

  it("says the guide price per person for the whole cruise, never per night", () => {
    renderEn(<VesselView locale="en" v={dahabiya()} today="2026-11-04" />);
    expect(screen.getByText("From €3,375 per person for the 5-night cruise")).toBeTruthy();
    expect(document.body.textContent).toContain(
      "From €3,375 per person for the 5-night cruise, sharing a double room. This is a guide, not a quote.",
    );
    expect(document.body.textContent).not.toMatch(/per night/);
  });

  it("labels the area as including the bathroom and draws no deck plan from unknown decks", () => {
    renderEn(<VesselView locale="en" v={dahabiya()} today="2026-11-04" />);
    expect(screen.getByText("Area, including bathroom: 34.7 m²")).toBeTruthy();
    expect(screen.getByText("Sold as one unit.")).toBeTruthy();
    expect(document.body.textContent).not.toContain("To be confirmed");
  });

  it("shows the boarding note, how it sails, life on board and good to know", () => {
    renderEn(<VesselView locale="en" v={dahabiya()} today="2026-11-04" />);
    expect(screen.getByText(/collects guests from Luxor city hotels/)).toBeTruthy();
    expect(screen.getByText("Sails when the wind allows, with no engine on board.")).toBeTruthy();
    expect(screen.getByText("Length and beam: 60 × 8.5 m")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Good to know" })).toBeTruthy();
  });

  it("keeps the badge when the other fields are empty, and leaves no empty rows", () => {
    renderEn(
      <VesselView
        locale="en"
        v={dahabiya({
          cabinCount: null,
          maxGuests: null,
          yearBuilt: null,
          lengthM: null,
          summary: null,
          cabins: [],
          itineraries: [],
          indicativePrice: undefined,
          propulsionNote: null,
          onBoard: [],
          goodToKnow: [],
        })}
        today="2026-11-04"
      />,
    );
    expect(within(screen.getByText("Sailing dahabiya").closest("p")!).getByText("Wind")).toBeTruthy();
    expect(screen.queryByText("Indicative price")).toBeNull();
    expect(screen.queryByRole("heading", { name: "Good to know" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Cabins and decks" })).toBeNull();
  });

  it("shows no badge for a vessel without a confirmed value", () => {
    renderEn(<VesselView locale="en" v={dahabiya({ propulsion: null })} today="2026-11-04" />);
    expect(within(screen.getByText("Sailing dahabiya").closest("p")!).queryByText("Wind")).toBeNull();
  });
});
