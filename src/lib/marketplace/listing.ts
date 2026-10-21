/**
 * The public marketplace (Batch 5-1): facet pages, search filtering and structured data, kept free of I/O so it is
 * unit-tested. Copy is English for now; Batch 10 translates it (ADR-093).
 */
import type { CruiseCardProps } from "@/components/ds/CruiseCard/CruiseCard";
import { formatMoney } from "@/components/ds/lib/format";
import type { Money, VesselType } from "@/components/ds/lib/types";

export type Itinerary = {
  origin: string;
  destination: string;
  nights: number;
  /** Future scheduled departure dates, yyyy-mm-dd, ascending. */
  departures: string[];
};

export type ListingVessel = {
  id: string;
  slug: string;
  name: string;
  type: VesselType;
  category: string | null;
  maxGuests: number | null;
  cabinCount: number | null;
  deckCount: number | null;
  sample: boolean;
  /** Showcase vessels are listed although incomplete (DASH-PUB-010). */
  showcase: boolean;
  summary: string | null;
  image?: { src: string; alt: string; width: number; height: number };
  /** Published Nilecruz evaluation, 0–100 (ADR-009). */
  evaluation?: number;
  itineraries: Itinerary[];
  /** The one public price (ADR-025, ADR-093); absent when nothing is bookable or no rate fits. */
  from?: Money;
  /** False: information only. No price, availability or reserve button (DASH-PUB-010). */
  bookable: boolean;
  /**
   * ADR-102: the "from" price with sightseeing: the vessel's own (approved vessels), or the cruise plus Nilecruz's
   * programme for two (`sightseeingBy` says which).
   */
  fromWithSightseeing?: Money;
  sightseeingBy?: "vessel" | "nilecruz";
};

// ── Facets (SEO-016): only these filtered listings exist and are indexable ──────────────────────────────────
export type Facet = {
  slug: string;
  /** The silo row's H1. */
  h1: string;
  title: string;
  description: string;
  intro: string;
  match: (v: ListingVessel) => boolean;
};

const sails = (v: ListingVessel, origin: string, destination: string) =>
  v.itineraries.some((i) => same(i.origin, origin) && same(i.destination, destination));
const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export const FACETS: Facet[] = [
  {
    slug: "dahabiyas",
    h1: "Dahabiya cruises",
    title: "Dahabiya cruises on the Nile",
    description: "Sailing dahabiyas on the Nile: small boats, few guests, with Nilecruz evaluations and honest starting prices.",
    intro: "Dahabiyas are sailing boats with a handful of cabins. They moor at quiet riverbanks rather than town quays.",
    match: (v) => v.type === "sail",
  },
  {
    slug: "motor-ships",
    h1: "Nile cruise ships",
    title: "Nile cruise ships: compare motor ships",
    description: "Motor cruise ships on the Nile, compared by size, route, Nilecruz evaluation and starting price.",
    intro: "Motor ships carry more guests and usually more facilities, such as a pool deck, and keep to set schedules.",
    match: (v) => v.type === "motor",
  },
  {
    slug: "luxury",
    h1: "Luxury Nile cruises",
    title: "Luxury Nile cruises compared",
    description: "Vessels Nilecruz classes as luxury, with their evaluations, routes and starting prices.",
    intro: "Vessels we class as luxury, from our own checks. The evaluation shows how each one scored.",
    match: (v) => v.category === "luxury",
  },
  {
    slug: "luxor-to-aswan",
    h1: "Luxor to Aswan cruises",
    title: "Luxor to Aswan Nile cruises",
    description: "Nile cruises sailing from Luxor to Aswan: vessels, nights, evaluations and starting prices.",
    intro: "Cruises that start in Luxor and end in Aswan, sailing upstream.",
    match: (v) => sails(v, "Luxor", "Aswan"),
  },
  {
    slug: "aswan-to-luxor",
    h1: "Aswan to Luxor cruises",
    title: "Aswan to Luxor Nile cruises",
    description: "Nile cruises sailing from Aswan to Luxor: vessels, nights, evaluations and starting prices.",
    intro: "Cruises that start in Aswan and end in Luxor, sailing downstream with the current.",
    match: (v) => sails(v, "Aswan", "Luxor"),
  },
];

export const facetBySlug = (slug: string) => FACETS.find((f) => f.slug === slug);

/** Bookable vessels first (by price), then information-only ones, each group by name. */
export function sortListing(list: ListingVessel[]): ListingVessel[] {
  return [...list].sort((a, b) => {
    if (a.bookable !== b.bookable) return a.bookable ? -1 : 1;
    if (a.from && b.from && a.from.currency === b.from.currency && a.from.amount !== b.from.amount)
      return a.from.amount - b.from.amount;
    if (!!a.from !== !!b.from) return a.from ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

/** The card's route and nights: the vessel's shortest itinerary, so the headline matches what's on sale soonest. */
export function headlineItinerary(v: ListingVessel): Itinerary | undefined {
  return [...v.itineraries].sort((a, b) => a.nights - b.nights || a.origin.localeCompare(b.origin))[0];
}

/** A listing card's props (BRAND-026, 028, ADR-025): guests always, the score when published, no stars, one price. */
export type GridCard = Omit<CruiseCardProps, "onCompare" | "onSave" | "compared" | "saved"> & { slug: string };

export function toCard(v: ListingVessel): GridCard {
  const it = headlineItinerary(v);
  const badges: GridCard["badges"] = [];
  if (!v.bookable) badges.push({ label: "Information only", tone: "media" });
  if (v.sample) badges.push({ label: "Sample data", tone: "accent", icon: "info" });
  return {
    slug: v.slug,
    name: v.name,
    href: `/cruises/${v.slug}/`,
    vessel: v.type,
    route: it ? [it.origin, it.destination] : undefined,
    nights: it?.nights,
    guests: v.maxGuests ?? undefined,
    evaluation: v.evaluation,
    // ADR-025: the one public price, only for a vessel that can be booked; information-only listings show none.
    price: v.bookable ? v.from : undefined,
    image: v.image,
    badges:
      v.bookable && v.fromWithSightseeing
        ? [...badges, { label: `With sightseeing from ${formatMoney(v.fromWithSightseeing, "en")}`, tone: "success" as const }]
        : badges,
  };
}

// ── Search (DATA-012): routes, dates and match counts from real schedules and departures ────────────────────
export const routeId = (origin: string, destination: string) =>
  `${origin}-to-${destination}`
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export type SearchRouteOption = { id: string; label: string; sub?: string; dates: string[] };

/** Every route with future departures, its dates merged across vessels. "Any route" first. */
export function searchRoutes(list: ListingVessel[]): SearchRouteOption[] {
  const byRoute = new Map<string, { label: string; nights: Set<number>; dates: Set<string> }>();
  for (const v of list)
    for (const i of v.itineraries) {
      if (!i.departures.length) continue;
      const id = routeId(i.origin, i.destination);
      const r = byRoute.get(id) ?? { label: `${i.origin} → ${i.destination}`, nights: new Set(), dates: new Set() };
      if (i.nights) r.nights.add(i.nights);
      i.departures.forEach((d) => r.dates.add(d));
      byRoute.set(id, r);
    }
  const routes = [...byRoute.entries()]
    .map(([id, r]) => ({
      id,
      label: r.label,
      sub: nightsRange([...r.nights]),
      dates: [...r.dates].sort(),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
  const all = [...new Set(routes.flatMap((r) => r.dates))].sort();
  return [{ id: "any", label: "Any route", sub: "Every sailing", dates: all }, ...routes];
}

function nightsRange(n: number[]): string | undefined {
  if (!n.length) return undefined;
  const lo = Math.min(...n);
  const hi = Math.max(...n);
  return lo === hi ? `${lo} nights` : `${lo}–${hi} nights`;
}

export const VESSEL_OPTIONS: { id: string; label: string; type?: VesselType }[] = [
  { id: "any", label: "Any vessel" },
  { id: "sail", label: "Dahabiya", type: "sail" },
  { id: "motor", label: "Motor ship", type: "motor" },
  { id: "steam", label: "Paddle steamer", type: "steam" },
];

export type SearchQuery = {
  route?: string;
  vessel?: string;
  date?: string;
  guests?: number;
  q?: string;
  /** ADR-102: only vessels with a "with sightseeing" price (their own or Nilecruz's programme). */
  sightseeing?: boolean;
};

/** Reads the CruiseSearch GET form (route, vessel, date, adults, ages); anything unknown is ignored. */
export function parseSearch(sp: Record<string, string | string[] | undefined>): SearchQuery {
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const route = one("route");
  const vessel = one("vessel");
  const date = one("date");
  const adults = Number(one("adults"));
  const ages = (one("ages") ?? "").split(",").filter((a) => /^\d{1,2}$/.test(a));
  const guests = (Number.isInteger(adults) && adults > 0 ? Math.min(adults, 30) : 0) + ages.length;
  // SEO-028: the site search (WebSite SearchAction) looks up vessels by name.
  const q = one("q")?.trim().slice(0, 80);
  return {
    q: q || undefined,
    route: route && route !== "any" && /^[a-z0-9-]{1,120}$/.test(route) ? route : undefined,
    vessel: VESSEL_OPTIONS.some((o) => o.id === vessel && o.type) ? vessel : undefined,
    date: date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined,
    guests: guests || undefined,
    sightseeing: one("sightseeing") === "1" || undefined,
  };
}

export const isSearching = (q: SearchQuery) => !!(q.route || q.vessel || q.date || q.guests || q.q || q.sightseeing);

/** The vessels that fit, and how many departures fit (never invented, ADR-007). */
export function applySearch(list: ListingVessel[], q: SearchQuery): { vessels: ListingVessel[]; departures: number } {
  let departures = 0;
  const words = (q.q ?? "").toLowerCase().split(/\s+/).filter(Boolean);
  const vessels = list.filter((v) => {
    if (words.length && !words.every((w) => v.name.toLowerCase().includes(w))) return false;
    if (q.vessel && v.type !== q.vessel) return false;
    if (q.sightseeing && !(v.bookable && v.fromWithSightseeing)) return false;
    if (q.guests && v.maxGuests && q.guests > v.maxGuests) return false;
    const its = v.itineraries.filter((i) => !q.route || routeId(i.origin, i.destination) === q.route);
    if (q.route && !its.length) return false;
    const deps = its.flatMap((i) => i.departures).filter((d) => !q.date || d === q.date);
    if (q.date && !deps.length) return false;
    departures += deps.length;
    return true;
  });
  return { vessels, departures };
}

// ── Structured data (SEO-004, 026, DATA-034) ─────────────────────────────────────────────────────────────────
export type Crumb = { name: string; url: string };

export function breadcrumbJsonLd(crumbs: Crumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: c.url })),
  };
}

/** A listing: CollectionPage with an ItemList of vessel pages. No ratings or prices here (SEO-026). */
export function collectionJsonLd(
  page: { name: string; description: string; url: string },
  items: { name: string; url: string }[],
) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: page.name,
    description: page.description,
    url: page.url,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: items.length,
      itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, url: it.url })),
    },
  };
}

/** Safe inside <script type="application/ld+json">: no "</script>" break-out. */
export const jsonLdScript = (data: unknown) => JSON.stringify(data).replace(/</g, "\\u003c");

// ── Comparison (DASH-PUB-004) ─────────────────────────────────────────────────────────────────────────────────
export const COMPARE_MAX = 3;

/** `?v=slug,slug,slug`: known slugs only, in the order given, at most three, no repeats. */
export function compareSlugs(v: string | string[] | undefined, known: Set<string>): string[] {
  const raw = typeof v === "string" ? v.split(",") : [];
  return [...new Set(raw.map((s) => s.trim()).filter((s) => known.has(s)))].slice(0, COMPARE_MAX);
}
