"use server";

import { redirect } from "next/navigation";
import type { ActionState } from "@/components/dashboard/ActionForm";
import { passengersProblem, type Passenger } from "@/lib/bookings/bookings";
import { ageOn } from "@/lib/product/pricing";
import { requireUser } from "@/server/auth";
import { failed, formObject } from "@/server/catalogue/form";
import { connectionProblem } from "@/server/connections/form";
import { getDb } from "@/server/db";
import { rateLimit, tooMany } from "@/server/security/rate-limit";
import { notifyNewRequest } from "@/server/requests/dispatch";

type Plan = {
  departureId: string;
  departsOn: string;
  cabinTypeId: string;
  currency: string;
  cabins: number;
  ages: number[];
  /** ADR-102: with the vessel's own sightseeing, or with Nilecruz's programme (the database checks). */
  package?: "cruise" | "with_sightseeing" | "with_programme";
};

/** The guests from the form, checked against the cabins (DATA-020). */
function guestsFrom(plan: Plan, fd: FormData): { guests: Passenger[] } | { problem: string } {
  const f = formObject(fd, ["terms"]);
  if (!(f.terms as string[]).includes("yes"))
    return { problem: "Tick that you have read the terms and the cancellation policy." };
  const per = plan.ages.length;
  const guests: Passenger[] = Array.from({ length: plan.cabins * per }, (_, i) => ({
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
  const all = Array.from({ length: plan.cabins }, () => plan.ages).flat();
  const problem = passengersProblem(
    guests,
    plan.departsOn,
    { adults: all.filter((a) => a >= 18).length, childAges: all.filter((a) => a < 18) },
    ageOn,
  );
  return problem ? { problem } : { guests };
}

/**
 * ADR-099: cabins the operator confirms first (manual or sheet data). The request goes to the operator's contacts with
 * one-tap answers; the customer pays once it's confirmed.
 */
export async function customerRequestBooking(slug: string, plan: Plan, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const session = await requireUser(`/cruises/${slug}/reserve/`);
  const limit = await rateLimit("booking-request", `user:${session.userId}`);
  if (!limit.ok) return failed(tooMany(limit.retryAfter));
  const g = guestsFrom(plan, fd);
  if ("problem" in g) return failed(g.problem);
  const db = await getDb();
  const { data: id, error } = await db.rpc("customer_request_booking", {
    dep: plan.departureId,
    cur: plan.currency,
    cabins: Array.from({ length: plan.cabins }, () => ({
      cabin_type_id: plan.cabinTypeId,
      ages: plan.ages,
      package: plan.package ?? "cruise",
    })),
    guests: g.guests,
    terms_read: true,
  });
  if (error) return connectionProblem(error);
  await notifyNewRequest(id as string);
  redirect(`/dashboard/journey/requests/booking/${id}/`);
}

/** DASH-PUB-009, ADR-093: a signed-in customer reserves at the published rate; the database re-checks everything. */
export async function customerReserve(slug: string, plan: Plan, _prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser(`/cruises/${slug}/reserve/`);
  const g = guestsFrom(plan, fd);
  if ("problem" in g) return failed(g.problem);
  const guests = g.guests;
  const db = await getDb();
  const { data: ref, error } = await db.rpc("customer_reserve", {
    dep: plan.departureId,
    cur: plan.currency,
    cabins: Array.from({ length: plan.cabins }, () => ({
      cabin_type_id: plan.cabinTypeId,
      ages: plan.ages,
      package: plan.package ?? "cruise",
    })),
    guests,
    terms_read: true,
  });
  if (error) return connectionProblem(error);
  const { data: r } = await db
    .from("reservations")
    .select("id")
    .eq("reference", ref as string)
    .single();
  redirect(`/dashboard/journey/reservations/${r!.id}/`);
}
