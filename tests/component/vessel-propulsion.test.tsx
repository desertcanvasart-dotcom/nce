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
  yearRenovated: null,
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
  price: {
    mode: "from_price",
    from: { amount: 337500, currency: "EUR" },
    basis: "per_person_per_trip",
    nights: 5,
    lastChecked: "2026-11-04",
  },
  rateDisplay: "offer_by_adviser",
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

  it("shows the year built and, when there is one, the year last renovated", () => {
    renderEn(<VesselView locale="en" v={dahabiya({ yearBuilt: 2001, yearRenovated: 2018 })} today="2026-11-04" />);
    expect(screen.getByText("Built").nextElementSibling?.textContent).toBe("2001");
    expect(screen.getByText("Renovated").nextElementSibling?.textContent).toBe("2018");
    cleanup();
    renderEn(<VesselView locale="en" v={dahabiya()} today="2026-11-04" />);
    expect(screen.queryByText("Renovated")).toBeNull();
  });

  it("says the approved starting price in the brief's words, for the whole cruise, never per night (ADR-109)", () => {
    renderEn(<VesselView locale="en" v={dahabiya()} today="2026-11-04" />);
    expect(document.body.textContent).toContain("From €3,375 per person. Includes our margin. A guide, not a quote.");
    expect(document.body.textContent).toContain("Per person, for the 5-night cruise. Last checked 4 Nov 2026.");
    expect(document.body.textContent).toContain("All prices we publish and quote already include our margin.");
    expect(document.body.textContent).not.toMatch(/Per person, per night|€[\d,]+ a night|Prices in preparation|Indicative|US\$/);
  });

  it("says 'Price on request', with no figure, when the vessel has no approved price", () => {
    renderEn(<VesselView locale="en" v={dahabiya({ price: { mode: "on_request" } })} today="2026-11-04" />);
    expect(screen.getAllByText("Price on request").length).toBeGreaterThan(0);
    expect(document.body.textContent).not.toMatch(/€\d{3}|€\d,\d|Last checked/);
  });

  it("offers 'Check rates for your dates' without an account, keeping the cruise", () => {
    renderEn(<VesselView locale="en" v={dahabiya()} today="2026-11-04" rates={async () => ({})} />);
    expect(screen.getByRole("heading", { name: "Check rates for your dates" })).toBeTruthy();
    expect(screen.getByText("We’ll check availability and send your offer by email.")).toBeTruthy();
    expect(screen.getByLabelText("Email")).toBeTruthy();
    expect(screen.getByLabelText("Cabin preference")).toBeTruthy();
    // Save-quote only after a result or enquiry.
    expect(screen.queryByText("Save this quote and get an alert if the price changes.")).toBeNull();
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
          yearRenovated: null,
          lengthM: null,
          summary: null,
          cabins: [],
          itineraries: [],
          price: { mode: "on_request" },
          propulsionNote: null,
          onBoard: [],
          goodToKnow: [],
        })}
        today="2026-11-04"
      />,
    );
    expect(within(screen.getByText("Sailing dahabiya").closest("p")!).getByText("Wind")).toBeTruthy();
    expect(screen.queryByText("Indicative price")).toBeNull();
    expect(screen.getByText("Starting price")).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Good to know" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Cabins and decks" })).toBeNull();
  });

  it("shows no badge for a vessel without a confirmed value", () => {
    renderEn(<VesselView locale="en" v={dahabiya({ propulsion: null })} today="2026-11-04" />);
    expect(within(screen.getByText("Sailing dahabiya").closest("p")!).queryByText("Wind")).toBeNull();
  });
});
