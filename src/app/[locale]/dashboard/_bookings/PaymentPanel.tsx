import Link from "next/link";
import { Badge } from "@/components/ds/Badge/Badge";
import { formatMoney } from "@/components/ds/lib/format";
import { Section, ui } from "@/components/dashboard/ui";
import { CairoTime } from "@/components/shell/CairoTime";
import { RULE_WORDS, type DeadlineRule } from "@/lib/payments/deadlines";
import type { balance, paymentsFor } from "@/server/payments/queries";

type Bal = NonNullable<Awaited<ReturnType<typeof balance>>>;
type Pays = Awaited<ReturnType<typeof paymentsFor>>;

export const PAYMENT_BADGE = {
  reported: { tone: "accent", text: "Reported, being checked" },
  verified: { tone: "success", text: "Received" },
  rejected: { tone: "danger", text: "Not received" },
  refunded: { tone: "neutral", text: "Refunded" },
} as const;
const METHOD = { card: "Card (Stripe)", transfer: "Bank transfer", manual: "Recorded by Nilecruz" } as const;

/**
 * DASH-CUS-008, DASH-ADM-103, DASH-OPR-013: deadline, total, paid, outstanding, and every payment.
 * Wording never suggests that recording or verifying moves money (DASH-ADM-107).
 */
export function PaymentPanel({
  bal,
  pays,
  rule,
  status,
  receiptHref,
}: {
  bal: Bal;
  pays: Pays;
  rule: string;
  status: string;
  receiptHref?: (paymentId: string) => string;
}) {
  const money = (m: number) => formatMoney({ amount: Number(m), currency: bal.currency }, "en");
  return (
    <Section title="Payment" id="payment">
      <dl className={ui.grid}>
        <div>
          <dt className={ui.label}>Total</dt>
          <dd>{money(bal.total_minor)}</dd>
        </div>
        <div>
          <dt className={ui.label}>Received</dt>
          <dd>{money(bal.paid_minor)}</dd>
        </div>
        <div>
          <dt className={ui.label}>Outstanding</dt>
          <dd>
            <strong>{money(bal.outstanding_minor)}</strong>
          </dd>
        </div>
        <div>
          <dt className={ui.label}>Pay in full by</dt>
          <dd>
            <CairoTime value={bal.payment_due_at} endOfDay />
          </dd>
        </div>
      </dl>
      <p className={ui.muted}>
        {RULE_WORDS[rule as DeadlineRule]}, and always before departure.{" "}
        {status === "awaiting_payment"
          ? "If it isn’t paid by then, the reservation is cancelled and the cabins released, unless a reported payment is still being checked."
          : null}
        {bal.reported_minor > 0 ? ` ${money(bal.reported_minor)} is reported and being checked.` : null}
      </p>
      {pays.length ? (
        <ul className={ui.list}>
          {pays.map((p) => (
            <li key={p.id}>
              {formatMoney({ amount: Number(p.amount_minor), currency: p.currency }, "en")} · {METHOD[p.method]}
              {p.paid_on ? ` · ${p.paid_on}` : ""}
              {p.reference ? ` · ref. ${p.reference}` : ""}{" "}
              <Badge tone={PAYMENT_BADGE[p.status].tone}>{PAYMENT_BADGE[p.status].text}</Badge>
              {p.note ? <span className={ui.muted}> {p.note}</span> : null}
              {p.proofUrl ? (
                <>
                  {" "}
                  · <a href={p.proofUrl}>proof</a>
                </>
              ) : null}
              {p.status === "verified" && p.receipt_number && receiptHref ? (
                <>
                  {" "}
                  · <Link href={receiptHref(p.id)}>Receipt {p.receipt_number}</Link>
                </>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className={ui.muted}>No payments yet.</p>
      )}
    </Section>
  );
}
