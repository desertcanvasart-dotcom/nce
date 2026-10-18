import "server-only";
import { getDb } from "@/server/db";

/** Money views (Batch 4f-1). RLS decides who sees what; admins see everything, operators their own. */

export async function balance(reservationId: string) {
  const db = await getDb();
  const { data } = await db.rpc("reservation_balance", { res: reservationId });
  return data?.[0] ?? null;
}

export async function paymentsFor(reservationId: string) {
  const db = await getDb();
  const { data, error } = await db
    .from("payments")
    .select(
      "id, method, status, amount_minor, currency, paid_on, reference, note, receipt_number, proof_path, created_at, verified_at",
    )
    .eq("reservation_id", reservationId)
    .order("created_at");
  if (error) throw error;
  return Promise.all(
    (data ?? []).map(async (p) => {
      if (!p.proof_path) return { ...p, proofUrl: null };
      const { data: s } = await db.storage.from("payment-proofs").createSignedUrl(p.proof_path, 600);
      return { ...p, proofUrl: s?.signedUrl ?? null };
    }),
  );
}

export async function payment(id: string) {
  const db = await getDb();
  const { data } = await db
    .from("payments")
    .select(
      "*, reservation:reservations(id, reference, customer_id, currency, total_minor, vessel:vessels(name), departure:departures(departs_on))",
    )
    .eq("id", id)
    .maybeSingle();
  return data;
}

export async function premiumPeriods() {
  const db = await getDb();
  const { data } = await db.from("premium_periods").select("*").order("starts_on");
  return data ?? [];
}

/** Admin finance: what needs a decision, and the records (DASH-ADM-003, 097, 098). */
export async function financeQueue() {
  const db = await getDb();
  const [reported, payments, overdueReported] = await Promise.all([
    db
      .from("payments")
      .select(
        "id, amount_minor, currency, paid_on, reference, proof_path, created_at, reservation:reservations(id, reference, payment_due_at, org:organisations(display_name))",
      )
      .eq("status", "reported")
      .order("created_at"),
    db
      .from("payments")
      .select(
        "id, method, status, amount_minor, currency, paid_on, reference, receipt_number, created_at, reservation:reservations(id, reference, org:organisations(display_name))",
      )
      .order("created_at", { ascending: false })
      .limit(100),
    db
      .from("reservations")
      .select("id, reference, payment_due_at, payments!inner(status)")
      .eq("status", "awaiting_payment")
      .lt("payment_due_at", new Date().toISOString())
      .eq("payments.status", "reported"),
  ]);
  const withProof = await Promise.all(
    (reported.data ?? []).map(async (p) => {
      if (!p.proof_path) return { ...p, proofUrl: null };
      const { data: s } = await db.storage.from("payment-proofs").createSignedUrl(p.proof_path, 600);
      return { ...p, proofUrl: s?.signedUrl ?? null };
    }),
  );
  return { reported: withProof, payments: payments.data ?? [], overdueReported: overdueReported.data ?? [] };
}

export async function awaitingVerificationCount() {
  const db = await getDb();
  const { count } = await db.from("payments").select("id", { count: "exact", head: true }).eq("status", "reported");
  return count ?? 0;
}

export type Payable = {
  orgId: string;
  name: string;
  currency: string;
  payable: number;
  commission: number;
  paidOut: number;
  balance: number;
};

/** Per operator and currency: payables earned, commission kept, payouts made, balance owed (DATA-037, 038). */
export async function payables(orgId?: string): Promise<Payable[]> {
  const db = await getDb();
  let e = db
    .from("commission_entries")
    .select("org_id, currency, payable_minor, commission_minor, org:organisations(display_name)");
  let p = db.from("payouts").select("org_id, currency, amount_minor, org:organisations(display_name)");
  if (orgId) {
    e = e.eq("org_id", orgId);
    p = p.eq("org_id", orgId);
  }
  const [{ data: entries }, { data: outs }] = await Promise.all([e, p]);
  const rows = new Map<string, Payable>();
  const row = (id: string, name: string, cur: string) => {
    const k = `${id}/${cur}`;
    if (!rows.has(k)) rows.set(k, { orgId: id, name, currency: cur, payable: 0, commission: 0, paidOut: 0, balance: 0 });
    return rows.get(k)!;
  };
  for (const x of entries ?? []) {
    const r = row(x.org_id, x.org?.display_name ?? "", x.currency);
    r.payable += Number(x.payable_minor);
    r.commission += Number(x.commission_minor);
  }
  for (const x of outs ?? []) row(x.org_id, x.org?.display_name ?? "", x.currency).paidOut += Number(x.amount_minor);
  for (const r of rows.values()) r.balance = r.payable - r.paidOut;
  return [...rows.values()].sort((a, b) => a.name.localeCompare(b.name) || a.currency.localeCompare(b.currency));
}

export async function payoutsFor(orgId: string) {
  const db = await getDb();
  const { data } = await db.from("payouts").select("*").eq("org_id", orgId).order("paid_on", { ascending: false });
  return data ?? [];
}
