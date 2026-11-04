import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ds/Button/Button";
import { VesselCompare } from "@/components/ds/VesselCompare/VesselCompare";
import { VesselTypeCard } from "@/components/ds/VesselTypeCard/VesselTypeCard";
import type { VesselType } from "@/components/ds/lib/types";
import { Breadcrumbs } from "@/components/marketplace/Breadcrumbs";
import { ListingGrid } from "@/components/marketplace/ListingGrid";
import { SAMPLE_VESSELS, vesselProfile, VESSEL_TYPE_TEXT } from "@/content/vessel-types";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import type { EditorialPage } from "@/lib/content/editorial";
import { jsonLdScript, toCard, type ListingVessel } from "@/lib/marketplace/listing";
import { articleJsonLd, faqJsonLd } from "@/lib/seo/jsonld";
import { absoluteUrl } from "@/lib/seo/metadata";
import { VesselChooser } from "./VesselChooser";
import styles from "./editorial.module.css";

const URL = "/vessels/";
const TYPES: VesselType[] = ["sail", "motor", "steam"];

/**
 * PAGE-026, /vessels/ (Islam's vessels brief, 3 Nov 2026, ADR-106): the three vessel types explained, a chooser, the
 * full comparison, who evaluates, how to choose, one sample vessel of each type, questions and a next step. Laid out by
 * hand, so its copy is in the message files (EN, with ES and JA drafted for review) rather than a Sanity article.
 */
export async function VesselsPillar({ locale, all }: { locale: Locale; all: ListingVessel[] }) {
  const t = await getTranslations({ locale, namespace: "vesselsPillar" });
  const profiles = TYPES.map((type) => vesselProfile(type, locale));
  const faqs = (t.raw("faqs.items") as { q: string }[]).map((f, i) => ({
    q: f.q,
    a: t.rich(`faqs.items.${i}.a`, { link: (c) => <Link href="/how-we-choose-vessels/">{c}</Link> }),
    plain: t.markup(`faqs.items.${i}.a`, { link: (c) => c }),
  }));
  // One of each type, in the brief's order; a vessel that isn't published simply isn't shown.
  const samples = SAMPLE_VESSELS.map((slug) => all.find((v) => v.slug === slug)).filter((v) => !!v);
  const page: EditorialPage = {
    id: "P026",
    title: t("hero.title"),
    standfirst: t("hero.intro"),
    sections: [],
    faqs: faqs.map((f) => ({ q: f.q, a: f.plain })),
    seoDescription: t("meta.description"),
    sample: false,
    review: "approved",
  };
  const url = absoluteUrl(locale, URL);
  const faq = faqJsonLd(page);
  return (
    <article className={styles.page}>
      <Breadcrumbs
        locale={locale}
        trail={[
          { name: t("crumbs.home"), path: "/" },
          { name: t("crumbs.vessels"), path: URL },
        ]}
      />
      <header className={styles.head}>
        <h1 className={styles.title}>{t("hero.title")}</h1>
        <p className={styles.lead}>{t("hero.intro")}</p>
        <div className={styles.actions}>
          <Button variant="primary" href="#chooser">
            {t("hero.choose")}
          </Button>
          <Button variant="outline" href="#compare">
            {t("hero.compare")}
          </Button>
        </div>
      </header>

      <section className={styles.wide} id="chooser" aria-labelledby="chooser-heading">
        <h2 id="chooser-heading">{t("chooser.heading")}</h2>
        <p>{t("chooser.intro")}</p>
        <VesselChooser />
      </section>

      <section aria-labelledby="types-heading">
        <h2 id="types-heading" className="visually-hidden">
          {t("types.heading")}
        </h2>
        <div className={styles.types}>
          {profiles.map((p) => (
            <VesselTypeCard
              key={p.type}
              type={p.type}
              title={p.name}
              eyebrow={p.short}
              description={p.line}
              facts={p.facts}
              href={VESSEL_TYPE_TEXT[p.type].hub}
              cta={t(`types.links.${p.type}`)}
            />
          ))}
        </div>
      </section>

      <section className={styles.wide} id="compare" aria-labelledby="compare-heading">
        <h2 id="compare-heading">{t("compare.heading")}</h2>
        <div className={styles.compare}>
          <VesselCompare
            profiles={profiles}
            defaultAll
            note={t.rich("compare.note", { link: (c) => <Link href="/how-we-choose-vessels/">{c}</Link> })}
          />
        </div>
        <ul className={styles.inline}>
          <li>
            <Link href="/nile-cruise-prices/">{t("compare.prices")}</Link>
          </li>
          <li>
            <Link href="/vessels/compare/">{t("compare.sideBySide")}</Link>
          </li>
        </ul>
      </section>

      <section className={styles.section} aria-labelledby="trust-heading">
        <h2 id="trust-heading">{t("trust.heading")}</h2>
        <p>{t("trust.text")}</p>
        <p>
          <Link href="/how-we-choose-vessels/" className={styles.more}>
            {t("trust.link")}
          </Link>
        </p>
      </section>

      {TYPES.map((type) => (
        <section key={type} className={styles.section} aria-labelledby={`about-${type}`}>
          <h2 id={`about-${type}`}>{t(`sections.${type}.heading`)}</h2>
          {(t.raw(`sections.${type}.paragraphs`) as string[]).map((p) => (
            <p key={p}>{p}</p>
          ))}
        </section>
      ))}

      <section className={styles.wide} aria-labelledby="choose-heading">
        <h2 id="choose-heading">{t("choose.heading")}</h2>
        <ul className={styles.panels}>
          {profiles.map((p) => (
            <li key={p.type}>
              <h3>{p.name}</h3>
              <p>{t.rich(`choose.${p.type}.yes`, { b: (c) => <strong>{c}</strong> })}</p>
              <p>{t.rich(`choose.${p.type}.no`, { b: (c) => <strong>{c}</strong> })}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.closing} aria-labelledby="samples-heading">
        <h2 id="samples-heading">{t("samples.heading")}</h2>
        <p>{t("samples.intro")}</p>
        {samples.length ? (
          <ListingGrid
            cards={samples.map((v) => {
              // The heading and intro already say these can't be booked yet, so the card doesn't repeat it.
              const card = toCard(v);
              return { ...card, badges: card.badges?.filter((b) => b.label !== "Information only") };
            })}
            why={Object.fromEntries(
              samples.map((v) => [
                v.slug,
                <>
                  {v.cabinCount ? <p>{t("samples.cabins", { count: v.cabinCount })}</p> : null}
                  {v.lengthM && v.beamM ? (
                    <p>
                      {t("samples.size", {
                        length: new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(v.lengthM),
                        beam: new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(v.beamM),
                      })}
                    </p>
                  ) : null}
                  {/* The record's summary is English; the other languages show the facts only. */}
                  {locale === "en" && v.summary ? <p>{v.summary}</p> : null}
                </>,
              ]),
            )}
          />
        ) : (
          <p className={styles.muted}>{t("samples.empty")}</p>
        )}
        <p>
          <Link href="/cruises/" className={styles.more}>
            {t("samples.more")}
          </Link>
        </p>
      </section>

      <section className={styles.section} aria-labelledby="faqs">
        <h2 id="faqs">{t("faqs.heading")}</h2>
        <dl className={styles.faqs}>
          {faqs.map((f) => (
            <div key={f.q}>
              <dt>{f.q}</dt>
              <dd>{f.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className={styles.cta} aria-labelledby="cta-heading">
        <h2 id="cta-heading">{t("cta.heading")}</h2>
        <p>{t("cta.text")}</p>
        <Button variant="primary" icon="arrow-right" href="/plan-my-cruise/">
          {t("cta.button")}
        </Button>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript({ ...articleJsonLd(page, url), inLanguage: locale }) }}
      />
      {faq ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(faq) }} /> : null}
    </article>
  );
}
