import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { formatMoney } from "@/components/ds/lib/format";
import { Breadcrumbs } from "@/components/marketplace/Breadcrumbs";
import styles from "@/components/marketplace/marketplace.module.css";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { compareSlugs } from "@/lib/marketplace/listing";
import { pageMetadata } from "@/lib/seo/metadata";
import { publicListing } from "@/server/marketplace/queries";

type Props = {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ v?: string | string[] }>;
};

const TYPE = { sail: "Dahabiya", motor: "Motor ship", steam: "Paddle steamer" } as const;

// A comparison is a visitor's own selection: never indexed (SEO-016).
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata({
    locale,
    path: "/cruises/compare",
    title: "Compare vessels",
    description: "Up to three Nile cruise vessels side by side.",
    noindex: true,
  });
}

/** DASH-PUB-004: up to three vessels side by side, from the "Compare" ticks on the listings. */
export default async function Compare({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const all = await publicListing();
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
          { name: "Home", path: "/" },
          { name: "Cruises", path: "/cruises/" },
          { name: "Compare", path: "/cruises/compare/" },
        ]}
      />
      <header className={styles.head}>
        <h1 className={styles.title}>Compare vessels</h1>
        <p className={styles.lead}>
          The facts that differ most between Nile vessels. Prices are the public “from” price per person for two sharing; every
          cabin and date is priced after you sign in.
        </p>
      </header>
      {picked.length < 2 ? (
        <p className={styles.empty}>
          Tick “Compare” on two or three vessels in the <Link href="/cruises/">cruise listings</Link> to see them side by side.
        </p>
      ) : (
        <div className={styles.compareWrap}>
          <table className={styles.compare}>
            <caption className="visually-hidden">Vessels compared</caption>
            <thead>
              <tr>
                <td />
                {picked.map((v) => (
                  <th key={v.slug} scope="col">
                    <Link href={`/cruises/${v.slug}/`}>{v.name}</Link>
                    {v.sample ? <small> · Sample data</small> : null}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {row("Type", (v) => TYPE[v.type])}
              {row("Guests on board, at most", (v) => v.maxGuests ?? "Not given")}
              {row("Cabins", (v) => v.cabinCount ?? "Not given")}
              {row("Decks", (v) => v.deckCount ?? "Not given")}
              {row("Nilecruz evaluation", (v) =>
                v.evaluation !== undefined ? `${Math.round(v.evaluation)}/100` : "Not evaluated yet",
              )}
              {row("From, per person", (v) =>
                v.bookable && v.from ? formatMoney(v.from, locale) : v.bookable ? "Prices on request" : "Information only",
              )}
              {row("With sightseeing, from", (v) =>
                v.bookable && v.fromWithSightseeing ? formatMoney(v.fromWithSightseeing, locale) : "Cruise only",
              )}
              {row("Itineraries", (v) =>
                v.itineraries.length ? (
                  <ul>
                    {v.itineraries.map((i) => (
                      <li key={`${i.origin}-${i.destination}-${i.nights}`}>
                        {i.origin} → {i.destination}, {i.nights} night{i.nights === 1 ? "" : "s"}
                      </li>
                    ))}
                  </ul>
                ) : (
                  "Not published yet"
                ),
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
