import { useTranslations } from "next-intl";
import { CruiseSearch } from "@/components/ds/CruiseSearch/CruiseSearch";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import {
  pricedCount,
  collectionJsonLd,
  FACETS,
  facetText,
  jsonLdScript,
  searchRoutes,
  toCard,
  VESSEL_OPTIONS,
  vesselOptions,
  type ListingVessel,
} from "@/lib/marketplace/listing";
import { absoluteUrl } from "@/lib/seo/metadata";
import { Icon } from "@/components/ds/Icon/Icon";
import { PROPULSIONS, propulsionIcon, vesselIcon, type Propulsion } from "@/components/ds/lib/types";
import { Breadcrumbs, type Trail } from "./Breadcrumbs";
import { ListingGrid } from "./ListingGrid";
import styles from "./marketplace.module.css";

type Props = {
  locale: Locale;
  trail: Trail;
  h1: string;
  intro: string;
  /** Path of this page, for the CollectionPage URL. */
  path: string;
  description: string;
  vessels: ListingVessel[];
  /** Every public vessel, for the search's routes and dates. */
  all: ListingVessel[];
  /** The facet this page is, to preselect the search's vessel type. */
  vesselType?: string;
  matchCount?: number;
  current?: string;
  empty: string;
  /** ADR-102: the "With sightseeing" filter is on (the Cruises hub only). */
  sightseeing?: boolean;
  /** The Motor, Wind or Steam filter that is on (the Cruises hub only). */
  propulsion?: Propulsion;
};

/** A /cruises/ listing (PAGE-060–067): breadcrumb, H1, search, the facet links and the cards. */
export function Listing(p: Props) {
  const t = useTranslations("listing");
  const routes = searchRoutes(p.all, p.locale);
  const vessels = vesselOptions(p.locale).map((o) => ({
    id: o.id,
    label: o.label,
    icon: o.type ? vesselIcon[o.type] : undefined,
  }));
  const json = collectionJsonLd(
    { name: p.h1, description: p.description, url: absoluteUrl(p.locale, p.path) },
    p.vessels.map((v) => ({ name: v.name, url: absoluteUrl(p.locale, `/cruises/${v.slug}`) })),
  );
  return (
    <div className={styles.page}>
      <Breadcrumbs locale={p.locale} trail={p.trail} />
      <header className={styles.head}>
        <h1 className={styles.title}>{p.h1}</h1>
        <p className={styles.lead}>{p.intro}</p>
      </header>
      <div className={styles.search}>
        <CruiseSearch
          routes={routes}
          vessels={vessels}
          defaultVessel={Math.max(
            0,
            VESSEL_OPTIONS.findIndex((o) => o.id === p.vesselType),
          )}
          action="/cruises/"
          matchCount={p.matchCount}
        />
      </div>
      <nav aria-label={t("facetsLabel")} className={styles.facets}>
        <ul>
          {FACETS.map((f) => (
            <li key={f.slug}>
              {p.current === f.slug ? (
                <span aria-current="page">{facetText(f, p.locale).h1}</span>
              ) : (
                <Link href={`/cruises/${f.slug}/`}>{facetText(f, p.locale).h1}</Link>
              )}
            </li>
          ))}
          <li>
            {p.sightseeing ? (
              <span aria-current="page">{t("withSightseeing")}</span>
            ) : (
              <Link href="/cruises/?sightseeing=1">{t("withSightseeing")}</Link>
            )}
          </li>
        </ul>
      </nav>
      {/* What drives the vessel, from its own data: an icon and a word for each, never colour alone. */}
      <nav aria-label={t("propulsionLabel")} className={styles.facets}>
        <ul>
          {PROPULSIONS.map((k) => (
            <li key={k}>
              {p.propulsion === k ? (
                <span aria-current="page">
                  <Icon name={propulsionIcon[k]} />
                  {t(`propulsion.${k}`)}
                </span>
              ) : (
                <Link href={`/cruises/?propulsion=${k}`}>
                  <Icon name={propulsionIcon[k]} />
                  {t(`propulsion.${k}`)}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </nav>
      <p className={styles.count}>
        {t("vessels", { count: p.vessels.length })}
        {p.matchCount !== undefined ? ` · ${t("departures", { count: p.matchCount })}` : ""}
      </p>
      {p.vessels.length ? (
        <ListingGrid cards={p.vessels.map((v) => toCard(v, p.locale))} />
      ) : (
        <p className={styles.empty}>{p.empty}</p>
      )}
      <p className={styles.note}>{t("note", { priced: pricedCount(p.vessels), total: p.vessels.length })}</p>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(json) }} />
    </div>
  );
}
