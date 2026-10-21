import Link from "next/link";
import { Badge } from "@/components/ds/Badge/Badge";
import { Section, ui } from "@/components/dashboard/ui";
import { CairoTime } from "@/components/shell/CairoTime";
import { requireUser } from "@/server/auth";
import { journey } from "@/server/journey/queries";
import { bookableTours, myTourOrders } from "@/server/tours/orders";
import { money, TOUR_ORDER_BADGE } from "../../_bookings/TourOrderBits";

/** Tours and sightseeing (DASH-CUS-011, DASH-PAY-014): tour orders, tours that fit each upcoming cruise, and all bookable tours. */
export default async function MyTours() {
  const session = await requireUser("/dashboard/journey/tours/");
  const [orders, tours, j] = await Promise.all([myTourOrders(session.userId), bookableTours(), journey(session.userId)]);
  return (
    <>
      <h1 className={ui.pageTitle}>Tours and sightseeing</h1>
      <p className={ui.muted}>
        Tours and extras are sold by Nilecruz and paid separately from your cruise. Book them for the days your ship is moored in
        the right city.
      </p>
      <Section title="Your tour orders" id="orders">
        {orders.length ? (
          <ul className={ui.list}>
            {orders.map((o) => (
              <li key={o.id}>
                <Link href={`/dashboard/journey/tours/${o.id}/`}>
                  {o.reference} · {o.tour?.name}
                </Link>{" "}
                · <CairoTime value={o.starts_at} /> · {money(o.total_minor, o.currency)}{" "}
                <Badge tone={TOUR_ORDER_BADGE[o.status].tone}>{TOUR_ORDER_BADGE[o.status].text}</Badge>
              </li>
            ))}
          </ul>
        ) : (
          <p className={ui.muted}>No tour orders yet.</p>
        )}
      </Section>
      {j.suggestions.map((sg) => (
        <Section
          key={sg.reservation.id}
          title={`Suggested for your cruise ${sg.reservation.reference}`}
          id={`for-${sg.reservation.id}`}
        >
          <p className={ui.muted}>
            {sg.reservation.vessel}: {sg.reservation.route}, {sg.reservation.departsOn} to {sg.reservation.returnsOn}. Tours with
            places on the days of your sailing
            {sg.reservation.sailingPeriod === "morning" ? ", and the day before: your ship sails in the morning" : ""}.
          </p>
          <ul className={ui.list}>
            {sg.tours.map((t) => (
              <li key={t.id}>
                <Link href={`/dashboard/journey/tours/book/${t.id}/`}>{t.name}</Link> · {t.days.join(", ")}
              </li>
            ))}
          </ul>
        </Section>
      ))}
      <Section title="Book a tour" id="book">
        {tours.length ? (
          <ul className={ui.list}>
            {tours.map((t) => (
              <li key={t.id}>
                <Link href={`/dashboard/journey/tours/book/${t.id}/`}>{t.name}</Link> · {t.location} ·{" "}
                {t.nextStart ? (
                  <>
                    next date <CairoTime value={t.nextStart} />
                  </>
                ) : (
                  "choose a date"
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className={ui.muted}>No tours can be booked right now; dates and prices are published soon.</p>
        )}
      </Section>
    </>
  );
}
