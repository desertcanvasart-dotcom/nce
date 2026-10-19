import type { ReactNode } from "react";
import { Badge } from "@/components/ds/Badge/Badge";
import { formatMoney } from "@/components/ds/lib/format";
import { Section, ui } from "@/components/dashboard/ui";
import { CairoTime } from "@/components/shell/CairoTime";
import { CANCELLATION_STATUS, OPERATOR_REVIEW } from "@/lib/payments/cancellation";
import type { cancellationsFor, refundsFor } from "@/server/payments/queries";

type Requests = Awaited<ReturnType<typeof cancellationsFor>>;
type Refunds = Awaited<ReturnType<typeof refundsFor>>;

/**
 * DASH-PAY-011, 012, DASH-CUS-010, DASH-OPR-015, DASH-ADM-095: each cancellation request with its figures, the operator's
 * check, the decision and the refunds made. `actions` adds what the viewer may do on a request.
 */
export function CancellationPanel({
  requests,
  refunds,
  actions,
}: {
  requests: Requests;
  refunds: Refunds;
  actions?: (request: Requests[number]) => ReactNode;
}) {
  if (!requests.length) return null;
  return (
    <Section title="Cancellation" id="cancellation">
      {requests.map((c) => {
        const money = (m: number) => formatMoney({ amount: Number(m), currency: c.currency }, "en");
        const given = refunds.filter((x) => x.cancellation_id === c.id);
        const decided = c.status !== "requested" && c.status !== "withdrawn";
        return (
          <article key={c.id} className={ui.card} aria-label="Cancellation request">
            <p>
              <Badge tone={CANCELLATION_STATUS[c.status].tone}>{CANCELLATION_STATUS[c.status].text}</Badge>{" "}
              <span className={ui.muted}>
                Requested <CairoTime value={c.created_at} />
              </span>
            </p>
            <dl className={ui.grid}>
              <div>
                <dt className={ui.label}>Days before departure</dt>
                <dd>{c.days_before}</dd>
              </div>
              <div>
                <dt className={ui.label}>Charge</dt>
                <dd>
                  {c.percent} % · {money(c.charge_minor)}
                </dd>
              </div>
              <div>
                <dt className={ui.label}>{decided ? "Received" : "Received so far"}</dt>
                <dd>{money(c.paid_minor)}</dd>
              </div>
              <div>
                <dt className={ui.label}>{decided ? "Refund" : "Refund if approved"}</dt>
                <dd>
                  <strong>{money(c.refund_minor)}</strong>
                </dd>
              </div>
              {c.unpaid_charge_minor > 0 ? (
                <div>
                  <dt className={ui.label}>Charge not yet paid</dt>
                  <dd>{money(c.unpaid_charge_minor)}</dd>
                </div>
              ) : null}
            </dl>
            {c.reason ? <p className={ui.muted}>Reason given: {c.reason}</p> : null}
            {c.status === "requested" || c.operator_review !== "pending" ? (
              <p className={ui.muted}>
                {OPERATOR_REVIEW[c.operator_review]}
                {c.operator_note ? `: ${c.operator_note}` : "."}
              </p>
            ) : null}
            {c.decision_note ? <p className={ui.muted}>Nilecruz’s note: {c.decision_note}</p> : null}
            {given.length ? (
              <ul className={ui.list}>
                {given.map((x) => (
                  <li key={x.id}>
                    Refunded {formatMoney({ amount: Number(x.amount_minor), currency: x.currency }, "en")} ·{" "}
                    {x.method === "stripe" ? "to the card (Stripe)" : (x.how ?? "outside the system")}
                    {x.reference && x.method !== "stripe" ? ` · ref. ${x.reference}` : ""} · <CairoTime value={x.created_at} />
                  </li>
                ))}
              </ul>
            ) : null}
            {actions?.(c)}
          </article>
        );
      })}
    </Section>
  );
}
