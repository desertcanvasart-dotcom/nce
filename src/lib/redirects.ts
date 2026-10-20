import { LIVE_TOUR_REDIRECTS, tourUrl } from "./content/tours";

/**
 * 301s from the current nilecruz.com URLs to their silo equivalents (SEO-021, ADR-028).
 * Wired now so nothing is lost when the domain moves; verified again in Batch 10.
 */
export const liveSiteRedirects: { source: string; destination: string }[] = [
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
];
