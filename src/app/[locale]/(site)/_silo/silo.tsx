import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
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
import styles from "@/components/editorial/editorial.module.css";
import { PRICE_FACTORS, PRICE_FOOTNOTE, PRICE_PRESETS } from "@/content/price-factors";
import { ROUTE_STOPS } from "@/content/routes";
import { profileWithStats, VESSEL_TYPE_TEXT } from "@/content/vessel-types";
import { routing, type Locale } from "@/i18n/routing";
import { jsonLdScript } from "@/lib/marketplace/listing";
import { webApplicationJsonLd } from "@/lib/seo/jsonld";
import { BUILT, children, closingListing, LINK_MAP, sentence } from "@/lib/seo/links";
import { absoluteUrl, pageMetadata } from "@/lib/seo/metadata";
import { editorialPage, vesselTypeStats } from "@/server/content/pages";
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
  const [page, stats, all] = await Promise.all([editorialPage(row.id), vesselTypeStats(), publicListing()]);
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
        <ItineraryTimeline vessel={ROUTE_STOPS[url].vessel} stops={ROUTE_STOPS[url].stops} />
        {compare}
      </>
    );
  } else if (url === "/nile-cruise-guide/when-to-go/") {
    lead = (
      <div className={styles.scene}>
        <Scene time="day" vessel="motor" temple label="A Nile cruise ship passing a temple in the midday sun" />
      </div>
    );
  } else if (url === "/nile-cruise-guide/" || url === "/nile-cruise-guide/planning/how-many-nights/") {
    lead = compare;
  }

  return (
    <>
      <EditorialFrame
        locale={locale}
        url={url}
        page={page}
        lead={lead}
        hideChildren={hideChildren}
        closing={<ClosingCruises all={all} listing={closingListing(url)} type={TYPE_OF[url]} />}
      />
      {extra}
    </>
  );
}
