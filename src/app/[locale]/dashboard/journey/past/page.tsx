import Link from "next/link";
import { Badge } from "@/components/ds/Badge/Badge";
import { Section, ui } from "@/components/dashboard/ui";
import { CairoTime } from "@/components/shell/CairoTime";
import { requireUser } from "@/server/auth";
import { journey } from "@/server/journey/queries";
import { RESERVATION_BADGE } from "../../_bookings/ReservationRecord";
import { TOUR_ORDER_BADGE } from "../../_bookings/TourOrderBits";

const REQUEST = { open: "Expired", accepted: "Booked", closed: "Closed" } as const;

/** Past trips (DASH-CUS-012): finished and cancelled bookings, past tours, closed and expired requests. Read-only. */
export default async function PastTrips() {
  const session = await requireUser("/dashboard/journey/past/");
  const { past } = await journey(session.userId);
  return (
    <>
      <h1 className={ui.pageTitle}>Past trips</h1>
      <Section title="Cruises" id="cruises">
        {past.reservations.length ? (
          <ul className={ui.list}>
            {past.reservations.map((r) => (
              <li key={r.id}>
                <Link href={`/dashboard/journey/reservations/${r.id}/`}>
                  {r.vessel}: {r.route}
                </Link>{" "}
                · {r.departsOn} to {r.returnsOn} · {r.reference}{" "}
                <Badge tone={RESERVATION_BADGE[r.status].tone}>{RESERVATION_BADGE[r.status].text}</Badge>
              </li>
            ))}
          </ul>
        ) : (
          <p className={ui.muted}>No past cruises.</p>
        )}
      </Section>
      <Section title="Tours" id="tours">
        {past.tourOrders.length ? (
          <ul className={ui.list}>
            {past.tourOrders.map((o) => (
              <li key={o.id}>
                <Link href={`/dashboard/journey/tours/${o.id}/`}>{o.tourName}</Link> · <CairoTime value={o.startsAt} /> ·{" "}
                {o.reference} <Badge tone={TOUR_ORDER_BADGE[o.status].tone}>{TOUR_ORDER_BADGE[o.status].text}</Badge>
              </li>
            ))}
          </ul>
        ) : (
          <p className={ui.muted}>No past tours.</p>
        )}
      </Section>
      <Section title="Closed requests" id="requests">
        {past.requests.length ? (
          <ul className={ui.list}>
            {past.requests.map((q) => (
              <li key={q.id}>
                <Link href={`/dashboard/journey/requests/${q.id}/`}>{q.label}</Link> · {REQUEST[q.status]} · {q.offers.length}{" "}
                {q.offers.length === 1 ? "offer" : "offers"}
              </li>
            ))}
          </ul>
        ) : (
          <p className={ui.muted}>No closed requests.</p>
        )}
      </Section>
    </>
  );
}
