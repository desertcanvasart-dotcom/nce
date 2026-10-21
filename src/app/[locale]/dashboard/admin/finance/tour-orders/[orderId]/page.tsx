import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/dashboard/ActionForm";
import { Badge } from "@/components/ds/Badge/Badge";
import { Input, Section, Select, ui } from "@/components/dashboard/ui";
import { CairoTime } from "@/components/shell/CairoTime";
import { requireAdmin } from "@/server/auth";
import { tourOrder } from "@/server/tours/orders";
import { isUuid } from "../../../../sections";
import { decideTourCancellation, issueTourCardRefund, recordTourManualRefund } from "../../actions";
import { guestsLabel, money, TOUR_CANCEL, TOUR_MODE, TOUR_ORDER_BADGE } from "../../../../_bookings/TourOrderBits";

/** DASH-PAY-014: a tour order for finance admins: payments, and the cancellation decision and refund. */
export default async function AdminTourOrder({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  if (!isUuid(orderId)) notFound();
  await requireAdmin(["finance"], `/dashboard/admin/finance/tour-orders/${orderId}/`);
  const o = await tourOrder(orderId);
  if (!o) notFound();
  const m = (x: number | string) => money(x, o.currency);
  const refunded = o.tour_refunds.reduce((n, r) => n + Number(r.amount_minor), 0);
  const left = o.cancel_state === "approved" ? Number(o.cancel_refund_minor ?? 0) - refunded : 0;
  return (
    <>
      <p>
        <Link href="/dashboard/admin/finance/#tour-orders">← Deposits and commission</Link>
      </p>
      <h1 className={ui.pageTitle}>Tour order {o.reference}</h1>
      <Section title="Order" id="order">
        <p>
          <Badge tone={TOUR_ORDER_BADGE[o.status].tone}>{TOUR_ORDER_BADGE[o.status].text}</Badge>{" "}
          {o.cancel_state ? <span className={ui.muted}>{TOUR_CANCEL[o.cancel_state]}</span> : null}
        </p>
        <dl className={ui.grid}>
          <div>
            <dt className={ui.label}>Tour</dt>
            <dd>{o.tour?.name}</dd>
          </div>
          <div>
            <dt className={ui.label}>Starts</dt>
            <dd>
              <CairoTime value={o.starts_at} />
            </dd>
          </div>
          <div>
            <dt className={ui.label}>Session</dt>
            <dd>
              {TOUR_MODE[o.mode]}
              {o.label ? ` · ${o.label}` : ""}
              {o.vehicle ? ` · ${o.vehicle}` : ""}
            </dd>
          </div>
          <div>
            <dt className={ui.label}>Guests</dt>
            <dd>
              {guestsLabel(o.ages)} · lead {o.lead_name}
            </dd>
          </div>
          <div>
            <dt className={ui.label}>Total</dt>
            <dd>{m(o.total_minor)}</dd>
          </div>
        </dl>
        {o.notes ? <p className={ui.muted}>Customer’s notes: {o.notes}</p> : null}
        <p className={ui.muted}>Tours are Nilecruz’s own sales: no commission and no operator payable (DATA-041).</p>
        <ul className={ui.list}>
          {o.tour_payments.map((p) => (
            <li key={p.id}>
              {money(p.amount_minor, p.currency)} · Card (Stripe) · <CairoTime value={p.created_at} />
              {p.receipt_number ? ` · Receipt ${p.receipt_number}` : ""}
              {p.note ? ` · ${p.note}` : ""}
            </li>
          ))}
          {o.tour_refunds.map((r) => (
            <li key={r.id}>
              Refunded {money(r.amount_minor, r.currency)} · {r.how}
              {r.method === "manual" && r.reference ? ` · ref. ${r.reference}` : ""} · <CairoTime value={r.created_at} />
            </li>
          ))}
        </ul>
      </Section>
      {o.cancel_state ? (
        <Section title="Cancellation" id="cancellation">
          <dl className={ui.grid}>
            <div>
              <dt className={ui.label}>Requested</dt>
              <dd>{o.cancel_requested_on}</dd>
            </div>
            <div>
              <dt className={ui.label}>Days before the start</dt>
              <dd>{o.cancel_days_before}</dd>
            </div>
            <div>
              <dt className={ui.label}>Charge</dt>
              <dd>
                {o.cancel_percent} % · {m(o.cancel_charge_minor ?? 0)}
              </dd>
            </div>
            <div>
              <dt className={ui.label}>Refund</dt>
              <dd>
                <strong>{m(o.cancel_refund_minor ?? 0)}</strong>
              </dd>
            </div>
          </dl>
          {o.cancel_reason ? <p className={ui.muted}>Reason given: {o.cancel_reason}</p> : null}
          {o.cancel_note ? <p className={ui.muted}>Note: {o.cancel_note}</p> : null}
          {o.cancel_state === "requested" ? (
            <ActionForm action={decideTourCancellation.bind(null, o.id)} submit="Save decision">
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
          ) : null}
          {left > 0 ? (
            <>
              <p>
                Still to refund: <strong>{m(left)}</strong>
              </p>
              <ActionForm action={issueTourCardRefund.bind(null, o.id)} submit="Refund to the card through Stripe" />
              <ActionForm action={recordTourManualRefund.bind(null, o.id)} submit="Record a manual refund" variant="outline">
                <div className={ui.grid}>
                  <Input label={`Amount (${o.currency})`} name="amount" inputMode="decimal" required />
                  <Input label="How" name="how" maxLength={80} required />
                  <Input label="Reference" name="ref" maxLength={200} required />
                </div>
              </ActionForm>
            </>
          ) : null}
        </Section>
      ) : null}
    </>
  );
}
