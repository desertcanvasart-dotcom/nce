"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionState } from "@/components/dashboard/ActionForm";
import { priceToMinor } from "@/lib/connections/format";
import { requireAdmin } from "@/server/auth";
import { failed, formObject, saved } from "@/server/catalogue/form";
import { connectionProblem } from "@/server/connections/form";
import { getDb } from "@/server/db";
import { issueStripeRefunds, issueTourRefund } from "@/server/payments/stripe";

/**
 * Finance (DASH-ADM-097–103, 106, DATA-037, 043). Finance and super admins only; the database checks the same.
 * Recording or verifying a payment never charges a card or moves money (DASH-ADM-107).
 */
const PAGE = "/dashboard/admin/finance/";
const FIN = ["finance"] as const;

export async function decidePayment(paymentId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin([...FIN], PAGE);
  const decision = String(fd.get("decision") ?? "");
  if (decision !== "verified" && decision !== "rejected") return failed("Choose received or not received.");
  const db = await getDb();
  const { error } = await db.rpc("verify_payment", {
    target: paymentId,
    decision,
    review_note: String(fd.get("note") ?? "").trim() || undefined,
  });
  if (error) return connectionProblem(error);
  revalidatePath(PAGE);
  return saved(
    decision === "verified" ? "Marked as received. A receipt and the commission entry were created." : "Marked as not received.",
  );
}

export async function recordManualPayment(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin([...FIN], PAGE);
  const f = formObject(fd);
  const reference = String(f.reservation ?? "")
    .trim()
    .toUpperCase();
  const amount = priceToMinor(String(f.amount ?? "").replace(/,/g, ""));
  if (!/^NC-[A-HJ-NP-Z2-9]{6}$/.test(reference)) return failed("Give the reservation reference, for example NC-7K3QX9.");
  if (amount === null) return failed("Give the amount received.");
  const db = await getDb();
  const { data: r } = await db.from("reservations").select("id, currency").eq("reference", reference).maybeSingle();
  if (!r) return failed("No reservation has that reference.");
  const { error } = await db.rpc("record_manual_payment", {
    res: r.id,
    amount,
    cur: r.currency,
    how: String(f.method ?? ""),
    ref: String(f.ref ?? ""),
    paid_date: String(f.paid_on ?? ""),
  });
  if (error) return connectionProblem(error);
  revalidatePath(PAGE);
  return saved(`Recorded for ${reference}. A receipt and the commission entry were created.`);
}

export async function recordPayout(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin([...FIN], PAGE);
  const f = formObject(fd);
  const amount = priceToMinor(String(f.amount ?? "").replace(/,/g, ""));
  if (!z.uuid().safeParse(f.org_id).success) return failed("Choose the operator.");
  if (amount === null) return failed("Give the amount paid out.");
  if (!/^(USD|EUR|EGP)$/.test(String(f.currency))) return failed("Choose the currency.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(f.paid_on ?? ""))) return failed("Give the date of the payout.");
  const db = await getDb();
  const { error } = await db.rpc("record_payout", {
    target_org: String(f.org_id),
    amount,
    cur: String(f.currency),
    how: String(f.method ?? "Bank transfer"),
    ref: String(f.ref ?? ""),
    paid_date: String(f.paid_on),
    payout_note: String(f.note ?? "") || undefined,
  });
  if (error) return connectionProblem(error);
  revalidatePath(PAGE);
  return saved("Payout recorded. This records a transfer you made; it doesn't send money.");
}

const periodInput = z
  .object({
    name: z.string().trim().min(1, "required").max(120),
    starts_on: z.iso.date({ message: "a date" }),
    ends_on: z.iso.date({ message: "a date" }),
  })
  .refine((v) => v.ends_on >= v.starts_on, { message: "ends before it starts", path: ["ends_on"] });

/** DASH-ADM-099, DASH-PAY-006: premium periods apply to new bookings only (DASH-PAY-010). */
export async function savePeriod(id: string | null, _prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin([...FIN], PAGE);
  const input = periodInput.safeParse(formObject(fd));
  if (!input.success) return failed(`Premium period: ${input.error.issues[0]!.message}.`);
  const db = await getDb();
  const { error } = id
    ? await db.from("premium_periods").update(input.data).eq("id", id)
    : await db.from("premium_periods").insert(input.data);
  if (error) return connectionProblem(error);
  revalidatePath(PAGE);
  return saved("Premium period saved. It applies to reservations made from now on; existing ones keep their deadline.");
}

export async function deletePeriod(id: string, _prev: ActionState, _fd: FormData): Promise<ActionState> {
  await requireAdmin([...FIN], PAGE);
  const db = await getDb();
  const { error } = await db.from("premium_periods").delete().eq("id", id);
  if (error) return connectionProblem(error);
  revalidatePath(PAGE);
  return saved("Premium period removed.");
}

// ── Cancellations and refunds (DASH-ADM-095, 104, 105, DATA-029) ──────────────────────────────────────────
const bookingPage = (reservationId: string) => `/dashboard/admin/bookings/${reservationId}/`;

export async function decideCancellation(
  reservationId: string,
  cancellationId: string,
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  await requireAdmin([...FIN], bookingPage(reservationId));
  const decision = String(fd.get("decision") ?? "");
  if (decision !== "approve" && decision !== "reject") return failed("Choose approve or refuse.");
  const db = await getDb();
  const { data, error } = await db.rpc("decide_cancellation", {
    target: cancellationId,
    approve: decision === "approve",
    note: String(fd.get("note") ?? "").trim() || undefined,
  });
  if (error) return connectionProblem(error);
  revalidatePath(bookingPage(reservationId));
  revalidatePath(PAGE);
  if (data === "rejected") return saved("Refused. The customer sees your reason.");
  return saved(
    data === "refund_due"
      ? "Approved. The reservation is cancelled and its cabins returned. Now issue the refund below."
      : "Approved. The reservation is cancelled and its cabins returned; nothing is due back.",
  );
}

/** DATA-029: the refund goes back to the card through Stripe, only after approval, for what is due. */
export async function issueCardRefund(
  reservationId: string,
  cancellationId: string,
  _prev: ActionState,
  _fd: FormData,
): Promise<ActionState> {
  await requireAdmin([...FIN], bookingPage(reservationId));
  const db = await getDb();
  const { data: plan, error } = await db.rpc("stripe_refund_plan", { target: cancellationId });
  if (error) return connectionProblem(error);
  if (!plan?.length) return failed("Nothing more can go back to a card. Record the rest as a manual refund.");
  const problem = await issueStripeRefunds(reservationId, cancellationId, plan);
  if (problem) return failed(problem);
  revalidatePath(bookingPage(reservationId));
  revalidatePath(PAGE);
  return saved("Refund issued through Stripe. The customer sees it on their reservation; banks take a few days to show it.");
}

export async function recordManualRefund(
  reservationId: string,
  cancellationId: string,
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  await requireAdmin([...FIN], bookingPage(reservationId));
  const f = formObject(fd);
  const amount = priceToMinor(String(f.amount ?? "").replace(/,/g, ""));
  if (amount === null) return failed("Give the amount refunded.");
  const db = await getDb();
  const { error } = await db.rpc("record_manual_refund", {
    target: cancellationId,
    amount,
    how: String(f.how ?? ""),
    ref: String(f.ref ?? ""),
  });
  if (error) return connectionProblem(error);
  revalidatePath(bookingPage(reservationId));
  revalidatePath(PAGE);
  return saved("Refund recorded. Recording it doesn't move money; it notes a refund made outside the system.");
}

const BANK_FIELDS = ["holder", "bank", "account_number", "iban", "swift", "currency", "note"] as const;

/** CONTENT-NEEDED #5: what customers see when paying by transfer. Kept as a setting: the repository is public. */
export async function saveBankDetails(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin([...FIN], PAGE);
  const details: Record<string, string> = {};
  for (const k of BANK_FIELDS) {
    const v = String(fd.get(k) ?? "").trim();
    if (v) details[k] = v;
  }
  const db = await getDb();
  const { error } = await db.rpc("save_bank_details", { details });
  if (error) return connectionProblem(error);
  revalidatePath(PAGE);
  return saved("Bank details saved. Customers see them when they pay by transfer.");
}

// ── Tour orders (DASH-PAY-014): Nilecruz's own sales, so a finance admin decides and refunds ─────────────────
const tourOrderPage = (id: string) => `/dashboard/admin/finance/tour-orders/${id}/`;

export async function decideTourCancellation(orderId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin([...FIN], tourOrderPage(orderId));
  const decision = String(fd.get("decision") ?? "");
  if (decision !== "approve" && decision !== "reject") return failed("Choose approve or refuse.");
  const db = await getDb();
  const { error } = await db.rpc("decide_tour_cancellation", {
    target: orderId,
    approve: decision === "approve",
    note: String(fd.get("note") ?? "").trim() || undefined,
  });
  if (error) return connectionProblem(error);
  revalidatePath(tourOrderPage(orderId));
  revalidatePath(PAGE);
  return saved(decision === "approve" ? "Approved. Now issue the refund." : "Refused. The customer sees your reason.");
}

export async function issueTourCardRefund(orderId: string, _prev: ActionState, _fd: FormData): Promise<ActionState> {
  await requireAdmin([...FIN], tourOrderPage(orderId));
  const db = await getDb();
  const { data: o } = await db
    .from("tour_orders")
    .select("cancel_state, cancel_refund_minor, tour_payments(id, status, stripe_payment_intent_id), tour_refunds(amount_minor)")
    .eq("id", orderId)
    .maybeSingle();
  if (!o || o.cancel_state !== "approved") return failed("No refund is due on this order.");
  const left = Number(o.cancel_refund_minor ?? 0) - o.tour_refunds.reduce((n, r) => n + Number(r.amount_minor), 0);
  const pay = o.tour_payments.find((p) => p.status === "verified");
  if (left <= 0 || !pay) return failed("Nothing is left to refund.");
  const problem = await issueTourRefund(orderId, { id: pay.id, intent: pay.stripe_payment_intent_id }, left);
  if (problem) return failed(problem);
  revalidatePath(tourOrderPage(orderId));
  revalidatePath(PAGE);
  return saved("Refund issued through Stripe.");
}

export async function recordTourManualRefund(orderId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin([...FIN], tourOrderPage(orderId));
  const f = formObject(fd);
  const amount = priceToMinor(String(f.amount ?? "").replace(/,/g, ""));
  if (amount === null) return failed("Give the amount refunded.");
  const db = await getDb();
  const { error } = await db.rpc("record_tour_manual_refund", {
    target: orderId,
    amount,
    how: String(f.how ?? ""),
    ref: String(f.ref ?? ""),
  });
  if (error) return connectionProblem(error);
  revalidatePath(tourOrderPage(orderId));
  revalidatePath(PAGE);
  return saved("Refund recorded. Recording it doesn't move money.");
}
