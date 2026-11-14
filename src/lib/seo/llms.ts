/**
 * /llms.txt: a short plain-text guide for AI assistants (the llmstxt.org convention): what the site is, where its main
 * pages are, and the read-only MCP address. Only pages that are built are listed, so it never points at a 404.
 */
import { isBuilt } from "./links";

type Entry = { path: string; title: string; note: string };

const SECTIONS: { heading: string; entries: Entry[] }[] = [
  {
    heading: "Cruises",
    entries: [
      { path: "/cruises/", title: "Compare Nile cruises", note: "every vessel, with route, nights, guests and a guide price" },
      { path: "/cruises/dahabiyas/", title: "Dahabiya cruises", note: "small sailing boats" },
      { path: "/cruises/motor-ships/", title: "Nile cruise ships", note: "motor cruise ships" },
      { path: "/cruises/luxury/", title: "Luxury Nile cruises", note: "the upper end of the river" },
      { path: "/cruises/luxor-to-aswan/", title: "Luxor to Aswan cruises", note: "usually four nights" },
      { path: "/cruises/aswan-to-luxor/", title: "Aswan to Luxor cruises", note: "usually three nights" },
    ],
  },
  {
    heading: "Vessels",
    entries: [
      { path: "/vessels/", title: "Vessel types", note: "how a dahabiya, a motor cruise ship and a paddle steamer differ" },
      { path: "/vessels/compare/dahabiya-vs-cruise-ship/", title: "Dahabiya or cruise ship", note: "a side-by-side comparison" },
      { path: "/how-we-choose-vessels/", title: "How we choose vessels", note: "how Nilecruz evaluates a vessel" },
    ],
  },
  {
    heading: "Prices",
    entries: [
      {
        path: "/nile-cruise-prices/",
        title: "Nile cruise prices explained",
        note: "why one five-star cruise costs far more than another",
      },
      { path: "/nile-cruise-prices/whats-included/", title: "What is included", note: "what a cruise price pays for" },
      {
        path: "/nile-cruise-prices/star-ratings-explained/",
        title: "Star ratings explained",
        note: "what the stars do and don't mean",
      },
    ],
  },
  {
    heading: "Planning",
    entries: [
      { path: "/nile-cruise-guide/", title: "Nile cruise guide", note: "routes, seasons and planning" },
      { path: "/nile-cruise-guide/routes/", title: "Routes", note: "Luxor to Aswan, Aswan to Luxor, Esna to Aswan" },
      { path: "/nile-cruise-guide/when-to-go/", title: "When to go", note: "the seasons, month by month" },
      { path: "/nile-cruise-guide/planning/how-many-nights/", title: "How many nights", note: "three, four or five" },
      { path: "/destinations/", title: "Destinations", note: "Luxor, Edfu, Kom Ombo, Aswan and Abu Simbel" },
      { path: "/tours-extras/", title: "Tours and extras", note: "sold separately from a cruise" },
    ],
  },
  {
    heading: "Company",
    entries: [
      { path: "/about/", title: "About Nilecruz", note: "who evaluates the vessels" },
      { path: "/contact/", title: "Contact", note: "how to reach the office" },
    ],
  },
];

export function llmsTxt(site: string): string {
  const lines = [
    "# Nilecruz",
    "",
    "> A marketplace for Nile cruises in Egypt that explains how vessels differ and what prices pay for.",
    "",
    "Public prices are in euros, per person. A starting price is a guide, not a quote: rates and availability are",
    "confirmed for the traveller's dates. Tours and extras are sold separately from a cruise.",
    "",
  ];
  for (const s of SECTIONS) {
    const built = s.entries.filter((e) => isBuilt(e.path));
    if (!built.length) continue;
    lines.push(`## ${s.heading}`, "", ...built.map((e) => `- [${e.title}](${site}${e.path}): ${e.note}`), "");
  }
  lines.push(
    "## For assistants",
    "",
    `- [Sitemap](${site}/sitemap.xml): every indexable page, by language`,
    `- MCP server: ${site}/api/mcp/ (JSON-RPC over POST, read-only, no login). Tools: search_cruises, get_vessel, compare_vessels, sailing_availability`,
    "",
  );
  return lines.join("\n");
}
