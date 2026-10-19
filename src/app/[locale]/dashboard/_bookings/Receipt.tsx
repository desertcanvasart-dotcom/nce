import { formatMoney } from "@/components/ds/lib/format";
import { ui } from "@/components/dashboard/ui";
import { CairoTime } from "@/components/shell/CairoTime";
import type { payment } from "@/server/payments/queries";

const METHOD = { card: "Card (Stripe)", transfer: "Bank transfer", manual: "Recorded by Nilecruz" } as const;

/** DASH-ADM-102: a receipt for one received payment. Printable; Nilecruz is merchant of record (ADR-026). */
export function Receipt({ p }: { p: NonNullable<Awaited<ReturnType<typeof payment>>> }) {
  return (
    <article className={ui.card} aria-label={`Receipt ${p.receipt_number}`}>
      <h1 className={ui.pageTitle}>Receipt {p.receipt_number}</h1>
      <dl className={ui.grid}>
        <div>
          <dt className={ui.label}>Received by</dt>
          <dd>Nilecruz</dd>
        </div>
        <div>
          <dt className={ui.label}>Amount</dt>
          <dd>
            <strong>{formatMoney({ amount: Number(p.amount_minor), currency: p.currency }, "en")}</strong>
          </dd>
        </div>
        <div>
          <dt className={ui.label}>Method</dt>
          <dd>{METHOD[p.method]}</dd>
        </div>
        <div>
          <dt className={ui.label}>Recorded</dt>
          <dd>{p.verified_at ? <CairoTime value={p.verified_at} /> : "—"}</dd>
        </div>
        <div>
          <dt className={ui.label}>For</dt>
          <dd>
            Reservation {p.reservation?.reference} · {p.reservation?.vessel?.name} · departs{" "}
            {p.reservation?.departure?.departs_on}
          </dd>
        </div>
        <div>
          <dt className={ui.label}>Reference</dt>
          <dd>{p.reference ?? "—"}</dd>
        </div>
      </dl>
      <p className={ui.muted}>
        A receipt confirms Nilecruz received this payment for the reservation. The crew gratuity is paid on board and isn’t
        included.
      </p>
    </article>
  );
}
