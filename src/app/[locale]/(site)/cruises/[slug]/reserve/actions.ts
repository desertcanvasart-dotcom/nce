"use server";

import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import type { ActionState } from "@/components/dashboard/ActionForm";
import { passengersIssue, passengersProblem, type Passenger } from "@/lib/bookings/bookings";
import { PLAN_PROBLEM, planSchema } from "@/lib/bookings/plan";
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

/**
 * The refusals in Japanese for the Japanese form (null elsewhere: every other language reads the English). The
 * database's own wording is English, so a Japanese visitor gets one general sentence instead.
 */
async function japanese(fd: FormData) {
  return fd.get("locale") === "ja" ? getTranslations({ locale: "ja", namespace: "vesselPage.reserve.errors" }) : null;
}
type Say = Awaited<ReturnType<typeof japanese>>;
const planProblem = (t: Say) => (t ? t("plan") : PLAN_PROBLEM);
const waitProblem = (t: Say, retryAfter: number) =>
  t ? t("tooMany", { n: Math.max(1, Math.ceil(retryAfter / 60)) }) : tooMany(retryAfter);

/** The guests from the form, checked against the cabins (DATA-020). */
function guestsFrom(plan: Plan, fd: FormData, t: Say): { guests: Passenger[] } | { problem: string } {
  const f = formObject(fd, ["terms"]);
  if (!(f.terms as string[]).includes("yes"))
    return { problem: t ? t("terms") : "Tick that you have read the terms and the cancellation policy." };
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
  const offered = { adults: all.filter((a) => a >= 18).length, childAges: all.filter((a) => a < 18) };
  if (!t) {
    const problem = passengersProblem(guests, plan.departsOn, offered, ageOn);
    return problem ? { problem } : { guests };
  }
  const issue = passengersIssue(guests, plan.departsOn, offered, ageOn);
  if (!issue) return { guests };
  const problem =
    issue.key === "count"
      ? t("count", { n: String(issue.total) })
      : issue.key === "ages"
        ? t("ages", {
            adults: issue.adults,
            children: issue.childAges.length ? t("agesChildren", { ages: issue.childAges.join("、") }) : "",
          })
        : t(issue.key);
  return { problem };
}

/**
 * ADR-099: cabins the operator confirms first (manual or sheet data). The request goes to the operator's contacts with
 * one-tap answers; the customer pays once it's confirmed.
 */
export async function customerRequestBooking(slug: string, plan: Plan, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const session = await requireUser(`/cruises/${slug}/reserve/`);
  const t = await japanese(fd);
  if (!planSchema.safeParse(plan).success) return failed(planProblem(t));
  const limit = await rateLimit("booking-request", `user:${session.userId}`);
  if (!limit.ok) return failed(waitProblem(t, limit.retryAfter));
  const g = guestsFrom(plan, fd, t);
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
  if (error) return t ? failed(t("database")) : connectionProblem(error);
  await notifyNewRequest(id as string);
  redirect(`/dashboard/journey/requests/booking/${id}/`);
}

/** DASH-PUB-009, ADR-093: a signed-in customer reserves at the published rate; the database re-checks everything. */
export async function customerReserve(slug: string, plan: Plan, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const session = await requireUser(`/cruises/${slug}/reserve/`);
  const t = await japanese(fd);
  if (!planSchema.safeParse(plan).success) return failed(planProblem(t));
  // SEC-011: reserving holds cabins at once, so one account can't hold a sailing's cabins over and over.
  const limit = await rateLimit("reserve", `user:${session.userId}`);
  if (!limit.ok) return failed(waitProblem(t, limit.retryAfter));
  const g = guestsFrom(plan, fd, t);
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
  if (error) return t ? failed(t("database")) : connectionProblem(error);
  const { data: r } = await db
    .from("reservations")
    .select("id")
    .eq("reference", ref as string)
    .single();
  redirect(`/dashboard/journey/reservations/${r!.id}/`);
}
