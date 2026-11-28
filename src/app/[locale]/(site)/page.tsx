import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CruiseSearch } from "@/components/ds/CruiseSearch/CruiseSearch";
import { Hero } from "@/components/ds/Hero/Hero";
import { VesselCompare } from "@/components/ds/VesselCompare/VesselCompare";
import { VesselTypeCard } from "@/components/ds/VesselTypeCard/VesselTypeCard";
import { vesselIcon } from "@/components/ds/lib/types";
import { ClosingCruises } from "@/components/editorial/ClosingCruises";
import styles from "@/components/editorial/editorial.module.css";
import { contentLocale } from "@/content/places";
import { vesselProfile, VESSEL_TYPE_TEXT } from "@/content/vessel-types";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { siteUrl } from "@/lib/env";
import { jsonLdScript, searchRoutes, vesselOptions } from "@/lib/marketplace/listing";
import { organizationJsonLd, websiteJsonLd } from "@/lib/seo/jsonld";
import { bridges, nameOf } from "@/lib/seo/links";
import { pageMetadata } from "@/lib/seo/metadata";
import { editorialPage } from "@/server/content/pages";
import { publicListing } from "@/server/marketplace/queries";

type Props = { params: Promise<{ locale: Locale }> };

/** The hero carries one sentence over the picture; the full intro follows below it. Japanese ends its own with 。 */
const firstSentence = (s: string) => s.match(/^.+?(?:[.?](\s|$)|[。？])/)?.[0].trim() ?? s;

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
  const words = contentLocale(locale);
  const [page, all] = await Promise.all([editorialPage("P001", locale), publicListing(words)]);
  const t = await getTranslations({ locale, namespace: "editorial" });
  const common = await getTranslations({ locale, namespace: "common" });
  const profiles = (["sail", "motor", "steam"] as const).map((kind) => vesselProfile(kind, words));
  const [types, prices, how] = page?.sections ?? [];
  const pillars = bridges("/", locale).filter((b) => b.href !== "/cruises/");
  return (
    <>
      {/* No eyebrow: the logo already says "Nile cruises, explained" (Islam's review, 6 Nov 2026). */}
      <Hero
        title={page?.title ?? t("homeTitle")}
        subtitle={page ? firstSentence(page.standfirst) : undefined}
        vessel="sail"
        height={560}
      >
        <CruiseSearch
          routes={searchRoutes(all, locale)}
          vessels={vesselOptions(locale).map((o) => ({
            id: o.id,
            label: o.label,
            icon: o.type ? vesselIcon[o.type] : undefined,
          }))}
          action="/cruises/"
          onMedia
        />
      </Hero>
      <div className={styles.page}>
        {page?.review === "draft" ? (
          <p className={styles.flags}>
            <span>{common("draft")}</span>
          </p>
        ) : null}
        {/* The rest of the intro, when it runs past the hero's one sentence. */}
        {page && page.standfirst !== firstSentence(page.standfirst) ? <p className={styles.lead}>{page.standfirst}</p> : null}
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
                cta={nameOf(hub, locale)}
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
          <nav aria-label={t("guides")} className={styles.related}>
            <h2>{t("startHere")}</h2>
            <ul>
              {pillars.map((b) => (
                <li key={b.href}>
                  <Link href={b.href}>{b.anchor}</Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
        <ClosingCruises all={all} listing={{ href: "/cruises/", anchor: t("nileCruises") }} />
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(organizationJsonLd(siteUrl, locale)) }}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(websiteJsonLd(siteUrl)) }} />
    </>
  );
}
