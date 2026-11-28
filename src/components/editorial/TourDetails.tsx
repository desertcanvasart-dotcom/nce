import { useLocale, useTranslations } from "next-intl";
import { placeName } from "@/content/places";
import { Link } from "@/i18n/navigation";
import { durationText, kindText, tourUrl, type PublicTour } from "@/lib/content/tours";
import styles from "./editorial.module.css";

/**
 * One tour's facts (DASH-PUB-006): what it is, the steps, what's included and not, where it starts and its cancellation
 * terms. With an office and rates it shows its prices and links to the booking calendar; until then, "Prices coming
 * soon" (ADR-097).
 */
export function TourDetails({ tour, heading = true }: { tour: PublicTour; heading?: boolean }) {
  const t = useTranslations("tours");
  const common = useTranslations("common");
  const locale = useLocale();
  return (
    <section className={styles.tour} aria-labelledby={`tour-${tour.slug}`}>
      {heading ? <h2 id={`tour-${tour.slug}`}>{tour.name}</h2> : null}
      <p className={styles.muted}>
        {kindText(tour.kind, locale)} · {placeName(tour.location, locale)} · {durationText(tour.durationMinutes, locale)}
        {tour.adultsOnly ? ` · ${t("adultsOnly")}` : ""}
        {tour.sample ? ` · ${common("sample")}` : ""}
      </p>
      {tour.description ? <p className={styles.prewrap}>{tour.description.split("\n\n")[0]}</p> : null}
      {tour.itinerary.length ? (
        <>
          <h3>{t("day")}</h3>
          <ol className={styles.steps}>
            {tour.itinerary.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </>
      ) : null}
      <div className={styles.split}>
        {tour.inclusions.length ? (
          <div>
            <h3>{t("included")}</h3>
            <ul>
              {tour.inclusions.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {tour.exclusions.length ? (
          <div>
            <h3>{t("notIncluded")}</h3>
            <ul>
              {tour.exclusions.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
      {tour.meetingPoint ? (
        <p>
          <strong>{t("starts")}</strong> {tour.meetingPoint}
        </p>
      ) : null}
      {tour.cancellationTerms ? (
        <p>
          <strong>{t("cancellation")}</strong> {tour.cancellationTerms}
        </p>
      ) : null}
      {tour.bookable ? (
        <div className={styles.booking}>
          {/* ADR-109: tour rates are in US dollars and the euro is the only public selling currency; never converted. */}
          <p>
            <strong>{t("onRequest")}</strong> {t("policy")}
          </p>
          <p>
            {t.rich("choose", {
              name: tour.name,
              link: (c) => <Link href={`/dashboard/journey/tours/book/${tour.id}/`}>{c}</Link>,
            })}
          </p>
        </div>
      ) : (
        <p className={styles.booking}>
          <strong>{t("soon")}</strong> {t.rich("soonBody", { link: (c) => <Link href="/contact/">{c}</Link> })}
        </p>
      )}
    </section>
  );
}

/** The tours hub's cards: name, kind, place and length, linking to each tour's one page (DASH-ADM-072). */
export function TourCards({ tours }: { tours: PublicTour[] }) {
  const t = useTranslations("tours");
  const locale = useLocale();
  if (!tours.length) return <p className={styles.muted}>{t("none")}</p>;
  return (
    <section className={styles.cards} aria-labelledby="all-tours">
      <h2 id="all-tours">{t("all")}</h2>
      <ul>
        {tours.map((tour) => (
          <li key={tour.slug}>
            <Link href={tourUrl(tour.slug)}>{tour.name}</Link>
            <span>
              {kindText(tour.kind, locale)} · {placeName(tour.location, locale)} · {durationText(tour.durationMinutes, locale)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
