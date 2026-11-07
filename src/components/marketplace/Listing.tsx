import { CruiseSearch } from "@/components/ds/CruiseSearch/CruiseSearch";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import {
  pricedCount,
  collectionJsonLd,
  facetLive,
  FACETS,
  jsonLdScript,
  searchRoutes,
  toCard,
  VESSEL_OPTIONS,
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

const PROPULSION_TEXT: Record<Propulsion, string> = { motor: "Motor", wind: "Wind", steam: "Steam" };

/** A /cruises/ listing (PAGE-060–067): breadcrumb, H1, search, the facet links and the cards. */
export function Listing(p: Props) {
  const routes = searchRoutes(p.all);
  const vessels = VESSEL_OPTIONS.map((o) => ({ id: o.id, label: o.label, icon: o.type ? vesselIcon[o.type] : undefined }));
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
      <nav aria-label="Cruise types and routes" className={styles.facets}>
        <ul>
          {/* ADR-113: a gated facet is linked only once it has vessels (shown here if it's this page). */}
          {FACETS.filter((f) => f.slug === p.current || facetLive(f, p.all)).map((f) => (
            <li key={f.slug}>
              {p.current === f.slug ? <span aria-current="page">{f.h1}</span> : <Link href={`/cruises/${f.slug}/`}>{f.h1}</Link>}
            </li>
          ))}
          <li>
            {p.sightseeing ? (
              <span aria-current="page">With sightseeing</span>
            ) : (
              <Link href="/cruises/?sightseeing=1">With sightseeing</Link>
            )}
          </li>
        </ul>
      </nav>
      {/* What drives the vessel, from its own data: an icon and a word for each, never colour alone. */}
      <nav aria-label="Propulsion" className={styles.facets}>
        <ul>
          {PROPULSIONS.map((k) => (
            <li key={k}>
              {p.propulsion === k ? (
                <span aria-current="page">
                  <Icon name={propulsionIcon[k]} />
                  {PROPULSION_TEXT[k]}
                </span>
              ) : (
                <Link href={`/cruises/?propulsion=${k}`}>
                  <Icon name={propulsionIcon[k]} />
                  {PROPULSION_TEXT[k]}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </nav>
      <p className={styles.count}>
        {p.vessels.length} vessel{p.vessels.length === 1 ? "" : "s"}
        {p.matchCount !== undefined ? ` · ${p.matchCount} matching departure${p.matchCount === 1 ? "" : "s"}` : ""}
      </p>
      {p.vessels.length ? <ListingGrid cards={p.vessels.map(toCard)} /> : <p className={styles.empty}>{p.empty}</p>}
      <p className={styles.note}>
        Starting prices are per person, in euros: a guide, not a quote. All prices we publish and quote already include our
        margin. Sorted by starting price: cruises with “Price on request” have no price to sort by, so they come after the others,
        by name ({pricedCount(p.vessels)} of {p.vessels.length} show a price). Crew gratuities are separate: usually €5 to €10 per
        person, per night, depending on the cruise. Check each cruise’s offer.
      </p>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(json) }} />
    </div>
  );
}
