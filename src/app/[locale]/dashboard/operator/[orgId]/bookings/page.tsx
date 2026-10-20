import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ds/Badge/Badge";
import { formatMoney } from "@/components/ds/lib/format";
import { Section, ui } from "@/components/dashboard/ui";
import { requireOrgRole } from "@/server/auth";
import { reservations } from "@/server/bookings/queries";
import { payables, payoutsFor } from "@/server/payments/queries";
import { RESERVATION_BADGE } from "../../../_bookings/ReservationRecord";
import { isUuid } from "../../../sections";

/** The company's reservations and, for owners and finance, its payables (DASH-OPR-001, 013, DATA-038). */
export default async function OperatorBookings({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  if (!isUuid(orgId)) notFound();
  const { company } = await requireOrgRole(orgId, ["owner", "reservations", "finance", "viewer"], {
    kind: "operator",
    returnTo: `/dashboard/operator/${orgId}/bookings/`,
  });
  const seesMoney = company.teamRole === "owner" || company.teamRole === "finance";
  const [list, owed, outs] = await Promise.all([
    reservations({ orgId }),
    seesMoney ? payables(orgId) : Promise.resolve([]),
    seesMoney ? payoutsFor(orgId) : Promise.resolve([]),
  ]);
  const money = (m: number, c: string) => formatMoney({ amount: Number(m), currency: c }, "en");
  return (
    <>
      <h1 className={ui.pageTitle}>Bookings and payments</h1>
      <Section title="Reservations" id="list">
        {list.length ? (
          <ul className={ui.list}>
            {list.map((r) => (
              <li key={r.id}>
                <Link href={`/dashboard/operator/${orgId}/bookings/${r.id}/`}>
                  {r.reference} · {r.vessel?.name} · departs {r.departure?.departs_on}
                  {r.buyer_name ? ` · for ${r.buyer_name}` : ""}
                </Link>{" "}
                <Badge tone={RESERVATION_BADGE[r.status].tone}>{RESERVATION_BADGE[r.status].text}</Badge>{" "}
                {formatMoney({ amount: Number(r.total_minor), currency: r.currency }, "en")}
              </li>
            ))}
          </ul>
        ) : (
          <p className={ui.muted}>No reservations yet. They appear here when a customer accepts one of your offers.</p>
        )}
      </Section>
      {seesMoney ? (
        <Section title="Payables" id="payables">
          <p className={ui.muted}>
            Nilecruz receives customers’ payments, keeps its 10 % commission and pays you the rest outside this system. Read-only.
          </p>
          {owed.length ? (
            <ul className={ui.list}>
              {owed.map((p) => (
                <li key={p.currency}>
                  {p.currency}: earned {money(p.payable, p.currency)} · paid out {money(p.paidOut, p.currency)} ·{" "}
                  <strong>owed {money(p.balance, p.currency)}</strong>
                </li>
              ))}
            </ul>
          ) : (
            <p className={ui.muted}>Nothing yet: payables start when Nilecruz receives a payment.</p>
          )}
          {outs.length ? (
            <ul className={ui.list}>
              {outs.map((o) => (
                <li key={o.id}>
                  Payout {money(o.amount_minor, o.currency)} on {o.paid_on} · {o.method}
                  {o.reference ? ` · ${o.reference}` : ""}
                </li>
              ))}
            </ul>
          ) : null}
        </Section>
      ) : null}
    </>
  );
}
