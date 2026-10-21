import { Link } from "@/i18n/navigation";
import { durationText, KIND_TEXT, tourUrl, type PublicTour } from "@/lib/content/tours";
import styles from "./editorial.module.css";

/**
 * One tour's facts (DASH-PUB-006): what it is, the steps, what's included and not, where it starts and its cancellation
 * terms. Booking opens with the calendar in 7-2: until then, "Prices coming soon" (ADR-097).
 */
export function TourDetails({ tour, heading = true }: { tour: PublicTour; heading?: boolean }) {
  return (
    <section className={styles.tour} aria-labelledby={`tour-${tour.slug}`}>
      {heading ? <h2 id={`tour-${tour.slug}`}>{tour.name}</h2> : null}
      <p className={styles.muted}>
        {KIND_TEXT[tour.kind]} · {tour.location} · {durationText(tour.durationMinutes)}
        {tour.adultsOnly ? " · adults only" : ""}
        {tour.sample ? " · Sample data" : ""}
      </p>
      {tour.description ? <p className={styles.prewrap}>{tour.description.split("\n\n")[0]}</p> : null}
      {tour.itinerary.length ? (
        <>
          <h3>The day</h3>
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
            <h3>Included</h3>
            <ul>
              {tour.inclusions.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {tour.exclusions.length ? (
          <div>
            <h3>Not included</h3>
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
          <strong>Where it starts:</strong> {tour.meetingPoint}
        </p>
      ) : null}
      {tour.cancellationTerms ? (
        <p>
          <strong>Cancellation:</strong> {tour.cancellationTerms}
        </p>
      ) : null}
      <p className={styles.booking}>
        <strong>Prices coming soon.</strong> Booking opens when our office’s rates are loaded. Until then,{" "}
        <Link href="/contact/">contact us</Link> to ask about this tour.
      </p>
    </section>
  );
}

/** The tours hub's cards: name, kind, place and length, linking to each tour's one page (DASH-ADM-072). */
export function TourCards({ tours }: { tours: PublicTour[] }) {
  if (!tours.length) return <p className={styles.muted}>No tours are published yet.</p>;
  return (
    <section className={styles.cards} aria-labelledby="all-tours">
      <h2 id="all-tours">All tours and extras</h2>
      <ul>
        {tours.map((t) => (
          <li key={t.slug}>
            <Link href={tourUrl(t.slug)}>{t.name}</Link>
            <span>
              {KIND_TEXT[t.kind]} · {t.location} · {durationText(t.durationMinutes)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
