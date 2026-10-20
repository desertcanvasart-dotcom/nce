import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/dashboard/ActionForm";
import { cardPayable } from "@/lib/payments/checkout";
import { balance, bankDetails, cancellationQuote, cancellationsFor, paymentsFor, refundsFor } from "@/server/payments/queries";
import { BankDetails } from "../../../_bookings/BankDetails";
import { formatMoney } from "@/components/ds/lib/format";
import { CancellationPanel } from "../../../_bookings/CancellationPanel";
import { PaymentPanel } from "../../../_bookings/PaymentPanel";
import { Checkboxes, Input, Notice, Section, TextArea, ui } from "@/components/dashboard/ui";
import { requireUser } from "@/server/auth";
import { reservation } from "@/server/bookings/queries";
import { ReservationRecord } from "../../../_bookings/ReservationRecord";
import { isUuid } from "../../../sections";
import { reportTransfer, requestCancellation, startCheckout, uploadProof, withdrawCancellation } from "../../actions";

const PROOF = {
  submitted: "Waiting for the operator’s check",
  verified: "Verified by the operator",
  rejected: "Not accepted",
} as const;

/** One reservation for its customer, with the eligibility proof upload for local rates (ADR-078, ADR-088). */
export default async function MyReservation({
  params,
  searchParams,
}: {
  params: Promise<{ reservationId: string }>;
  searchParams: Promise<{ paid?: string }>;
}) {
  const { reservationId } = await params;
  const { paid } = await searchParams;
  if (!isUuid(reservationId)) notFound();
  const session = await requireUser(`/dashboard/journey/reservations/${reservationId}/`);
  const r = await reservation(reservationId);
  if (!r || r.customer_id !== session.userId || r.buyer_org_id) notFound();
  const local = r.rate_plan === "egyptian_citizen" || r.rate_plan === "foreign_resident";
  const [bal, pays, requests, refunds, quote, bank] = await Promise.all([
    balance(r.id),
    paymentsFor(r.id),
    cancellationsFor(r.id),
    refundsFor(r.id),
    cancellationQuote(r.id),
    bankDetails(),
  ]);
  const open = requests.find((c) => c.status === "requested" || c.status === "refund_due");
  const owing = r.status === "awaiting_payment" && !open && !!bal && bal.outstanding_minor > 0;
  const canCancel = r.status !== "cancelled" && !open && !!quote;
  const money = (m: number) => formatMoney({ amount: Number(m), currency: r.currency }, "en");

  return (
    <>
      <p>
        <Link href="/dashboard/journey/reservations/">← Reservations</Link>
      </p>
      <h1 className={ui.pageTitle}>Reservation {r.reference}</h1>
      {paid ? (
        <Notice tone="success">
          Thank you. Stripe confirms the payment to Nilecruz in a moment; it then shows as received here.
        </Notice>
      ) : null}
      {bal ? (
        <PaymentPanel
          bal={bal}
          pays={pays}
          rule={r.deadline_rule}
          status={r.status}
          receiptHref={(id) => `/dashboard/journey/reservations/${r.id}/receipts/${id}/`}
        />
      ) : null}
      {owing ? (
        <Section title="Pay" id="pay">
          {cardPayable(r.currency) ? (
            <ActionForm action={startCheckout.bind(null, r.id)} submit="Pay the balance by card">
              <Checkboxes
                legend="Before paying"
                name="policy"
                options={[{ value: "yes", label: "I have read the cancellation policy below" }]}
                checked={[]}
              />
              <p className={ui.muted}>You enter your card on Stripe’s secure page; Nilecruz never sees the card details.</p>
            </ActionForm>
          ) : (
            <p className={ui.muted}>Prices in E£ are paid by bank transfer for now.</p>
          )}
          <h3 className={ui.subTitle}>Paid by bank transfer?</h3>
          <BankDetails details={bank} reference={r.reference} />
          <ActionForm
            action={reportTransfer.bind(null, r.id)}
            submit="Report the transfer"
            encType="multipart/form-data"
            variant="outline"
            resetOnSuccess
          >
            <input type="hidden" name="currency" value={r.currency} />
            <div className={ui.grid}>
              <Input label={`Amount sent (${r.currency})`} name="amount" inputMode="decimal" required />
              <Input label="Date sent" name="paid_on" type="date" required />
              <Input label="Bank reference" name="reference" maxLength={200} />
            </div>
            <div className={ui.field}>
              <label className={ui.label} htmlFor="transfer-proof">
                Proof (optional: PDF, JPEG or PNG, up to 10 MB)
              </label>
              <input id="transfer-proof" name="proof" type="file" accept="application/pdf,image/jpeg,image/png" />
            </div>
          </ActionForm>
        </Section>
      ) : null}
      <CancellationPanel
        requests={requests}
        refunds={refunds}
        actions={(c) =>
          c.status === "requested" ? (
            <ActionForm action={withdrawCancellation.bind(null, r.id, c.id)} submit="Withdraw the request" variant="outline" />
          ) : null
        }
      />
      <ReservationRecord r={r} />
      {canCancel ? (
        <Section title="Cancel this reservation" id="cancel">
          <p>
            Cancelled today, {quote.days_before} {quote.days_before === 1 ? "day" : "days"} before departure, the cancellation
            policy above charges <strong>{quote.percent} %</strong> of the price: {money(quote.charge_minor)}.{" "}
            {quote.refund_minor > 0
              ? `You have paid ${money(quote.paid_minor)}, so ${money(quote.refund_minor)} would be refunded.`
              : quote.unpaid_charge_minor > 0
                ? `You have paid ${money(quote.paid_minor)}, so ${money(quote.unpaid_charge_minor)} of the charge would still be owed.`
                : "Nothing would be refunded."}
          </p>
          <p className={ui.muted}>
            The charge is fixed on the day your request arrives. The operator checks the figures, then Nilecruz confirms the
            cancellation and refunds you.
          </p>
          <ActionForm action={requestCancellation.bind(null, r.id)} submit="Ask to cancel" variant="outline">
            <TextArea label="Reason (optional)" name="reason" rows={3} maxLength={1000} />
            <Checkboxes
              legend="Before asking"
              name="policy"
              options={[{ value: "yes", label: "I have read the cancellation policy and the charge above" }]}
              checked={[]}
            />
          </ActionForm>
        </Section>
      ) : null}
      {local ? (
        <Section title="Proof of eligibility" id="proof">
          {/* CONTENT-NEEDED #38: Faris's wording replaces this draft. */}
          <Notice>
            Draft wording: this reservation uses the{" "}
            {r.rate_plan === "egyptian_citizen" ? "Egyptian-citizen" : "foreign-resident"} rate. Upload proof (for example an ID
            card or residence permit). Only you, the operator and Nilecruz can open it.
          </Notice>
          {r.eligibility_proofs.length ? (
            <ul className={ui.list}>
              {r.eligibility_proofs.map((p) => (
                <li key={p.id}>
                  {p.url ? <a href={p.url}>Uploaded file</a> : "Uploaded file"} · {PROOF[p.status]}
                  {p.note ? ` · ${p.note}` : ""}
                </li>
              ))}
            </ul>
          ) : null}
          <ActionForm
            action={uploadProof.bind(null, r.id)}
            submit="Upload proof"
            encType="multipart/form-data"
            resetOnSuccess
            variant="outline"
          >
            <div className={ui.field}>
              <label className={ui.label} htmlFor="proof">
                File (PDF, JPEG or PNG, up to 10 MB)
              </label>
              <input id="proof" name="proof" type="file" accept="application/pdf,image/jpeg,image/png" required />
            </div>
          </ActionForm>
        </Section>
      ) : null}
    </>
  );
}
