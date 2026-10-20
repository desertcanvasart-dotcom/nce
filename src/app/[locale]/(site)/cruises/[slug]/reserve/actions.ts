"use server";

import { redirect } from "next/navigation";
import type { ActionState } from "@/components/dashboard/ActionForm";
import { passengersProblem, type Passenger } from "@/lib/bookings/bookings";
import { ageOn } from "@/lib/product/pricing";
import { requireUser } from "@/server/auth";
import { failed, formObject } from "@/server/catalogue/form";
import { connectionProblem } from "@/server/connections/form";
import { getDb } from "@/server/db";

/** DASH-PUB-009, ADR-093: a signed-in customer reserves at the published rate; the database re-checks everything. */
export async function customerReserve(
  slug: string,
  plan: { departureId: string; departsOn: string; cabinTypeId: string; currency: string; cabins: number; ages: number[] },
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  await requireUser(`/cruises/${slug}/reserve/`);
  const f = formObject(fd, ["terms"]);
  if (!(f.terms as string[]).includes("yes")) return failed("Tick that you have read the terms and the cancellation policy.");
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
  if (problem) return failed(problem);
  const db = await getDb();
  const { data: ref, error } = await db.rpc("customer_reserve", {
    dep: plan.departureId,
    cur: plan.currency,
    cabins: Array.from({ length: plan.cabins }, () => ({ cabin_type_id: plan.cabinTypeId, ages: plan.ages })),
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
