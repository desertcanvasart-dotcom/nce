import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { ClosingCruises } from "@/components/editorial/ClosingCruises";
import { LinkCards } from "@/components/editorial/LinkCards";
import { Breadcrumbs } from "@/components/marketplace/Breadcrumbs";
import styles from "@/components/editorial/editorial.module.css";
import { ABOUT } from "@/content/about";
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
  return pageMetadata({ locale, path: URL, title: ABOUT.seoTitle, description: ABOUT.seoDescription });
}

/** PAGE-101: who evaluates the vessels, one block per job they did on board. */
export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const all = await publicListing();
  return (
    <article className={styles.page}>
      <Breadcrumbs locale={locale} trail={trail(URL)} />
      <header className={styles.head}>
        <p className={styles.eyebrow}>About Nilecruz</p>
        <h1 className={styles.title}>{ABOUT.title}</h1>
        <p className={styles.lead}>{ABOUT.subtitle}</p>
      </header>
      <section className={styles.section}>
        {ABOUT.intro.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </section>
      <ul className={styles.roles} aria-label="Where we worked on board">
        {ABOUT.roles.map((r) => (
          <li key={r.role}>
            <p className={styles.eyebrow}>{r.role}</p>
            <h2>{r.lead}</h2>
            <p>{r.text}</p>
          </li>
        ))}
      </ul>
      <section className={styles.section}>
        <h2 className={styles.statement}>{ABOUT.statement}</h2>
        {ABOUT.closing.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </section>
      <LinkCards
        title="Keep reading"
        links={[{ href: "/how-we-choose-vessels/", anchor: "How we choose vessels" }]}
        id="keep-reading"
      />
      {/* SEO-012: like every information page, About ends with cruises you can book. */}
      <ClosingCruises all={all} listing={closingListing(URL)} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(companyPageJsonLd("AboutPage", "About Nilecruz", absoluteUrl(locale, URL), siteUrl)),
        }}
      />
    </article>
  );
}
