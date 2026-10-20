"use server";

import { redirect } from "next/navigation";
import type { ActionState } from "@/components/dashboard/ActionForm";
import { requireUser } from "@/server/auth";
import { dbProblem } from "@/server/catalogue/form";
import { getDb } from "@/server/db";

/** ADR-073: the invited person accepts; the database checks the invitation is addressed to their email. */
export async function acceptInvitation(invitationId: string, _prev: ActionState, _fd: FormData): Promise<ActionState> {
  await requireUser("/dashboard/");
  const db = await getDb();
  const { data, error } = await db.rpc("accept_invitation", { invitation: invitationId });
  if (error) return dbProblem(error);
  // Operators and travel partners each have their own workspace (DASH-B2B-009).
  const { data: org } = await db.from("organisations").select("kind").eq("id", data).maybeSingle();
  redirect(`/dashboard/${org?.kind === "partner" ? "partner" : "operator"}/${data}/`);
}
