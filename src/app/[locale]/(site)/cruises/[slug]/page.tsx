import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Listing } from "@/components/marketplace/Listing";
import { VesselView } from "@/components/marketplace/VesselView";
import { routing, type Locale } from "@/i18n/routing";
import { facetBySlug, FACETS, sortListing } from "@/lib/marketplace/listing";
import { pickItinerary, vesselH1 } from "@/lib/marketplace/vessel";
import { pageMetadata } from "@/lib/seo/metadata";
import { publicListing, publicVessel } from "@/server/marketplace/queries";

type Props = { params: Promise<{ locale: Locale; slug: string }> };

// The search's vessel type starts at the facet's own type.
const FACET_TYPE: Record<string, string> = { dahabiyas: "sail", "motor-ships": "motor" };

// Static, refreshed when the catalogue changes or every ten minutes, like its data (PERF-010, CATALOGUE_SECONDS).
export const revalidate = 600;

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => FACETS.map((f) => ({ locale, slug: f.slug })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const f = facetBySlug(slug);
  if (f) return pageMetadata({ locale, path: `/cruises/${f.slug}`, title: f.title, description: f.description });
  const v = await publicVessel(slug);
  if (!v) return {};
  // DATA-031: an itinerary is a parameter read in the browser; the canonical is always the vessel URL.
  const it = pickItinerary(v.itineraries, undefined);
  return pageMetadata({
    locale,
    path: `/cruises/${v.slug}`,
    title: `${vesselH1(v.name, it)} | Nile cruise`,
    description:
      v.summary ?? `${v.name}: itineraries, cabins by deck, the Nilecruz evaluation and the starting price for a Nile cruise.`,
    // Sample vessels are test data: never indexed.
    noindex: v.sample,
  });
}

/**
 * PAGE-061, 062, 064, 066, 067: the listed facets of the Cruises silo (SEO-016), static. Every other slug is a vessel
 * page (PAGE-072); vessel slugs can never equal a facet slug (SEO-030).
 */
export default async function CruiseFacetOrVessel({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const f = facetBySlug(slug);
  if (!f) {
    const v = await publicVessel(slug);
    if (!v) notFound();
    return <VesselView locale={locale} v={v} it={pickItinerary(v.itineraries, undefined)} />;
  }
  const all = await publicListing();
  return (
    <Listing
      locale={locale}
      trail={[
        { name: "Home", path: "/" },
        { name: "Cruises", path: "/cruises/" },
        { name: f.h1, path: `/cruises/${f.slug}/` },
      ]}
      h1={f.h1}
      intro={f.intro}
      path={`/cruises/${f.slug}`}
      description={f.description}
      vessels={sortListing(all.filter(f.match))}
      all={all}
      vesselType={FACET_TYPE[f.slug]}
      current={f.slug}
      empty="No vessels of this kind are published yet. See all cruises."
    />
  );
}
