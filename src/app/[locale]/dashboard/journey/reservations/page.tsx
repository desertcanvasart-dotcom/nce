import Link from "next/link";
import { Badge } from "@/components/ds/Badge/Badge";
import { formatMoney } from "@/components/ds/lib/format";
import { Section, ui } from "@/components/dashboard/ui";
import { requireUser } from "@/server/auth";
import { reservations } from "@/server/bookings/queries";
import { RESERVATION_BADGE } from "../../_bookings/ReservationRecord";

/** My reservations (DASH-CUS-007 → reservation). Payments and deadlines join in 4f. */
export default async function MyReservations() {
  await requireUser("/dashboard/journey/reservations/");
  const list = await reservations();
  return (
    <>
      <h1 className={ui.pageTitle}>Reservations and payments</h1>
      <Section title="Your reservations" id="list">
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
            No reservations yet. Accept an offer in <Link href="/dashboard/journey/requests/">Cruise requests</Link> to make one.
          </p>
        )}
      </Section>
    </>
  );
}
