import { LIVE_TOUR_REDIRECTS, tourUrl } from "./content/tours";

/** A query parameter the old address must carry for the rule to apply (Next.js `has`). */
type Has = { type: "query"; key: string; value?: string };

/**
 * 301s from the current nilecruz.com URLs to their silo equivalents (SEO-021, ADR-028). Checked against the live site
 * in Batch 10-2: its sitemap (9 pages), its links, and the address patterns its pages build in the browser
 * (/cruise/{id}, /tours/{id}, /explore filters). The first rule that matches wins, so specific rules come first.
 */
export const liveSiteRedirects: { source: string; destination: string; has?: Has[] }[] = [
  // The live listing's filter links, to the listing pages that exist.
  { source: "/explore", has: [{ type: "query", key: "boat", value: "dahabiya" }], destination: "/cruises/dahabiyas/" },
  { source: "/explore", has: [{ type: "query", key: "boat", value: "powered" }], destination: "/cruises/motor-ships/" },
  { source: "/explore", destination: "/cruises/" },
  { source: "/how-we-score", destination: "/how-we-choose-vessels/" },
  { source: "/match", destination: "/plan-my-cruise/" },
  { source: "/request", destination: "/plan-my-cruise/" },
  { source: "/tours", destination: "/tours-extras/" },
  { source: "/compare", destination: "/cruises/compare/" },
  { source: "/account", destination: "/dashboard/" },
  { source: "/independence", destination: "/how-we-choose-vessels/" },
  // SEO-022: each live tour page to its new one (a Phase 1 workbook page, or /tours-extras/{slug}/).
  ...LIVE_TOUR_REDIRECTS.map((r) => ({ source: r.source, destination: tourUrl(r.slug) })),
  // Any other live tour or vessel address. The live site's vessel IDs aren't public (its /api/ is closed to crawlers),
  // so every /cruise/{id} goes to the listing; vessel-by-vessel rules can be added if the old export turns up.
  { source: "/tours/:id", destination: "/tours-extras/" },
  { source: "/cruise/:id", destination: "/cruises/" },
];
