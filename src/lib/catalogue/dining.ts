/** Food on board: the diets a vessel's kitchen caters for, with the words travellers and staff see. */
export const DIETARY_OPTIONS = [
  { value: "halal", label: "Halal" },
  { value: "kosher", label: "Kosher" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "gluten_free", label: "Gluten-free" },
  { value: "dairy_free", label: "Dairy-free" },
] as const;
export type DietaryOption = (typeof DIETARY_OPTIONS)[number]["value"];

const list = (xs: string[]) => (xs.length < 2 ? (xs[0] ?? "") : `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}`);

/** "The kitchen caters for halal, vegan and gluten-free diets…", in the order of the list above; null without any. */
export function dietaryText(values: readonly string[]): string | null {
  const names = DIETARY_OPTIONS.filter((o) => values.includes(o.value)).map((o) => o.label.toLowerCase());
  if (!names.length) return null;
  return `The kitchen caters for ${list(names)} diets. Mention yours when you book.`;
}
