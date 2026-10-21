"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionState } from "@/components/dashboard/ActionForm";
import { requireAdmin } from "@/server/auth";
import { dbProblem, formObject, problemsFrom, saved } from "@/server/catalogue/form";
import { getDb } from "@/server/db";

/** ADR-100: allotments are contracts, entered by Nilecruz's catalogue admins on the operator's page. */
const page = (orgId: string) => `/dashboard/admin/operators/${orgId}/`;
const input = z
  .object({
    cabin: z.string().regex(/^[0-9a-f-]{36}\|[0-9a-f-]{36}$/, "the ship and cabin type"),
    starts_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "a first departure date"),
    ends_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "a last departure date"),
    cabins: z.coerce.number().int().min(1, "1 to 100 cabins").max(100, "1 to 100 cabins"),
    release_days: z.coerce.number().int().min(0, "0 to 120 days").max(120, "0 to 120 days"),
    contract_ref: z.string().trim().max(120),
  })
  .refine((v) => v.ends_on >= v.starts_on, { message: "a last date on or after the first", path: ["ends_on"] });

export async function addAllotment(orgId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin(["catalogue"], page(orgId));
  const r = input.safeParse(formObject(fd));
  if (!r.success)
    return problemsFrom(r.error, {
      cabin: "Ship and cabin type",
      starts_on: "From",
      ends_on: "To",
      cabins: "Cabins per sailing",
      release_days: "Release",
      contract_ref: "Contract",
    });
  const [vesselId, cabinTypeId] = r.data.cabin.split("|") as [string, string];
  const db = await getDb();
  const { error } = await db.from("allotments").insert({
    org_id: orgId,
    vessel_id: vesselId,
    cabin_type_id: cabinTypeId,
    starts_on: r.data.starts_on,
    ends_on: r.data.ends_on,
    cabins: r.data.cabins,
    release_days: r.data.release_days,
    contract_ref: r.data.contract_ref || null,
  });
  if (error) return dbProblem(error);
  revalidatePath(page(orgId));
  return saved("Allotment added. Its cabins book instantly until each sailing's release date.");
}

export async function setAllotmentActive(
  orgId: string,
  id: string,
  active: boolean,
  _prev: ActionState,
  _fd: FormData,
): Promise<ActionState> {
  await requireAdmin(["catalogue"], page(orgId));
  const db = await getDb();
  const { error } = await db.from("allotments").update({ active }).eq("id", id).eq("org_id", orgId);
  if (error) return dbProblem(error);
  revalidatePath(page(orgId));
  return saved(active ? "Allotment switched back on." : "Allotment switched off. Bookings already made stay.");
}
