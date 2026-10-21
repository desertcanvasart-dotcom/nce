import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { Breadcrumbs } from "@/components/marketplace/Breadcrumbs";
import styles from "@/components/editorial/editorial.module.css";
import { BOOKING_RULE, FAQS, FOR_IT, GLOSSARY, INTRO, NEVER, START, WAYS, type Shot } from "@/content/operator-connect";
import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { jsonLdScript } from "@/lib/marketplace/listing";
import { absoluteUrl, pageMetadata } from "@/lib/seo/metadata";
import own from "./connect.module.css";

type Props = { params: Promise<{ locale: Locale }> };
const URL = "/operators/connect/";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata({ locale, path: URL, title: INTRO.seoTitle, description: INTRO.seoDescription });
}

/** A screenshot shows once its file is in public/ (taken by scripts/operator-shots.ts from sample data). */
function Figure({ shot }: { shot: Shot }) {
  if (!existsSync(join(process.cwd(), "public", shot.file))) return null;
  return (
    <figure className={own.figure}>
      {/* eslint-disable-next-line @next/next/no-img-element -- static screenshots, already sized and compressed */}
      <img src={shot.file} alt={shot.alt} width={shot.width} height={shot.height} loading="lazy" decoding="async" />
      <figcaption>{shot.caption}</figcaption>
    </figure>
  );
}

/**
 * PAGE-107 (Faris, 21 Oct 2026): every way an operator can connect, step by step, with screenshots from the system
 * (sample data). Linked from the footer only. Draft copy for review.
 */
export default async function OperatorsConnect({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
  return (
    <article className={styles.page}>
      <Breadcrumbs
        locale={locale}
        trail={[
          { name: "Home", path: "/" },
          { name: "How operators connect", path: URL },
        ]}
      />
      <header className={styles.head}>
        <p className={styles.flags}>
          <span>Draft for review</span>
        </p>
        <h1 className={styles.title}>{INTRO.title}</h1>
        <p className={styles.lead}>{INTRO.lead}</p>
      </header>

      <section className={styles.section} aria-labelledby="words">
        <h2 id="words">A few words we use</h2>
        <dl className={styles.faqs}>
          {GLOSSARY.map((g) => (
            <div key={g.term}>
              <dt>{g.term}</dt>
              <dd>{g.meaning}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className={own.wide} aria-labelledby="ways">
        <h2 id="ways">The six ways at a glance</h2>
        <div className={own.tableWrap}>
          <table className={own.table}>
            <caption className="visually-hidden">The six ways to connect, compared</caption>
            <thead>
              <tr>
                <th scope="col">Way</th>
                <th scope="col">Work for you</th>
                <th scope="col">How fresh</th>
                <th scope="col">How guests book</th>
              </tr>
            </thead>
            <tbody>
              {WAYS.map((w) => (
                <tr key={w.id}>
                  <th scope="row">
                    <a href={`#${w.id}`}>{w.title.replace(/^\d+\.\s*/, "")}</a>
                  </th>
                  <td data-label="Work for you">{w.effort}</td>
                  <td data-label="How fresh">{w.freshness}</td>
                  <td data-label="How guests book">{w.booking}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {WAYS.map((w) => (
        <section key={w.id} className={own.way} aria-labelledby={w.id}>
          <h2 id={w.id}>{w.title}</h2>
          <p className={styles.lead}>{w.summary}</p>
          <p className={styles.booking}>
            <strong>Best for:</strong> {w.bestFor}
          </p>
          <div className={styles.split}>
            <div>
              <h3>What you do</h3>
              <ol className={styles.steps}>
                {w.steps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
            </div>
            <div>
              <h3>What Nilecruz does</h3>
              <ul>
                {w.weDo.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          </div>
          <p>
            <strong>How often:</strong> {w.update}
          </p>
          {w.notes?.map((n) => (
            <p key={n} className={styles.muted}>
              {n}
            </p>
          ))}
          {w.shots.map((s) => (
            <Figure key={s.file} shot={s} />
          ))}
        </section>
      ))}

      <section className={styles.section} aria-labelledby="booking">
        <h2 id="booking">{BOOKING_RULE.title}</h2>
        {BOOKING_RULE.paragraphs.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </section>

      <section className={styles.section} aria-labelledby="never">
        <h2 id="never">What Nilecruz never does</h2>
        <ul>
          {NEVER.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      </section>

      <section className={styles.section} aria-labelledby="start">
        <h2 id="start">{START.title}</h2>
        <ol className={styles.steps}>
          {START.steps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
        <p>
          <Link className={own.cta} href={START.apply}>
            Apply as an operator
          </Link>{" "}
          or <Link href="/contact/">ask us a question</Link>.
        </p>
      </section>

      <section className={styles.section} aria-labelledby="questions">
        <h2 id="questions">Questions operators ask</h2>
        <dl className={styles.faqs}>
          {FAQS.map((f) => (
            <div key={f.q}>
              <dt>{f.q}</dt>
              <dd>{f.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className={styles.section} aria-labelledby="it">
        <h2 id="it">{FOR_IT.title}</h2>
        {FOR_IT.paragraphs.map((p) => (
          <p key={p}>{p}</p>
        ))}
        <pre className={own.code} aria-label="A short example of the format, in JSON">
          {FOR_IT.sample}
        </pre>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript({ ...faq, url: absoluteUrl(locale, URL) }) }}
      />
    </article>
  );
}
