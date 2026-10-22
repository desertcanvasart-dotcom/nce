"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionState } from "@/components/dashboard/ActionForm";
import { addressProblem } from "@/lib/connections/safe-fetch";
import { requireAdmin, requireOrgRole } from "@/server/auth";
import { dbProblem, failed, formObject, problemsFrom, saved } from "@/server/catalogue/form";
import { fetchPolicy } from "@/server/connections/policy";
import { getDb } from "@/server/db";
import { revalidateCatalogue } from "@/server/marketplace/revalidate";

/**
 * ADR-103: freesale agreements and holds (Nilecruz's catalogue admins, on the operator's page) and the operator's
 * webhook address (its owners on Inventory connections, or catalogue admins). RLS checks the same rights again.
 */
const adminPage = (orgId: string) => `/dashboard/admin/operators/${orgId}/`;
const operatorPage = (orgId: string) => `/dashboard/operator/${orgId}/inventory/`;
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "a date");

// ── Freesales ──────────────────────────────────────────────────────────────────────────────────────────
const freesaleInput = z
  .object({
    cabin: z.string().regex(/^[0-9a-f-]{36}(\|[0-9a-f-]{36})?$/, "the ship (and cabin type)"),
    starts_on: day,
    ends_on: day,
    contract_ref: z.string().trim().max(120),
  })
  .refine((v) => v.ends_on >= v.starts_on, { message: "a last date on or after the first", path: ["ends_on"] });

export async function addFreesale(orgId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin(["catalogue"], adminPage(orgId));
  const r = freesaleInput.safeParse(formObject(fd));
  if (!r.success)
    return problemsFrom(r.error, { cabin: "Ship and cabin type", starts_on: "From", ends_on: "To", contract_ref: "Contract" });
  const [vesselId, cabinTypeId] = r.data.cabin.split("|") as [string, string | undefined];
  const db = await getDb();
  const { error } = await db.from("freesales").insert({
    org_id: orgId,
    vessel_id: vesselId,
    cabin_type_id: cabinTypeId ?? null,
    starts_on: r.data.starts_on,
    ends_on: r.data.ends_on,
    contract_ref: r.data.contract_ref || null,
  });
  if (error) return dbProblem(error);
  revalidatePath(adminPage(orgId));
  revalidateCatalogue();
  return saved("Freesale added. Recent manual and sheet availability for those departures now books instantly.");
}

export async function setFreesaleActive(
  orgId: string,
  id: string,
  active: boolean,
  _prev: ActionState,
  _fd: FormData,
): Promise<ActionState> {
  await requireAdmin(["catalogue"], adminPage(orgId));
  const db = await getDb();
  const { error } = await db.from("freesales").update({ active }).eq("id", id).eq("org_id", orgId);
  if (error) return dbProblem(error);
  revalidatePath(adminPage(orgId));
  revalidateCatalogue();
  return saved(active ? "Freesale switched back on." : "Freesale switched off. Bookings already made stay.");
}

// ── Holds ──────────────────────────────────────────────────────────────────────────────────────────────
const holdInput = z.object({
  cabin: z.string().regex(/^[0-9a-f-]{36}\|[0-9a-f-]{36}$/, "the ship and cabin type"),
  departs_on: day,
  cabins: z.coerce.number().int().min(1, "1 to 50 cabins").max(50, "1 to 50 cabins"),
  hours: z.coerce.number().int().min(1, "1 to 168 hours").max(168, "1 to 168 hours"),
  note: z.string().trim().max(500),
});

export async function placeHold(orgId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin(["catalogue"], adminPage(orgId));
  const r = holdInput.safeParse(formObject(fd));
  if (!r.success)
    return problemsFrom(r.error, {
      cabin: "Ship and cabin type",
      departs_on: "Departure",
      cabins: "Cabins",
      hours: "For",
      note: "Note",
    });
  const [vesselId, cabinTypeId] = r.data.cabin.split("|") as [string, string];
  const db = await getDb();
  const { data: deps } = await db
    .from("departures")
    .select("id")
    .eq("vessel_id", vesselId)
    .eq("departs_on", r.data.departs_on)
    .eq("status", "scheduled");
  if (!deps?.length) return failed("That ship has no scheduled sailing on that date.");
  if (deps.length > 1) return failed("That ship has two sailings on that date: place the hold from the departure's page.");
  const { error } = await db.rpc("admin_place_hold", {
    dep: deps[0]!.id,
    cab: cabinTypeId,
    n: r.data.cabins,
    hours: r.data.hours,
    note: r.data.note || undefined,
  });
  if (error) return dbProblem(error);
  revalidatePath(adminPage(orgId));
  revalidateCatalogue();
  return saved(`Holding ${r.data.cabins} cabin${r.data.cabins === 1 ? "" : "s"} for ${r.data.hours} hours.`);
}

export async function extendHold(orgId: string, id: string, _prev: ActionState, _fd: FormData): Promise<ActionState> {
  await requireAdmin(["catalogue"], adminPage(orgId));
  const db = await getDb();
  const { error } = await db.rpc("admin_extend_hold", { target: id, hours: 24 });
  if (error) return dbProblem(error);
  revalidatePath(adminPage(orgId));
  return saved("Hold extended by 24 hours.");
}

export async function releaseHold(orgId: string, id: string, _prev: ActionState, _fd: FormData): Promise<ActionState> {
  await requireAdmin(["catalogue"], adminPage(orgId));
  const db = await getDb();
  const { error } = await db.rpc("admin_release_hold", { target: id });
  if (error) return dbProblem(error);
  revalidatePath(adminPage(orgId));
  revalidateCatalogue();
  return saved("Hold released. Its cabins are free again.");
}

// ── Webhook address ────────────────────────────────────────────────────────────────────────────────────
const urlInput = z.object({ url: z.string().trim().max(500) });

async function saveWebhookFor(orgId: string, fd: FormData, page: string): Promise<ActionState> {
  const r = urlInput.safeParse(formObject(fd));
  if (!r.success) return failed("Webhook address: at most 500 characters.");
  const db = await getDb();
  if (!r.data.url) {
    const { error } = await db.from("webhook_endpoints").delete().eq("org_id", orgId);
    if (error) return dbProblem(error);
    revalidatePath(page);
    return saved("Webhook address removed. Nothing more is sent.");
  }
  const problem = await addressProblem(r.data.url, fetchPolicy());
  if (problem) return failed(`Webhook address: ${problem}`);
  const { error } = await db.from("webhook_endpoints").upsert({ org_id: orgId, url: r.data.url, active: true });
  if (error) return dbProblem(error);
  revalidatePath(page);
  return saved("Webhook address saved. Changes from now on are sent to it.");
}

export async function saveWebhook(orgId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireOrgRole(orgId, ["owner"], { kind: "operator", returnTo: operatorPage(orgId) });
  return saveWebhookFor(orgId, fd, operatorPage(orgId));
}

export async function adminSaveWebhook(orgId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin(["catalogue"], adminPage(orgId));
  return saveWebhookFor(orgId, fd, adminPage(orgId));
}
