"use server";

import { revalidatePath } from "next/cache";
import { getLocale, getTranslations } from "next-intl/server";
import type { ActionState } from "@/components/dashboard/ActionForm";
import { requireUser } from "@/server/auth";
import { dbProblem, failed, formObject, saved } from "@/server/catalogue/form";
import { getDb } from "@/server/db";

/** ADR-101: optional emails on or off (bookings, payments, reminders and cancellations always go). */
export async function setOptionalEmails(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const session = await requireUser("/account/security/");
  const on = (formObject(fd, ["optional"]).optional as string[]).includes("yes");
  const db = await getDb();
  const { error } = await db.from("profiles").update({ optional_emails: on }).eq("id", session.userId);
  // The general database wording is English: Japanese gets the account's own sentence.
  if (error)
    return (await getLocale()) === "ja" ? failed((await getTranslations("account"))("messages.unexpected")) : dbProblem(error);
  revalidatePath("/account/security/");
  return saved((await getTranslations("account"))("security.emailsSaved"));
}
