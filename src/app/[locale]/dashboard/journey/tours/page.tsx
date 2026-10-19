import Link from "next/link";
import { Badge } from "@/components/ds/Badge/Badge";
import { Section, ui } from "@/components/dashboard/ui";
import { CairoTime } from "@/components/shell/CairoTime";
import { requireUser } from "@/server/auth";
import { bookableTours, myTourOrders } from "@/server/tours/orders";
import { money, TOUR_ORDER_BADGE } from "../../_bookings/TourOrderBits";

/** Tours and sightseeing for the customer: their tour orders, and the tours they can book (DASH-PAY-014). */
export default async function MyTours() {
  const session = await requireUser("/dashboard/journey/tours/");
  const [orders, tours] = await Promise.all([myTourOrders(session.userId), bookableTours()]);
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
                · {o.session ? <CairoTime value={o.session.starts_at} /> : null} · {money(o.total_minor, o.currency)}{" "}
                <Badge tone={TOUR_ORDER_BADGE[o.status].tone}>{TOUR_ORDER_BADGE[o.status].text}</Badge>
              </li>
            ))}
          </ul>
        ) : (
          <p className={ui.muted}>No tour orders yet.</p>
        )}
      </Section>
      <Section title="Book a tour" id="book">
        {tours.length ? (
          <ul className={ui.list}>
            {tours.map((t) => (
              <li key={t.id}>
                <Link href={`/dashboard/journey/tours/book/${t.id}/`}>{t.name}</Link> · {t.location} · next date{" "}
                <CairoTime value={t.nextStart} />
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
