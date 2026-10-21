import { CruiseSearch } from "@/components/ds/CruiseSearch/CruiseSearch";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import {
  collectionJsonLd,
  FACETS,
  jsonLdScript,
  searchRoutes,
  toCard,
  VESSEL_OPTIONS,
  type ListingVessel,
  headlineItinerary,
} from "@/lib/marketplace/listing";
import { absoluteUrl } from "@/lib/seo/metadata";
import { vesselIcon } from "@/components/ds/lib/types";
import { Breadcrumbs, type Trail } from "./Breadcrumbs";
import { ListingGrid } from "./ListingGrid";
import { PriceWhy } from "./PriceWhy";
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
};

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
          {FACETS.map((f) => (
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
      <p className={styles.count}>
        {p.vessels.length} vessel{p.vessels.length === 1 ? "" : "s"}
        {p.matchCount !== undefined ? ` · ${p.matchCount} matching departure${p.matchCount === 1 ? "" : "s"}` : ""}
      </p>
      {p.vessels.length ? (
        <ListingGrid
          cards={p.vessels.map(toCard)}
          why={Object.fromEntries(
            p.vessels
              .filter((v) => v.bookable && v.from)
              .map((v) => {
                const it = headlineItinerary(v);
                return [
                  v.slug,
                  <PriceWhy
                    key={v.slug}
                    facts={{
                      price: v.from!,
                      vesselType: v.type,
                      maxGuests: v.maxGuests,
                      nights: it?.nights,
                      nextDeparture: it?.departures[0],
                      gratuityUsdMinor: null,
                      sightseeing: v.fromWithSightseeing
                        ? { by: v.sightseeingBy ?? "vessel", from: v.fromWithSightseeing }
                        : undefined,
                    }}
                  />,
                ];
              }),
          )}
        />
      ) : (
        <p className={styles.empty}>{p.empty}</p>
      )}
      <p className={styles.note}>
        Prices are per person, for two sharing a cabin, in the operator’s currency. Crew gratuities are separate and paid on
        board. Prices for every cabin and date appear after you sign in.
      </p>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(json) }} />
    </div>
  );
}
