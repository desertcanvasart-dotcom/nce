/** Structured data for education pages (Batch 6): Article, FAQPage, and on home Organization and WebSite (SEO-028). */
import { BLOG_TOPICS, type BlogPost } from "@/lib/content/blog";
import type { EditorialPage } from "@/lib/content/editorial";
import { siteUrl } from "@/lib/env";
import { SHARE_IMAGE } from "./metadata";

/** Nilecruz as publisher and author: its name, home page and logo, so an article can be tied to the organisation. */
const organization = (site: string) => ({
  "@type": "Organization",
  name: "Nilecruz",
  url: `${site}/`,
  logo: { "@type": "ImageObject", url: `${site}/nilecruz-icon.svg` },
});

/**
 * An education page. The language is the one the text is in (English unless the page is translated); the date is the
 * last edit in Sanity, left out for copy that only lives in the repository.
 */

export function articleJsonLd(page: EditorialPage, url: string, language = "en") {
  const publisher = organization(siteUrl);
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: page.title,
    description: page.seoDescription ?? page.standfirst.replace("[[up]]", "").trim(),
    url,
    mainEntityOfPage: url,
    image: `${siteUrl}${SHARE_IMAGE.url}`,
    dateModified: page.updatedAt,
    author: publisher,
    publisher,
    inLanguage: language,
  };
}

/** ADR-105: a blog post, with its dates and byline (Nilecruz when no author is named). */
export function blogPostingJsonLd(post: BlogPost, url: string, blogUrl: string) {
  const publisher = organization(siteUrl);
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    image: `${siteUrl}${SHARE_IMAGE.url}`,
    headline: post.title,
    description: post.seoDescription ?? post.standfirst,
    url,
    mainEntityOfPage: url,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt ?? post.publishedAt,
    author: post.author ? { "@type": "Person", name: post.author } : publisher,
    publisher,
    articleSection: BLOG_TOPICS[post.topic].label,
    isPartOf: { "@type": "Blog", name: "Nilecruz blog", url: blogUrl },
    inLanguage: post.language,
  };
}

/** FAQPage only when the page has questions. */
export function faqJsonLd(page: Pick<EditorialPage, "faqs">) {
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
    ...organization(site),
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
    offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
  };
}

/** PAGE-074–090: a destination and its main sight (SEO, workbook schema TouristDestination · TouristAttraction). */
export function touristDestinationJsonLd(name: string, description: string, url: string, sight?: string) {
  return {
    "@context": "https://schema.org",
    "@type": "TouristDestination",
    name,
    description,
    url,
    containedInPlace: { "@type": "Country", name: "Egypt" },
    ...(sight ? { includesAttraction: { "@type": "TouristAttraction", name: sight } } : {}),
  };
}

/** Each destination's main sight, the one every cruise visits (TouristAttraction in the workbook's schema column). */
export const MAIN_SIGHT: Record<string, string> = {
  "/destinations/luxor/": "Karnak Temple",
  "/destinations/edfu/": "Temple of Horus",
  "/destinations/kom-ombo/": "Kom Ombo Temple",
  "/destinations/aswan/": "Philae Temple",
  "/destinations/abu-simbel/": "Abu Simbel temples",
};

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
            priceCurrency: "EUR",
            url,
            availability: "https://schema.org/InStock",
          },
  };
}
