/**
 * Tour pages (Batch 7-1, DASH-PUB-006, DASH-ADM-072, SEO-022). The workbook's Phase 1 tour rows have their own URLs;
 * the tours they cover (by tour slug) redirect there, so each tour has exactly one page. Every other published tour
 * lives at /tours-extras/{tour slug}/. Prices come with the calendar booking in 7-2 (ADR-097).
 */
export type PublicTour = {
  id: string;
  slug: string;
  name: string;
  kind: "museum_visit" | "excursion" | "evening_tour" | "transfer" | "other";
  location: string;
  durationMinutes: number;
  adultsOnly: boolean;
  sample: boolean;
  description: string | null;
  itinerary: string[];
  inclusions: string[];
  exclusions: string[];
  meetingPoint: string | null;
  cancellationTerms: string | null;
  /** ADR-097: bookable on the calendar (an office and rates); its price lines, and the lowest price in US cents. */
  bookable: boolean;
  prices: string[];
  fromMinor: number | null;
};

/** Workbook tour page → the tours it covers. */
export const WORKBOOK_TOURS: Record<string, string[]> = {
  "/tours-extras/abu-simbel-day-trip/": ["abu-simbel-day-trip-from-aswan-by-road"],
  "/tours-extras/transfers/": [
    "aswan-airport-private-transfer",
    "luxor-airport-private-transfer",
    "meet-and-assist-aswan-airport",
    "meet-and-assist-luxor-airport",
  ],
  "/tours-extras/luxor-hot-air-balloon/": [],
};

/** The one page for a tour: its workbook page, or /tours-extras/{slug}/. */
export function tourUrl(slug: string): string {
  const row = Object.entries(WORKBOOK_TOURS).find(([, slugs]) => slugs.includes(slug));
  return row ? row[0] : `/tours-extras/${slug}/`;
}

/** SEO-022: the live nilecruz.com tour addresses (/tours/{id}) and where they now live. From docs/imports/nilecruz-tours.json. */
export const LIVE_TOUR_REDIRECTS: { source: string; slug: string }[] = [
  { source: "/tours/17100001-0000-4000-8000-000000000002", slug: "3-night-sightseeing-aswan-to-luxor" },
  { source: "/tours/17100001-0000-4000-8000-000000000001", slug: "4-night-sightseeing-luxor-to-aswan" },
  { source: "/tours/17100001-0000-4000-8000-000000000007", slug: "abu-simbel-day-trip-from-aswan-by-road" },
  { source: "/tours/17100001-0000-4000-8000-000000000006", slug: "abydos-and-dendera-full-day-trip-from-luxor" },
  { source: "/tours/17100001-0000-4000-8000-000000000005", slug: "dendera-temple-half-day-trip-from-luxor" },
  { source: "/tours/17100001-0000-4000-8000-000000000004", slug: "aswan-airport-private-transfer" },
  { source: "/tours/17100001-0000-4000-8000-000000000003", slug: "luxor-airport-private-transfer" },
];

/** "about 10 hours", "3 nights", "40 minutes". */
export function durationText(minutes: number): string {
  if (minutes >= 24 * 60) {
    const nights = Math.round(minutes / (24 * 60));
    return `${nights} ${nights === 1 ? "night" : "nights"}`;
  }
  if (minutes >= 90) return `about ${Math.round(minutes / 60)} hours`;
  if (minutes >= 60) return "about an hour";
  return `${minutes} minutes`;
}

export const KIND_TEXT: Record<PublicTour["kind"], string> = {
  museum_visit: "Museum visit",
  excursion: "Day trip",
  evening_tour: "Evening tour",
  transfer: "Private transfer",
  other: "Tour",
};
