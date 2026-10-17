/**
 * DASH-ADM-018 / DATA-021: what a vessel still needs before it can be published. Rates and availability
 * (and the cabins they hang on) are part of the check; they arrive in Batch 4c, so until then only a
 * dated showcase exception can make a vessel visible (DATA-024).
 */
export type ReadinessInput = {
  name: string | null;
  type: string | null;
  route_text: string | null;
  category: string | null;
  cabin_count: number | null;
  max_guests: number | null;
  description_en: string | null;
  photos: { alt_en: string | null; credit: string | null }[];
  operator: { status: string } | null;
  /** Filled from Batch 4c onwards. */
  cabin_types?: number;
  bookable_departures?: number;
};

export type ReadinessItem = { key: string; label: string; done: boolean; later?: string };

const filled = (v: string | null | undefined) => !!v && v.trim().length > 0;

export function readiness(v: ReadinessInput): { items: ReadinessItem[]; complete: boolean; missing: number } {
  const items: ReadinessItem[] = [
    { key: "name", label: "Name", done: filled(v.name) },
    { key: "type", label: "Vessel type", done: filled(v.type) },
    { key: "route", label: "Route", done: filled(v.route_text) },
    { key: "category", label: "Category", done: filled(v.category) },
    { key: "cabins_total", label: "Total cabin count", done: (v.cabin_count ?? 0) > 0 },
    { key: "guests", label: "Guest capacity", done: (v.max_guests ?? 0) > 0 },
    { key: "description", label: "Description in English", done: filled(v.description_en) },
    {
      key: "photos",
      label: "At least one photo with a description and credit",
      done: v.photos.some((p) => filled(p.alt_en) && filled(p.credit)),
    },
    { key: "operator", label: "An approved operator", done: v.operator?.status === "approved" },
    { key: "cabin_types", label: "Cabin types and decks", done: (v.cabin_types ?? 0) > 0, later: "4c" },
    { key: "rates", label: "Departures with rates and availability", done: (v.bookable_departures ?? 0) > 0, later: "4c" },
  ];
  const missing = items.filter((i) => !i.done).length;
  return { items, complete: missing === 0, missing };
}
