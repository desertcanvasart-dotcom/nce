/** Main navigation: five pillars plus Cruises (SEO-015, Q8), "Why prices differ" always visible (BRAND-025). */
export const mainNav = [
  { key: "cruises", href: "/cruises" },
  { key: "vessels", href: "/vessels" },
  { key: "prices", href: "/nile-cruise-prices" },
  { key: "guide", href: "/nile-cruise-guide" },
  { key: "destinations", href: "/destinations" },
  { key: "tours", href: "/tours-extras" },
] as const;

/** Footer: Trust & Company pages and every silo root (SEO-015). */
export const footerCompany = [
  { key: "about", href: "/about" },
  { key: "howWeChoose", href: "/how-we-choose-vessels" },
  { key: "egyptologists", href: "/our-egyptologists" },
  { key: "reviews", href: "/reviews" },
  { key: "planMyCruise", href: "/plan-my-cruise" },
  { key: "contact", href: "/contact" },
] as const;

export const footerExplore = [
  { key: "cruises", ns: "nav", href: "/cruises" },
  { key: "vessels", ns: "nav", href: "/vessels" },
  { key: "prices", ns: "footer", href: "/nile-cruise-prices" },
  { key: "guide", ns: "nav", href: "/nile-cruise-guide" },
  { key: "destinations", ns: "nav", href: "/destinations" },
  { key: "tours", ns: "nav", href: "/tours-extras" },
] as const;

/** Draft legal pages exist in English only while under review (ENG-019, ADR-031). */
export const footerLegal = [
  { key: "terms", href: "/terms/" },
  { key: "privacy", href: "/privacy/" },
] as const;
