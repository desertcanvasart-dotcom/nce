import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Listing } from "@/components/marketplace/Listing";
import { routing, type Locale } from "@/i18n/routing";
import { facetBySlug, FACETS, sortListing } from "@/lib/marketplace/listing";
import { pageMetadata } from "@/lib/seo/metadata";
import { publicListing } from "@/server/marketplace/queries";

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
  if (!f) return {};
  return pageMetadata({ locale, path: `/cruises/${f.slug}`, title: f.title, description: f.description });
}

/** PAGE-061, 062, 064, 066, 067: the listed facets of the Cruises silo (SEO-016). Vessel pages join them in 5-2. */
export default async function CruiseFacet({ params }: Props) {
  const { locale, slug } = await params;
  const f = facetBySlug(slug);
  if (!f) notFound();
  setRequestLocale(locale);
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
