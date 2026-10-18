import Link from "next/link";
import { notFound } from "next/navigation";
import { ui } from "@/components/dashboard/ui";
import { requireAdmin } from "@/server/auth";
import { reservation } from "@/server/bookings/queries";
import { ReservationRecord } from "../../../_bookings/ReservationRecord";
import { isUuid } from "../../../sections";

/** DASH-ADM-093: the full booking record for supervision. */
export default async function AdminBooking({ params }: { params: Promise<{ reservationId: string }> }) {
  const { reservationId } = await params;
  if (!isUuid(reservationId)) notFound();
  await requireAdmin(["finance"], `/dashboard/admin/bookings/${reservationId}/`);
  const r = await reservation(reservationId);
  if (!r) notFound();
  return (
    <>
      <p>
        <Link href="/dashboard/admin/bookings/">← Requests and bookings</Link>
      </p>
      <h1 className={ui.pageTitle}>Reservation {r.reference}</h1>
      <ReservationRecord r={r} />
    </>
  );
}
