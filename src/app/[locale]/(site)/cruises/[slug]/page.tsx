import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Listing } from "@/components/marketplace/Listing";
import { VesselView, vesselWords } from "@/components/marketplace/VesselView";
import { routing, type Locale } from "@/i18n/routing";
import { facetBySlug, FACETS, sortListing } from "@/lib/marketplace/listing";
import type { ListingVessel } from "@/lib/marketplace/listing";
import { siteUrl } from "@/lib/env";
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
  const v = await publicVessel(slug, locale);
  if (!v) return {};
  // The title and description cover every itinerary (DATA-031): no single sailing sets the page's identity.
  const t = await getTranslations({ locale, namespace: "vesselPage" });
  const w = vesselWords(
    v,
    locale,
    (k, x) => t(k as never, x as never),
    (k) => t.raw(k as never),
  );
  const meta = pageMetadata({
    locale,
    path: `/cruises/${v.slug}`,
    title: w.title,
    description: w.description ?? undefined,
    // Sample vessels are test data: never indexed.
    noindex: v.sample,
  });
  const images = v.photos[0] ? [{ url: photoUrl(v.slug), alt: v.photos[0].alt }] : undefined;
  return {
    ...meta,
    openGraph: { ...meta.openGraph, type: "website", images },
    twitter: { card: "summary_large_image", title: w.title, description: w.description ?? undefined, images },
  };
}

/** The main photo at a stable address on the site (signed storage links expire). */
const photoUrl = (slug: string) => `${siteUrl}/api/vessel-files/${slug}/photo/`;

/** Up to three other public vessels of the same type to compare: those with a photo first, then by name. */
function similarTo(slug: string, type: string, all: ListingVessel[]): ListingVessel[] {
  return all
    .filter((x) => x.slug !== slug && x.type === type)
    .sort((a, b) => Number(!a.image) - Number(!b.image) || a.name.localeCompare(b.name))
    .slice(0, 3);
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
    const [v, all] = await Promise.all([publicVessel(slug, locale), publicListing()]);
    if (!v) notFound();
    return (
      <VesselView
        locale={locale}
        v={v}
        similar={similarTo(v.slug, v.type, all)}
        ogImage={v.photos[0] ? photoUrl(v.slug) : undefined}
      />
    );
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
