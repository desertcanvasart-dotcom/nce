import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ds/Button/Button";
import { Scene } from "@/components/ds/Scene/Scene";
import { Breadcrumbs } from "@/components/marketplace/Breadcrumbs";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import type { EditorialPage } from "@/lib/content/editorial";
import { jsonLdScript } from "@/lib/marketplace/listing";
import { articleJsonLd, faqJsonLd } from "@/lib/seo/jsonld";
import { absoluteUrl } from "@/lib/seo/metadata";
import { GuidePlanner } from "./GuidePlanner";
import styles from "./editorial.module.css";

const URL = "/nile-cruise-guide/";
const DECISIONS = ["route", "season", "nights", "around"] as const;
/** Each decision's descriptive links: the guide's child articles, and for the last, what's booked separately. */
const DECISION_LINKS: Record<(typeof DECISIONS)[number], [key: string, href: string][]> = {
  route: [["routes", "/nile-cruise-guide/routes/"]],
  season: [["whenToGo", "/nile-cruise-guide/when-to-go/"]],
  nights: [["nights", "/nile-cruise-guide/planning/how-many-nights/"]],
  around: [
    ["planning", "/nile-cruise-guide/planning/"],
    ["included", "/nile-cruise-prices/whats-included/"],
    ["extras", "/tours-extras/"],
  ],
};

/**
 * PAGE-002, /nile-cruise-guide/ (Islam's guide brief, 4 Nov 2026): the trip-planning hub. It answers "how do I plan
 * this trip?" (route, time of year, nights, what to book separately) and leaves choosing a boat to /vessels/, which it
 * links once in the hero and once after the four decisions. Laid out by hand like the vessels pillar (ADR-106), so its
 * copy is in the message files: EN as approved, ES and JA drafted for review.
 */
export async function GuideHub({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "guideHub" });
  const faqs = t.raw("faqs.items") as { q: string; a: string }[];
  const page: EditorialPage = {
    id: "P002",
    title: t("hero.title"),
    standfirst: t("hero.intro"),
    sections: [],
    faqs,
    seoDescription: t("meta.description"),
    sample: false,
    review: "approved",
  };
  const faq = faqJsonLd(page);
  return (
    <article className={styles.page}>
      <Breadcrumbs
        locale={locale}
        trail={[
          { name: t("crumbs.home"), path: "/" },
          { name: t("crumbs.guide"), path: URL },
        ]}
      />
      <header className={styles.head}>
        <h1 className={styles.title}>{t("hero.title")}</h1>
        <p className={styles.lead}>{t("hero.intro")}</p>
        <div className={styles.actions}>
          <Button variant="primary" href="#planner">
            {t("hero.plan")}
          </Button>
          <Button variant="outline" href="/vessels/">
            {t("hero.compare")}
          </Button>
        </div>
      </header>

      <div className={styles.scene}>
        <Scene time="dawn" vessel={null} temple label={t("meta.image")} />
      </div>

      <section className={styles.wide} id="planner" aria-labelledby="planner-heading">
        <h2 id="planner-heading">{t("planner.heading")}</h2>
        {/* Only this page sends the planner's words to the browser (PERF: the layout leaves guideHub out). */}
        <NextIntlClientProvider>
          <GuidePlanner />
        </NextIntlClientProvider>
      </section>

      <section className={styles.section} aria-labelledby="short-heading">
        <h2 id="short-heading">{t("short.heading")}</h2>
        <dl className={styles.facts}>
          {(t.raw("short.items") as { label: string; text: string }[]).map((s) => (
            <div key={s.label}>
              <dt>{s.label}</dt>
              <dd>{s.text}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className={styles.section} aria-labelledby="decisions-heading">
        <h2 id="decisions-heading">{t("decisions.heading")}</h2>
        {DECISIONS.map((d) => (
          <div key={d} className={styles.decision}>
            <h3>{t(`decisions.${d}.heading`)}</h3>
            <p>{t(`decisions.${d}.text`)}</p>
            <ul className={styles.inline}>
              {DECISION_LINKS[d].map(([key, href]) => (
                <li key={href}>
                  <Link href={href} className={styles.more}>
                    {t(`decisions.links.${key}`)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <p className={styles.callout}>{t.rich("boat", { link: (c) => <Link href="/vessels/">{c}</Link> })}</p>
      </section>

      <section className={styles.section} aria-labelledby="day-heading">
        <h2 id="day-heading">{t("day.heading")}</h2>
        <p>{t("day.text")}</p>
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
        <div className={styles.actions}>
          <Button variant="primary" icon="arrow-right" href="/plan-my-cruise/">
            {t("cta.button")}
          </Button>
          <Link href="/cruises/" className={styles.more}>
            {t("cta.all")}
          </Link>
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript({ ...articleJsonLd(page, absoluteUrl(locale, URL)), inLanguage: locale }),
        }}
      />
      {faq ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(faq) }} /> : null}
    </article>
  );
}
