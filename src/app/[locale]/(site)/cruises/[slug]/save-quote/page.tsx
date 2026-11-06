import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ActionForm } from "@/components/dashboard/ActionForm";
import { formatDate, formatNights } from "@/components/ds/lib/format";
import { Breadcrumbs } from "@/components/marketplace/Breadcrumbs";
import styles from "@/components/marketplace/VesselPage.module.css";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { hasFigure } from "@/lib/marketplace/public-price";
import { pageMetadata } from "@/lib/seo/metadata";
import { requireUser } from "@/server/auth";
import { publicVessel } from "@/server/marketplace/queries";
import { saveQuote } from "./actions";

type Props = {
  params: Promise<{ locale: Locale; slug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: "pricing.save" });
  return pageMetadata({ locale, path: `/cruises/${slug}/save-quote`, title: t("pageTitle"), noindex: true });
}

/**
 * ADR-109, Level 3: "Save this quote and get an alert if the price changes", reached from the rate form once it has
 * shown a rate or sent an enquiry. Saving needs an account (sign-in returns here with the quote); nothing else does.
 */
export default async function SaveQuote({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const keep = new URLSearchParams(
    Object.entries(sp).filter(
      (e): e is [string, string] => typeof e[1] === "string" && ["itinerary", "date", "guests", "cabin"].includes(e[0]),
    ),
  ).toString();
  await requireUser(`/cruises/${slug}/save-quote/${keep ? `?${keep}` : ""}`);
  const v = await publicVessel(slug, locale);
  if (!v) notFound();
  const t = await getTranslations({ locale, namespace: "pricing" });
  const tv = await getTranslations({ locale, namespace: "vesselPage" });
  const places = tv.raw("places") as Record<string, string>;
  const place = (n: string) => places[n] ?? n;
  const it = v.itineraries.find((i) => i.code === sp.itinerary);
  const date = sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : "";
  const guests = sp.guests && /^\d{1,2}$/.test(sp.guests) ? sp.guests : "";
  const cabin = v.cabins.find((c) => c.id === sp.cabin);
  const details = [
    it ? `${formatNights(it.nights, locale)}, ${place(it.origin)} → ${place(it.destination)}` : null,
    date ? formatDate(date, locale) : t("save.any"),
    guests ? `${t("rates.guests")}: ${guests}` : null,
    cabin?.name ?? null,
  ]
    .filter(Boolean)
    .join(" · ");
  const path = `/cruises/${v.slug}/`;
  return (
    <div className={styles.page}>
      <Breadcrumbs
        locale={locale}
        trail={[
          { name: tv("crumbs.home"), path: "/" },
          { name: tv("crumbs.cruises"), path: "/cruises/" },
          { name: v.name, path },
          { name: t("save.pageTitle"), path: `${path}save-quote/` },
        ]}
      />
      <header className={styles.heroHead}>
        <p className={styles.eyebrow}>{v.name}</p>
        <h1 className={styles.title}>{t("save.title")}</h1>
        <p className={styles.lead}>{t("save.summary", { name: v.name, details })}</p>
      </header>
      <section className={styles.section} aria-label={t("save.pageTitle")}>
        <ActionForm action={saveQuote.bind(null, v.slug)} submit={t("save.button")}>
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="itinerary" value={it?.code ?? ""} />
          <input type="hidden" name="date" value={date} />
          <input type="hidden" name="guests" value={guests} />
          <input type="hidden" name="cabin" value={cabin?.id ?? ""} />
          {/* An alert only where there is a public price that can change. */}
          {hasFigure(v.price) ? (
            <label>
              <input type="checkbox" name="alert" defaultChecked /> {t("save.alert")}
            </label>
          ) : null}
        </ActionForm>
        <p>
          <Link href={path}>{tv("ask.back", { name: v.name })}</Link>
        </p>
      </section>
    </div>
  );
}
