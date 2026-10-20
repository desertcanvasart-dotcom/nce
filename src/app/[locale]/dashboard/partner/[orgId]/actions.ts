"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "@/components/dashboard/ActionForm";
import { priceToMinor } from "@/lib/connections/format";
import { passengersProblem, type Passenger } from "@/lib/bookings/bookings";
import { env } from "@/lib/env";
import { ageOn } from "@/lib/product/pricing";
import { checkoutParams } from "@/lib/payments/checkout";
import { requireOrgRole } from "@/server/auth";
import { parseRequest } from "@/server/bookings/request-form";
import { failed, formObject, saved } from "@/server/catalogue/form";
import { connectionProblem } from "@/server/connections/form";
import { getDb } from "@/server/db";
import { getStripe } from "@/server/payments/stripe";

/**
 * Travel partners book for clients (DASH-B2B-003, 005–008, ADR-092). The database checks each role again:
 * owners and reservations users reserve and edit client details; owners and finance users pay; anyone can ask to cancel.
 */
const booking = (orgId: string, id: string) => `/dashboard/partner/${orgId}/bookings/${id}/`;
const requests = (orgId: string) => `/dashboard/partner/${orgId}/requests/`;

/** The selling price as typed: empty means none; anything else must be an amount. */
function sellingFrom(f: Record<string, string | string[]>): { ok: true; minor: number | null } | { ok: false } {
  const text = String(f.selling_total ?? "")
    .replace(/,/g, "")
    .trim();
  if (!text) return { ok: true, minor: null };
  const minor = priceToMinor(text);
  return minor === null ? { ok: false } : { ok: true, minor };
}

export async function partnerReserve(
  orgId: string,
  plan: { departureId: string; cabinTypeId: string; currency: string; cabins: number; ages: number[] },
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  await requireOrgRole(orgId, ["owner", "reservations"], { kind: "partner", returnTo: `/dashboard/partner/${orgId}/search/` });
  const f = formObject(fd, ["terms"]);
  if (!(f.terms as string[]).includes("yes"))
    return failed("Tick that the client has read the terms and the cancellation policy.");
  const per = plan.ages.length;
  const guests = Array.from({ length: plan.cabins * per }, (_, i) => ({
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
  if (guests.some((g) => g.full_name.length < 2 || !/^\d{4}-\d{2}-\d{2}$/.test(g.date_of_birth)))
    return failed("Give every guest's full name and date of birth.");
  const selling = sellingFrom(f);
  if (!selling.ok) return failed("Give your selling price as an amount, for example 2600.");
  const db = await getDb();
  const { data: ref, error } = await db.rpc("partner_reserve", {
    org: orgId,
    dep: plan.departureId,
    cur: plan.currency,
    cabins: Array.from({ length: plan.cabins }, () => ({ cabin_type_id: plan.cabinTypeId, ages: plan.ages })),
    guests,
    client_ref: String(f.client_reference ?? "").slice(0, 120),
    selling_total: selling.minor ?? 0,
    terms_read: true,
  });
  if (error) return connectionProblem(error);
  const { data: r } = await db
    .from("reservations")
    .select("id")
    .eq("reference", ref as string)
    .single();
  redirect(booking(orgId, r!.id));
}

export async function saveClientDetails(
  orgId: string,
  reservationId: string,
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  await requireOrgRole(orgId, ["owner", "reservations"], {
    kind: "partner",
    allowPaused: true,
    returnTo: booking(orgId, reservationId),
  });
  const f = formObject(fd);
  const selling = sellingFrom(f);
  if (!selling.ok) return failed("Give your selling price as an amount, for example 2600.");
  const db = await getDb();
  const { data, error } = await db
    .from("partner_booking_details")
    .update({
      client_reference:
        String(f.client_reference ?? "")
          .trim()
          .slice(0, 120) || null,
      selling_total_minor: selling.minor,
    })
    .eq("reservation_id", reservationId)
    .eq("org_id", orgId)
    .select("reservation_id");
  if (error) return connectionProblem(error);
  if (!data?.length) return failed("You can't change this booking's client details.");
  revalidatePath(booking(orgId, reservationId));
  return saved("Client details saved. Only your agency sees them.");
}

export async function partnerCheckout(
  orgId: string,
  reservationId: string,
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const { session } = await requireOrgRole(orgId, ["owner", "finance"], {
    kind: "partner",
    returnTo: booking(orgId, reservationId),
  });
  if (!formObject(fd, ["policy"]).policy?.includes("yes")) return failed("Tick that you have read the cancellation policy.");
  const db = await getDb();
  const { data: r } = await db
    .from("reservations")
    .select("id, reference, buyer_org_id, status, currency, vessel:vessels(name)")
    .eq("id", reservationId)
    .maybeSingle();
  if (!r || r.buyer_org_id !== orgId) return failed("Booking not found.");
  if (r.status !== "awaiting_payment") return failed("This booking isn't waiting for payment.");
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
      returnPath: booking(orgId, reservationId),
    }),
  );
  if (!checkout.url) return failed("Stripe didn't return a payment page. Try again.");
  redirect(checkout.url);
}

const PROOF_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "application/pdf": "pdf" };

export async function partnerReportTransfer(
  orgId: string,
  reservationId: string,
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  await requireOrgRole(orgId, ["owner", "finance"], { kind: "partner", returnTo: booking(orgId, reservationId) });
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
  revalidatePath(booking(orgId, reservationId));
  return saved("Thank you. Nilecruz checks the transfer and confirms it here; until then it shows as reported.");
}

export async function partnerRequestCancellation(
  orgId: string,
  reservationId: string,
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  await requireOrgRole(orgId, ["owner", "reservations", "finance"], {
    kind: "partner",
    allowPaused: true,
    returnTo: booking(orgId, reservationId),
  });
  const f = formObject(fd, ["policy"]);
  if (!(f.policy as string[]).includes("yes")) return failed("Tick that you have read the cancellation policy and the charge.");
  const db = await getDb();
  const { error } = await db.rpc("request_cancellation", {
    res: reservationId,
    why: String(f.reason ?? "").slice(0, 1000),
    policy_read: true,
  });
  if (error) return connectionProblem(error);
  revalidatePath(booking(orgId, reservationId));
  return saved("Cancellation requested. The operator checks the figures and Nilecruz confirms it here.");
}

/** DASH-B2B-004: a request for the company. Operators see it as from a travel partner and may offer at the trade rate. */
export async function partnerCreateRequest(orgId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireOrgRole(orgId, ["owner", "reservations"], { kind: "partner", returnTo: requests(orgId) });
  const parsed = parseRequest(fd);
  if (!parsed.ok) return parsed.state;
  const db = await getDb();
  const { data, error } = await db
    .from("cruise_requests")
    .insert({ ...parsed.row, buyer_org_id: orgId })
    .select("id")
    .single();
  if (error) return connectionProblem(error);
  redirect(`${requests(orgId)}${data.id}/`);
}

export async function partnerCloseRequest(orgId: string, id: string, _prev: ActionState, _fd: FormData): Promise<ActionState> {
  await requireOrgRole(orgId, ["owner", "reservations"], {
    kind: "partner",
    allowPaused: true,
    returnTo: `${requests(orgId)}${id}/`,
  });
  const db = await getDb();
  const { error } = await db
    .from("cruise_requests")
    .update({ status: "closed" })
    .eq("id", id)
    .eq("buyer_org_id", orgId)
    .eq("status", "open");
  if (error) return connectionProblem(error);
  revalidatePath(`${requests(orgId)}${id}/`);
  return saved("Request closed. Operators can no longer send offers for it.");
}

/** DASH-B2B-004, 006: anyone in the company with the reservations role accepts an offer for a client. */
export async function partnerAcceptOffer(
  orgId: string,
  requestId: string,
  offerId: string,
  departsOn: string,
  offered: { adults: number; childAges: number[] },
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  await requireOrgRole(orgId, ["owner", "reservations"], {
    kind: "partner",
    returnTo: `${requests(orgId)}${requestId}/accept/${offerId}/`,
  });
  const f = formObject(fd, ["terms"]);
  if (!(f.terms as string[]).includes("yes"))
    return failed("Tick that the client has read the terms and the cancellation policy.");
  const guests: Passenger[] = Array.from({ length: offered.adults + offered.childAges.length }, (_, i) => ({
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
  const problem = passengersProblem(guests, departsOn, offered, ageOn);
  if (problem) return failed(problem);
  const selling = sellingFrom(f);
  if (!selling.ok) return failed("Give your selling price as an amount, for example 2600.");
  const db = await getDb();
  const { data: ref, error } = await db.rpc("accept_offer", { target: offerId, guests, terms_read: true });
  if (error) return connectionProblem(error);
  const { data: r } = await db
    .from("reservations")
    .select("id")
    .eq("reference", ref as string)
    .single();
  // The booking is made; the client's details are the agency's own notes on it.
  await db
    .from("partner_booking_details")
    .update({
      client_reference:
        String(f.client_reference ?? "")
          .trim()
          .slice(0, 120) || null,
      selling_total_minor: selling.minor,
    })
    .eq("reservation_id", r!.id);
  redirect(booking(orgId, r!.id));
}
