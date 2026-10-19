import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/dashboard/ActionForm";
import { Input, Select, ui } from "@/components/dashboard/ui";
import { formatMoney } from "@/components/ds/lib/format";
import { requireAdmin } from "@/server/auth";
import { reservation } from "@/server/bookings/queries";
import { balance, cancellationsFor, paymentsFor, refundsFor } from "@/server/payments/queries";
import { CancellationPanel } from "../../../_bookings/CancellationPanel";
import { decideCancellation, issueCardRefund, recordManualRefund } from "../../finance/actions";
import { PaymentPanel } from "../../../_bookings/PaymentPanel";
import { ReservationRecord } from "../../../_bookings/ReservationRecord";
import { isUuid } from "../../../sections";

/** DASH-ADM-093: the full booking record for supervision. */
export default async function AdminBooking({ params }: { params: Promise<{ reservationId: string }> }) {
  const { reservationId } = await params;
  if (!isUuid(reservationId)) notFound();
  await requireAdmin(["finance"], `/dashboard/admin/bookings/${reservationId}/`);
  const r = await reservation(reservationId);
  if (!r) notFound();
  const [bal, pays, requests, refunds] = await Promise.all([
    balance(r.id),
    paymentsFor(r.id),
    cancellationsFor(r.id),
    refundsFor(r.id),
  ]);
  const hasCard = pays.some((p) => p.method === "card" && p.status === "verified");
  return (
    <>
      <p>
        <Link href="/dashboard/admin/bookings/">← Requests and bookings</Link>
      </p>
      <h1 className={ui.pageTitle}>Reservation {r.reference}</h1>
      {bal ? (
        <PaymentPanel
          bal={bal}
          pays={pays}
          rule={r.deadline_rule}
          status={r.status}
          receiptHref={(id) => `/dashboard/admin/finance/receipts/${id}/`}
        />
      ) : null}
      <CancellationPanel
        requests={requests}
        refunds={refunds}
        actions={(c) => {
          if (c.status === "requested")
            return (
              <ActionForm action={decideCancellation.bind(null, r.id, c.id)} submit="Save decision">
                <p className={ui.muted}>
                  Approving cancels the reservation and returns its cabins. The refund is then worked out against what has been
                  received by now; the charge stays as quoted.
                </p>
                <div className={ui.grid}>
                  <Select
                    label="Decision"
                    name="decision"
                    required
                    placeholder="Choose"
                    options={[
                      { value: "approve", label: "Approve the cancellation" },
                      { value: "reject", label: "Refuse it" },
                    ]}
                  />
                  <Input label="Note" name="note" maxLength={1000} hint="Required when refusing; the customer sees it." />
                </div>
              </ActionForm>
            );
          if (c.status !== "refund_due") return null;
          const left =
            c.refund_minor - refunds.filter((x) => x.cancellation_id === c.id).reduce((n, x) => n + Number(x.amount_minor), 0);
          return (
            <>
              <p>
                Still to refund: <strong>{formatMoney({ amount: left, currency: c.currency }, "en")}</strong>
              </p>
              {hasCard ? (
                <ActionForm action={issueCardRefund.bind(null, r.id, c.id)} submit="Refund to the card through Stripe">
                  <p className={ui.muted}>Goes back to the card the customer paid with, up to what was paid by card.</p>
                </ActionForm>
              ) : null}
              <ActionForm action={recordManualRefund.bind(null, r.id, c.id)} submit="Record a manual refund" variant="outline">
                <p className={ui.muted}>
                  For a refund made outside the system, for example by bank transfer. Recording it doesn’t move money.
                </p>
                <div className={ui.grid}>
                  <Input label={`Amount (${c.currency})`} name="amount" inputMode="decimal" required />
                  <Input label="How" name="how" maxLength={80} required hint="For example “Bank transfer”." />
                  <Input label="Reference" name="ref" maxLength={200} required />
                </div>
              </ActionForm>
            </>
          );
        }}
      />
      <ReservationRecord r={r} />
    </>
  );
}
