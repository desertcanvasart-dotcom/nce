"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionState } from "@/components/dashboard/ActionForm";
import { requireAdmin } from "@/server/auth";
import { dbProblem, formObject, problemsFrom, saved } from "@/server/catalogue/form";
import { getDb } from "@/server/db";

/** DASH-ADM-087, 088, DASH-B2B-011: approve, reject or pause a travel partner's trade access. Records are kept. */
const statusInput = z
  .object({
    status: z.enum(["approved", "rejected", "paused"], { message: "choose a decision" }),
    reason: z.string().trim().max(500, "at most 500 characters"),
  })
  .refine((v) => v.status === "approved" || v.reason.length >= 5, {
    message: "explain the decision in a few words",
    path: ["reason"],
  });

const page = (orgId: string) => `/dashboard/admin/partners/${orgId}/`;

export async function setPartnerStatus(orgId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin(["catalogue"], page(orgId));
  const input = statusInput.safeParse(formObject(fd));
  if (!input.success) return problemsFrom(input.error, { status: "Decision", reason: "Reason" });
  const db = await getDb();
  const { error } = await db
    .from("organisations")
    // Approving clears an earlier pause or rejection reason.
    .update({ status: input.data.status, status_reason: input.data.status === "approved" ? null : input.data.reason || null })
    .eq("id", orgId)
    .eq("kind", "partner");
  if (error) return dbProblem(error);
  revalidatePath(page(orgId));
  revalidatePath("/dashboard/admin/partners/");
  const words = {
    approved: "Approved: the agency's team can search and see trade rates.",
    rejected: "Rejected.",
    paused: "Paused: the team can still see its bookings and payments, but can't search or book.",
  };
  return saved(words[input.data.status]);
}
