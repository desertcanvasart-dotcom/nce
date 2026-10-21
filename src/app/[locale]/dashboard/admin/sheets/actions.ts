"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "@/components/dashboard/ActionForm";
import { requireAdmin } from "@/server/auth";
import { dbProblem, failed, formObject, saved } from "@/server/catalogue/form";
import { getDb } from "@/server/db";
import { acknowledge, ACCEPTED, MAX_BYTES, processSheet, receiveSheet } from "@/server/sheets/ingest";

/** ADR-099, Part B: catalogue admins review vacancy sheets on operators' behalf. */
const LIST = "/dashboard/admin/sheets/";
const page = (id: string) => `${LIST}${id}/`;

export async function uploadSheet(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const session = await requireAdmin(["catalogue"], LIST);
  const orgId = String(fd.get("org_id") ?? "");
  const file = fd.get("file");
  if (!orgId) return failed("Choose the operator.");
  if (!(file instanceof File) || !file.size) return failed(`Choose a file (${ACCEPTED}).`);
  if (file.size > MAX_BYTES) return failed("The file is larger than 15 MB.");
  let id: string;
  try {
    id = await receiveSheet({
      channel: "upload",
      sender: session.email || null,
      orgId,
      fileName: file.name,
      contentType: file.type || null,
      bytes: Buffer.from(await file.arrayBuffer()),
    });
  } catch (e) {
    return failed(e instanceof Error ? e.message : "The file couldn't be read.");
  }
  redirect(page(id));
}

export async function setSheetOperator(id: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin(["catalogue"], page(id));
  const db = await getDb();
  const { error } = await db
    .from("sheet_ingests")
    .update({ org_id: String(fd.get("org_id") ?? ""), status: "received" })
    .eq("id", id);
  if (error) return dbProblem(error);
  await processSheet(id);
  revalidatePath(page(id));
  return saved("Operator set and the sheet read.");
}

/** Map a sheet name to a ship or cabin type; saved as an alias for every later sheet from this operator. */
export async function mapName(
  id: string,
  orgId: string,
  kind: "vessel" | "cabin",
  name: string,
  vesselSlug: string | null,
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  await requireAdmin(["catalogue"], page(id));
  const target = String(fd.get("target") ?? "");
  if (!target) return failed("Choose what this name means.");
  const db = await getDb();
  const { error } = await db
    .from("operator_aliases")
    .insert({ org_id: orgId, kind, sheet_name: name, target, vessel_slug: kind === "cabin" ? vesselSlug : null });
  // Already saved (same name for this operator): the existing alias stands.
  if (error && error.code !== "23505") return dbProblem(error);
  await db.from("sheet_ingests").update({ edited: true }).eq("id", id);
  await processSheet(id);
  revalidatePath(page(id));
  return saved(`“${name}” saved as a name for ${target}.`);
}

export async function editRow(id: string, index: number, _prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin(["catalogue"], page(id));
  const n = Number(formObject(fd).available);
  if (!Number.isInteger(n) || n < 0 || n > 400) return failed("Cabins free is a whole number from 0 to 400.");
  const db = await getDb();
  const { data: s } = await db.from("sheet_ingests").select("raw_rows").eq("id", id).single();
  const raw = (s?.raw_rows ?? []) as { available: number }[];
  if (!raw[index]) return failed("Row not found.");
  raw[index] = { ...raw[index], available: n };
  const { error } = await db.from("sheet_ingests").update({ raw_rows: raw, edited: true }).eq("id", id);
  if (error) return dbProblem(error);
  await processSheet(id);
  revalidatePath(page(id));
  return saved("Row changed.");
}

export async function confirmSheet(id: string, _prev: ActionState, _fd: FormData): Promise<ActionState> {
  await requireAdmin(["catalogue"], page(id));
  const db = await getDb();
  const { data, error } = await db.rpc("confirm_sheet", { ingest: id });
  if (error) return dbProblem(error);
  const out = data as { changed: number; skipped: number; failed: number };
  const { data: s } = await db.from("sheet_ingests").select("channel, sender, org_id").eq("id", id).single();
  const { data: settings } = s?.org_id
    ? await db.from("operator_settings").select("sheet_ack").eq("org_id", s.org_id).maybeSingle()
    : { data: null };
  if (settings?.sheet_ack && s?.org_id) await acknowledge(s.channel, s.sender, s.org_id, out.changed);
  revalidatePath(page(id));
  return saved(`Confirmed: ${out.changed} changed, ${out.skipped} not applied (newer data), ${out.failed} with problems.`);
}

export async function rejectSheet(id: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin(["catalogue"], page(id));
  const db = await getDb();
  const { error } = await db.rpc("reject_sheet", { ingest: id, why: String(fd.get("why") ?? "") });
  if (error) return dbProblem(error);
  revalidatePath(page(id));
  return saved("Rejected. Nothing was changed.");
}

export async function setSheetSettings(orgId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin(["catalogue"], `/dashboard/admin/operators/${orgId}/`);
  const f = formObject(fd, ["options"]);
  const opts = f.options as string[];
  const db = await getDb();
  const { error } = await db
    .from("operator_settings")
    .upsert({ org_id: orgId, sheet_auto_confirm: opts.includes("auto"), sheet_ack: opts.includes("ack") });
  if (error) return error.code === "23514" ? failed(error.message) : dbProblem(error);
  revalidatePath(`/dashboard/admin/operators/${orgId}/`);
  return saved("Sheet settings saved.");
}
