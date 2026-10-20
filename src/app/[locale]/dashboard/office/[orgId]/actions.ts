"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionState } from "@/components/dashboard/ActionForm";
import { requireOrgRole } from "@/server/auth";
import { dbProblem, failed, saved } from "@/server/catalogue/form";
import { getDb } from "@/server/db";

/** ADR-097: the office cancels a start it can't run; the database cancels its orders and refunds paid ones in full. */
export async function cancelStart(
  orgId: string,
  rateId: string,
  startsAt: string,
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  await requireOrgRole(orgId, ["owner", "reservations"], { kind: "office", returnTo: `/dashboard/office/${orgId}/` });
  const why = z.string().trim().min(3).max(500).safeParse(fd.get("reason"));
  if (!why.success) return failed("Give the reason for cancelling (3 to 500 characters); the customers will see it.");
  const db = await getDb();
  const { data, error } = await db.rpc("office_cancel_slot", { rate: rateId, starts: startsAt, why: why.data });
  if (error) return dbProblem(error);
  revalidatePath(`/dashboard/office/${orgId}/`);
  return saved(
    data
      ? `Start cancelled: ${data} ${data === 1 ? "booking" : "bookings"} cancelled; paid ones are refunded in full.`
      : "Start closed.",
  );
}
