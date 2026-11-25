import { describe, expect, it } from "vitest";
import { toCard, type ListingVessel } from "@/lib/marketplace/listing";

const boat = (over: Partial<ListingVessel> = {}): ListingVessel => ({
  id: "v",
  slug: "boat",
  name: "Boat",
  type: "motor",
  propulsion: null,
  category: null,
  maxGuests: null,
  cabinCount: null,
  deckCount: null,
  sample: false,
  showcase: true,
  summary: null,
  itineraries: [],
  bookable: false,
  price: { mode: "on_request" },
  ...over,
});
const labels = (v: ListingVessel) => toCard(v).badges?.map((b) => b.label);
const priced: ListingVessel["price"] = {
  mode: "from_price",
  from: { amount: 50100, currency: "EUR" },
  basis: "per_person_per_night",
  nights: null,
  lastChecked: "2026-11-25",
};

describe("a ship card's tags (Islam, 25 Nov 2026)", () => {
  it("tags a ship with no public price as request based", () => {
    expect(labels(boat())).toEqual(["Request based"]);
  });

  it("gives a priced ship no tag, and no ship says 'Information only'", () => {
    expect(labels(boat({ price: priced }))).toEqual([]);
    expect(labels(boat({ price: priced, bookable: true }))).toEqual([]);
  });

  it("doesn't tag a ship that can be booked online, even without a public price", () => {
    expect(labels(boat({ bookable: true }))).toEqual([]);
  });

  it("doesn't call a ship we can't sell request based", () => {
    expect(labels(boat({ booking: "not_available_through_nilecruz" }))).toEqual([]);
  });
});
