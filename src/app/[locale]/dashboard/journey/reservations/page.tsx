import Link from "next/link";
import { Badge } from "@/components/ds/Badge/Badge";
import { formatMoney } from "@/components/ds/lib/format";
import { Section, ui } from "@/components/dashboard/ui";
import { CairoTime } from "@/components/shell/CairoTime";
import { requireUser } from "@/server/auth";
import { myTourOrders } from "@/server/tours/orders";
import { TOUR_ORDER_BADGE } from "../../_bookings/TourOrderBits";
import { reservations } from "@/server/bookings/queries";
import { RESERVATION_BADGE } from "../../_bookings/ReservationRecord";

/** Bookings (DASH-CUS-002, ADR-091): cruise reservations with their payments; tour orders are linked, not mixed in. */
export default async function MyReservations() {
  const session = await requireUser("/dashboard/journey/reservations/");
  const [list, tours] = await Promise.all([reservations({ customerId: session.userId }), myTourOrders(session.userId)]);
  return (
    <>
      <h1 className={ui.pageTitle}>Bookings</h1>
      <Section title="Cruise reservations" id="list">
        {list.length ? (
          <ul className={ui.list}>
            {list.map((r) => (
              <li key={r.id}>
                <Link href={`/dashboard/journey/reservations/${r.id}/`}>
                  {r.reference} · {r.vessel?.name} · departs {r.departure?.departs_on}
                </Link>{" "}
                <Badge tone={RESERVATION_BADGE[r.status].tone}>{RESERVATION_BADGE[r.status].text}</Badge>{" "}
                {formatMoney({ amount: Number(r.total_minor), currency: r.currency }, "en")}
              </li>
            ))}
          </ul>
        ) : (
          <p className={ui.muted}>
            No reservations yet. Accept an offer in <Link href="/dashboard/journey/requests/">Requests and offers</Link> to make
            one.
          </p>
        )}
      </Section>
      <Section title="Tour orders" id="tours">
        <p className={ui.muted}>Tours are paid separately from your cruise.</p>
        {tours.length ? (
          <ul className={ui.list}>
            {tours.map((o) => (
              <li key={o.id}>
                <Link href={`/dashboard/journey/tours/${o.id}/`}>
                  {o.reference} · {o.tour?.name}
                </Link>{" "}
                · <CairoTime value={o.starts_at} />{" "}
                <Badge tone={TOUR_ORDER_BADGE[o.status].tone}>{TOUR_ORDER_BADGE[o.status].text}</Badge>
              </li>
            ))}
          </ul>
        ) : null}
        <p>
          <Link href="/dashboard/journey/tours/">Tours and sightseeing</Link>
        </p>
      </Section>
    </>
  );
}
