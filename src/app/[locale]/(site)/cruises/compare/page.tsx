import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Badge } from "@/components/ds/Badge/Badge";
import { formatMoney } from "@/components/ds/lib/format";
import { propulsionIcon } from "@/components/ds/lib/types";
import { Breadcrumbs } from "@/components/marketplace/Breadcrumbs";
import styles from "@/components/marketplace/marketplace.module.css";
import { Link } from "@/i18n/navigation";
import { contentLocale, placeName } from "@/content/places";
import type { Locale } from "@/i18n/routing";
import { compareSlugs } from "@/lib/marketplace/listing";
import { sellsThroughUs } from "@/lib/marketplace/public-price";
import { pageMetadata } from "@/lib/seo/metadata";
import { publicListing } from "@/server/marketplace/queries";

type Props = {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ v?: string | string[] }>;
};

const TYPE = { sail: "dahabiya", motor: "motorShip", steam: "steamer" } as const;

// A comparison is a visitor's own selection: never indexed (SEO-016).
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "compare" });
  return pageMetadata({
    locale,
    path: "/cruises/compare",
    title: t("title"),
    description: t("description"),
    noindex: true,
  });
}

/** DASH-PUB-004: up to three vessels side by side, from the "Compare" ticks on the listings. */
export default async function Compare({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const all = await publicListing(contentLocale(locale));
  const t = await getTranslations({ locale, namespace: "compare" });
  const common = await getTranslations({ locale, namespace: "common" });
  const listing = await getTranslations({ locale, namespace: "listing" });
  const slugs = compareSlugs((await searchParams).v, new Set(all.map((v) => v.slug)));
  const picked = slugs.map((s) => all.find((v) => v.slug === s)!);
  const row = (label: string, cell: (v: (typeof picked)[number]) => React.ReactNode) => (
    <tr>
      <th scope="row">{label}</th>
      {picked.map((v) => (
        <td key={v.slug}>{cell(v)}</td>
      ))}
    </tr>
  );
  return (
    <div className={styles.page}>
      <Breadcrumbs
        locale={locale}
        trail={[
          { name: common("home"), path: "/" },
          { name: common("cruises"), path: "/cruises/" },
          { name: t("crumb"), path: "/cruises/compare/" },
        ]}
      />
      <header className={styles.head}>
        <h1 className={styles.title}>{t("title")}</h1>
        <p className={styles.lead}>{t("lead")}</p>
      </header>
      {picked.length < 2 ? (
        <p className={styles.empty}>{t.rich("empty", { link: (c) => <Link href="/cruises/">{c}</Link> })}</p>
      ) : (
        <div className={styles.compareWrap}>
          <table className={styles.compare}>
            <caption className="visually-hidden">{t("caption")}</caption>
            <thead>
              <tr>
                <td />
                {picked.map((v) => (
                  <th key={v.slug} scope="col">
                    <Link href={`/cruises/${v.slug}/`}>{v.displayName ?? v.name}</Link>
                    {v.sample ? <small> · {common("sample")}</small> : null}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {row(t("type"), (v) => t(TYPE[v.type]))}
              {row(t("propulsion"), (v) =>
                v.propulsion ? (
                  <Badge icon={propulsionIcon[v.propulsion]}>{listing(`propulsion.${v.propulsion}`)}</Badge>
                ) : (
                  t("notConfirmed")
                ),
              )}
              {row(t("guests"), (v) => v.maxGuests ?? t("notGiven"))}
              {row(t("cabins"), (v) => v.cabinCount ?? t("notGiven"))}
              {row(t("decks"), (v) => v.deckCount ?? t("notGiven"))}
              {row(t("evaluation"), (v) => (v.evaluation !== undefined ? `${Math.round(v.evaluation)}/100` : t("notEvaluated")))}
              {/* ADR-109: the approved starting price in euros, else "Price on request"; booking status is its own row. */}
              {row(t("price"), (v) =>
                v.price.mode === "from_price"
                  ? t("from", { price: formatMoney(v.price.from, locale) })
                  : v.price.mode === "price_band"
                    ? t("band", { min: formatMoney(v.price.min, locale), max: formatMoney(v.price.max, locale) })
                    : t("onRequest"),
              )}
              {row(t("booking"), (v) =>
                v.bookable ? t("bookable") : sellsThroughUs(v.booking) ? t("requestBased") : t("unavailable"),
              )}
              {row(t("itineraries"), (v) =>
                v.itineraries.length ? (
                  <ul>
                    {v.itineraries.map((i) => (
                      <li key={`${i.origin}-${i.destination}-${i.nights}`}>
                        {t("itinerary", {
                          from: placeName(i.origin, locale),
                          to: placeName(i.destination, locale),
                          nights: i.nights,
                        })}
                      </li>
                    ))}
                  </ul>
                ) : (
                  t("notPublished")
                ),
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
