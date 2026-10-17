/** ADR-071 categories (set by admins) and ADR-072 "Best for" labels (chosen by admins, never from scores). */
export const CATEGORIES = [
  { value: "basic", label: "Basic" },
  { value: "standard", label: "Standard" },
  { value: "superior", label: "Superior" },
  { value: "deluxe", label: "Deluxe" },
  { value: "luxury", label: "Luxury" },
] as const;
export type Category = (typeof CATEGORIES)[number]["value"];

/** Which categories each listing page shows: /cruises/luxury/ and /cruises/value/. Superior is in neither. */
export const FACET_CATEGORIES: Record<"luxury" | "value", Category[]> = {
  luxury: ["luxury", "deluxe"],
  value: ["basic", "standard"],
};

export function facetsFor(category: Category | null): ("luxury" | "value")[] {
  if (!category) return [];
  return (Object.keys(FACET_CATEGORIES) as ("luxury" | "value")[]).filter((f) => FACET_CATEGORIES[f].includes(category));
}

export const BEST_FOR = [
  { value: "first_time_visitors", label: "First-time visitors" },
  { value: "cabins", label: "Cabins" },
  { value: "quiet_stays", label: "Quiet stays" },
  { value: "food_lovers", label: "Food lovers" },
  { value: "families", label: "Families" },
  { value: "couples", label: "Couples" },
  { value: "luxury_travellers", label: "Luxury travellers" },
  { value: "value", label: "Value" },
  { value: "traditional_character", label: "Traditional character" },
  { value: "contemporary_design", label: "Contemporary design" },
] as const;
export type BestFor = (typeof BEST_FOR)[number]["value"];

export const VESSEL_TYPE_LABEL = { sail: "Sailing dahabiya", motor: "Motor cruise ship", steam: "Paddle steamer" } as const;
