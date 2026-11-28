import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { ClosingCruises } from "@/components/editorial/ClosingCruises";
import { LinkCards } from "@/components/editorial/LinkCards";
import { Breadcrumbs } from "@/components/marketplace/Breadcrumbs";
import styles from "@/components/editorial/editorial.module.css";
import { aboutFor } from "@/content/about";
import { contentLocale } from "@/content/places";
import { routing, type Locale } from "@/i18n/routing";
import { siteUrl } from "@/lib/env";
import { jsonLdScript } from "@/lib/marketplace/listing";
import { companyPageJsonLd } from "@/lib/seo/jsonld";
import { closingListing, trail } from "@/lib/seo/links";
import { absoluteUrl, pageMetadata } from "@/lib/seo/metadata";
import { publicListing } from "@/server/marketplace/queries";

type Props = { params: Promise<{ locale: Locale }> };
const URL = "/about/";

// Static, refreshed when the catalogue changes or every ten minutes, for the closing cruises (PERF-010).
export const revalidate = 600;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const about = aboutFor(locale);
  return pageMetadata({ locale, path: URL, title: about.seoTitle, description: about.seoDescription });
}

/** PAGE-101: who evaluates the vessels, one block per job they did on board. */
export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const about = aboutFor(locale);
  const all = await publicListing(contentLocale(locale));
  return (
    <article className={styles.page}>
      <Breadcrumbs locale={locale} trail={trail(URL, locale)} />
      <header className={styles.head}>
        <p className={styles.eyebrow}>{about.eyebrow}</p>
        <h1 className={styles.title}>{about.title}</h1>
        <p className={styles.lead}>{about.subtitle}</p>
      </header>
      <section className={styles.section}>
        {about.intro.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </section>
      <ul className={styles.roles} aria-label={about.rolesLabel}>
        {about.roles.map((r) => (
          <li key={r.role}>
            <p className={styles.eyebrow}>{r.role}</p>
            <h2>{r.lead}</h2>
            <p>{r.text}</p>
          </li>
        ))}
      </ul>
      <section className={styles.section}>
        <h2 className={styles.statement}>{about.statement}</h2>
        {about.closing.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </section>
      <LinkCards
        title={about.keepReading}
        links={[{ href: "/how-we-choose-vessels/", anchor: about.howWeChoose }]}
        id="keep-reading"
      />
      {/* SEO-012: like every information page, About ends with cruises you can book. */}
      <ClosingCruises all={all} listing={closingListing(URL, locale)} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(companyPageJsonLd("AboutPage", about.eyebrow, absoluteUrl(locale, URL), siteUrl)),
        }}
      />
    </article>
  );
}
