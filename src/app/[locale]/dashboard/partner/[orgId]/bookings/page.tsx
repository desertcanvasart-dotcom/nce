import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ds/Badge/Badge";
import { formatMoney } from "@/components/ds/lib/format";
import { ui } from "@/components/dashboard/ui";
import { requireOrgRole } from "@/server/auth";
import { companyBookings } from "@/server/bookings/queries";
import { RESERVATION_BADGE } from "../../../_bookings/ReservationRecord";
import { isUuid } from "../../../sections";

/** DASH-B2B-005, 006: every booking the agency made, with its client reference. Kept when the agency is paused. */
export default async function CompanyBookings({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  if (!isUuid(orgId)) notFound();
  await requireOrgRole(orgId, ["owner", "reservations", "finance"], {
    kind: "partner",
    allowPaused: true,
    returnTo: `/dashboard/partner/${orgId}/bookings/`,
  });
  const list = await companyBookings(orgId);
  return (
    <>
      <h1 className={ui.pageTitle}>Company bookings</h1>
      {list.length ? (
        <div className={ui.tableWrap}>
          <table className={ui.table}>
            <caption className="visually-hidden">Company bookings</caption>
            <thead>
              <tr>
                <th scope="col">Reservation</th>
                <th scope="col">Client reference</th>
                <th scope="col">Departs</th>
                <th scope="col">Status</th>
                <th scope="col" className={ui.num}>
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link href={`/dashboard/partner/${orgId}/bookings/${r.id}/`}>{r.reference}</Link>
                    <span className={ui.muted}> · {r.vessel?.name}</span>
                  </td>
                  <td>{r.partner_booking_details?.client_reference ?? "—"}</td>
                  <td>{r.departure?.departs_on}</td>
                  <td>
                    <Badge tone={RESERVATION_BADGE[r.status].tone}>{RESERVATION_BADGE[r.status].text}</Badge>
                  </td>
                  <td className={ui.num}>{formatMoney({ amount: Number(r.total_minor), currency: r.currency }, "en")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className={ui.muted}>
          No bookings yet. <Link href={`/dashboard/partner/${orgId}/search/`}>Search departures</Link> to reserve for a client.
        </p>
      )}
    </>
  );
}
