import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Listing } from "@/components/marketplace/Listing";
import { contentLocale } from "@/content/places";
import type { Locale } from "@/i18n/routing";
import { applySearch, isSearching, parseSearch, sortListing } from "@/lib/marketplace/listing";
import { pageMetadata } from "@/lib/seo/metadata";
import { publicListing } from "@/server/marketplace/queries";

type Props = {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** SEO-016: a search is a parameter on the hub, canonical to the clean URL and kept out of the index. */
export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale } = await params;
  const searching = isSearching(parseSearch(await searchParams));
  const t = await getTranslations({ locale, namespace: "cruisesHub" });
  return pageMetadata({ locale, path: "/cruises", title: t("title"), description: t("description"), noindex: searching });
}

/** PAGE-060: the Cruises hub. Every public vessel, or those that fit a search (DATA-012). */
export default async function CruisesHub({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const query = parseSearch(await searchParams);
  const all = await publicListing(contentLocale(locale));
  const t = await getTranslations({ locale, namespace: "cruisesHub" });
  const common = await getTranslations({ locale, namespace: "common" });
  const searching = isSearching(query);
  const found = searching ? applySearch(all, query) : { vessels: all, departures: undefined };
  return (
    <Listing
      locale={locale}
      trail={[
        { name: common("home"), path: "/" },
        { name: common("cruises"), path: "/cruises/" },
      ]}
      h1={t("title")}
      intro={t("intro")}
      path="/cruises"
      description={t("description")}
      vessels={sortListing(found.vessels)}
      all={all}
      sightseeing={!!query.sightseeing}
      propulsion={query.propulsion}
      vesselType={query.vessel}
      matchCount={found.departures}
      empty={searching ? t("noMatch") : t("none")}
    />
  );
}
