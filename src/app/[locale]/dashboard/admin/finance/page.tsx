import Link from "next/link";
import { Badge } from "@/components/ds/Badge/Badge";
import { formatMoney } from "@/components/ds/lib/format";
import { ActionForm } from "@/components/dashboard/ActionForm";
import { Input, Notice, Section, Select, ui } from "@/components/dashboard/ui";
import { CairoTime } from "@/components/shell/CairoTime";
import { requireAdmin } from "@/server/auth";
import { approvedOperators } from "@/server/catalogue/queries";
import { financeQueue, payables, premiumPeriods } from "@/server/payments/queries";
import { PAYMENT_BADGE } from "../../_bookings/PaymentPanel";
import { decidePayment, deletePeriod, recordManualPayment, recordPayout, savePeriod } from "./actions";

const money = (m: number, c: string) => formatMoney({ amount: Number(m), currency: c }, "en");
const CURRENCIES = [
  { value: "USD", label: "US$" },
  { value: "EUR", label: "€" },
  { value: "EGP", label: "E£" },
];

/** DASH-ADM-097–103, 106, DATA-037, 043: payments, receipts, commission, payables, payouts, premium calendar. */
export default async function FinancePage() {
  await requireAdmin(["finance"], "/dashboard/admin/finance/");
  const [q, owed, operators, periods] = await Promise.all([financeQueue(), payables(), approvedOperators(), premiumPeriods()]);

  return (
    <>
      <h1 className={ui.pageTitle}>Deposits and commission</h1>
      <Notice>
        This is payment administration and reconciliation. Recording or verifying a payment never charges a card or moves money;
        card payments arrive from Stripe, and payouts to operators are made outside this system.
      </Notice>

      <Section title={`Payments awaiting verification (${q.reported.length})`} id="verify">
        {q.reported.length ? (
          <ul className={ui.list}>
            {q.reported.map((p) => (
              <li key={p.id}>
                <strong>{money(p.amount_minor, p.currency)}</strong> for{" "}
                <Link href={`/dashboard/admin/bookings/${p.reservation?.id}/`}>{p.reservation?.reference}</Link> (
                {p.reservation?.org?.display_name}) · sent {p.paid_on} · ref. {p.reference ?? "—"}
                {p.proofUrl ? (
                  <>
                    {" "}
                    · <a href={p.proofUrl}>proof</a>
                  </>
                ) : null}
                <ActionForm
                  action={decidePayment.bind(null, p.id)}
                  submit={`Save decision for ${p.reservation?.reference}`}
                  variant="outline"
                >
                  <div className={ui.grid}>
                    <Select
                      label="Seen on the bank statement?"
                      name="decision"
                      required
                      placeholder="Choose"
                      options={[
                        { value: "verified", label: "Received" },
                        { value: "rejected", label: "Not received" },
                      ]}
                    />
                    <Input label="Note to the customer" name="note" maxLength={500} hint="Required if not received." />
                  </div>
                </ActionForm>
              </li>
            ))}
          </ul>
        ) : (
          <p className={ui.muted}>Nothing to verify.</p>
        )}
      </Section>

      <Section title="Past the deadline, held for review" id="review">
        <p className={ui.muted}>
          These weren’t released automatically because a reported payment is still being checked (DASH-PAY-009).
        </p>
        {q.overdueReported.length ? (
          <ul className={ui.list}>
            {q.overdueReported.map((r) => (
              <li key={r.id}>
                <Link href={`/dashboard/admin/bookings/${r.id}/`}>{r.reference}</Link> · due{" "}
                <CairoTime value={r.payment_due_at} endOfDay />
              </li>
            ))}
          </ul>
        ) : (
          <p className={ui.muted}>None.</p>
        )}
      </Section>

      <Section title="Record a manual payment" id="manual">
        <ActionForm action={recordManualPayment} submit="Record payment" variant="outline" resetOnSuccess>
          <div className={ui.grid}>
            <Input label="Reservation reference" name="reservation" required maxLength={9} hint="For example NC-7K3QX9." />
            <Input label="Amount received" name="amount" inputMode="decimal" required hint="In the reservation’s currency." />
            <Input label="Method" name="method" required maxLength={80} hint="For example “Bank transfer”." />
            <Input label="Reference" name="ref" required maxLength={200} hint="The bank statement reference." />
            <Input label="Received on" name="paid_on" type="date" required />
          </div>
        </ActionForm>
      </Section>

      <Section title="Operator payables" id="payables">
        <p className={ui.muted}>Each received cruise payment: 10 % commission to Nilecruz, the rest payable to the operator.</p>
        {owed.length ? (
          <div className={ui.tableWrap}>
            <table className={`${ui.table} ${ui.stack}`}>
              <caption className="visually-hidden">Payables by operator</caption>
              <thead>
                <tr>
                  <th scope="col">Operator</th>
                  <th scope="col" className={ui.num}>
                    Commission
                  </th>
                  <th scope="col" className={ui.num}>
                    Payable
                  </th>
                  <th scope="col" className={ui.num}>
                    Paid out
                  </th>
                  <th scope="col" className={ui.num}>
                    Owed
                  </th>
                </tr>
              </thead>
              <tbody>
                {owed.map((p) => (
                  <tr key={`${p.orgId}/${p.currency}`}>
                    <th scope="row" data-label="Operator">
                      {p.name} ({p.currency})
                    </th>
                    <td data-label="Commission" className={ui.num}>
                      {money(p.commission, p.currency)}
                    </td>
                    <td data-label="Payable" className={ui.num}>
                      {money(p.payable, p.currency)}
                    </td>
                    <td data-label="Paid out" className={ui.num}>
                      {money(p.paidOut, p.currency)}
                    </td>
                    <td data-label="Owed" className={ui.num}>
                      <strong>{money(p.balance, p.currency)}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className={ui.muted}>No payables yet.</p>
        )}
        <h3 className={ui.subTitle}>Record a payout</h3>
        <ActionForm action={recordPayout} submit="Record payout" variant="outline" resetOnSuccess>
          <div className={ui.grid}>
            <Select
              label="Operator"
              name="org_id"
              required
              placeholder="Choose"
              options={operators.map((o) => ({ value: o.id, label: o.display_name }))}
            />
            <Input label="Amount" name="amount" inputMode="decimal" required />
            <Select label="Currency" name="currency" required defaultValue="USD" options={CURRENCIES} />
            <Input label="Method" name="method" required maxLength={80} defaultValue="Bank transfer" />
            <Input label="Reference" name="ref" maxLength={200} />
            <Input label="Paid on" name="paid_on" type="date" required />
          </div>
        </ActionForm>
      </Section>

      <Section title="All payments" id="payments">
        {q.payments.length ? (
          <ul className={ui.list}>
            {q.payments.map((p) => (
              <li key={p.id}>
                {money(p.amount_minor, p.currency)} · {p.method} ·{" "}
                <Link href={`/dashboard/admin/bookings/${p.reservation?.id}/`}>{p.reservation?.reference}</Link> ·{" "}
                {p.reservation?.org?.display_name}{" "}
                <Badge tone={PAYMENT_BADGE[p.status].tone}>{PAYMENT_BADGE[p.status].text}</Badge>
                {p.receipt_number ? (
                  <>
                    {" "}
                    · <Link href={`/dashboard/admin/finance/receipts/${p.id}/`}>Receipt {p.receipt_number}</Link>
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className={ui.muted}>No payments yet.</p>
        )}
      </Section>

      <Section title="Premium calendar" id="premium">
        <p className={ui.muted}>
          Departures inside a premium period are paid within 3 days of booking, like 24 Dec – 7 Jan. Changes apply to new
          reservations only.
        </p>
        {periods.map((p) => (
          <div key={p.id}>
            <ActionForm action={savePeriod.bind(null, p.id)} submit={`Save ${p.name}`} variant="outline">
              <div className={ui.grid}>
                <Input label="Name" name="name" required maxLength={120} defaultValue={p.name} />
                <Input label="From" name="starts_on" type="date" required defaultValue={p.starts_on} />
                <Input label="To" name="ends_on" type="date" required defaultValue={p.ends_on} />
              </div>
            </ActionForm>
            <ActionForm action={deletePeriod.bind(null, p.id)} submit={`Remove ${p.name}`} variant="ghost" />
          </div>
        ))}
        <ActionForm action={savePeriod.bind(null, null)} submit="Add premium period" variant="outline" resetOnSuccess>
          <div className={ui.grid}>
            <Input label="Name" name="name" required maxLength={120} />
            <Input label="From" name="starts_on" type="date" required />
            <Input label="To" name="ends_on" type="date" required />
          </div>
        </ActionForm>
      </Section>
    </>
  );
}
