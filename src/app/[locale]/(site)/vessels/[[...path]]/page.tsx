import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Scene } from "@/components/ds/Scene/Scene";
import { VesselArt } from "@/components/ds/VesselArt/VesselArt";
import { VesselCompare } from "@/components/ds/VesselCompare/VesselCompare";
import { VesselTypeCard } from "@/components/ds/VesselTypeCard/VesselTypeCard";
import type { VesselType } from "@/components/ds/lib/types";
import { ClosingCruises } from "@/components/editorial/ClosingCruises";
import { EditorialFrame } from "@/components/editorial/EditorialFrame";
import { LinkCards } from "@/components/editorial/LinkCards";
import styles from "@/components/editorial/editorial.module.css";
import { profileWithStats, VESSEL_TYPE_TEXT } from "@/content/vessel-types";
import { routing, type Locale } from "@/i18n/routing";
import { BUILT, children, closingListing, LINK_MAP, sentence } from "@/lib/seo/links";
import { pageMetadata } from "@/lib/seo/metadata";
import { editorialPage, vesselTypeStats } from "@/server/content/pages";
import { publicListing } from "@/server/marketplace/queries";

type Props = { params: Promise<{ locale: Locale; path?: string[] }> };

// Static, refreshed when content is published or the catalogue changes, or every ten minutes (PERF-010).
export const revalidate = 600;
export const dynamicParams = false;

const urlOf = (path?: string[]) => `/vessels/${path?.length ? `${path.join("/")}/` : ""}`;
const VESSEL_URLS = [...BUILT].filter((u) => u.startsWith("/vessels/"));

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => VESSEL_URLS.map((u) => ({ locale, path: u.split("/").filter(Boolean).slice(1) })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, path } = await params;
  const url = urlOf(path);
  const row = LINK_MAP[url];
  const page = row ? await editorialPage(row.id) : null;
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

/** PAGE-026–042 (Phase 1): the Vessels silo. */
export default async function VesselsSilo({ params }: Props) {
  const { locale, path } = await params;
  setRequestLocale(locale);
  const url = urlOf(path);
  const row = LINK_MAP[url];
  if (!row || !BUILT.has(url)) notFound();
  const [page, stats, all] = await Promise.all([editorialPage(row.id), vesselTypeStats(), publicListing()]);
  if (!page) notFound();
  const type = TYPE_OF[url];
  const profiles = (["sail", "motor", "steam"] as const).map((t) => profileWithStats(t, stats[t]));
  const compare = (
    <div className={styles.compare}>
      <VesselCompare profiles={profiles} defaultType={type} />
    </div>
  );

  let lead: React.ReactNode = null;
  let hideChildren = false;
  if (row.type === "Pillar") {
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
  } else if (row.type === "Guide article" && type) {
    lead = (
      <div className={styles.scene}>
        <Scene time="dawn" vessel={type} label={`A ${VESSEL_TYPE_TEXT[type].name.toLowerCase()} on the Nile at dawn`} />
      </div>
    );
  } else if (row.type === "Hub" || row.type === "Comparison") {
    lead = compare;
  }

  return (
    <EditorialFrame
      locale={locale}
      url={url}
      page={page}
      lead={lead}
      hideChildren={hideChildren}
      closing={<ClosingCruises all={all} listing={closingListing(url)} type={type} />}
    />
  );
}
