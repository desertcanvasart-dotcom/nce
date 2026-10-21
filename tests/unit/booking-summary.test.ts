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
