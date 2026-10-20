/**
 * The linking engine (SEO-008–014, ADR-096): every internal link on an education page comes from the silo workbook
 * (src/lib/seo/link-map.json, made by scripts/link-map.py) and points only at a page that exists (ADR-093).
 * Anchors are the target's primary keyword (SEO-014). The CI link check (tests/e2e/silo-links.spec.ts) reads the same.
 */
import map from "./link-map.json";

export type SiloPage = {
  id: string;
  silo: string;
  level: number;
  parent: string | null;
  h1: string;
  type: string;
  keyword: string;
  phase: number;
  down: string[];
  across: string[];
  bridges: string[];
  schema: string[];
};

export const LINK_MAP = map as Record<string, SiloPage>;

/**
 * Pages that exist. A page joins when its batch ships; links to anything else are left out until then.
 * Vessel pages (/cruises/{slug}/) aren't in the workbook's link columns, so they aren't listed here.
 */
export const BUILT = new Set<string>([
  // Batch 5: the marketplace
  "/cruises/",
  "/cruises/dahabiyas/",
  "/cruises/motor-ships/",
  "/cruises/luxury/",
  "/cruises/luxor-to-aswan/",
  "/cruises/aswan-to-luxor/",
  "/cruises/compare/",
  // Batch 6-1: home and the Vessels silo
  "/",
  "/vessels/",
  "/vessels/dahabiya/",
  "/vessels/dahabiya/a-day-on-board/",
  "/vessels/motor-cruise-ships/",
  "/vessels/motor-cruise-ships/a-day-on-board/",
  "/vessels/paddle-steamers/",
  "/vessels/compare/",
  "/vessels/compare/dahabiya-vs-cruise-ship/",
  // Batch 6-2: Prices Explained and the Guide
  "/nile-cruise-prices/",
  "/nile-cruise-prices/star-ratings-explained/",
  "/nile-cruise-prices/whats-included/",
  "/nile-cruise-prices/budget-vs-luxury/",
  "/nile-cruise-prices/price-calculator/",
  "/nile-cruise-guide/",
  "/nile-cruise-guide/routes/",
  "/nile-cruise-guide/routes/luxor-to-aswan/",
  "/nile-cruise-guide/routes/aswan-to-luxor/",
  "/nile-cruise-guide/routes/esna-to-aswan/",
  "/nile-cruise-guide/when-to-go/",
  "/nile-cruise-guide/planning/",
  "/nile-cruise-guide/planning/how-many-nights/",
  "/nile-cruise-guide/planning/nile-cruise-vs-land-tour/",
  "/nile-cruise-guide/planning/tipping/",
  // Batch 7-1: destinations, tours and extras, trust and company
  "/destinations/",
  "/destinations/luxor/",
  "/destinations/edfu/",
  "/destinations/kom-ombo/",
  "/destinations/aswan/",
  "/destinations/abu-simbel/",
  "/tours-extras/",
  "/tours-extras/abu-simbel-day-trip/",
  "/tours-extras/luxor-hot-air-balloon/",
  "/tours-extras/transfers/",
  "/about/",
  "/how-we-choose-vessels/",
  "/contact/",
]);

export const isBuilt = (url: string) => BUILT.has(url);

/** Pages that don't end with the cruise row (SEO-012 is for informational pages): the Contact form. */
export const NO_CLOSING = new Set(["/contact/"]);

export type Link = { href: string; anchor: string };

/** Workbook keywords are lower case; names of places keep their capitals in anchors ("nile cruise ship" → "Nile cruise ship"). */
const PROPER = /\b(nilecruz|nile|egypt|luxor|aswan|esna|edfu|cairo|nasser|kom ombo|abu simbel|dendera|abydos)\b/gi;
export const keywordText = (s: string) => s.replace(PROPER, (w) => w.replace(/\b\w/g, (c) => c.toUpperCase()));

/** The keyword as a card title or breadcrumb label: "Nile cruise ship", "Dahabiya". */
export const sentence = (s: string) => {
  const t = keywordText(s);
  return t.charAt(0).toUpperCase() + t.slice(1);
};

const page = (url: string): SiloPage => {
  const p = LINK_MAP[url];
  if (!p) throw new Error(`${url} isn't in the silo workbook`);
  return p;
};

const link = (url: string): Link => ({ href: url, anchor: sentence(page(url).keyword) });
/** The same link for use inside a sentence: proper nouns capitalised, the rest as written. */
const inline = (url: string): Link => ({ href: url, anchor: keywordText(page(url).keyword) });

/** Breadcrumb names: the pillars by their navigation names, every other page by its keyword. */
const PILLAR_NAMES: Record<string, string> = {
  "/": "Home",
  "/vessels/": "Vessels",
  "/nile-cruise-prices/": "Why prices differ",
  "/nile-cruise-guide/": "Nile cruise guide",
  "/cruises/": "Cruises",
  "/destinations/": "Destinations",
  "/tours-extras/": "Tours & extras",
  "/about/": "About Nilecruz",
  "/how-we-choose-vessels/": "How we choose vessels",
  "/contact/": "Contact",
};

/** SEO-008: home → pillar → … → this page. */
export function trail(url: string): { name: string; path: string }[] {
  const out: { name: string; path: string }[] = [];
  for (let u: string | null = url; u; u = LINK_MAP[u]?.parent ?? null) {
    out.unshift({ name: PILLAR_NAMES[u] ?? sentence(page(u).keyword), path: u });
    if (u === "/") break;
  }
  if (out[0]?.path !== "/") out.unshift({ name: "Home", path: "/" });
  return out;
}

/** The parent page, for the one link up in the intro (SEO-008); none for home or a pillar's own home link. */
export function up(url: string): Link | null {
  const p = page(url).parent;
  return p && p !== "/" && isBuilt(p) ? inline(p) : null;
}

/** SEO-009: a pillar's or hub's children that exist, in workbook order. */
export const children = (url: string): Link[] =>
  page(url)
    .down.filter((u) => u !== url && isBuilt(u))
    .map(link);

/** SEO-010: two or three siblings in the same hub ("Keep reading"); only ones that exist. */
export const siblings = (url: string): Link[] => page(url).across.filter(isBuilt).slice(0, 3).map(link);

/** SEO-011: links to other silos, only where the workbook lists them. */
export const bridges = (url: string): Link[] => page(url).bridges.filter(isBuilt).map(link);

/**
 * SEO-012: the closing cruise row's listing: the first bridge into /cruises/ that exists, else the listing hub.
 * `type` filters the cards when the matching facet page isn't built yet (paddle steamers).
 */
export function closingListing(url: string): Link {
  const b = page(url).bridges.find((u) => u.startsWith("/cruises/") && isBuilt(u));
  return b ? link(b) : link("/cruises/");
}

/** Every link a page must show (for the CI check): up, children, siblings, bridges and the closing listing. */
export function expectedLinks(url: string): string[] {
  const p = page(url);
  const out = new Set<string>();
  const u = up(url);
  if (u) out.add(u.href);
  for (const l of [...children(url), ...siblings(url), ...bridges(url)]) out.add(l.href);
  if (p.type !== "Homepage" && !NO_CLOSING.has(url)) out.add(closingListing(url).href);
  return [...out];
}

/** Every education-silo URL a page may link to: its own row's links, its trail, and the closing listing. */
export function allowedLinks(url: string): Set<string> {
  const p = page(url);
  return new Set([...p.down, ...p.across, ...p.bridges, ...trail(url).map((c) => c.path), closingListing(url).href, url]);
}
