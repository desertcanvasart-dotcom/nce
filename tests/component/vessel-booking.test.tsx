// @vitest-environment jsdom
import { cleanup, screen } from "@testing-library/react";
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
  it("says 'From €1,120 per person', with our margin, and no per-night figure or per-cruise total", () => {
    renderEn(<VesselView locale="en" v={vessel()} today="2026-11-06" />);
    const text = document.body.textContent ?? "";
    expect(text).toContain("From €1,120 per person. Includes our margin. A guide, not a quote.");
    expect(text).toContain("Per person, per trip.");
    expect(text).not.toMatch(/€[\d,]+ (a|per) night|per person, per night\.|for the [34]-night cruise|US\$|\$\d/i);
  });
});

describe("the Nour El Nil boats' prices (Islam, 6 Nov 2026)", () => {
  it("show the 'from' price without 'Includes our margin' until it is confirmed", () => {
    const price = { ...(vessel().price as Extract<VesselPage["price"], { mode: "from_price" }>), margin: false };
    renderEn(<VesselView locale="en" v={vessel({ name: "Adelaïde", price })} today="2026-11-06" />);
    const text = document.body.textContent ?? "";
    expect(text).toContain("From €1,120 per person. A guide, not a quote.");
    expect(text).not.toContain("Includes our margin");
    expect(text).not.toContain("All prices we publish and quote already include our margin.");
  });
});

describe("a vessel that can't be booked through Nilecruz (Steam Ship Sudan)", () => {
  const sudan = vessel({
    slug: "steam-ship-sudan",
    name: "Steam Ship Sudan",
    type: "steam",
    propulsion: "steam",
    price: { mode: "on_request" },
    booking: "not_available_through_nilecruz",
    enquiry: { name: "Original Travel", email: "jamie.armstrong@originaltravel.co.uk" },
  });

  it("shows no price and no Nilecruz booking action, and offers to enquire with Original Travel", () => {
    renderEn(<VesselView locale="en" v={sudan} today="2026-11-06" rates={async () => ({})} />);
    expect(screen.getAllByText("Booking unavailable through us").length).toBeGreaterThan(0);
    const enquire = screen.getAllByRole("link", { name: "Enquire with Original Travel" });
    expect(enquire.length).toBeGreaterThan(0);
    for (const a of enquire) expect(a.getAttribute("href")).toBe("mailto:jamie.armstrong@originaltravel.co.uk");
    expect(screen.queryByRole("link", { name: /Ask for an offer|See prices and dates/ })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Check rates for your dates" })).toBeNull();
    expect(screen.queryByText("Starting price")).toBeNull();
    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(/€\d|Price on request|ask for an offer|ask us|your offer|Original Travel[^.]*operator/i);
    for (const a of document.querySelectorAll("a")) expect(a.getAttribute("href") ?? "").not.toMatch(/\/(ask|reserve)\//);
  });
});
