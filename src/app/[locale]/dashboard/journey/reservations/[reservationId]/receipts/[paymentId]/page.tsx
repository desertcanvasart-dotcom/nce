import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/server/auth";
import { payment } from "@/server/payments/queries";
import { Receipt } from "../../../../../_bookings/Receipt";
import { isUuid } from "../../../../../sections";

export default async function MyReceipt({ params }: { params: Promise<{ reservationId: string; paymentId: string }> }) {
  const { reservationId, paymentId } = await params;
  if (!isUuid(reservationId) || !isUuid(paymentId)) notFound();
  const session = await requireUser(`/dashboard/journey/reservations/${reservationId}/receipts/${paymentId}/`);
  const p = await payment(paymentId);
  if (!p || p.status !== "verified" || p.reservation?.id !== reservationId || p.reservation.customer_id !== session.userId)
    notFound();
  return (
    <>
      <p>
        <Link href={`/dashboard/journey/reservations/${reservationId}/`}>← Reservation</Link>
      </p>
      <Receipt p={p} />
    </>
  );
}
