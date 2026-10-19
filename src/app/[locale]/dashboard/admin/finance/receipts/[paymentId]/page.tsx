import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/server/auth";
import { payment } from "@/server/payments/queries";
import { Receipt } from "../../../../_bookings/Receipt";
import { isUuid } from "../../../../sections";

export default async function AdminReceipt({ params }: { params: Promise<{ paymentId: string }> }) {
  const { paymentId } = await params;
  if (!isUuid(paymentId)) notFound();
  await requireAdmin(["finance"], `/dashboard/admin/finance/receipts/${paymentId}/`);
  const p = await payment(paymentId);
  if (!p || p.status !== "verified") notFound();
  return (
    <>
      <p>
        <Link href="/dashboard/admin/finance/">← Deposits and commission</Link>
      </p>
      <Receipt p={p} />
    </>
  );
}
