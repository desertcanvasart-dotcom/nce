"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionState } from "@/components/dashboard/ActionForm";
import { requireAdmin, requireOrgRole, requireUser } from "@/server/auth";
import { dbProblem, failed, formObject, problemsFrom, saved } from "@/server/catalogue/form";
import { connectionProblem } from "@/server/connections/form";
import { getDb } from "@/server/db";

/** ADR-099: booking-request actions in the dashboards (operators, customers, admins). */
const opPage = (orgId: string, id: string) => `/dashboard/operator/${orgId}/requests/booking/${id}/`;

export async function answerInDashboard(
  orgId: string,
  id: string,
  act: "confirm" | "decline" | "hold" | "other",
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  await requireOrgRole(orgId, ["owner", "reservations"], { kind: "operator", returnTo: opPage(orgId, id) });
  const f = formObject(fd);
  const alt =
    act === "other"
      ? {
          departure_id: f.departure_id || undefined,
          cabin_type_id: f.cabin_type_id || undefined,
          cabins: Number(f.cabins),
          note: String(f.note ?? ""),
        }
      : undefined;
  const db = await getDb();
  const { error } = await db.rpc("operator_answer_booking_request", { req: id, act, alt });
  if (error) return connectionProblem(error);
  revalidatePath(opPage(orgId, id));
  return saved("Answer recorded.");
}

const contactInput = z
  .object({
    name: z.string().trim().min(1, "a name").max(120),
    email: z.union([z.literal(""), z.email({ message: "an email address like name@example.com" })]),
    whatsapp: z.union([
      z.literal(""),
      z.string().regex(/^\+[1-9][0-9]{7,14}$/, "a number in international format, like +201001234567"),
    ]),
    roles: z.array(z.string()),
    opt_in: z.array(z.string()),
  })
  .refine((v) => v.email || v.whatsapp, { message: "an email address or a WhatsApp number", path: ["email"] });

const contactsPage = (orgId: string, admin: boolean) =>
  admin ? `/dashboard/admin/operators/${orgId}/` : `/dashboard/operator/${orgId}/inventory/`;

export async function addContact(orgId: string, admin: boolean, _prev: ActionState, fd: FormData): Promise<ActionState> {
  if (admin) await requireAdmin(["catalogue"], contactsPage(orgId, true));
  else await requireOrgRole(orgId, ["owner"], { kind: "operator", returnTo: contactsPage(orgId, false) });
  const r = contactInput.safeParse(formObject(fd, ["roles", "opt_in"]));
  if (!r.success) return problemsFrom(r.error, { name: "Name", email: "Email", whatsapp: "WhatsApp" });
  const db = await getDb();
  const { error } = await db.from("operator_contacts").insert({
    org_id: orgId,
    name: r.data.name,
    email: r.data.email || null,
    whatsapp: r.data.whatsapp || null,
    reservations: r.data.roles.includes("reservations"),
    sheets: r.data.roles.includes("sheets"),
    whatsapp_opt_in_at: r.data.whatsapp && r.data.opt_in.includes("yes") ? new Date().toISOString() : null,
  });
  if (error) return dbProblem(error);
  revalidatePath(contactsPage(orgId, admin));
  return saved("Contact added.");
}

export async function removeContact(
  orgId: string,
  admin: boolean,
  id: string,
  _prev: ActionState,
  _fd: FormData,
): Promise<ActionState> {
  if (admin) await requireAdmin(["catalogue"], contactsPage(orgId, true));
  else await requireOrgRole(orgId, ["owner"], { kind: "operator", returnTo: contactsPage(orgId, false) });
  const db = await getDb();
  const { error } = await db.from("operator_contacts").delete().eq("id", id).eq("org_id", orgId);
  if (error) return dbProblem(error);
  revalidatePath(contactsPage(orgId, admin));
  return saved("Contact removed.");
}

export async function setReplySla(orgId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin(["catalogue"], `/dashboard/admin/operators/${orgId}/`);
  const hours = Number(formObject(fd).hours);
  if (!Number.isInteger(hours) || hours < 1 || hours > 72) return failed("The reply time is 1 to 72 hours.");
  const db = await getDb();
  const { error } = await db.from("operator_settings").upsert({ org_id: orgId, reply_sla_hours: hours });
  if (error) return dbProblem(error);
  revalidatePath(`/dashboard/admin/operators/${orgId}/`);
  return saved(`Reply time set to ${hours} hours.`);
}

const custPage = (id: string) => `/dashboard/journey/requests/booking/${id}/`;

export async function acceptAlternative(id: string, _prev: ActionState, _fd: FormData): Promise<ActionState> {
  await requireUser(custPage(id));
  const db = await getDb();
  const { data, error } = await db.rpc("customer_accept_alternative", { req: id });
  if (error) return connectionProblem(error);
  redirect(`/dashboard/journey/reservations/${data}/`);
}

export async function withdrawRequest(id: string, _prev: ActionState, _fd: FormData): Promise<ActionState> {
  await requireUser(custPage(id));
  const db = await getDb();
  const { error } = await db.rpc("customer_withdraw_booking_request", { req: id });
  if (error) return connectionProblem(error);
  revalidatePath(custPage(id));
  return saved("Request withdrawn.");
}
