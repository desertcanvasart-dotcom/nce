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
