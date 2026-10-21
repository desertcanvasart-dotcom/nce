/** Structured data for education pages (Batch 6): Article, FAQPage, and on home Organization and WebSite (SEO-028). */
import type { EditorialPage } from "@/lib/content/editorial";

export function articleJsonLd(page: EditorialPage, url: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: page.title,
    description: page.seoDescription ?? page.standfirst.replace("[[up]]", "").trim(),
    url,
    mainEntityOfPage: url,
    publisher: { "@type": "Organization", name: "Nilecruz" },
    inLanguage: "en",
  };
}

/** FAQPage only when the page has questions. */
export function faqJsonLd(page: EditorialPage) {
  if (!page.faqs.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: page.faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
}

export function organizationJsonLd(site: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Nilecruz",
    url: `${site}/`,
    description: "A marketplace for Nile cruises that explains how vessels differ and what prices pay for.",
  };
}

/** SEO-028: the site search is the cruise listing's text search (`?q=`). */
export function websiteJsonLd(site: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Nilecruz",
    url: `${site}/`,
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${site}/cruises/?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

/** PAGE-059: the price calculator is a web application (free, in the browser). */
export function webApplicationJsonLd(name: string, url: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name,
    url,
    applicationCategory: "TravelApplication",
    operatingSystem: "Any",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };
}

/** PAGE-074–090: a destination and its main sight (SEO, workbook schema TouristDestination · TouristAttraction). */
export function touristDestinationJsonLd(name: string, description: string, url: string) {
  return {
    "@context": "https://schema.org",
    "@type": "TouristDestination",
    name,
    description,
    url,
    containedInPlace: { "@type": "Country", name: "Egypt" },
  };
}

/** PAGE-101, 106: About and Contact pages, each with the organisation. */
export function companyPageJsonLd(type: "AboutPage" | "ContactPage", name: string, url: string, site: string) {
  return {
    "@context": "https://schema.org",
    "@type": type,
    name,
    url,
    about: { "@type": "Organization", name: "Nilecruz", url: `${site}/` },
  };
}

/** A tour page; an Offer with its lowest price once it has real rates (ADR-097). */
export function tourJsonLd(name: string, description: string | null, url: string, fromMinor: number | null = null) {
  return {
    "@context": "https://schema.org",
    "@type": "TouristTrip",
    name,
    description: description ?? undefined,
    url,
    offers:
      fromMinor === null
        ? undefined
        : {
            "@type": "Offer",
            price: (fromMinor / 100).toFixed(2),
            priceCurrency: "USD",
            url,
            availability: "https://schema.org/InStock",
          },
  };
}
