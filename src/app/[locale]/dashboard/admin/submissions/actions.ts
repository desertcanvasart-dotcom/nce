"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "@/components/dashboard/ActionForm";
import { RESERVED_VESSEL_SLUGS, SLUG_PATTERN } from "@/lib/data/slugs";
import { requireAdmin } from "@/server/auth";
import { dbProblem, failed } from "@/server/catalogue/form";
import { getDb } from "@/server/db";

/** DASH-ADM-037–040: inspect, give feedback, decide. Transitions are enforced in the database. */
const page = (id: string) => `/dashboard/admin/submissions/${id}/`;

export async function approve(id: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin(["catalogue"], page(id));
  const slug = String(fd.get("slug") ?? "").trim() || null;
  if (slug && (!SLUG_PATTERN.test(slug) || (RESERVED_VESSEL_SLUGS as readonly string[]).includes(slug))) {
    return failed("Use lower-case letters, numbers and hyphens, and not a listing address such as “luxury”.");
  }
  const db = await getDb();
  const { data, error } = await db.rpc("approve_submission", { target: id, new_slug: slug ?? undefined });
  if (error) return dbProblem(error);
  revalidatePath(page(id));
  redirect(`/dashboard/admin/catalogue/${data}/`);
}

export async function requestChanges(id: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin(["catalogue"], page(id));
  const note = String(fd.get("note") ?? "").trim();
  if (note.length < 5) return failed("Tell the operator what to change.");
  const db = await getDb();
  const { error } = await db.rpc("request_submission_changes", { target: id, note });
  if (error) return dbProblem(error);
  revalidatePath(page(id));
  return { ok: true, message: "Sent back to the operator with your feedback." };
}

export async function reject(id: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin(["catalogue"], page(id));
  const note = String(fd.get("note") ?? "").trim();
  if (note.length < 5) return failed("Explain why, so the operator understands.");
  const db = await getDb();
  const { error } = await db.rpc("reject_submission", { target: id, note });
  if (error) return dbProblem(error);
  revalidatePath(page(id));
  return { ok: true, message: "Rejected. The operator sees your reason." };
}
