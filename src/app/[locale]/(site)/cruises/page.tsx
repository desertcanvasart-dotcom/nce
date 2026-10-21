import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { Listing } from "@/components/marketplace/Listing";
import type { Locale } from "@/i18n/routing";
import { applySearch, isSearching, parseSearch, sortListing } from "@/lib/marketplace/listing";
import { pageMetadata } from "@/lib/seo/metadata";
import { publicListing } from "@/server/marketplace/queries";

type Props = {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const H1 = "Compare Nile cruises";
const DESCRIPTION =
  "Compare Nile cruises on dahabiyas and cruise ships: routes, nights, guests on board, Nilecruz evaluations and honest starting prices.";

/** SEO-016: a search is a parameter on the hub, canonical to the clean URL and kept out of the index. */
export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale } = await params;
  const searching = isSearching(parseSearch(await searchParams));
  return pageMetadata({ locale, path: "/cruises", title: "Compare Nile cruises", description: DESCRIPTION, noindex: searching });
}

/** PAGE-060: the Cruises hub. Every public vessel, or those that fit a search (DATA-012). */
export default async function CruisesHub({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const query = parseSearch(await searchParams);
  const all = await publicListing();
  const searching = isSearching(query);
  const found = searching ? applySearch(all, query) : { vessels: all, departures: undefined };
  return (
    <Listing
      locale={locale}
      trail={[
        { name: "Home", path: "/" },
        { name: "Cruises", path: "/cruises/" },
      ]}
      h1={H1}
      intro="Every vessel on Nilecruz, with its route, how many guests it carries, our own evaluation and one honest starting price. Sail on a dahabiya or cruise on a motor ship."
      path="/cruises"
      description={DESCRIPTION}
      vessels={sortListing(found.vessels)}
      all={all}
      sightseeing={!!query.sightseeing}
      vesselType={query.vessel}
      matchCount={found.departures}
      empty={searching ? "No sailings fit that search. Try other dates or any route." : "No cruises are published yet."}
    />
  );
}
