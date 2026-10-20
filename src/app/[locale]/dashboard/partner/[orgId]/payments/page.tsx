import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ds/Badge/Badge";
import { formatMoney } from "@/components/ds/lib/format";
import { ui } from "@/components/dashboard/ui";
import { CairoTime } from "@/components/shell/CairoTime";
import { requireOrgRole } from "@/server/auth";
import { getDb } from "@/server/db";
import { PAYMENT_BADGE } from "../../../_bookings/PaymentPanel";
import { isUuid } from "../../../sections";

const METHOD = { card: "Card (Stripe)", transfer: "Bank transfer", manual: "Recorded by Nilecruz" } as const;

/** DASH-B2B-005: the agency's payment records across its bookings. Kept when the agency is paused. */
export default async function CompanyPayments({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  if (!isUuid(orgId)) notFound();
  await requireOrgRole(orgId, ["owner", "finance"], {
    kind: "partner",
    allowPaused: true,
    returnTo: `/dashboard/partner/${orgId}/payments/`,
  });
  const db = await getDb();
  const { data } = await db
    .from("payments")
    .select(
      "id, method, status, amount_minor, currency, paid_on, receipt_number, created_at, reservation:reservations!inner(id, reference, buyer_org_id)",
    )
    .eq("reservation.buyer_org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(500);
  const rows = data ?? [];
  return (
    <>
      <h1 className={ui.pageTitle}>Payments</h1>
      {rows.length ? (
        <ul className={ui.list}>
          {rows.map((p) => (
            <li key={p.id}>
              <CairoTime value={p.created_at} /> ·{" "}
              <Link href={`/dashboard/partner/${orgId}/bookings/${p.reservation.id}/`}>{p.reservation.reference}</Link> ·{" "}
              {formatMoney({ amount: Number(p.amount_minor), currency: p.currency }, "en")} · {METHOD[p.method]}{" "}
              <Badge tone={PAYMENT_BADGE[p.status].tone}>{PAYMENT_BADGE[p.status].text}</Badge>
              {p.receipt_number ? <span className={ui.muted}> · Receipt {p.receipt_number}</span> : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className={ui.muted}>No payments yet.</p>
      )}
    </>
  );
}
