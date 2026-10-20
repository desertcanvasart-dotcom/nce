import type { ReactNode } from "react";
import { Breadcrumbs } from "@/components/marketplace/Breadcrumbs";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { splitUp, type EditorialPage } from "@/lib/content/editorial";
import { jsonLdScript } from "@/lib/marketplace/listing";
import { articleJsonLd, faqJsonLd } from "@/lib/seo/jsonld";
import { bridges, children, siblings, trail, up } from "@/lib/seo/links";
import { absoluteUrl } from "@/lib/seo/metadata";
import { LinkCards } from "./LinkCards";
import styles from "./editorial.module.css";

type Props = {
  locale: Locale;
  url: string;
  page: EditorialPage;
  /** Components after the intro (VesselCompare, cards…). */
  lead?: ReactNode;
  /** The closing cruise row (SEO-012), and anything else after the sections. */
  closing?: ReactNode;
  /** Pillars show their children with richer cards of their own. */
  hideChildren?: boolean;
};

/**
 * One template for every education page (Batch 6): breadcrumb, H1, the intro with its one link up (SEO-008), the
 * page's components and sections, its children (SEO-009), bridges to other silos (SEO-011), "Keep reading" (SEO-010),
 * FAQs, the closing cruises (SEO-012), and Article and FAQPage data. Draft copy says so (ADR-096).
 */
export function EditorialFrame({ locale, url, page, lead, closing, hideChildren }: Props) {
  const [before, after] = splitUp(page.standfirst);
  const parent = up(url);
  const faq = faqJsonLd(page);
  const crossLinks = bridges(url).filter((b) => !b.href.startsWith("/cruises/"));
  return (
    <article className={styles.page}>
      <Breadcrumbs locale={locale} trail={trail(url)} />
      <header className={styles.head}>
        {page.review === "draft" || page.sample ? (
          <p className={styles.flags}>
            {page.review === "draft" ? <span>Draft for review</span> : null}
            {page.sample ? <span>Sample data</span> : null}
          </p>
        ) : null}
        <h1 className={styles.title}>{page.title}</h1>
        <p className={styles.lead}>
          {before}
          {parent ? <Link href={parent.href}>{page.upAnchor ?? parent.anchor}</Link> : null}
          {after}
        </p>
      </header>
      {lead}
      {page.sections.map((s, i) => (
        <section key={i} className={styles.section}>
          {s.heading ? <h2>{s.heading}</h2> : null}
          {s.paragraphs.map((p, j) => (
            <p key={j}>{p}</p>
          ))}
        </section>
      ))}
      {hideChildren ? null : <LinkCards title="In this guide" links={children(url)} id="children" />}
      {crossLinks.length ? (
        <nav aria-label="Related guides" className={styles.related}>
          <h2>Related</h2>
          <ul>
            {crossLinks.map((b) => (
              <li key={b.href}>
                <Link href={b.href}>{b.anchor}</Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
      <LinkCards title="Keep reading" links={siblings(url)} id="keep-reading" />
      {page.faqs.length ? (
        <section className={styles.section} aria-labelledby="faqs">
          <h2 id="faqs">Questions</h2>
          <dl className={styles.faqs}>
            {page.faqs.map((f) => (
              <div key={f.q}>
                <dt>{f.q}</dt>
                <dd>{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}
      {closing}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(articleJsonLd(page, absoluteUrl(locale, url))) }}
      />
      {faq ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(faq) }} /> : null}
    </article>
  );
}
