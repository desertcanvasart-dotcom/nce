import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CruiseSearch } from "@/components/ds/CruiseSearch/CruiseSearch";
import { Hero } from "@/components/ds/Hero/Hero";
import { VesselCompare } from "@/components/ds/VesselCompare/VesselCompare";
import { VesselTypeCard } from "@/components/ds/VesselTypeCard/VesselTypeCard";
import { vesselIcon } from "@/components/ds/lib/types";
import { ClosingCruises } from "@/components/editorial/ClosingCruises";
import styles from "@/components/editorial/editorial.module.css";
import { profileWithStats, VESSEL_TYPE_TEXT } from "@/content/vessel-types";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { siteUrl } from "@/lib/env";
import { jsonLdScript, searchRoutes, VESSEL_OPTIONS } from "@/lib/marketplace/listing";
import { organizationJsonLd, websiteJsonLd } from "@/lib/seo/jsonld";
import { bridges, LINK_MAP, sentence } from "@/lib/seo/links";
import { pageMetadata } from "@/lib/seo/metadata";
import { editorialPage, vesselTypeStats } from "@/server/content/pages";
import { publicListing } from "@/server/marketplace/queries";

type Props = { params: Promise<{ locale: Locale }> };

/** The hero carries one sentence over the picture; the full intro follows below it. */
const firstSentence = (s: string) => s.match(/^.+?[.?](\s|$)/)?.[0].trim() ?? s;

// Static, refreshed with the content and the catalogue (PERF-010).
export const revalidate = 600;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    ...pageMetadata({ locale, path: "/", title: t("homeTitle"), description: t("homeDescription") }),
    title: { absolute: `${t("homeTitle")} | ${t("siteName")}` },
  };
}

/** PAGE-001: the home page. Its sections are the drafted copy (ADR-096); its components show real data. */
export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [page, stats, all] = await Promise.all([editorialPage("P001"), vesselTypeStats(), publicListing()]);
  const profiles = (["sail", "motor", "steam"] as const).map((t) => profileWithStats(t, stats[t]));
  const [types, prices, how] = page?.sections ?? [];
  const pillars = bridges("/").filter((b) => b.href !== "/cruises/");
  return (
    <>
      <Hero
        title={page?.title ?? "Nile cruises, explained before you sail"}
        eyebrow="Nile cruises, explained"
        subtitle={page ? firstSentence(page.standfirst) : undefined}
        vessel="sail"
        height={560}
      >
        <CruiseSearch
          routes={searchRoutes(all)}
          vessels={VESSEL_OPTIONS.map((o) => ({ id: o.id, label: o.label, icon: o.type ? vesselIcon[o.type] : undefined }))}
          action="/cruises/"
          onMedia
        />
      </Hero>
      <div className={styles.page}>
        {page?.review === "draft" ? (
          <p className={styles.flags}>
            <span>Draft for review</span>
          </p>
        ) : null}
        {page ? <p className={styles.lead}>{page.standfirst}</p> : null}
        {types ? (
          <section className={styles.section} aria-labelledby="types">
            <h2 id="types">{types.heading}</h2>
            {types.paragraphs.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </section>
        ) : null}
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
        <div className={styles.compare}>
          <VesselCompare profiles={profiles} />
        </div>
        {[prices, how].filter(Boolean).map((s) => (
          <section key={s!.heading} className={styles.section}>
            <h2>{s!.heading}</h2>
            {s!.paragraphs.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </section>
        ))}
        {pillars.length ? (
          <nav aria-label="Guides" className={styles.related}>
            <h2>Start here</h2>
            <ul>
              {pillars.map((b) => (
                <li key={b.href}>
                  <Link href={b.href}>{b.anchor}</Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
        <ClosingCruises all={all} listing={{ href: "/cruises/", anchor: "Nile cruises" }} />
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(organizationJsonLd(siteUrl)) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(websiteJsonLd(siteUrl)) }} />
    </>
  );
}
