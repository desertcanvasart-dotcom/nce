import type { Mooring } from "@/lib/catalogue/mooring";
/**
 * The vessel page (PAGE-072, Batch 5-2), kept free of I/O so it is unit-tested. English copy until Batch 10 (ADR-093).
 */
import type { Money, VesselType } from "@/components/ds/lib/types";
import type { SailingPeriod } from "@/lib/product/sailing-time";

export type VesselCabin = {
  id: string;
  name: string;
  deck: string;
  sizeM2: number | null;
  bed: string | null;
  maxOccupancy: number;
  view: string | null;
  balcony: boolean;
  amenities: string[];
};

export type VesselItinerary = {
  id: string;
  code: string;
  origin: string;
  destination: string;
  nights: number;
  sailingPeriod: SailingPeriod | null;
  sailsAt: string | null;
  days: { day: number; title: string; body: string }[];
  /** Future scheduled departure dates, ascending. */
  departures: string[];
  /** ADR-102: what the vessel's own sightseeing includes on this itinerary (approved vessels only). */
  sightseeing?: Sightseeing;
  /** ADR-102: Nilecruz's sightseeing programme for this itinerary (every other vessel), its price per person for two. */
  programme?: { name: string; slug: string; ppForTwoMinor: number };
};

export type Sightseeing = { guide: boolean; ticketsIncluded: boolean; sites: string[]; note: string | null };

/** "An Egyptologist guide, entrance fees included: Karnak, Edfu …" */
export function sightseeingText(s: Sightseeing): string {
  const parts = [
    s.guide ? "an Egyptologist guide" : null,
    s.ticketsIncluded ? "entrance fees included" : "entrance fees not included",
  ];
  return `${parts.filter(Boolean).join(", ")}; visiting ${s.sites.join(", ")}.`.replace(/^./, (c) => c.toUpperCase());
}

export type VesselPage = {
  id: string;
  slug: string;
  name: string;
  type: VesselType;
  category: string | null;
  maxGuests: number | null;
  cabinCount: number | null;
  deckCount: number | null;
  /** EXP-005, EXP-002: how it moors, and the spaces all its guests share. */
  mooring: Mooring | null;
  sharedSpaces: string[];
  yearBuilt: number | null;
  sample: boolean;
  showcase: boolean;
  summary: string | null;
  description: string | null;
  gratuityUsdMinor: number | null;
  photos: { src: string; alt: string; width: number; height: number }[];
  cabins: VesselCabin[];
  itineraries: VesselItinerary[];
  evaluation?: {
    score: number;
    verdict: "recommended" | "recommended_with_reservations" | "not_recommended";
    assessedOn: string;
    evaluator: string;
    /** Points per dimension, out of its weight. */
    dimensions: Record<string, number>;
  };
  externalRatings: {
    source: string;
    rating: number;
    scale: number;
    count: number | null;
    url: string | null;
    retrievedOn: string;
  }[];
  from?: Money;
  bookable: boolean;
  /** ADR-102: the "from" price with sightseeing, by the vessel or with Nilecruz's programme (`sightseeingBy`). */
  fromWithSightseeing?: Money;
  sightseeingBy?: "vessel" | "nilecruz";
};

/** The itinerary in the URL (`?itinerary=CODE`, canonical to the vessel URL, DATA-031), else the shortest. */
export function pickItinerary(its: VesselItinerary[], code: string | undefined): VesselItinerary | undefined {
  const sorted = [...its].sort((a, b) => a.nights - b.nights || a.code.localeCompare(b.code));
  return (code && sorted.find((i) => i.code.toLowerCase() === code.toLowerCase())) || sorted[0];
}

/** The silo row's H1: "{Vessel name} — {route}, {nights} nights". */
export function vesselH1(name: string, it: VesselItinerary | undefined): string {
  if (!it) return name;
  return `${name} — ${it.origin} to ${it.destination}, ${it.nights} night${it.nights === 1 ? "" : "s"}`;
}

/** Cabin types by deck, in the vessel's deck order (upper decks first when the names say so), each deck's cabins by size. */
export function deckGroups(cabins: VesselCabin[]): { deck: string; cabins: VesselCabin[] }[] {
  const rank = (d: string) => {
    const l = d.toLowerCase();
    if (/sun|upper|top|bridge/.test(l)) return 0;
    if (/middle|main/.test(l)) return 1;
    if (/lower/.test(l)) return 2;
    return 1;
  };
  const by = new Map<string, VesselCabin[]>();
  for (const c of cabins) by.set(c.deck, [...(by.get(c.deck) ?? []), c]);
  return [...by.entries()]
    .sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b))
    .map(([deck, list]) => ({
      deck,
      cabins: list.sort((x, y) => (y.sizeM2 ?? 0) - (x.sizeM2 ?? 0) || x.name.localeCompare(y.name)),
    }));
}

/** DATA-004: a date in the visitor's language, read as a calendar date (no time-zone shift). */
export function formatDay(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));
}

export const VERDICT_TEXT = {
  recommended: "Recommended",
  recommended_with_reservations: "Recommended, with reservations",
  not_recommended: "Not recommended",
} as const;

/**
 * Structured data for the vessel page (PAGE-072, DATA-034, SEO-026): a TouristTrip with the itinerary's stops, and an
 * AggregateOffer from the public "from" price only. Never AggregateRating (no verified reviews yet).
 */
export function touristTripJsonLd(v: VesselPage, it: VesselItinerary | undefined, url: string) {
  return {
    "@context": "https://schema.org",
    "@type": "TouristTrip",
    name: vesselH1(v.name, it),
    description: v.summary ?? undefined,
    url,
    touristType: "Nile cruise",
    itinerary: it
      ? {
          "@type": "ItemList",
          itemListElement: [it.origin, it.destination].map((place, i) => ({
            "@type": "ListItem",
            position: i + 1,
            item: { "@type": "Place", name: place },
          })),
        }
      : undefined,
    offers:
      v.bookable && v.from
        ? {
            "@type": "AggregateOffer",
            lowPrice: (v.from.amount / 100).toFixed(2),
            priceCurrency: v.from.currency,
            availability: "https://schema.org/InStock",
            url,
          }
        : undefined,
  };
}

// ── Reserving (DASH-PUB-009) ───────────────────────────────────────────────────────────────────────────────
export type DeparturePrice = {
  departureId: string;
  scheduleId: string;
  departsOn: string;
  returnsOn: string;
  cabinTypeId: string;
  currency: string;
  single: number | null;
  double: number | null;
  triple: number | null;
  placesLeft: number | null;
  bookable: boolean;
  /** ADR-099: instant (feed, API or the operator's answer, ≤ 2 h), request (manual or sheet, ≤ 7 days), or neither. */
  mode: BookingMode;
};
export type BookingMode = "instant" | "request" | "unconfirmed" | "sold_out";
export const canBook = (r: Pick<DeparturePrice, "bookable" | "mode">) =>
  r.bookable && (r.mode === "instant" || r.mode === "request");

/** One currency per departure and cabin: US$ when there is one, else € (ADR-093). */
export function preferredPrices(rows: DeparturePrice[]): DeparturePrice[] {
  const best = new Map<string, DeparturePrice>();
  const rank = (c: string) => (c === "USD" ? 0 : c === "EUR" ? 1 : 2);
  for (const r of rows) {
    const key = `${r.departureId}:${r.cabinTypeId}`;
    const cur = best.get(key);
    if (!cur || rank(r.currency) < rank(cur.currency)) best.set(key, r);
  }
  return [...best.values()];
}

/** The per-person price for a party in one cabin, by guests taking a bed (infants under 3 don't, ADR-012). */
export function perPersonFor(p: DeparturePrice, ages: number[]): number | null {
  const beds = ages.filter((a) => a >= 3).length;
  return beds === 1 ? p.single : beds === 2 ? p.double : beds === 3 ? p.triple : null;
}

/**
 * BRAND-003, ADR-099: what a cabin says about its availability. Exact numbers never come from manual or sheet data;
 * "Last few cabins" only from instant data with 2 or fewer free.
 */
export function availabilityLabel(r: Pick<DeparturePrice, "placesLeft" | "mode">, confirmHours: number): string {
  switch (r.mode) {
    case "sold_out":
      return "Sold out";
    case "unconfirmed":
      return "To be confirmed";
    case "request":
      return `Available · confirmed within ${confirmHours} h`;
    default:
      return r.placesLeft !== null && r.placesLeft <= 2 ? "Last few cabins" : "Instant confirmation";
  }
}

/**
 * "Ask for an offer" from a vessel page (DASH-PUB-010, ADR-093): the request form prefilled with the route (only one
 * that exists), a two-week window from the first departure and the itinerary's nights. Anything else is ignored.
 */
export function requestDefaults(
  sp: Record<string, string | undefined>,
  routes: { origin: string; destination: string }[],
): {
  route?: string;
  earliest?: string;
  latest?: string;
  nights?: number;
  nightsMin?: number;
  nightsMax?: number;
  adults?: number;
  childAges?: string;
  cabins?: number;
  budget?: string;
  currency?: string;
  notes?: string;
} {
  const day = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);
  const int = (v: string | undefined, lo: number, hi: number) => {
    const n = Number(v);
    return Number.isInteger(n) && n >= lo && n <= hi ? n : undefined;
  };
  const route = routes.some((r) => `${r.origin}→${r.destination}` === sp.route) ? sp.route : undefined;
  const from = day(sp.from);
  let latest = day(sp.to);
  if (from && !latest) {
    const d = new Date(`${from}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 14);
    latest = d.toISOString().slice(0, 10);
  }
  const nights = int(sp.nights, 1, 21);
  // From Plan my cruise (PAGE-105): every field of the plan, checked again by the form when it's sent.
  return {
    route,
    earliest: from,
    latest,
    nights,
    nightsMin: int(sp.nmin, 1, 21) ?? nights,
    nightsMax: int(sp.nmax, 1, 21) ?? nights,
    adults: int(sp.adults, 1, 30),
    childAges: sp.children && /^\d{1,2}(,\d{1,2})*$/.test(sp.children) ? sp.children.split(",").join(", ") : undefined,
    cabins: int(sp.cabins, 1, 30),
    budget: sp.budget && /^\d+([.,]\d{1,2})?$/.test(sp.budget) ? sp.budget : undefined,
    currency: sp.cur && ["USD", "EUR", "EGP"].includes(sp.cur) ? sp.cur : undefined,
    notes: sp.notes ? sp.notes.slice(0, 1000) : undefined,
  };
}

/**
 * SEO-013: the places an itinerary stops at, in sailing order, by their destination pages. The classic stretch between
 * Luxor (or Esna) and Aswan passes Edfu and Kom Ombo in either direction. Only stops with a page are linked.
 */
const STOP_SLUGS: Record<string, string> = {
  luxor: "/destinations/luxor/",
  esna: "/destinations/esna/",
  edfu: "/destinations/edfu/",
  "kom ombo": "/destinations/kom-ombo/",
  aswan: "/destinations/aswan/",
};

export function stopsFor(origin: string, destination: string): { name: string; href: string }[] {
  const o = origin.trim().toLowerCase();
  const d = destination.trim().toLowerCase();
  const south = ["luxor", "esna", "edfu", "kom ombo", "aswan"];
  const a = south.indexOf(o);
  const b = south.indexOf(d);
  const names =
    a >= 0 && b >= 0
      ? (a < b ? south.slice(a, b + 1) : south.slice(b, a + 1).reverse()).filter(
          (n, i, all) => n !== "esna" || i === 0 || i === all.length - 1,
        )
      : [o, d];
  return names
    .filter((n) => STOP_SLUGS[n])
    .map((n) => ({ name: n.replace(/\b\w/g, (c) => c.toUpperCase()), href: STOP_SLUGS[n]! }));
}
