"use server";

import { redirect } from "next/navigation";
import type { ActionState } from "@/components/dashboard/ActionForm";
import { parseVesselCsv, type ImportRow } from "@/lib/catalogue/csv";
import { requireAdmin } from "@/server/auth";
import { dbProblem, failed } from "@/server/catalogue/form";
import { getDb } from "@/server/db";

const PAGE = "/dashboard/admin/catalogue/import/";

async function existingKeys() {
  const db = await getDb();
  const { data, error } = await db.from("vessels").select("source_ref, name, slug");
  if (error) throw error;
  const rows = data ?? [];
  return {
    sourceRefs: new Set(rows.map((r) => r.source_ref?.toLowerCase()).filter((x): x is string => !!x)),
    names: new Set(rows.map((r) => r.name.toLowerCase())),
    slugs: new Set(rows.map((r) => r.slug)),
  };
}

/** DASH-ADM-021, 022: upload and preview. Nothing reaches the catalogue until the admin confirms. */
export async function previewImport(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin(["catalogue"], PAGE);
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) return failed("Choose a CSV file.");
  if (file.size > 2 * 1024 * 1024) return failed("The file is larger than 2 MB. Split it into smaller files.");
  if (!/\.csv$/i.test(file.name)) return failed("Upload a .csv file (save the template as “CSV UTF-8”).");
  const text = new TextDecoder("utf-8", { fatal: false }).decode(await file.arrayBuffer());
  const { rows, fileErrors } = parseVesselCsv(text, await existingKeys());
  if (fileErrors.length) return { ok: false, message: "The file can't be imported:", problems: fileErrors };
  if (!rows.length) return failed("The file has no rows.");
  const summary = {
    ok: rows.filter((r) => r.status === "ok").length,
    duplicate: rows.filter((r) => r.status === "duplicate").length,
    error: rows.filter((r) => r.status === "error").length,
  };
  const db = await getDb();
  const { data, error } = await db
    .from("vessel_import_batches")
    .insert({ file_name: file.name.slice(0, 200), rows, summary })
    .select("id")
    .single();
  if (error) return dbProblem(error);
  redirect(`${PAGE}?batch=${data.id}`);
}

/** DASH-ADM-023, 024: valid rows become private drafts; duplicates (checked again now) are skipped. */
export async function confirmImport(batchId: string, _prev: ActionState, _fd: FormData): Promise<ActionState> {
  await requireAdmin(["catalogue"], PAGE);
  const db = await getDb();
  const { data: batch } = await db.from("vessel_import_batches").select("status, rows").eq("id", batchId).maybeSingle();
  if (!batch) return failed("This preview no longer exists. Upload the file again.");
  if (batch.status !== "previewed") return failed("This file was already imported or discarded.");
  const keys = await existingKeys();
  let created = 0;
  let skipped = 0;
  for (const row of batch.rows as ImportRow[]) {
    if (row.status !== "ok" || !row.vessel) continue;
    const v = row.vessel;
    if (keys.sourceRefs.has(v.source_ref.toLowerCase()) || keys.names.has(v.name.toLowerCase())) {
      skipped++;
      continue;
    }
    let slug = v.slug;
    for (let n = 2; keys.slugs.has(slug); n++) slug = `${v.slug}-${n}`;
    const { data: inserted, error } = await db
      .from("vessels")
      .insert({
        slug,
        source_ref: v.source_ref,
        name: v.name,
        type: v.type,
        visibility: "private",
        route_text: v.route_text,
        category: v.category,
        cabin_count: v.cabin_count,
        max_guests: v.max_guests,
        deck_count: v.deck_count,
        year_built: v.year_built,
      })
      .select("id")
      .single();
    if (error) {
      skipped++;
      continue;
    }
    keys.sourceRefs.add(v.source_ref.toLowerCase());
    keys.names.add(v.name.toLowerCase());
    keys.slugs.add(slug);
    if (v.description_en)
      await db.from("vessel_translations").insert({ vessel_id: inserted.id, locale: "en", description: v.description_en });
    created++;
  }
  const u = await db
    .from("vessel_import_batches")
    .update({ status: "imported", imported_at: new Date().toISOString(), summary: { created, skipped_at_import: skipped } })
    .eq("id", batchId);
  if (u.error) return dbProblem(u.error);
  redirect(`${PAGE}?batch=${batchId}&created=${created}&skipped=${skipped}`);
}

export async function discardImport(batchId: string, _prev: ActionState, _fd: FormData): Promise<ActionState> {
  await requireAdmin(["catalogue"], PAGE);
  const db = await getDb();
  const { error } = await db
    .from("vessel_import_batches")
    .update({ status: "discarded" })
    .eq("id", batchId)
    .eq("status", "previewed");
  if (error) return dbProblem(error);
  redirect(PAGE);
}
