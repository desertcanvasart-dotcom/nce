import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ds/Button/Button";
import { Icon, type IconName } from "@/components/ds/Icon/Icon";
import { Media } from "@/components/ds/Media/Media";
import type { SceneTime, VesselType } from "@/components/ds/lib/types";
import { Breadcrumbs } from "@/components/marketplace/Breadcrumbs";
import { ListingGrid } from "@/components/marketplace/ListingGrid";
import {
  callsAt,
  itinerariesOf,
  onLakeNasser,
  RIVER_STOPS,
  type ItineraryPlaces,
  type RouteKey,
  type StopStatus,
} from "@/content/river-stops";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import type { EditorialPage } from "@/lib/content/editorial";
import { jsonLdScript, sortListing, toCard, type ListingVessel } from "@/lib/marketplace/listing";
import { articleJsonLd, faqJsonLd } from "@/lib/seo/jsonld";
import { isBuilt } from "@/lib/seo/links";
import { absoluteUrl } from "@/lib/seo/metadata";
import { RiverMap, type MapStop } from "./RiverMap";
import styles from "./editorial.module.css";
import d from "./destinations.module.css";

const URL = "/destinations/";
const ROUTES: RouteKey[] = ["classic", "dahabiya"];
const TYPES: VesselType[] = ["sail", "motor", "steam"];
// Each stop's illustration has its own light until its licensed photo arrives (never a boat in place of a temple).
const LIGHT: SceneTime[] = ["dawn", "day", "dusk", "day", "dawn", "dusk", "day", "night"];
const STATUS_ICON: Record<StopStatus, IconName> = {
  yes: "check",
  check: "info",
  noLargeShips: "minus",
  notOnItinerary: "minus",
  optionalFromAswan: "plus",
  optionalSeparate: "plus",
};

/**
 * PAGE-074, /destinations/ (Islam's destinations brief, 4 Nov 2026): the river from Luxor to Aswan as an illustrated
 * chart, then each stop, who stops where, how a visit works, one cruise of each kind that calls here, questions and a
 * next step. Laid out by hand: the stops come from src/content/river-stops.ts (shared with each destination page), the
 * page's own words from the message files, in English with Spanish and Japanese drafted for review.
 */
export async function DestinationsPillar({
  locale,
  all,
  places,
}: {
  locale: Locale;
  all: ListingVessel[];
  places: ItineraryPlaces;
}) {
  const t = await getTranslations({ locale, namespace: "destinationsPillar" });
  const faqs = t.raw("faqs.items") as { q: string; a: string }[];
  const page: EditorialPage = {
    id: "P074",
    title: t("hero.title"),
    standfirst: t("hero.intro"),
    sections: [],
    faqs,
    seoDescription: t("meta.description"),
    sample: false,
    review: "approved",
  };
  const url = absoluteUrl(locale, URL);
  const river = RIVER_STOPS.filter((s) => !s.beyond);
  const label = (s: (typeof RIVER_STOPS)[number]) => (s.beyond ? t("journey.beyond") : t("map.stop", { n: s.orderOnRiver }));
  const mapStops: MapStop[] = RIVER_STOPS.map((s) => ({
    key: s.key,
    n: s.orderOnRiver,
    name: s.name[locale],
    summary: s.summary[locale],
    beyond: s.beyond,
    onMap: s.onMap,
    image: s.image ? { ...s.image, alt: s.image.alt[locale] } : null,
    read: t("map.read", { name: s.name[locale] }),
    label: label(s),
  }));

  // One published cruise of each kind that calls at stops on this page, never a Lake Nasser route; bookable first.
  const calls = (v: ListingVessel) =>
    itinerariesOf(v, places).some((it) => !onLakeNasser(it) && river.some((s) => callsAt(it, s)));
  const examples = TYPES.map((type) => sortListing(all.filter((v) => v.type === type && calls(v)))[0]).filter(
    (v): v is ListingVessel => !!v,
  );

  return (
    <article className={styles.page}>
      <Breadcrumbs
        locale={locale}
        trail={[
          { name: t("crumbs.home"), path: "/" },
          { name: t("crumbs.destinations"), path: URL },
        ]}
      />
      <header className={d.hero}>
        <div className={styles.head}>
          <h1 className={styles.title}>{t("hero.title")}</h1>
          <p className={styles.lead}>{t("hero.intro")}</p>
          <div className={styles.actions}>
            <Button variant="primary" href="#journey">
              {t("hero.follow")}
            </Button>
            <Button variant="outline" href="#who-stops-where">
              {t("hero.table")}
            </Button>
          </div>
        </div>
        <RiverMap
          stops={mapStops}
          labels={{
            map: t("map.label"),
            list: t("map.list"),
            notToScale: t("map.notToScale"),
            direction: t("map.direction"),
            routeLabel: t("map.routeLabel"),
            routes: { classic: t("map.classic"), dahabiya: t("map.dahabiya") },
            lake: t("map.lake"),
            optional: t("map.optional"),
            end: t("map.end"),
            onRoute: t("map.onRoute"),
          }}
        />
      </header>

      <section id="journey" className={d.journey} aria-labelledby="journey-heading">
        <h2 id="journey-heading" className={d.sectionTitle}>
          {t("journey.heading")}
        </h2>
        <ol className={d.stops}>
          {RIVER_STOPS.map((s, i) => (
            <li key={s.key} id={`stop-${s.key}`} className={s.beyond ? d.beyondStop : undefined}>
              {s.beyond ? <p className={d.riverBreak} aria-hidden="true" /> : null}
              <article className={d.stop} aria-labelledby={`stop-${s.key}-name`}>
                <Media
                  image={s.image ? { ...s.image, alt: s.image.alt[locale] } : undefined}
                  time={LIGHT[i]}
                  vessel={null}
                  temple
                  sizes="(min-width: 900px) 55vw, 100vw"
                  className={d.stopArt}
                />
                <div className={d.stopText}>
                  <p className={d.stopNumber}>
                    {s.beyond ? (
                      t("journey.beyond")
                    ) : (
                      <>
                        <span aria-hidden="true">{String(s.orderOnRiver).padStart(2, "0")}</span>
                        <span className="visually-hidden">{t("journey.stop", { n: s.orderOnRiver })}</span>
                      </>
                    )}
                  </p>
                  <h3 id={`stop-${s.key}-name`}>{s.name[locale]}</h3>
                  <p className={d.summary}>{s.summary[locale]}</p>
                  <p>{s.description[locale]}</p>
                  <div className={d.facts}>
                    <h4>{t("journey.sights")}</h4>
                    <ul className={d.sights}>
                      {s.mainSights[locale].map((x) => (
                        <li key={x}>{x}</li>
                      ))}
                    </ul>
                    {s.visitLength ? (
                      <p className={d.fact}>
                        <Icon name="clock" />
                        <span>
                          <strong>{t("journey.visit")}</strong> {s.visitLength[locale]}
                        </span>
                      </p>
                    ) : null}
                    {s.insiderNote ? (
                      <p className={d.note}>
                        <strong>{t("journey.team")}</strong> {s.insiderNote[locale]}
                      </p>
                    ) : null}
                  </div>
                  {s.path && s.linkText && isBuilt(s.path) ? (
                    <p>
                      <Link href={s.path} className={styles.more}>
                        {s.linkText[locale]} →
                      </Link>
                    </p>
                  ) : null}
                </div>
              </article>
            </li>
          ))}
        </ol>
      </section>

      <section id="who-stops-where" className={styles.wide} aria-labelledby="table-heading">
        <h2 id="table-heading">{t("table.heading")}</h2>
        <p>{t("table.intro")}</p>
        <div className={d.tableWrap}>
          <table className={d.table}>
            <caption className="visually-hidden">{t("table.caption")}</caption>
            <thead>
              <tr>
                <th scope="col">{t("table.stop")}</th>
                {ROUTES.map((r) => (
                  <th key={r} scope="col">
                    {t(`map.${r}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {RIVER_STOPS.map((s) => (
                <tr key={s.key}>
                  <th scope="row">{(s.tableLabel ?? s.name)[locale]}</th>
                  {ROUTES.map((r) => (
                    <td key={r} data-status={s.routes[r]}>
                      <Icon name={STATUS_ICON[s.routes[r]]} />
                      <span>{t(`table.status.${s.routes[r]}`)}</span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* On a phone, each route is a list of its own rather than a squeezed table. */}
        <div className={d.routeLists}>
          {ROUTES.map((r) => (
            <div key={r}>
              <h3>{t(`map.${r}`)}</h3>
              <ul>
                {RIVER_STOPS.map((s) => (
                  <li key={s.key} data-status={s.routes[r]}>
                    <Icon name={STATUS_ICON[s.routes[r]]} />
                    <span>
                      <strong>{(s.tableLabel ?? s.name)[locale]}</strong> {t(`table.status.${s.routes[r]}`)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className={styles.muted}>{t("table.note")}</p>
        <p>
          <Link href="/nile-cruise-guide/routes/" className={styles.more}>
            {t("table.link")} →
          </Link>
        </p>
      </section>

      <section className={styles.section} aria-labelledby="visit-heading">
        <h2 id="visit-heading">{t("visit.heading")}</h2>
        <p>{t("visit.text")}</p>
      </section>

      <section className={styles.closing} aria-labelledby="cruises-heading">
        <h2 id="cruises-heading">{t("cruises.heading")}</h2>
        <p>{t("cruises.intro")}</p>
        {examples.length ? <ListingGrid cards={examples.map(toCard)} /> : <p className={styles.muted}>{t("cruises.empty")}</p>}
        <p>
          <Link href="/cruises/" className={styles.more}>
            {t("cruises.link")} →
          </Link>
        </p>
      </section>

      <section className={styles.section} aria-labelledby="faqs-heading">
        <h2 id="faqs-heading">{t("faqs.heading")}</h2>
        <dl className={styles.faqs}>
          {faqs.map((f) => (
            <div key={f.q}>
              <dt>{f.q}</dt>
              <dd>{f.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className={styles.cta} aria-labelledby="next-heading">
        <h2 id="next-heading">{t("next.heading")}</h2>
        <p>{t("next.text")}</p>
        <Button variant="primary" icon="arrow-right" href="/plan-my-cruise/">
          {t("next.button")}
        </Button>
        <p>
          <Link href="/nile-cruise-guide/" className={styles.more}>
            {t("next.secondary")}
          </Link>
        </p>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript({ ...articleJsonLd(page, url), inLanguage: locale }) }}
      />
      {faqJsonLd(page) ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(faqJsonLd(page)) }} />
      ) : null}
      {/* SEO-005: the pillar lists its stops, in river order, as its workbook row asks (CollectionPage, ItemList). */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: t("hero.title"),
            description: t("meta.description"),
            url,
            inLanguage: locale,
            mainEntity: {
              "@type": "ItemList",
              itemListOrder: "https://schema.org/ItemListOrderAscending",
              numberOfItems: RIVER_STOPS.length,
              itemListElement: RIVER_STOPS.map((s) => ({
                "@type": "ListItem",
                position: s.orderOnRiver,
                name: s.name[locale],
                ...(s.path && isBuilt(s.path) ? { url: absoluteUrl(locale, s.path) } : {}),
              })),
            },
          }),
        }}
      />
    </article>
  );
}
