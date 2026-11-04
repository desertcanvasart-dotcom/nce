import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ActionForm } from "@/components/dashboard/ActionForm";
import { Input, Select, TextArea } from "@/components/dashboard/ui";
import { formatNights } from "@/components/ds/lib/format";
import { Honeypot } from "@/components/forms/Honeypot";
import { Breadcrumbs } from "@/components/marketplace/Breadcrumbs";
import styles from "@/components/marketplace/VesselPage.module.css";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { pageMetadata } from "@/lib/seo/metadata";
import { publicVessel } from "@/server/marketplace/queries";
import { askForOffer } from "./actions";

type Props = {
  params: Promise<{ locale: Locale; slug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const v = await publicVessel(slug, locale);
  if (!v) return {};
  const t = await getTranslations({ locale, namespace: "vesselPage.ask" });
  // A form, not a page to find in search.
  return pageMetadata({ locale, path: `/cruises/${v.slug}/ask`, title: `${t("title")}: ${v.name}`, noindex: true });
}

/**
 * "Ask for an offer on this boat", with no account needed: the vessel, and the cruise and date it was asked from
 * (`?itinerary=CODE&date=YYYY-MM-DD`), arrive filled in. Signed-in or not, the request reaches Nilecruz the same way.
 */
export default async function AskForOffer({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const v = await publicVessel(slug, locale);
  if (!v) notFound();
  const t = await getTranslations({ locale, namespace: "vesselPage" });
  const places = t.raw("places") as Record<string, string>;
  const place = (n: string) => places[n] ?? n;
  const itinerary = v.itineraries.find((i) => i.code.toLowerCase() === sp.itinerary?.toLowerCase())?.code ?? "";
  const date = sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : "";
  const path = `/cruises/${v.slug}/`;
  return (
    <div className={styles.page}>
      <Breadcrumbs
        locale={locale}
        trail={[
          { name: t("crumbs.home"), path: "/" },
          { name: t("crumbs.cruises"), path: "/cruises/" },
          { name: v.name, path },
          { name: t("ask.title"), path: `${path}ask/` },
        ]}
      />
      <header className={styles.heroHead}>
        <p className={styles.eyebrow}>{v.name}</p>
        <h1 className={styles.title}>{t("ask.title")}</h1>
        <p className={styles.lead}>{t("ask.lead", { name: v.name })}</p>
        <p className={styles.status}>{t("ask.noAccount")}</p>
      </header>
      <section className={styles.section} aria-label={t("ask.title")}>
        <ActionForm action={askForOffer.bind(null, v.slug)} submit={t("ask.send")}>
          <input type="hidden" name="locale" value={locale} />
          {v.itineraries.length ? (
            <Select
              label={t("ask.cruise")}
              name="itinerary"
              defaultValue={itinerary}
              options={[
                { value: "", label: t("ask.anyCruise") },
                ...v.itineraries.map((i) => ({
                  value: i.code,
                  label: t("ask.cruiseOption", {
                    nights: formatNights(i.nights, locale),
                    origin: place(i.origin),
                    destination: place(i.destination),
                  }),
                })),
              ]}
            />
          ) : null}
          <Input label={t("ask.date")} name="date" type="date" defaultValue={date} hint={t("ask.dateHint")} />
          <Input label={t("ask.guests")} name="guests" type="number" inputMode="numeric" min={1} max={30} defaultValue={2} />
          <Input label={t("ask.name")} name="name" required maxLength={120} autoComplete="name" />
          <Input label={t("ask.email")} name="email" type="email" required maxLength={254} autoComplete="email" />
          <TextArea label={t("ask.message")} name="message" rows={5} maxLength={4000} hint={t("ask.messageHint")} />
          <Honeypot />
          <p className={styles.muted}>{t("ask.privacy")}</p>
        </ActionForm>
        <p>
          <Link href={path}>{t("ask.back", { name: v.name })}</Link>
        </p>
      </section>
    </div>
  );
}
