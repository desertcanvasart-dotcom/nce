"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "@/components/dashboard/ActionForm";
import { passengersProblem, type Passenger } from "@/lib/bookings/bookings";
import { priceToMinor } from "@/lib/connections/format";
import { env } from "@/lib/env";
import { cardPayable, checkoutParams, tourCheckoutParams } from "@/lib/payments/checkout";
import { formatCairo } from "@/lib/time/cairo";
import { cairoInstant } from "@/lib/tours/calendar";
import { ageOn } from "@/lib/product/pricing";
import { requireUser } from "@/server/auth";
import { failed, formObject, saved } from "@/server/catalogue/form";
import { parseRequest } from "@/server/bookings/request-form";
import { connectionProblem } from "@/server/connections/form";
import { getDb } from "@/server/db";
import { getStripe } from "@/server/payments/stripe";

/** My journey: cruise requests, accepting offers, eligibility proof (DASH-CUS-004–007, 014, 015, ADR-088). */
const REQUESTS = "/dashboard/journey/requests/";

export async function createRequest(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser(REQUESTS);
  const parsed = parseRequest(fd);
  if (!parsed.ok) return parsed.state;
  const db = await getDb();
  const { data, error } = await db.from("cruise_requests").insert(parsed.row).select("id").single();
  if (error) return connectionProblem(error);
  redirect(`${REQUESTS}${data.id}/`);
}

export async function closeRequest(id: string, _prev: ActionState, _fd: FormData): Promise<ActionState> {
  await requireUser(`${REQUESTS}${id}/`);
  const db = await getDb();
  const { error } = await db.from("cruise_requests").update({ status: "closed" }).eq("id", id).eq("status", "open");
  if (error) return connectionProblem(error);
  revalidatePath(`${REQUESTS}${id}/`);
  return saved("Request closed. Operators can no longer send offers for it.");
}

/** DASH-CUS-007, DASH-OPR-021: one database transaction re-checks everything and takes the cabins. */
export async function acceptOffer(
  requestId: string,
  offerId: string,
  departsOn: string,
  offered: { adults: number; childAges: number[] },
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  await requireUser(`${REQUESTS}${requestId}/accept/${offerId}/`);
  const f = formObject(fd, ["terms"]);
  const total = offered.adults + offered.childAges.length;
  const guests: Passenger[] = Array.from({ length: total }, (_, i) => ({
    full_name: String(f[`name_${i}`] ?? "").trim(),
    date_of_birth: String(f[`dob_${i}`] ?? ""),
    ...(i === 0
      ? {
          nationality: String(f.nationality ?? "")
            .trim()
            .toUpperCase(),
        }
      : {}),
  }));
  if (!(f.terms as string[]).includes("yes")) return failed("Tick that you have read the terms and the cancellation policy.");
  const problem = passengersProblem(guests, departsOn, offered, ageOn);
  if (problem) return failed(problem);
  const db = await getDb();
  const { data: reference, error } = await db.rpc("accept_offer", { target: offerId, guests, terms_read: true });
  if (error) return connectionProblem(error);
  const { data: res } = await db
    .from("reservations")
    .select("id")
    .eq("reference", reference as string)
    .single();
  redirect(`/dashboard/journey/reservations/${res!.id}/`);
}

const PROOF_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "application/pdf": "pdf" };

/** ADR-078, ADR-088: proof of Egyptian citizenship or residence, readable only by the customer, the operator and admins. */
export async function uploadProof(reservationId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser(`/dashboard/journey/reservations/${reservationId}/`);
  const file = fd.get("proof");
  if (!(file instanceof File) || file.size === 0) return failed("Choose a file.");
  const ext = PROOF_TYPES[file.type];
  if (!ext) return failed("Use a PDF, JPEG or PNG file.");
  if (file.size > 10 * 1024 * 1024) return failed("The file is larger than 10 MB.");
  const db = await getDb();
  const path = `reservations/${reservationId}/${randomUUID()}.${ext}`;
  const up = await db.storage
    .from("eligibility")
    .upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false });
  if (up.error) return failed("The file could not be stored. Try again.");
  const { error } = await db.from("eligibility_proofs").insert({ reservation_id: reservationId, storage_path: path });
  if (error) {
    await db.storage.from("eligibility").remove([path]);
    return connectionProblem(error);
  }
  revalidatePath(`/dashboard/journey/reservations/${reservationId}/`);
  return saved("Proof uploaded. The operator checks it before payment is due.");
}

export async function markNoticesRead(_prev: ActionState, _fd: FormData): Promise<ActionState> {
  const session = await requireUser("/dashboard/journey/");
  const db = await getDb();
  await db.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", session.userId).is("read_at", null);
  revalidatePath("/dashboard/journey/");
  return saved("Marked as read.");
}

// ── Paying (DASH-CUS-008, 009, DATA-026, ADR-089) ──────────────────────────────────────────────────────────
export async function startCheckout(reservationId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const session = await requireUser(`/dashboard/journey/reservations/${reservationId}/`);
  if (!formObject(fd, ["policy"]).policy?.includes("yes")) {
    return failed("Tick that you have read the cancellation policy (DASH-PAY-013).");
  }
  const db = await getDb();
  const { data: r } = await db
    .from("reservations")
    .select("id, reference, customer_id, status, currency, vessel:vessels(name)")
    .eq("id", reservationId)
    .maybeSingle();
  if (!r || r.customer_id !== session.userId) return failed("Reservation not found.");
  if (r.status !== "awaiting_payment") return failed("This reservation isn't waiting for payment.");
  if (!cardPayable(r.currency)) return failed("Prices in E£ are paid by bank transfer for now. Report the transfer below.");
  const { data: bal } = await db.rpc("reservation_balance", { res: reservationId });
  const outstanding = Number(bal?.[0]?.outstanding_minor ?? 0);
  if (outstanding <= 0) return failed("Nothing is outstanding.");
  const stripe = getStripe();
  if (!stripe) return failed("Card payments aren't switched on yet. Report a bank transfer below, or try again later.");
  const checkout = await stripe.checkout.sessions.create(
    checkoutParams({
      reservationId,
      reference: r.reference,
      vesselName: r.vessel?.name ?? "Nile cruise",
      outstandingMinor: outstanding,
      currency: r.currency,
      customerEmail: session.email,
      siteUrl: env.NEXT_PUBLIC_SITE_URL,
      nowSeconds: Math.floor(Date.now() / 1000),
    }),
  );
  if (!checkout.url) return failed("Stripe didn't return a payment page. Try again.");
  redirect(checkout.url);
}

export async function reportTransfer(reservationId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser(`/dashboard/journey/reservations/${reservationId}/`);
  const f = formObject(fd);
  const amount = priceToMinor(String(f.amount ?? "").replace(/,/g, ""));
  if (amount === null) return failed("Give the amount you sent, for example 1250.00.");
  const paidOn = String(f.paid_on ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(paidOn)) return failed("Give the date you sent it.");
  const db = await getDb();
  let proof: string | null = null;
  const file = fd.get("proof");
  if (file instanceof File && file.size > 0) {
    const ext = PROOF_TYPES[file.type];
    if (!ext) return failed("Use a PDF, JPEG or PNG file for the proof.");
    if (file.size > 10 * 1024 * 1024) return failed("The proof is larger than 10 MB.");
    proof = `reservations/${reservationId}/${randomUUID()}.${ext}`;
    const up = await db.storage
      .from("payment-proofs")
      .upload(proof, Buffer.from(await file.arrayBuffer()), { contentType: file.type });
    if (up.error) return failed("The proof could not be stored. Try again.");
  }
  const { error } = await db.rpc("report_payment", {
    res: reservationId,
    amount,
    cur: String(f.currency ?? ""),
    paid_date: paidOn,
    ref: String(f.reference ?? ""),
    proof: proof ?? undefined,
  });
  if (error) {
    if (proof) await db.storage.from("payment-proofs").remove([proof]);
    return connectionProblem(error);
  }
  revalidatePath(`/dashboard/journey/reservations/${reservationId}/`);
  return saved("Thank you. Nilecruz checks the transfer and confirms it here; until then it shows as reported.");
}

// ── Cancelling (DASH-CUS-010, DASH-PAY-011–013) ───────────────────────────────────────────────────────────
export async function requestCancellation(reservationId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser(`/dashboard/journey/reservations/${reservationId}/`);
  const f = formObject(fd, ["policy"]);
  if (!(f.policy as string[]).includes("yes")) return failed("Tick that you have read the cancellation policy and the charge.");
  const db = await getDb();
  const { error } = await db.rpc("request_cancellation", {
    res: reservationId,
    why: String(f.reason ?? "").slice(0, 1000),
    policy_read: true,
  });
  if (error) return connectionProblem(error);
  revalidatePath(`/dashboard/journey/reservations/${reservationId}/`);
  return saved("Cancellation requested. The operator checks the figures and Nilecruz confirms it here.");
}

export async function withdrawCancellation(
  reservationId: string,
  cancellationId: string,
  _prev: ActionState,
  _fd: FormData,
): Promise<ActionState> {
  await requireUser(`/dashboard/journey/reservations/${reservationId}/`);
  const db = await getDb();
  const { error } = await db.rpc("withdraw_cancellation", { target: cancellationId });
  if (error) return connectionProblem(error);
  revalidatePath(`/dashboard/journey/reservations/${reservationId}/`);
  return saved("Request withdrawn. Your reservation stays as it was.");
}

// ── Tour orders (DASH-PAY-014, DATA-027) ────────────────────────────────────────────────────────────────────
const TOURS = "/dashboard/journey/tours/";

export async function orderTour(tourId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser(`${TOURS}book/${tourId}/`);
  const f = formObject(fd, ["terms"]);
  if (!(f.terms as string[]).includes("yes")) return failed("Tick that you have read the terms and the cancellation policy.");
  const session = String(f.session ?? "");
  if (!session) return failed("Choose a date and time.");
  const ages = String(f.ages ?? "")
    .split(/[\s,]+/)
    .filter(Boolean);
  if (!ages.length || ages.some((a) => !/^\d{1,3}$/.test(a)))
    return failed("Give each guest's age as a whole number, separated by commas, for example “42, 40, 9”.");
  const lead = String(f.lead ?? "").trim();
  if (lead.length < 2) return failed("Give the lead guest's full name.");
  const db = await getDb();
  const { data, error } = await db.rpc("order_tour", {
    sess: session,
    guest_ages: ages.map(Number),
    lead,
    order_notes: String(f.notes ?? "").slice(0, 1000),
    terms_read: true,
  });
  if (error) return connectionProblem(error);
  redirect(`${TOURS}${data}/`);
}

/** ADR-097: book a start picked on the calendar. The database prices it again and holds the places for 60 minutes. */
export async function orderTourSlot(tourId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser(`${TOURS}book/${tourId}/`);
  const f = formObject(fd, ["terms"]);
  if (!(f.terms as string[]).includes("yes")) return failed("Tick that you have read the terms and the cancellation policy.");
  const day = String(f.day ?? "");
  const time = String(f.time ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !/^\d{2}:\d{2}$/.test(time)) return failed("Choose a date and a start time.");
  const ages = String(f.ages ?? "")
    .split(",")
    .filter(Boolean)
    .map(Number);
  if (!ages.length || ages.some((a) => !Number.isInteger(a) || a < 0 || a > 120)) return failed("Say who is coming.");
  const lead = String(f.lead ?? "").trim();
  if (lead.length < 2) return failed("Give the lead guest's full name.");
  const db = await getDb();
  const { data, error } = await db.rpc("order_tour_slot", {
    rate: String(f.rate ?? ""),
    starts: cairoInstant(day, time),
    guest_ages: ages,
    lead,
    order_notes: String(f.notes ?? "").slice(0, 1000),
    terms_read: true,
  });
  if (error) return connectionProblem(error);
  redirect(`${TOURS}${data}/`);
}

export async function startTourCheckout(orderId: string, _prev: ActionState, _fd: FormData): Promise<ActionState> {
  const session = await requireUser(`${TOURS}${orderId}/`);
  const db = await getDb();
  const { data: o } = await db
    .from("tour_orders")
    .select("id, reference, customer_id, status, currency, total_minor, hold_until, starts_at, tour:tours(name)")
    .eq("id", orderId)
    .maybeSingle();
  if (!o || o.customer_id !== session.userId) return failed("Order not found.");
  if (o.status !== "awaiting_payment") return failed("This order isn't waiting for payment.");
  if (Date.parse(o.hold_until) <= Date.now())
    return failed("The 60 minutes to pay have passed. Order again; the places may still be free.");
  const stripe = getStripe();
  if (!stripe) return failed("Card payments aren't switched on yet. Try again later.");
  const checkout = await stripe.checkout.sessions.create(
    tourCheckoutParams({
      orderId,
      reference: o.reference,
      tourName: o.tour?.name ?? "Tour",
      startsLabel: formatCairo(o.starts_at),
      totalMinor: Number(o.total_minor),
      currency: o.currency,
      customerEmail: session.email,
      siteUrl: env.NEXT_PUBLIC_SITE_URL,
      nowSeconds: Math.floor(Date.now() / 1000),
      holdUntilSeconds: Math.floor(Date.parse(o.hold_until) / 1000),
    }),
  );
  if (!checkout.url) return failed("Stripe didn't return a payment page. Try again.");
  redirect(checkout.url);
}

/** Unpaid: the places are simply let go. Paid: a request for a finance admin, charged by the tour's bands. */
export async function cancelTourOrder(orderId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser(`${TOURS}${orderId}/`);
  const f = formObject(fd, ["policy"]);
  const db = await getDb();
  const { error } = await db.rpc("request_tour_cancellation", {
    target: orderId,
    why: String(f.reason ?? "").slice(0, 1000),
    policy_read: (f.policy as string[]).includes("yes"),
  });
  if (error) return connectionProblem(error);
  revalidatePath(`${TOURS}${orderId}/`);
  return saved("Done.");
}
