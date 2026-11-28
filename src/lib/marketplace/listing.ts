/**
 * The public marketplace (Batch 5-1): facet pages, search filtering and structured data, kept free of I/O so it is
 * unit-tested. Shown words are English or Japanese (Spanish shows English until Batch 10, ADR-093); ids, slugs and
 * filter values are the same in every language.
 */
import { placeName } from "@/content/places";
import type { CruiseCardProps } from "@/components/ds/CruiseCard/CruiseCard";
import { PROPULSIONS, type Money, type Propulsion, type VesselType } from "@/components/ds/lib/types";
import {
  hasFigure,
  sellsThroughUs,
  sortAmount,
  type BookingAvailability,
  type PublicPrice,
  type RateDisplay,
} from "./public-price";

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
  /** The heading when it differs from the name ("Dendera, by Nour El Nil"). */
  displayName?: string | null;
  type: VesselType;
  /** What drives it; null until confirmed in its data. */
  propulsion: Propulsion | null;
  category: string | null;
  maxGuests: number | null;
  cabinCount: number | null;
  deckCount: number | null;
  /** Length and beam in metres, when both are confirmed. */
  lengthM?: number | null;
  beamM?: number | null;
  sample: boolean;
  /** Showcase vessels are listed although incomplete (DASH-PUB-010). */
  showcase: boolean;
  summary: string | null;
  image?: { src: string; alt: string; width: number; height: number };
  /** Published Nilecruz evaluation, 0–100 (ADR-009): only one that may be published (evaluationPublishable). */
  evaluation?: number;
  /** ADR-109: the one public starting price (euros, operator-approved), or "Price on request". */
  price: PublicPrice;
  rateDisplay?: RateDisplay;
  /** Who can book it; "not_available_through_nilecruz" shows no price and no Nilecruz booking action (6 Nov 2026). */
  booking?: BookingAvailability;
  itineraries: Itinerary[];
  /** The lowest bookable rate (any currency). Never shown publicly: ADR-109 shows `price` instead. */
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
  ja: FacetText;
  match: (v: ListingVessel) => boolean;
};

export type FacetText = { h1: string; title: string; description: string; intro: string };

/** A facet's words in the page's language. */
export const facetText = (f: Facet, locale: string = "en"): FacetText => (locale === "ja" ? f.ja : f);

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
    ja: {
      h1: "ダハビヤ・クルーズ",
      title: "ナイル川のダハビヤ・クルーズ",
      description: "ナイル川の帆走ダハビヤ。小さな船と少ない乗客、Nilecruzの評価と正直な開始料金を掲載しています。",
      intro: "ダハビヤは客室の少ない帆船です。町の船着き場ではなく、静かな川岸に停泊します。",
    },
    match: (v) => v.type === "sail",
  },
  {
    slug: "motor-ships",
    h1: "Nile cruise ships",
    title: "Nile cruise ships: compare motor ships",
    description: "Motor cruise ships on the Nile, compared by size, route, Nilecruz evaluation and starting price.",
    intro: "Motor ships carry more guests and usually more facilities, such as a pool deck, and keep to set schedules.",
    ja: {
      h1: "ナイル川クルーズ船",
      title: "ナイル川クルーズ船：モーターシップを比較",
      description: "ナイル川のモータークルーズ船を、大きさ、航路、Nilecruzの評価、開始料金で比較します。",
      intro: "モーターシップは乗客が多く、たいていはプールデッキなどの設備も充実していて、決まった日程で運航します。",
    },
    match: (v) => v.type === "motor",
  },
  {
    slug: "luxury",
    h1: "Luxury Nile cruises",
    title: "Luxury Nile cruises compared",
    description: "Vessels Nilecruz classes as luxury, with their evaluations, routes and starting prices.",
    intro: "Vessels we class as luxury, from our own checks. The evaluation shows how each one scored.",
    ja: {
      h1: "ラグジュアリー・ナイル川クルーズ",
      title: "ラグジュアリー・ナイル川クルーズを比較",
      description: "Nilecruzがラグジュアリーに分類する船を、評価、航路、開始料金とともに紹介します。",
      intro: "当社の確認に基づいてラグジュアリーに分類した船です。各船の点数は評価でご確認いただけます。",
    },
    match: (v) => v.category === "luxury",
  },
  {
    slug: "luxor-to-aswan",
    h1: "Luxor to Aswan cruises",
    title: "Luxor to Aswan Nile cruises",
    description: "Nile cruises sailing from Luxor to Aswan: vessels, nights, evaluations and starting prices.",
    intro: "Cruises that start in Luxor and end in Aswan, sailing upstream.",
    ja: {
      h1: "ルクソール発アスワン行きクルーズ",
      title: "ルクソール発アスワン行きのナイル川クルーズ",
      description: "ルクソールからアスワンへ向かうナイル川クルーズ。船、泊数、評価、開始料金を掲載しています。",
      intro: "ルクソールを出発し、アスワンに到着する上りのクルーズです。",
    },
    match: (v) => sails(v, "Luxor", "Aswan"),
  },
  {
    slug: "aswan-to-luxor",
    h1: "Aswan to Luxor cruises",
    title: "Aswan to Luxor Nile cruises",
    description: "Nile cruises sailing from Aswan to Luxor: vessels, nights, evaluations and starting prices.",
    intro: "Cruises that start in Aswan and end in Luxor, sailing downstream with the current.",
    ja: {
      h1: "アスワン発ルクソール行きクルーズ",
      title: "アスワン発ルクソール行きのナイル川クルーズ",
      description: "アスワンからルクソールへ向かうナイル川クルーズ。船、泊数、評価、開始料金を掲載しています。",
      intro: "アスワンを出発し、流れに乗ってルクソールに到着する下りのクルーズです。",
    },
    match: (v) => sails(v, "Aswan", "Luxor"),
  },
];

export const facetBySlug = (slug: string) => FACETS.find((f) => f.slug === slug);

/**
 * ADR-109: by starting price, lowest first; vessels with "Price on request" have no price to sort by, so they follow,
 * by name (the listing says so). Bookable vessels come first among equals.
 */
export function sortListing(list: ListingVessel[]): ListingVessel[] {
  return [...list].sort((a, b) => {
    const x = sortAmount(a.price);
    const y = sortAmount(b.price);
    if ((x === null) !== (y === null)) return x === null ? 1 : -1;
    if (x !== null && y !== null && x !== y) return x - y;
    if (a.bookable !== b.bookable) return a.bookable ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

/** How many vessels have a public figure; the rest are "Price on request" and sit outside a price sort. */
export const pricedCount = (list: ListingVessel[]) => list.filter((v) => hasFigure(v.price)).length;

/** The card's route and nights: the vessel's shortest itinerary, so the headline matches what's on sale soonest. */
export function headlineItinerary(v: ListingVessel): Itinerary | undefined {
  return [...v.itineraries].sort((a, b) => a.nights - b.nights || a.origin.localeCompare(b.origin))[0];
}

/** A listing card's props (BRAND-026, 028, ADR-025): guests always, the score when published, no stars, one price. */
export type GridCard = Omit<CruiseCardProps, "onCompare" | "onSave" | "compared" | "saved"> & { slug: string };

/** "Cruises you can book" only when every cruise in the row can be booked through Nilecruz (Islam, 6 Nov 2026). */
export const closingHeading = (shown: ListingVessel[], locale: string = "en") =>
  shown.length && shown.every((v) => v.bookable) ? WORDS[wordsOf(locale)].canBook : WORDS[wordsOf(locale)].explore;

export function toCard(v: ListingVessel, locale: string = "en"): GridCard {
  const words = WORDS[wordsOf(locale)];
  const it = headlineItinerary(v);
  const badges: GridCard["badges"] = [];
  // Islam, 25 Nov 2026: no "Information only" tag. A boat with no public price that isn't booked online is tagged as
  // sold on request; one we can't sell at all says so in its price line instead.
  if (!v.bookable && !hasFigure(v.price) && sellsThroughUs(v.booking)) badges.push({ label: words.requestBased, tone: "media" });
  if (v.sample) badges.push({ label: words.sample, tone: "accent", icon: "info" });
  return {
    slug: v.slug,
    name: v.displayName ?? v.name,
    href: `/cruises/${v.slug}/`,
    vessel: v.type,
    propulsion: v.propulsion ?? undefined,
    route: it ? [placeName(it.origin, locale), placeName(it.destination, locale)] : undefined,
    nights: it?.nights,
    guests: v.maxGuests ?? undefined,
    evaluation: v.evaluation,
    // ADR-109: the approved starting price in euros, or "Price on request"; never a rate computed from cabins.
    price:
      v.price.mode === "from_price"
        ? { from: v.price.from, margin: v.price.margin }
        : v.price.mode === "price_band"
          ? { min: v.price.min, max: v.price.max, margin: v.price.margin }
          : undefined,
    // A vessel Nilecruz can't sell says so instead of a price (Steam Ship Sudan, 6 Nov 2026).
    unavailable: !sellsThroughUs(v.booking),
    image: v.image,
    badges,
  };
}

// ── Words the listing code shows ────────────────────────────────────────────────────────────────────────────
const WORDS = {
  en: {
    canBook: "Cruises you can book",
    explore: "Cruises to explore",
    requestBased: "Request based",
    sample: "Sample data",
    anyRoute: "Any route",
    everySailing: "Every sailing",
    nights: (n: string) => `${n} nights`,
    vessels: { any: "Any vessel", sail: "Dahabiya", motor: "Motor ship", steam: "Steamer" },
  },
  ja: {
    canBook: "予約できるクルーズ",
    explore: "注目のクルーズ",
    requestBased: "リクエスト受付",
    sample: "サンプルデータ",
    anyRoute: "ルート指定なし",
    everySailing: "すべての出航",
    nights: (n: string) => `${n}泊`,
    vessels: { any: "船の指定なし", sail: "ダハビヤ", motor: "モータークルーズ船", steam: "蒸気船" },
  },
};
const wordsOf = (locale: string) => (locale === "ja" ? "ja" : "en");

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
export function searchRoutes(list: ListingVessel[], locale: string = "en"): SearchRouteOption[] {
  const words = WORDS[wordsOf(locale)];
  const byRoute = new Map<string, { label: string; shown: string; nights: Set<number>; dates: Set<string> }>();
  for (const v of list)
    for (const i of v.itineraries) {
      if (!i.departures.length) continue;
      const id = routeId(i.origin, i.destination);
      const r = byRoute.get(id) ?? {
        label: `${i.origin} → ${i.destination}`,
        shown: `${placeName(i.origin, locale)} → ${placeName(i.destination, locale)}`,
        nights: new Set(),
        dates: new Set(),
      };
      if (i.nights) r.nights.add(i.nights);
      i.departures.forEach((d) => r.dates.add(d));
      byRoute.set(id, r);
    }
  const routes = [...byRoute.entries()]
    .map(([id, r]) => ({
      id,
      label: r.label,
      shown: r.shown,
      sub: nightsRange([...r.nights], words.nights),
      dates: [...r.dates].sort(),
    }))
    // Ordered by the English names, so every language lists the routes alike.
    .sort((a, b) => a.label.localeCompare(b.label))
    .map(({ shown, ...r }) => ({ ...r, label: shown }));
  const all = [...new Set(routes.flatMap((r) => r.dates))].sort();
  return [{ id: "any", label: words.anyRoute, sub: words.everySailing, dates: all }, ...routes];
}

function nightsRange(n: number[], nights: (n: string) => string): string | undefined {
  if (!n.length) return undefined;
  const lo = Math.min(...n);
  const hi = Math.max(...n);
  return nights(lo === hi ? `${lo}` : `${lo}–${hi}`);
}

export const VESSEL_OPTIONS: { id: string; label: string; type?: VesselType }[] = [
  { id: "any", label: WORDS.en.vessels.any },
  { id: "sail", label: WORDS.en.vessels.sail, type: "sail" },
  { id: "motor", label: WORDS.en.vessels.motor, type: "motor" },
  { id: "steam", label: WORDS.en.vessels.steam, type: "steam" },
];

/** The same options as the search shows them in the page's language. */
export const vesselOptions = (locale: string = "en") =>
  VESSEL_OPTIONS.map((o) => ({ ...o, label: WORDS[wordsOf(locale)].vessels[o.type ?? "any"] }));

export type SearchQuery = {
  route?: string;
  vessel?: string;
  date?: string;
  guests?: number;
  q?: string;
  /** ADR-102: only vessels with a "with sightseeing" price (their own or Nilecruz's programme). */
  sightseeing?: boolean;
  /** Only vessels driven this way (motor, wind or steam), from their own data. */
  propulsion?: Propulsion;
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
    propulsion: PROPULSIONS.find((p) => p === one("propulsion")),
  };
}

export const isSearching = (q: SearchQuery) =>
  !!(q.route || q.vessel || q.date || q.guests || q.q || q.sightseeing || q.propulsion);

/** The vessels that fit, and how many departures fit (never invented, ADR-007). */
export function applySearch(list: ListingVessel[], q: SearchQuery): { vessels: ListingVessel[]; departures: number } {
  let departures = 0;
  const words = (q.q ?? "").toLowerCase().split(/\s+/).filter(Boolean);
  const vessels = list.filter((v) => {
    if (words.length && !words.every((w) => v.name.toLowerCase().includes(w))) return false;
    if (q.vessel && v.type !== q.vessel) return false;
    if (q.propulsion && v.propulsion !== q.propulsion) return false;
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
