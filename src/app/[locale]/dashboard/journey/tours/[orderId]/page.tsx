import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/dashboard/ActionForm";
import { Badge } from "@/components/ds/Badge/Badge";
import { Checkboxes, Notice, Section, TextArea, ui } from "@/components/dashboard/ui";
import { CairoTime } from "@/components/shell/CairoTime";
import { bandLines, type CancellationBand } from "@/lib/tours/tours";
import { requireUser } from "@/server/auth";
import { tourCancelQuote, tourOrder } from "@/server/tours/orders";
import { isUuid } from "../../../sections";
import { cancelTourOrder, startTourCheckout } from "../../actions";
import { guestsLabel, money, TOUR_CANCEL, TOUR_MODE, TOUR_ORDER_BADGE } from "../../../_bookings/TourOrderBits";

/** One tour order for its customer: pay, receipt, cancel (DASH-PAY-014, DATA-027). */
export default async function MyTourOrder({
  params,
  searchParams,
}: {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ paid?: string }>;
}) {
  const { orderId } = await params;
  const { paid } = await searchParams;
  if (!isUuid(orderId)) notFound();
  const session = await requireUser(`/dashboard/journey/tours/${orderId}/`);
  const o = await tourOrder(orderId);
  if (!o || o.customer_id !== session.userId) notFound();
  const quote = o.status === "confirmed" && o.cancel_state !== "requested" ? await tourCancelQuote(o.id) : null;
  const held = o.held;
  const bands = ((o.policy as { bands?: CancellationBand[] }).bands ?? []) as CancellationBand[];
  const m = (x: number | string) => money(x, o.currency);
  return (
    <>
      <p>
        <Link href="/dashboard/journey/tours/">← Tours and sightseeing</Link>
      </p>
      <h1 className={ui.pageTitle}>Tour order {o.reference}</h1>
      {paid ? <Notice tone="success">Thank you. Stripe confirms the payment in a moment; it then shows here.</Notice> : null}
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
            <dd>
              <strong>{m(o.total_minor)}</strong>
            </dd>
          </div>
        </dl>
        {o.notes ? <p className={ui.muted}>Your notes: {o.notes}</p> : null}
        {o.cancelled_reason ? <p className={ui.muted}>{o.cancelled_reason}.</p> : null}
        {o.cancel_note ? <p className={ui.muted}>Nilecruz’s note: {o.cancel_note}</p> : null}
        {o.tour_payments.length ? (
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
                Refunded {money(r.amount_minor, r.currency)} · {r.method === "stripe" ? "to the card (Stripe)" : r.how}
                {r.method === "manual" && r.reference ? ` · ref. ${r.reference}` : ""} · <CairoTime value={r.created_at} />
              </li>
            ))}
          </ul>
        ) : null}
      </Section>
      {held ? (
        <Section title="Pay" id="pay">
          <p>
            Your places are held until <CairoTime value={o.hold_until} />. You enter your card on Stripe’s secure page; Nilecruz
            never sees the card details.
          </p>
          <ActionForm action={startTourCheckout.bind(null, o.id)} submit="Pay by card" />
          <ActionForm action={cancelTourOrder.bind(null, o.id)} submit="Cancel this order" variant="ghost" />
        </Section>
      ) : null}
      {quote ? (
        <Section title="Cancel this tour" id="cancel">
          <p>
            Cancelled today, {quote.days_before} {quote.days_before === 1 ? "day" : "days"} before the start, the policy charges{" "}
            <strong>{quote.percent} %</strong>: {m(quote.charge_minor)}.{" "}
            {quote.refund_minor > 0 ? `${m(quote.refund_minor)} would be refunded.` : "Nothing would be refunded."}
          </p>
          <ul className={ui.list}>
            {bandLines(bands, "the start").map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
          <ActionForm action={cancelTourOrder.bind(null, o.id)} submit="Ask to cancel" variant="outline">
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
