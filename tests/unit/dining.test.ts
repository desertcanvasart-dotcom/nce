import { describe, expect, it } from "vitest";
import { dietaryText } from "@/lib/catalogue/dining";

describe("food and dining", () => {
  it("lists the diets in a fixed order, whatever order they were ticked in", () => {
    expect(dietaryText(["vegan", "halal", "gluten_free"])).toBe(
      "The kitchen caters for halal, vegan and gluten-free diets. Mention yours when you book.",
    );
  });

  it("reads naturally for one diet, and says nothing without any", () => {
    expect(dietaryText(["kosher"])).toBe("The kitchen caters for kosher diets. Mention yours when you book.");
    expect(dietaryText([])).toBeNull();
    expect(dietaryText(["airport_shuttle"])).toBeNull();
  });
});
