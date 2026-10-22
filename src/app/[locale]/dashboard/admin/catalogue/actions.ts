"use server";

import { randomUUID } from "node:crypto";
import { imageSize } from "image-size";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "@/components/dashboard/ActionForm";
import { RESERVED_VESSEL_SLUGS, slugify } from "@/lib/data/slugs";
import { requireAdmin } from "@/server/auth";
import { dbProblem, failed, formObject, problemsFrom, saved } from "@/server/catalogue/form";
import { vesselForEditor } from "@/server/catalogue/queries";
import { getDb } from "@/server/db";
import {
  descriptionsInput,
  externalRatingInput,
  newVesselInput,
  photoEditInput,
  photoInput,
  safetyInput,
  vesselDetailsInput,
  visibilityInput,
} from "@/server/validation";
import { revalidateCatalogue } from "@/server/marketplace/revalidate";

/** Catalogue actions (DASH-ADM-013–019, 033, 034, DATA-021, DATA-024). Super and catalogue admins; content admins edit texts. */

const CATALOGUE = ["catalogue"] as const;
const TEXTS = ["catalogue", "content"] as const;
const editor = (id: string) => `/dashboard/admin/catalogue/${id}/`;

async function freeSlug(name: string, type: string): Promise<string> {
  const db = await getDb();
  let base = slugify(name) || "vessel";
  if ((RESERVED_VESSEL_SLUGS as readonly string[]).includes(base)) base = `${base}-${type === "sail" ? "dahabiya" : "ship"}`;
  const { data } = await db.from("vessels").select("slug").like("slug", `${base}%`);
  const taken = new Set((data ?? []).map((r) => r.slug));
  let slug = base;
  for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
  return slug;
}

export async function createVessel(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin([...CATALOGUE], "/dashboard/admin/catalogue/new/");
  const input = newVesselInput.safeParse(formObject(fd));
  if (!input.success) return problemsFrom(input.error, { name: "Name", type: "Type" });
  const db = await getDb();
  const { data, error } = await db
    .from("vessels")
    .insert({
      name: input.data.name,
      type: input.data.type,
      slug: await freeSlug(input.data.name, input.data.type),
      visibility: "private",
    })
    .select("id")
    .single();
  if (error) return dbProblem(error);
  redirect(editor(data.id));
}

export async function saveDetails(id: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin([...CATALOGUE], editor(id));
  const input = vesselDetailsInput.safeParse(formObject(fd, ["best_for", "shared_spaces"]));
  if (!input.success) {
    return problemsFrom(input.error, {
      name: "Name",
      type: "Type",
      route_text: "Route",
      category: "Category",
      cabin_count: "Cabins",
      max_guests: "Guests",
      deck_count: "Decks",
      year_built: "Year built",
      best_for: "Best for",
      mooring: "Mooring",
      shared_spaces: "Shared spaces",
      operator_org_id: "Operator",
    });
  }
  const db = await getDb();
  const d = input.data;
  if (d.operator_org_id) {
    // DASH-ADM-016: only approved operators can be assigned.
    const { data: org } = await db.from("organisations").select("status, kind").eq("id", d.operator_org_id).maybeSingle();
    if (!org || org.kind !== "operator" || org.status !== "approved") return failed("Choose an approved operator.");
  }
  const { error } = await db
    .from("vessels")
    .update({
      name: d.name,
      type: d.type,
      route_text: d.route_text,
      category: d.category as "luxury" | null,
      cabin_count: d.cabin_count,
      max_guests: d.max_guests,
      deck_count: d.deck_count,
      year_built: d.year_built,
      best_for: d.best_for as ("families" | "value")[],
      mooring: d.mooring,
      shared_spaces: d.shared_spaces,
      operator_org_id: d.operator_org_id,
    })
    .eq("id", id);
  if (error) return dbProblem(error);
  revalidatePath(editor(id));
  revalidateCatalogue();
  return saved("Details saved.");
}

export async function saveDescriptions(id: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin([...TEXTS], editor(id));
  const input = descriptionsInput.safeParse(formObject(fd));
  if (!input.success)
    return problemsFrom(input.error, { description_en: "English", description_es: "Spanish", description_ja: "Japanese" });
  const db = await getDb();
  const rows = (["en", "es", "ja"] as const).map((locale) => ({
    vessel_id: id,
    locale,
    description: input.data[`description_${locale}`],
  }));
  const { error } = await db.from("vessel_translations").upsert(rows, { onConflict: "vessel_id,locale" });
  if (error) return dbProblem(error);
  revalidatePath(editor(id));
  revalidateCatalogue();
  return saved("Descriptions saved. Spanish or Japanese left empty fall back to English on the site.");
}

const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};
const MAX_PHOTO = 15 * 1024 * 1024;

export async function uploadPhoto(id: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin([...CATALOGUE], editor(id));
  const file = fd.get("photo");
  if (!(file instanceof File) || file.size === 0) return failed("Choose a photo to upload.");
  const ext = IMAGE_TYPES[file.type];
  if (!ext) return failed("Use a JPEG, PNG, WebP or AVIF photo.");
  if (file.size > MAX_PHOTO) return failed("The photo is larger than 15 MB. Export a smaller version.");
  const input = photoInput.safeParse(formObject(fd));
  if (!input.success) {
    return problemsFrom(input.error, {
      alt_en: "Description (English)",
      alt_es: "Spanish",
      alt_ja: "Japanese",
      credit: "Credit",
      rights: "Rights",
    });
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  let size: { width?: number; height?: number };
  try {
    size = imageSize(bytes);
  } catch {
    return failed("That file isn't a readable photo.");
  }
  if (!size.width || !size.height) return failed("That file isn't a readable photo.");

  const db = await getDb();
  const path = `vessels/${id}/${randomUUID()}.${ext}`;
  const up = await db.storage.from("media").upload(path, bytes, { contentType: file.type, upsert: false });
  if (up.error) return failed("The photo could not be stored. Try again.");
  const { data: media, error } = await db
    .from("media")
    .insert({ vessel_id: id, storage_path: path, width: size.width, height: size.height, credit: input.data.credit })
    .select("id")
    .single();
  if (error) {
    await db.storage.from("media").remove([path]);
    return dbProblem(error);
  }
  const alts = (["en", "es", "ja"] as const)
    .map((locale) => ({ media_id: media.id, locale, alt: input.data[`alt_${locale}`] }))
    .filter((r): r is { media_id: string; locale: "en" | "es" | "ja"; alt: string } => !!r.alt);
  const t = await db.from("media_translations").insert(alts);
  if (t.error) return dbProblem(t.error);
  revalidatePath(editor(id));
  revalidateCatalogue();
  return saved("Photo added.");
}

export async function savePhoto(id: string, mediaId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin([...TEXTS], editor(id));
  const input = photoEditInput.safeParse(formObject(fd));
  if (!input.success)
    return problemsFrom(input.error, { alt_en: "Description (English)", credit: "Credit", sort_order: "Order" });
  const db = await getDb();
  const m = await db
    .from("media")
    .update({ credit: input.data.credit, sort_order: input.data.sort_order ?? 0 })
    .eq("id", mediaId)
    .eq("vessel_id", id);
  if (m.error) return dbProblem(m.error);
  for (const locale of ["en", "es", "ja"] as const) {
    const alt = input.data[`alt_${locale}`];
    const r = alt
      ? await db.from("media_translations").upsert({ media_id: mediaId, locale, alt }, { onConflict: "media_id,locale" })
      : await db.from("media_translations").delete().eq("media_id", mediaId).eq("locale", locale);
    if (r.error) return dbProblem(r.error);
  }
  revalidatePath(editor(id));
  revalidateCatalogue();
  return saved("Photo details saved.");
}

export async function deletePhoto(id: string, mediaId: string, _prev: ActionState, _fd: FormData): Promise<ActionState> {
  await requireAdmin([...CATALOGUE], editor(id));
  const db = await getDb();
  const { data: m } = await db.from("media").select("storage_path").eq("id", mediaId).eq("vessel_id", id).maybeSingle();
  if (!m) return failed("That photo no longer exists.");
  const del = await db.from("media").delete().eq("id", mediaId);
  if (del.error) return dbProblem(del.error);
  await db.storage.from("media").remove([m.storage_path]);
  revalidatePath(editor(id));
  revalidateCatalogue();
  return saved("Photo removed.");
}

/** DATA-021 / DATA-024 / DASH-ADM-017, 019: publish only when ready; otherwise a dated, explained showcase. */
export async function setVisibility(id: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin([...CATALOGUE], editor(id));
  const input = visibilityInput.safeParse(formObject(fd));
  if (!input.success)
    return problemsFrom(input.error, { showcase_until: "Show until", showcase_reason: "Reason", mode: "Visibility" });
  const db = await getDb();
  const d = input.data;
  if (d.mode === "published") {
    const v = await vesselForEditor(id);
    if (!v) return failed("This vessel no longer exists.");
    if (!v.readiness.complete) {
      return {
        ok: false,
        message: "Not published: the readiness check is not complete.",
        problems: v.readiness.items.filter((i) => !i.done).map((i) => i.label),
      };
    }
    const { error } = await db
      .from("vessels")
      .update({ visibility: "published", published_at: new Date().toISOString(), showcase_until: null, showcase_reason: null })
      .eq("id", id);
    if (error) return dbProblem(error);
    revalidatePath(editor(id));
    revalidateCatalogue();
    return saved("Published.");
  }
  if (d.mode === "showcase") {
    if (d.showcase_until < new Date().toISOString().slice(0, 10)) return failed("The end date must be today or later.");
    const { error } = await db
      .from("vessels")
      .update({ visibility: "showcase", showcase_until: d.showcase_until, showcase_reason: d.showcase_reason })
      .eq("id", id);
    if (error) return dbProblem(error);
    revalidatePath(editor(id));
    revalidateCatalogue();
    return saved(`Showcased until ${d.showcase_until}. The page shows “Details in preparation · sample” and can't be booked.`);
  }
  const { error } = await db
    .from("vessels")
    .update({ visibility: "private", published_at: null, showcase_until: null, showcase_reason: null })
    .eq("id", id);
  if (error) return dbProblem(error);
  revalidatePath(editor(id));
  revalidateCatalogue();
  return saved("Now a private draft.");
}

export async function addExternalRating(id: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin([...CATALOGUE], editor(id));
  const input = externalRatingInput.safeParse(formObject(fd));
  if (!input.success) {
    return problemsFrom(input.error, {
      source_name: "Source",
      rating: "Rating",
      scale: "Scale",
      review_count: "Reviews",
      url: "Link",
      retrieved_on: "Date read",
    });
  }
  const db = await getDb();
  const { error } = await db.from("external_ratings").insert({ vessel_id: id, ...input.data });
  if (error) return dbProblem(error);
  revalidatePath(editor(id));
  revalidateCatalogue();
  return saved("External rating added. It is shown with its source and date, never as our score.");
}

export async function deleteExternalRating(
  id: string,
  ratingId: string,
  _prev: ActionState,
  _fd: FormData,
): Promise<ActionState> {
  await requireAdmin([...CATALOGUE], editor(id));
  const db = await getDb();
  const { error } = await db.from("external_ratings").delete().eq("id", ratingId).eq("vessel_id", id);
  if (error) return dbProblem(error);
  revalidatePath(editor(id));
  revalidateCatalogue();
  return saved("External rating removed.");
}

export async function addSafety(id: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin([...CATALOGUE], editor(id));
  const input = safetyInput.safeParse(formObject(fd));
  if (!input.success) return problemsFrom(input.error, { observed_on: "Date", status: "Status", notes: "Notes" });
  const db = await getDb();
  const { error } = await db.from("safety_observations").insert({ vessel_id: id, ...input.data });
  if (error) return dbProblem(error);
  revalidatePath(editor(id));
  revalidateCatalogue();
  return saved("Safety observation recorded (internal only).");
}

export async function setSafetyStatus(id: string, obsId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin([...CATALOGUE], editor(id));
  const status = fd.get("status");
  if (status !== "open" && status !== "under_review" && status !== "resolved") return failed("Choose a status.");
  const db = await getDb();
  const { error } = await db.from("safety_observations").update({ status }).eq("id", obsId).eq("vessel_id", id);
  if (error) return dbProblem(error);
  revalidatePath(editor(id));
  revalidateCatalogue();
  return saved("Status updated.");
}

/**
 * ADR-102: approve (or withdraw) a vessel to sell with sightseeing included. Only for vessels that already sell that
 * way; for every other vessel Nilecruz sells the sightseeing. Withdrawing hides its with-sightseeing rates; bookings
 * already made keep what they bought.
 */
export async function setSightseeingApproval(
  id: string,
  approve: boolean,
  _prev: ActionState,
  _fd: FormData,
): Promise<ActionState> {
  await requireAdmin([...CATALOGUE], editor(id));
  const db = await getDb();
  const { error } = await db.rpc("set_sightseeing_approval", { target: id, approved: approve });
  if (error) return dbProblem(error);
  revalidatePath(editor(id));
  revalidateCatalogue();
  return saved(
    approve
      ? "Approved: the operator can now enter rates with sightseeing and say what they include."
      : "Approval withdrawn: Nilecruz sells sightseeing for this vessel again.",
  );
}
