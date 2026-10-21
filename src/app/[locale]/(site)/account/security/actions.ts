"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import type { ActionState } from "@/components/dashboard/ActionForm";
import { requireUser } from "@/server/auth";
import { dbProblem, formObject, saved } from "@/server/catalogue/form";
import { getDb } from "@/server/db";

/** ADR-101: optional emails on or off (bookings, payments, reminders and cancellations always go). */
export async function setOptionalEmails(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const session = await requireUser("/account/security/");
  const on = (formObject(fd, ["optional"]).optional as string[]).includes("yes");
  const db = await getDb();
  const { error } = await db.from("profiles").update({ optional_emails: on }).eq("id", session.userId);
  if (error) return dbProblem(error);
  revalidatePath("/account/security/");
  return saved((await getTranslations("account"))("security.emailsSaved"));
}
