"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "@/components/dashboard/ActionForm";
import { expiryProblem, linePrice, sameGuests } from "@/lib/bookings/bookings";
import { priceToMinor } from "@/lib/connections/format";
import { currenciesFor, RATE_PLANS, type RatePlan } from "@/lib/product/pricing";
import { requireOrgRole } from "@/server/auth";
import { failed, formObject, saved } from "@/server/catalogue/form";
import { cabinsForDeparture, request } from "@/server/bookings/queries";
import { connectionProblem } from "@/server/connections/form";
import { getDb } from "@/server/db";

/** Personal offers (DASH-OPR-011, 017–023). Owners and reservations staff; the database checks the same rights. */
const requestPage = (orgId: string, requestId: string) => `/dashboard/operator/${orgId}/offers/${requestId}/`;

export async function sendOffer(
  orgId: string,
  requestId: string,
  previous: string | null,
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  await requireOrgRole(orgId, ["owner", "reservations"], { kind: "operator", returnTo: requestPage(orgId, requestId) });
  const f = formObject(fd);
  const r = await request(requestId);
  if (!r) return failed("This request no longer exists.");
  const departure = String(f.departure_id ?? "");
  const plan = String(f.plan ?? "") as RatePlan;
  const currency = String(f.currency ?? "");
  if (!RATE_PLANS.some((p) => p.value === plan)) return failed("Choose a rate plan.");
  if (!currenciesFor(plan).includes(currency as "USD"))
    return failed("E£ prices are only for the Egyptian-citizen and foreign-resident plans.");
  const hours = Number(f.expires_hours ?? 72);
  const exp = expiryProblem(hours);
  if (exp) return failed(exp);
  const terms = String(f.terms ?? "").trim();
  const eligibility = String(f.eligibility ?? "").trim();
  if (!terms) return failed("Write the terms of this offer.");
  if (!eligibility)
    return failed("Confirm who this offer is for (DASH-OPR-019): the family make-up and, for local rates, the eligibility.");

  const cabins = await cabinsForDeparture(departure, plan, currency);
  const lines: { cabin_type_id: string; adults: number; child_ages: number[]; price_minor: number }[] = [];
  let listTotal = 0;
  let listComplete = true;
  const problems: string[] = [];
  for (let i = 0; i < r.cabins; i++) {
    const n = i + 1;
    const cabin = cabins.find((c) => c.id === f[`cabin_type_${i}`]);
    const adults = Number(f[`adults_${i}`] ?? 0);
    const agesText = String(f[`child_ages_${i}`] ?? "").trim();
    const ages = agesText ? agesText.split(/[\s,]+/).filter(Boolean) : [];
    if (!cabin) {
      problems.push(`Cabin ${n}: choose a cabin type.`);
      continue;
    }
    if (!Number.isInteger(adults) || adults < 0 || ages.some((a) => !/^\d{1,2}$/.test(a))) {
      problems.push(`Cabin ${n}: give the number of adults and the children's ages as whole numbers.`);
      continue;
    }
    const childAges = ages.map(Number);
    const listed = linePrice({ adults, childAges, maxOccupancy: cabin.max_occupancy }, (occ) => {
      const rate = cabin.rates.find((x) => x.occupancy === occ);
      return rate ? { amountMinor: rate.amountMinor, bands: rate.bands } : null;
    });
    if (!listed.ok && /adult|sleeps/.test(listed.reason)) {
      problems.push(`Cabin ${n}: ${listed.reason}`);
      continue;
    }
    if (listed.ok) listTotal += listed.priceMinor;
    else listComplete = false;
    const typed = String(f[`price_${i}`] ?? "").trim();
    const price = typed ? priceToMinor(typed.replace(/,/g, "")) : listed.ok ? listed.priceMinor : null;
    if (price === null) {
      problems.push(
        `Cabin ${n}: ${listed.ok ? "give the price as an amount" : `${listed.reason} Enter a price for this cabin.`}`,
      );
      continue;
    }
    lines.push({ cabin_type_id: cabin.id, adults, child_ages: childAges, price_minor: price });
  }
  if (problems.length) return { ok: false, message: "The offer wasn't sent. Please fix:", problems };
  if (
    !sameGuests(
      lines.map((l) => ({ adults: l.adults, childAges: l.child_ages })),
      r,
    )
  ) {
    return failed(
      `The cabins must hold exactly the guests asked for: ${r.adults} adults${r.child_ages.length ? ` and children aged ${r.child_ages.join(", ")}` : ""}.`,
    );
  }
  const total = lines.reduce((s, l) => s + l.price_minor, 0);
  const note = String(f.pricing_note ?? "").trim();
  if (listComplete && total !== listTotal && !note)
    return failed("The price differs from your rates. Say why in “Price note” (the customer sees it).");

  const db = await getDb();
  const { error } = await db.rpc("send_offer", {
    req: requestId,
    dep: departure,
    plan,
    cur: currency,
    cabins: lines,
    total,
    list_total: listComplete ? listTotal : 0,
    note,
    inclusions_text: String(f.inclusions ?? ""),
    terms_text: terms,
    eligibility,
    expires_in_hours: hours,
    previous: previous ?? undefined,
  });
  if (error) return connectionProblem(error);
  revalidatePath(requestPage(orgId, requestId));
  redirect(`${requestPage(orgId, requestId)}?sent=1`);
}

export async function withdrawOffer(
  orgId: string,
  requestId: string,
  offerId: string,
  _prev: ActionState,
  _fd: FormData,
): Promise<ActionState> {
  await requireOrgRole(orgId, ["owner", "reservations"], { kind: "operator", returnTo: requestPage(orgId, requestId) });
  const db = await getDb();
  const { error } = await db.rpc("withdraw_offer", { target: offerId });
  if (error) return connectionProblem(error);
  revalidatePath(requestPage(orgId, requestId));
  return saved("Offer withdrawn. The customer can no longer accept it.");
}

export async function reviewProof(
  orgId: string,
  reservationId: string,
  proofId: string,
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  await requireOrgRole(orgId, ["owner", "reservations"], {
    kind: "operator",
    returnTo: `/dashboard/operator/${orgId}/bookings/${reservationId}/`,
  });
  const decision = String(fd.get("decision") ?? "");
  if (decision !== "verified" && decision !== "rejected") return failed("Choose verified or not accepted.");
  const note = String(fd.get("note") ?? "").trim();
  if (decision === "rejected" && !note) return failed("Tell the customer why, in a few words.");
  const db = await getDb();
  const { error } = await db.rpc("review_eligibility_proof", { target: proofId, decision, review_note: note || undefined });
  if (error) return connectionProblem(error);
  revalidatePath(`/dashboard/operator/${orgId}/bookings/${reservationId}/`);
  return saved(
    decision === "verified" ? "Proof verified." : "Proof not accepted; send an updated offer at the right rate if needed.",
  );
}

export async function markOrgNoticesRead(orgId: string, _prev: ActionState, _fd: FormData): Promise<ActionState> {
  await requireOrgRole(orgId, "any", { kind: "operator", returnTo: `/dashboard/operator/${orgId}/` });
  const db = await getDb();
  await db.from("notifications").update({ read_at: new Date().toISOString() }).eq("org_id", orgId).is("read_at", null);
  revalidatePath(`/dashboard/operator/${orgId}/`);
  return saved("Marked as read.");
}

/** ADR-089: operators remind customers to pay; only Nilecruz admins record money. */
export async function sendReminder(
  orgId: string,
  reservationId: string,
  _prev: ActionState,
  _fd: FormData,
): Promise<ActionState> {
  await requireOrgRole(orgId, ["owner", "reservations", "finance"], {
    kind: "operator",
    returnTo: `/dashboard/operator/${orgId}/bookings/${reservationId}/`,
  });
  const db = await getDb();
  const { error } = await db.rpc("send_payment_reminder", { res: reservationId });
  if (error) return connectionProblem(error);
  return saved("Reminder sent. The customer sees it in My journey.");
}
