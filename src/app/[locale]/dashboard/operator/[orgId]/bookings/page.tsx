import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ds/Badge/Badge";
import { formatMoney } from "@/components/ds/lib/format";
import { Section, ui } from "@/components/dashboard/ui";
import { requireOrgRole } from "@/server/auth";
import { reservations } from "@/server/bookings/queries";
import { RESERVATION_BADGE } from "../../../_bookings/ReservationRecord";
import { isUuid } from "../../../sections";

/** The company's reservations (DASH-OPR-001: its own business only). Payments join in 4f. */
export default async function OperatorBookings({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  if (!isUuid(orgId)) notFound();
  await requireOrgRole(orgId, ["owner", "reservations", "finance", "viewer"], {
    kind: "operator",
    returnTo: `/dashboard/operator/${orgId}/bookings/`,
  });
  const list = await reservations({ orgId });
  return (
    <>
      <h1 className={ui.pageTitle}>Bookings and payments</h1>
      <Section title="Reservations" id="list">
        {list.length ? (
          <ul className={ui.list}>
            {list.map((r) => (
              <li key={r.id}>
                <Link href={`/dashboard/operator/${orgId}/bookings/${r.id}/`}>
                  {r.reference} · {r.vessel?.name} · departs {r.departure?.departs_on}
                </Link>{" "}
                <Badge tone={RESERVATION_BADGE[r.status].tone}>{RESERVATION_BADGE[r.status].text}</Badge>{" "}
                {formatMoney({ amount: Number(r.total_minor), currency: r.currency }, "en")}
              </li>
            ))}
          </ul>
        ) : (
          <p className={ui.muted}>No reservations yet. They appear here when a customer accepts one of your offers.</p>
        )}
      </Section>
    </>
  );
}
