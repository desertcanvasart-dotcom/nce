import { describe, expect, it } from "vitest";
import { gratuityText, partyAges } from "@/lib/product/pricing";

describe("the gratuity on booking summaries (DATA-016, ADR-010)", () => {
  it("is its own line, paid on board at check-out, never in the amount due", () => {
    expect(gratuityText(800)).toBe(
      "Crew gratuity: US$8 per person (aged 3 and over) per night. Paid on board at check-out; never charged online and not part of the amount due.",
    );
  });
  it("adds the party's total when the party and nights are known, without infants under 3", () => {
    const ages = partyAges([
      { adults: 2, child_ages: [7, 2] },
      { adults: 1, child_ages: [] },
    ]);
    expect(ages).toEqual([30, 30, 7, 2, 30]);
    expect(gratuityText(800, { nights: 4, ages })).toContain(
      "US$8 per person (aged 3 and over) per night, US$128 for this party over 4 nights.",
    );
  });
  it("leaves the total out for a party of infants only", () => {
    expect(gratuityText(800, { nights: 4, ages: [1] })).not.toContain("for this party");
  });
});

describe("an approved vessel's price with sightseeing (ADR-102)", () => {
  it("shows on its card as a badge, beside the cruise-only price", async () => {
    const { toCard } = await import("@/lib/marketplace/listing");
    const card = toCard({
      id: "v",
      slug: "sample-dahab",
      name: "Sample Dahabiya",
      type: "sail",
      category: null,
      maxGuests: 12,
      cabinCount: 6,
      deckCount: 2,
      sample: false,
      showcase: false,
      summary: null,
      itineraries: [],
      from: { amount: 145000, currency: "USD" },
      fromWithSightseeing: { amount: 175000, currency: "USD" },
      bookable: true,
    });
    expect(card.price).toEqual({ amount: 145000, currency: "USD" });
    expect(card.badges).toContainEqual({ label: "With sightseeing from US$1,750", tone: "success" });
  });
  it("says what's included in plain words", async () => {
    const { sightseeingText } = await import("@/lib/marketplace/vessel");
    expect(sightseeingText({ guide: true, ticketsIncluded: true, sites: ["Esna Temple", "Edfu Temple"], note: null })).toBe(
      "An Egyptologist guide, entrance fees included; visiting Esna Temple, Edfu Temple.",
    );
    expect(sightseeingText({ guide: false, ticketsIncluded: false, sites: ["Kom Ombo Temple"], note: null })).toBe(
      "Entrance fees not included; visiting Kom Ombo Temple.",
    );
  });
});
