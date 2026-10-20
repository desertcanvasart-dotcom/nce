import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/dashboard/ActionForm";
import { formatMoney } from "@/components/ds/lib/format";
import { Checkboxes, Input, Notice, Section, TextArea, ui } from "@/components/dashboard/ui";
import { requireOrgRole } from "@/server/auth";
import { partnerDetails, reservation } from "@/server/bookings/queries";
import { balance, bankDetails, cancellationQuote, cancellationsFor, paymentsFor, refundsFor } from "@/server/payments/queries";
import { BankDetails } from "../../../../_bookings/BankDetails";
import { CancellationPanel } from "../../../../_bookings/CancellationPanel";
import { PaymentPanel } from "../../../../_bookings/PaymentPanel";
import { ReservationRecord } from "../../../../_bookings/ReservationRecord";
import { isUuid } from "../../../../sections";
import { partnerCheckout, partnerReportTransfer, partnerRequestCancellation, saveClientDetails } from "../../actions";

/** DASH-B2B-005–008: a company booking: payment, the agency's client details and margin, cancellation, the client record. */
export default async function CompanyBooking({
  params,
  searchParams,
}: {
  params: Promise<{ orgId: string; reservationId: string }>;
  searchParams: Promise<{ paid?: string }>;
}) {
  const { orgId, reservationId } = await params;
  const { paid } = await searchParams;
  if (!isUuid(orgId) || !isUuid(reservationId)) notFound();
  const { company } = await requireOrgRole(orgId, ["owner", "reservations", "finance"], {
    kind: "partner",
    allowPaused: true,
    returnTo: `/dashboard/partner/${orgId}/bookings/${reservationId}/`,
  });
  const r = await reservation(reservationId);
  if (!r || r.buyer_org_id !== orgId) notFound();
  const [bal, pays, details, requests, refunds, quote, bank] = await Promise.all([
    balance(r.id),
    paymentsFor(r.id),
    partnerDetails(r.id),
    cancellationsFor(r.id),
    refundsFor(r.id),
    cancellationQuote(r.id),
    bankDetails(),
  ]);
  const role = company.teamRole;
  const pays_ = role === "owner" || role === "finance";
  const edits = role === "owner" || role === "reservations";
  const open = requests.find((c) => c.status === "requested" || c.status === "refund_due");
  const owing = r.status === "awaiting_payment" && !open && !!bal && bal.outstanding_minor > 0;
  const money = (m: number) => formatMoney({ amount: Number(m), currency: r.currency }, "en");
  const margin = details?.selling_total_minor ? Number(details.selling_total_minor) - Number(r.total_minor) : null;
  return (
    <>
      <p>
        <Link href={`/dashboard/partner/${orgId}/bookings/`}>← Company bookings</Link>
      </p>
      <h1 className={ui.pageTitle}>Reservation {r.reference}</h1>
      {paid ? (
        <Notice tone="success">Thank you. Stripe confirms the payment in a moment; it then shows as received here.</Notice>
      ) : null}
      <p>
        <Link href={`/dashboard/partner/${orgId}/bookings/${r.id}/client/`}>Client booking record</Link>
        <span className={ui.muted}> · printable, with your agency’s name and selling price</span>
      </p>

      <Section title="Your client" id="client">
        <dl className={ui.grid}>
          <div>
            <dt className={ui.label}>Client reference</dt>
            <dd>{details?.client_reference ?? "—"}</dd>
          </div>
          <div>
            <dt className={ui.label}>Supplier total</dt>
            <dd>{money(r.total_minor)}</dd>
          </div>
          <div>
            <dt className={ui.label}>Your selling price</dt>
            <dd>{details?.selling_total_minor ? money(details.selling_total_minor) : "—"}</dd>
          </div>
          <div>
            <dt className={ui.label}>Difference</dt>
            <dd>{margin === null ? "—" : <strong>{money(margin)}</strong>}</dd>
          </div>
        </dl>
        <p className={ui.muted}>Only your agency sees these; the operator and your client never do.</p>
        {edits ? (
          <ActionForm action={saveClientDetails.bind(null, orgId, r.id)} submit="Save client details" variant="outline">
            <div className={ui.grid}>
              <Input label="Client reference" name="client_reference" maxLength={120} defaultValue={details?.client_reference} />
              <Input
                label={`Your selling price (${r.currency})`}
                name="selling_total"
                inputMode="decimal"
                defaultValue={details?.selling_total_minor ? (Number(details.selling_total_minor) / 100).toFixed(2) : ""}
              />
            </div>
          </ActionForm>
        ) : null}
      </Section>

      {bal ? <PaymentPanel bal={bal} pays={pays} rule={r.deadline_rule} status={r.status} /> : null}
      {owing && pays_ ? (
        <Section title="Pay" id="pay">
          <ActionForm action={partnerCheckout.bind(null, orgId, r.id)} submit="Pay the balance by card">
            <Checkboxes
              legend="Before paying"
              name="policy"
              options={[{ value: "yes", label: "I have read the cancellation policy below" }]}
              checked={[]}
            />
          </ActionForm>
          <h3 className={ui.subTitle}>Paid by bank transfer?</h3>
          <BankDetails details={bank} reference={r.reference} />
          <ActionForm
            action={partnerReportTransfer.bind(null, orgId, r.id)}
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
      ) : owing ? (
        <p className={ui.muted}>Your finance colleagues or the owner pay this booking.</p>
      ) : null}

      <CancellationPanel requests={requests} refunds={refunds} />
      <ReservationRecord r={r} />
      {r.status !== "cancelled" && !open && quote ? (
        <Section title="Cancel this booking" id="cancel">
          <p>
            Cancelled today, {quote.days_before} {quote.days_before === 1 ? "day" : "days"} before departure, the policy charges{" "}
            <strong>{quote.percent} %</strong>: {money(quote.charge_minor)}.{" "}
            {quote.refund_minor > 0 ? `${money(quote.refund_minor)} would be refunded.` : "Nothing would be refunded."}
          </p>
          <ActionForm action={partnerRequestCancellation.bind(null, orgId, r.id)} submit="Ask to cancel" variant="outline">
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
    </>
  );
}
