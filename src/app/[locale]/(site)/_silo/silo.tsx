import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound, permanentRedirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { ItineraryTimeline } from "@/components/ds/ItineraryTimeline/ItineraryTimeline";
import { PriceAnatomy } from "@/components/ds/PriceAnatomy/PriceAnatomy";
import { Scene } from "@/components/ds/Scene/Scene";
import { VesselArt } from "@/components/ds/VesselArt/VesselArt";
import { VesselCompare } from "@/components/ds/VesselCompare/VesselCompare";
import { VesselTypeCard } from "@/components/ds/VesselTypeCard/VesselTypeCard";
import type { VesselType } from "@/components/ds/lib/types";
import { ClosingCruises } from "@/components/editorial/ClosingCruises";
import { EditorialFrame } from "@/components/editorial/EditorialFrame";
import { LinkCards } from "@/components/editorial/LinkCards";
import { TourCards, TourDetails } from "@/components/editorial/TourDetails";
import { Breadcrumbs } from "@/components/marketplace/Breadcrumbs";
import styles from "@/components/editorial/editorial.module.css";
import { PRICE_FACTORS, PRICE_FOOTNOTE, PRICE_PRESETS } from "@/content/price-factors";
import { ROUTE_STOPS } from "@/content/routes";
import { profileWithStats, VESSEL_TYPE_TEXT } from "@/content/vessel-types";
import { routing, type Locale } from "@/i18n/routing";
import { tourUrl, WORKBOOK_TOURS } from "@/lib/content/tours";
import { siteUrl } from "@/lib/env";
import { DIMENSIONS } from "@/lib/evaluation/method";
import { collectionJsonLd, jsonLdScript } from "@/lib/marketplace/listing";
import { companyPageJsonLd, MAIN_SIGHT, tourJsonLd, touristDestinationJsonLd, webApplicationJsonLd } from "@/lib/seo/jsonld";
import { BUILT, children, closingListing, LINK_MAP, NO_CLOSING, sentence } from "@/lib/seo/links";
import { absoluteUrl, pageMetadata } from "@/lib/seo/metadata";
import { editorialPage, vesselTypeStats } from "@/server/content/pages";
import { publicTours } from "@/server/content/tours";
import { ContactForm } from "../contact/ContactForm";
import { PlanForm } from "@/components/plan/PlanForm";
import { SeasonCalendar } from "@/components/calendar/SeasonCalendar";
import { RULE_WORDS } from "@/lib/payments/deadlines";
import { publicPremiumPeriods } from "@/server/content/premium";
import { publicListing } from "@/server/marketplace/queries";

/**
 * One renderer for the three education silos (Batch 6): Vessels, Prices Explained and the Guide. Each silo's route
 * is a thin catch-all; this decides each page's components from its workbook row and URL.
 */
export type SiloParams = { locale: Locale; path?: string[] };

const urlOf = (prefix: string, path?: string[]) => `${prefix}${path?.length ? `${path.join("/")}/` : ""}`;

export function siloStaticParams(prefix: string) {
  const urls = [...BUILT].filter((u) => u.startsWith(prefix));
  return routing.locales.flatMap((locale) =>
    urls.map((u) => ({ locale, path: u.slice(prefix.length).split("/").filter(Boolean) })),
  );
}

export async function siloMetadata(prefix: string, { locale, path }: SiloParams): Promise<Metadata> {
  const url = urlOf(prefix, path);
  const row = LINK_MAP[url];
  const page = row && BUILT.has(url) ? await editorialPage(row.id) : null;
  if (!row || !page) return {};
  return pageMetadata({ locale, path: url, title: page.seoTitle ?? row.h1, description: page.seoDescription });
}

/** Which vessel type a page is about, for its illustration, comparison default and closing cruises. */
const TYPE_OF: Record<string, VesselType | undefined> = {
  "/vessels/dahabiya/": "sail",
  "/vessels/dahabiya/a-day-on-board/": "sail",
  "/vessels/motor-cruise-ships/": "motor",
  "/vessels/motor-cruise-ships/a-day-on-board/": "motor",
  "/vessels/paddle-steamers/": "steam",
};

export async function SiloPage({ prefix, params }: { prefix: string; params: SiloParams }) {
  const { locale, path } = params;
  setRequestLocale(locale);
  const url = urlOf(prefix, path);
  const row = LINK_MAP[url];
  if (!row || !BUILT.has(url)) notFound();
  const [page, stats, all, tours] = await Promise.all([
    editorialPage(row.id),
    vesselTypeStats(),
    publicListing(),
    url.startsWith("/tours-extras/") ? publicTours() : Promise.resolve([]),
  ]);
  if (!page) notFound();
  const type = TYPE_OF[url] ?? ROUTE_STOPS[url]?.vessel;
  const profiles = (["sail", "motor", "steam"] as const).map((t) => profileWithStats(t, stats[t]));
  const compare = (
    <div className={styles.compare}>
      <VesselCompare profiles={profiles} defaultType={type} />
    </div>
  );
  // DATA-008: the price breakdown, flagged as sample data with an honest footnote.
  const anatomy = (preset: "low" | "high" = "low") => (
    <PriceAnatomy
      factors={PRICE_FACTORS}
      currency="USD"
      presets={PRICE_PRESETS}
      defaultPreset={preset}
      eyebrow="How a price is built"
      totalLabel="per person, 4 nights Luxor–Aswan"
      footnote={PRICE_FOOTNOTE}
      sample
    />
  );

  let lead: ReactNode = null;
  let hideChildren = false;
  let extra: ReactNode = null;
  const closing = !NO_CLOSING.has(url);
  const ld = (data: unknown) => <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(data) }} />;
  const description = page.seoDescription ?? page.standfirst.replace("[[up]]", "").trim();
  if (url === "/vessels/") {
    // The three vessel types as cards (their keyword is the link text, SEO-014), then the comparison.
    hideChildren = true;
    const typeHubs = new Set(profiles.map((p) => VESSEL_TYPE_TEXT[p.type].hub));
    lead = (
      <>
        <div className={styles.types}>
          {profiles.map((p) => {
            const hub = VESSEL_TYPE_TEXT[p.type].hub;
            return (
              <VesselTypeCard
                key={p.type}
                type={p.type}
                title={p.name}
                eyebrow={p.short}
                description={p.line}
                facts={p.facts}
                href={hub}
                cta={sentence(LINK_MAP[hub]!.keyword)}
              />
            );
          })}
        </div>
        {compare}
        <LinkCards title="Compare them" links={children(url).filter((l) => !typeHubs.has(l.href))} id="children" />
      </>
    );
  } else if (row.type === "Vessel type hub" && type) {
    lead = (
      <>
        <div className={styles.art}>
          <VesselArt type={type} />
        </div>
        {compare}
      </>
    );
  } else if (url.startsWith("/vessels/") && row.type === "Guide article" && type) {
    lead = (
      <div className={styles.scene}>
        <Scene time="dawn" vessel={type} label={`A ${VESSEL_TYPE_TEXT[type].name.toLowerCase()} on the Nile at dawn`} />
      </div>
    );
  } else if (url.startsWith("/vessels/")) {
    lead = compare;
  } else if (url === "/nile-cruise-prices/" || url === "/nile-cruise-prices/star-ratings-explained/") {
    lead = anatomy();
  } else if (url === "/nile-cruise-prices/budget-vs-luxury/") {
    lead = anatomy("high");
  } else if (row.type === "Tool") {
    // PAGE-059: the calculator is the price breakdown as a full-page tool.
    lead = anatomy();
    extra = (
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(webApplicationJsonLd(row.h1, absoluteUrl(locale, url))) }}
      />
    );
  } else if (ROUTE_STOPS[url]) {
    // SEO-023: a route guide shows the days and the vessels, never a price grid.
    lead = (
      <>
        <ItineraryTimeline scroll vessel={ROUTE_STOPS[url].vessel} stops={ROUTE_STOPS[url].stops} />
        {compare}
      </>
    );
  } else if (url === "/nile-cruise-guide/when-to-go/") {
    lead = (
      <div className={styles.scene}>
        <Scene time="day" vessel="motor" temple label="A Nile cruise ship passing a temple in the midday sun" />
      </div>
    );
    // EXP-006: the seasons and the payment deadline you'd face, from the same rules as booking.
    extra = (
      <>
        <SeasonCalendar
          today={new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" })}
          periods={await publicPremiumPeriods()}
        />
        <ul className={styles.rules}>
          {Object.values(RULE_WORDS).map((w) => (
            <li key={w}>{w.replace(/^./, (c) => c.toUpperCase())}, and always before departure.</li>
          ))}
        </ul>
      </>
    );
  } else if (url === "/nile-cruise-guide/" || url === "/nile-cruise-guide/planning/how-many-nights/") {
    lead = compare;
  } else if (url.startsWith("/destinations/")) {
    // PAGE-074–090: a scene until photos (ADR-096), and the destination's data.
    lead = (
      <div className={styles.scene}>
        <Scene time="dawn" temple vessel="sail" label={`${row.h1} from the river`} />
      </div>
    );
    if (url !== "/destinations/")
      extra = ld(touristDestinationJsonLd(row.h1, description, absoluteUrl(locale, url), MAIN_SIGHT[url]));
  } else if (url === "/tours-extras/") {
    lead = <TourCards tours={tours} />;
  } else if (WORKBOOK_TOURS[url]) {
    // DASH-PUB-006: each covered tour's details, with prices and the calendar link once it has rates (ADR-097).
    const covered = WORKBOOK_TOURS[url].map((slug) => tours.find((t) => t.slug === slug)).filter((t) => !!t);
    lead = covered.length ? (
      <>
        {covered.map((t) => (
          <TourDetails key={t.slug} tour={t} heading={covered.length > 1} />
        ))}
      </>
    ) : null;
    const prices = covered.map((t) => t.fromMinor).filter((m): m is number => m !== null);
    extra = ld(tourJsonLd(row.h1, description, absoluteUrl(locale, url), prices.length ? Math.min(...prices) : null));
  } else if (url === "/how-we-choose-vessels/") {
    // PAGE-102: the evaluation method's weights, straight from the code that scores vessels.
    lead = (
      <table className={styles.weights}>
        <caption className="visually-hidden">The seven dimensions and their weights</caption>
        <thead>
          <tr>
            <th scope="col">Dimension</th>
            <th scope="col">What is scored</th>
            <th scope="col">Weight</th>
          </tr>
        </thead>
        <tbody>
          {DIMENSIONS.map((d) => (
            <tr key={d.key}>
              <th scope="row">{d.label}</th>
              <td>{d.criteria.join("; ")}</td>
              <td>{d.weight} of 100</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  } else if (url === "/about/") {
    extra = ld(companyPageJsonLd("AboutPage", row.h1, absoluteUrl(locale, url), siteUrl));
  } else if (url === "/contact/") {
    lead = <ContactForm />;
    extra = ld(companyPageJsonLd("ContactPage", row.h1, absoluteUrl(locale, url), siteUrl));
  } else if (url === "/plan-my-cruise/") {
    // PAGE-105, DASH-PUB-007: plan without an account; the routes are the published itineraries'.
    const routes = [
      ...new Map(
        all.flatMap((v) =>
          v.itineraries.map((i) => [`${i.origin}→${i.destination}`, { origin: i.origin, destination: i.destination }]),
        ),
      ).values(),
    ].sort((a, b) => `${a.origin}${a.destination}`.localeCompare(`${b.origin}${b.destination}`));
    lead = <PlanForm routes={routes} today={new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" })} />;
    extra = ld(companyPageJsonLd("ContactPage", row.h1, absoluteUrl(locale, url), siteUrl));
  }

  return (
    <>
      <EditorialFrame
        locale={locale}
        url={url}
        page={page}
        lead={lead}
        hideChildren={hideChildren}
        closing={closing ? <ClosingCruises all={all} listing={closingListing(url)} type={TYPE_OF[url]} /> : null}
      />
      {extra}
      {/* SEO-005: a hub lists its pages (CollectionPage with an ItemList), as its workbook row asks. */}
      {row.schema.includes("CollectionPage")
        ? ld(
            collectionJsonLd(
              { name: row.h1, description, url: absoluteUrl(locale, url) },
              children(url).map((l) => ({ name: LINK_MAP[l.href]?.h1 ?? l.anchor, url: absoluteUrl(locale, l.href) })),
            ),
          )
        : null}
    </>
  );
}

/**
 * A tour without a workbook row of its own (DASH-ADM-072): /tours-extras/{tour slug}/. A tour a workbook page covers
 * redirects there, so each tour has one page.
 */
export async function TourPage({ params }: { params: SiloParams }) {
  const { locale, path } = params;
  setRequestLocale(locale);
  const slug = path?.length === 1 ? path[0]! : "";
  const home = tourUrl(slug);
  if (home !== `/tours-extras/${slug}/`) permanentRedirect(home);
  const tour = (await publicTours()).find((t) => t.slug === slug);
  if (!tour) notFound();
  const url = `/tours-extras/${slug}/`;
  return (
    <article className={styles.page}>
      <Breadcrumbs
        locale={locale}
        trail={[
          { name: "Home", path: "/" },
          { name: "Tours & extras", path: "/tours-extras/" },
          { name: tour.name, path: url },
        ]}
      />
      <header className={styles.head}>
        <h1 className={styles.title}>{tour.name}</h1>
      </header>
      <TourDetails tour={tour} heading={false} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(tourJsonLd(tour.name, tour.description, absoluteUrl(locale, url), tour.fromMinor)),
        }}
      />
    </article>
  );
}

export async function tourMetadata({ locale, path }: SiloParams): Promise<Metadata> {
  const slug = path?.length === 1 ? path[0]! : "";
  const tour = (await publicTours()).find((t) => t.slug === slug);
  if (!tour) return {};
  return pageMetadata({
    locale,
    path: `/tours-extras/${slug}`,
    title: `${tour.name} | Tours and extras`,
    description: tour.description?.split("\n")[0]?.slice(0, 160),
    noindex: tour.sample,
  });
}
