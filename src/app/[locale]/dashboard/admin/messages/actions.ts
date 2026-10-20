"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/components/dashboard/ActionForm";
import { requireAdmin } from "@/server/auth";
import { dbProblem, saved } from "@/server/catalogue/form";
import { getDb } from "@/server/db";

/** PAGE-106: an admin marks a Contact message as handled (or reopens it). */
export async function fileMessage(id: string, handled: boolean, _prev: ActionState, _fd: FormData): Promise<ActionState> {
  const session = await requireAdmin(undefined, "/dashboard/admin/messages/");
  const db = await getDb();
  const { error } = await db
    .from("contact_messages")
    .update(
      handled ? { handled_at: new Date().toISOString(), handled_by: session.userId } : { handled_at: null, handled_by: null },
    )
    .eq("id", id);
  if (error) return dbProblem(error);
  revalidatePath("/dashboard/admin/messages/");
  return saved(handled ? "Marked as handled." : "Reopened.");
}
