"use server";

import { randomUUID } from "node:crypto";
import { imageSize } from "image-size";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionState } from "@/components/dashboard/ActionForm";
import { priceToMinor } from "@/lib/connections/format";
import { slugify } from "@/lib/data/slugs";
import { bandsProblem, sessionStarts, TOUR_CURRENCIES, TOUR_KINDS, type CancellationBand } from "@/lib/tours/tours";
import { requireAdmin } from "@/server/auth";
import { dbProblem, failed, formObject, problemsFrom, saved } from "@/server/catalogue/form";
import { getDb } from "@/server/db";
import { photoEditInput, photoInput } from "@/server/validation";

/**
 * Tours and sightseeing (DASH-ADM-058–071, 073, DATA-042, ADR-087). Catalogue (and super) admins manage everything;
 * content admins write texts and photos. RLS checks the same rights again.
 */
const MANAGE = ["catalogue"] as const;
const TEXTS = ["catalogue", "content"] as const;
const LIST = "/dashboard/admin/tours/";
const tourPage = (id: string) => `/dashboard/admin/tours/${id}/`;
const sessionsPage = (id: string) => `/dashboard/admin/tours/${id}/sessions/`;
const programPage = (id: string) => `/dashboard/admin/tours/programs/${id}/`;
const LOCALES = ["en", "es", "ja"] as const;

const text = (max: number) => z.string().trim().max(max, `at most ${max} characters`);
const lines = (v: unknown) =>
  String(v ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
const optUuid = z
  .string()
  .transform((v) => (v === "" ? null : v))
  .pipe(z.uuid().nullable());

// ── Tours ────────────────────────────────────────────────────────────────────────────────────────────────
const tourInput = z.object({
  name: text(160).min(1, "required"),
  kind: z.enum(TOUR_KINDS.map((k) => k.value) as [string, ...string[]], { message: "choose a kind" }),
  location: text(120).min(1, "required"),
  hours: z.coerce.number().int("whole hours").min(0).max(336),
  minutes: z.coerce.number().int("whole minutes").min(0).max(59),
});
const TOUR_LABELS = { name: "Name", kind: "Kind", location: "Location", hours: "Hours", minutes: "Minutes" };
const duration = (h: number, m: number) => h * 60 + m;

async function freeSlug(name: string): Promise<string> {
  const db = await getDb();
  const base = slugify(name) || "tour";
  const { data } = await db.from("tours").select("slug").like("slug", `${base}%`);
  const taken = new Set((data ?? []).map((r) => r.slug));
  let slug = base;
  for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
  return slug;
}

export async function createTour(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin([...MANAGE], LIST);
  const input = tourInput.safeParse(formObject(fd));
  if (!input.success) return problemsFrom(input.error, TOUR_LABELS);
  const minutes = duration(input.data.hours, input.data.minutes);
  if (minutes < 15) return failed("A tour lasts at least 15 minutes.");
  const db = await getDb();
  const { data, error } = await db
    .from("tours")
    .insert({
      slug: await freeSlug(input.data.name),
      name: input.data.name,
      kind: input.data.kind as (typeof TOUR_KINDS)[number]["value"],
      location: input.data.location,
      duration_minutes: minutes,
    })
    .select("id")
    .single();
  if (error) return dbProblem(error);
  redirect(tourPage(data.id));
}

const basicsInput = tourInput.extend({
  destination_id: optUuid,
  supplier_id: optUuid,
  standalone: z.array(z.string()),
  adults_only: z.array(z.string()),
});

export async function saveTourBasics(id: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin([...MANAGE], tourPage(id));
  const input = basicsInput.safeParse(formObject(fd, ["standalone", "adults_only"]));
  if (!input.success)
    return problemsFrom(input.error, { ...TOUR_LABELS, destination_id: "Destination", supplier_id: "Supplier" });
  const minutes = duration(input.data.hours, input.data.minutes);
  if (minutes < 15) return failed("A tour lasts at least 15 minutes.");
  const db = await getDb();
  const { error } = await db
    .from("tours")
    .update({
      name: input.data.name,
      kind: input.data.kind as (typeof TOUR_KINDS)[number]["value"],
      location: input.data.location,
      duration_minutes: minutes,
      destination_id: input.data.destination_id,
      supplier_id: input.data.supplier_id,
      standalone: input.data.standalone.includes("yes"),
      adults_only: input.data.adults_only.includes("yes"),
    })
    .eq("id", id);
  if (error) return dbProblem(error);
  revalidatePath(tourPage(id));
  return saved("Tour details saved.");
}

export async function saveTourTexts(id: string, locale: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin([...TEXTS], tourPage(id));
  if (!(LOCALES as readonly string[]).includes(locale)) return failed("Unknown language.");
  const f = formObject(fd);
  const description = String(f.description ?? "").trim();
  const meeting = String(f.meeting_point ?? "").trim();
  const terms = String(f.cancellation_terms ?? "").trim();
  const row = {
    tour_id: id,
    locale: locale as (typeof LOCALES)[number],
    description: description || null,
    itinerary: lines(f.itinerary),
    inclusions: lines(f.inclusions),
    exclusions: lines(f.exclusions),
    meeting_point: meeting || null,
    cancellation_terms: terms || null,
  };
  const problems: string[] = [];
  if (description.length > 6000) problems.push("Description: at most 6,000 characters");
  if (meeting.length > 1500) problems.push("Meeting point or pickup: at most 1,500 characters");
  if (terms.length > 3000) problems.push("Cancellation wording: at most 3,000 characters");
  for (const [k, label] of [
    ["itinerary", "Itinerary"],
    ["inclusions", "Included"],
    ["exclusions", "Not included"],
  ] as const) {
    if (row[k].length > 30) problems.push(`${label}: at most 30 lines`);
  }
  if (problems.length) return { ok: false, message: "Nothing was saved. Please fix:", problems };
  const db = await getDb();
  const { error } = await db.from("tour_translations").upsert(row, { onConflict: "tour_id,locale" });
  if (error) return dbProblem(error);
  revalidatePath(tourPage(id));
  return saved(
    locale === "en"
      ? "English texts saved."
      : `${locale === "es" ? "Spanish" : "Japanese"} texts saved. Empty fields fall back to English.`,
  );
}

export async function saveBands(id: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin([...MANAGE], tourPage(id));
  const f = formObject(fd);
  const bands: CancellationBand[] = [];
  for (let i = 0; i < 6; i++) {
    const d = String(f[`from_days_${i}`] ?? "").trim();
    const p = String(f[`percent_${i}`] ?? "").trim();
    if (!d && !p) continue;
    if (!/^\d{1,3}$/.test(d) || !/^\d{1,3}$/.test(p))
      return failed(`Band ${i + 1}: give whole numbers for the days and the percentage.`);
    bands.push({ from_days: Number(d), percent: Number(p) });
  }
  const problem = bandsProblem(bands);
  if (problem) return failed(problem);
  const db = await getDb();
  const { error } = await db
    .from("tours")
    .update({ cancellation_bands: bands.sort((a, b) => b.from_days - a.from_days) })
    .eq("id", id);
  if (error) return dbProblem(error);
  revalidatePath(tourPage(id));
  return saved(
    bands.length ? "Cancellation bands saved." : "Cancellation bands cleared: the tour can’t be booked until it has some.",
  );
}

export async function saveTourSchedules(id: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin([...MANAGE], tourPage(id));
  const ids = fd
    .getAll("schedule_id")
    .map(String)
    .filter((v) => z.uuid().safeParse(v).success);
  const db = await getDb();
  const del = await db.from("tour_schedules").delete().eq("tour_id", id);
  if (del.error) return dbProblem(del.error);
  if (ids.length) {
    const ins = await db.from("tour_schedules").insert(ids.map((schedule_id) => ({ tour_id: id, schedule_id })));
    if (ins.error) return dbProblem(ins.error);
  }
  revalidatePath(tourPage(id));
  return saved(
    ids.length
      ? `Offered with ${ids.length} cruise schedule${ids.length === 1 ? "" : "s"}.`
      : "Not assigned to any cruise schedule.",
  );
}

export async function setTourVisibility(id: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin([...MANAGE], tourPage(id));
  const visibility = String(fd.get("visibility") ?? "");
  if (visibility !== "private" && visibility !== "published") return failed("Choose private or published.");
  const db = await getDb();
  if (visibility === "published") {
    const { data } = await db.from("tour_translations").select("description").eq("tour_id", id).eq("locale", "en").maybeSingle();
    if (!data?.description) return failed("Add an English description before publishing.");
  }
  const { error } = await db.from("tours").update({ visibility }).eq("id", id);
  if (error) return dbProblem(error);
  revalidatePath(tourPage(id));
  return saved(visibility === "published" ? "Published." : "Made private.");
}

// ── Photos (DASH-ADM-061): texts and photos are content work too ───────────────────────────────────────────
const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};
const PHOTO_LABELS = {
  alt_en: "Description (English)",
  alt_es: "Spanish",
  alt_ja: "Japanese",
  credit: "Credit",
  rights: "Rights",
};

export async function uploadTourPhoto(id: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin([...TEXTS], tourPage(id));
  const file = fd.get("photo");
  if (!(file instanceof File) || file.size === 0) return failed("Choose a photo to upload.");
  const ext = IMAGE_TYPES[file.type];
  if (!ext) return failed("Use a JPEG, PNG, WebP or AVIF photo.");
  if (file.size > 15 * 1024 * 1024) return failed("The photo is larger than 15 MB. Export a smaller version.");
  const input = photoInput.safeParse(formObject(fd));
  if (!input.success) return problemsFrom(input.error, PHOTO_LABELS);
  const bytes = Buffer.from(await file.arrayBuffer());
  let size: { width?: number; height?: number };
  try {
    size = imageSize(bytes);
  } catch {
    return failed("That file isn't a readable photo.");
  }
  if (!size.width || !size.height) return failed("That file isn't a readable photo.");
  const db = await getDb();
  const path = `tours/${id}/${randomUUID()}.${ext}`;
  const up = await db.storage.from("media").upload(path, bytes, { contentType: file.type, upsert: false });
  if (up.error) return failed("The photo could not be stored. Try again.");
  const { data: media, error } = await db
    .from("media")
    .insert({ tour_id: id, storage_path: path, width: size.width, height: size.height, credit: input.data.credit })
    .select("id")
    .single();
  if (error) {
    await db.storage.from("media").remove([path]);
    return dbProblem(error);
  }
  const alts = LOCALES.map((locale) => ({ media_id: media.id, locale, alt: input.data[`alt_${locale}`] })).filter(
    (r): r is { media_id: string; locale: "en" | "es" | "ja"; alt: string } => !!r.alt,
  );
  const t = await db.from("media_translations").insert(alts);
  if (t.error) return dbProblem(t.error);
  revalidatePath(tourPage(id));
  return saved("Photo added.");
}

export async function saveTourPhoto(id: string, mediaId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin([...TEXTS], tourPage(id));
  const input = photoEditInput.safeParse(formObject(fd));
  if (!input.success)
    return problemsFrom(input.error, { alt_en: "Description (English)", credit: "Credit", sort_order: "Order" });
  const db = await getDb();
  const m = await db
    .from("media")
    .update({ credit: input.data.credit, sort_order: input.data.sort_order ?? 0 })
    .eq("id", mediaId)
    .eq("tour_id", id);
  if (m.error) return dbProblem(m.error);
  for (const locale of LOCALES) {
    const alt = input.data[`alt_${locale}`];
    const r = alt
      ? await db.from("media_translations").upsert({ media_id: mediaId, locale, alt }, { onConflict: "media_id,locale" })
      : await db.from("media_translations").delete().eq("media_id", mediaId).eq("locale", locale);
    if (r.error) return dbProblem(r.error);
  }
  revalidatePath(tourPage(id));
  return saved("Photo details saved.");
}

export async function deleteTourPhoto(id: string, mediaId: string, _prev: ActionState, _fd: FormData): Promise<ActionState> {
  await requireAdmin([...TEXTS], tourPage(id));
  const db = await getDb();
  const { data: m } = await db.from("media").select("storage_path").eq("id", mediaId).eq("tour_id", id).maybeSingle();
  if (!m) return failed("That photo no longer exists.");
  const del = await db.from("media").delete().eq("id", mediaId);
  if (del.error) return dbProblem(del.error);
  await db.storage.from("media").remove([m.storage_path]);
  revalidatePath(tourPage(id));
  return saved("Photo removed.");
}

// ── Sessions (DASH-ADM-067–069) ──────────────────────────────────────────────────────────────────────────
const sessionInput = z
  .object({
    from: z.iso.date({ message: "choose a date" }),
    to: z.iso.date({ message: "choose a date" }),
    weekdays: z.array(z.coerce.number().int().min(1).max(7)).min(1, "choose at least one weekday"),
    times: z.string().trim().min(1, "give at least one start time"),
    option: z.enum(["shared:per_guest", "private:per_guest", "private:per_group"], { message: "choose how it is sold" }),
    capacity: z.coerce.number().int("a whole number").min(1, "at least 1").max(500, "at most 500"),
    currency: z.enum(TOUR_CURRENCIES, { message: "US$ or €" }),
    price: z.string().trim(),
  })
  .refine((v) => priceToMinor(v.price) !== null, { message: "an amount like 45 or 45.50", path: ["price"] });

export async function createSessions(tourId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin([...MANAGE], sessionsPage(tourId));
  const input = sessionInput.safeParse(formObject(fd, ["weekdays"]));
  if (!input.success) {
    return problemsFrom(input.error, {
      from: "From",
      to: "To",
      weekdays: "Weekdays",
      times: "Start times",
      option: "Sold as",
      capacity: "Capacity",
      currency: "Currency",
      price: "Price",
    });
  }
  const db = await getDb();
  const { data: tour } = await db.from("tours").select("duration_minutes").eq("id", tourId).single();
  if (!tour) return failed("This tour no longer exists.");
  let starts: Date[];
  try {
    starts = sessionStarts({
      from: input.data.from,
      to: input.data.to,
      weekdays: input.data.weekdays,
      times: input.data.times.split(/[\s,]+/).filter(Boolean),
    });
  } catch (e) {
    return failed((e as Error).message);
  }
  const now = Date.now();
  starts = starts.filter((s) => s.getTime() > now);
  if (!starts.length) return failed("No future dates match those weekdays.");
  const [kind, pricing] = input.data.option.split(":") as ["shared" | "private", "per_guest" | "per_group"];
  const rows = starts.map((s) => ({
    tour_id: tourId,
    starts_at: s.toISOString(),
    ends_at: new Date(s.getTime() + tour.duration_minutes * 60_000).toISOString(),
    kind,
    pricing,
    capacity: input.data.capacity,
    currency: input.data.currency,
    price_minor: priceToMinor(input.data.price)!,
  }));
  const { data, error } = await db
    .from("tour_sessions")
    .upsert(rows, { onConflict: "tour_id,starts_at,kind,pricing,currency", ignoreDuplicates: true })
    .select("id");
  if (error) return dbProblem(error);
  revalidatePath(sessionsPage(tourId));
  const created = data?.length ?? 0;
  const existing = rows.length - created;
  return saved(
    `${created} session${created === 1 ? "" : "s"} created${existing ? `; ${existing} already existed and were left as they are` : ""}.`,
  );
}

export async function setSessionStatus(
  tourId: string,
  sessionId: string,
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  await requireAdmin([...MANAGE], sessionsPage(tourId));
  const status = fd.get("status") === "cancelled" ? "cancelled" : "scheduled";
  const db = await getDb();
  const { error } = await db.from("tour_sessions").update({ status }).eq("id", sessionId).eq("tour_id", tourId);
  if (error) return dbProblem(error);
  revalidatePath(sessionsPage(tourId));
  return saved(status === "cancelled" ? "Session cancelled." : "Session restored.");
}

// ── Suppliers (DASH-ADM-064) ─────────────────────────────────────────────────────────────────────────────
const optText = (max: number) => text(max).transform((v) => (v === "" ? null : v));
const supplierInput = z.object({
  name: text(160).min(1, "required"),
  contact_name: optText(120),
  email: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .pipe(z.email("an email address").nullable()),
  phone: optText(40),
  registration: optText(120),
  notes: optText(2000),
});
const SUPPLIER_LABELS = {
  name: "Company",
  contact_name: "Contact",
  email: "Email",
  phone: "Phone",
  registration: "Licence or registration",
  notes: "Notes",
};
const SUPPLIERS = "/dashboard/admin/tours/suppliers/";

export async function createSupplier(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin([...MANAGE], SUPPLIERS);
  const input = supplierInput.safeParse(formObject(fd));
  if (!input.success) return problemsFrom(input.error, SUPPLIER_LABELS);
  const db = await getDb();
  const { error } = await db.from("tour_suppliers").insert(input.data);
  if (error) return dbProblem(error);
  revalidatePath(SUPPLIERS);
  return saved(`${input.data.name} added.`);
}

export async function saveSupplier(id: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin([...MANAGE], SUPPLIERS);
  const input = supplierInput.safeParse(formObject(fd));
  if (!input.success) return problemsFrom(input.error, SUPPLIER_LABELS);
  const db = await getDb();
  const { error } = await db.from("tour_suppliers").update(input.data).eq("id", id);
  if (error) return dbProblem(error);
  revalidatePath(SUPPLIERS);
  return saved("Supplier saved.");
}

// ── Programs (DASH-ADM-070, 071) ─────────────────────────────────────────────────────────────────────────
const programInput = z.object({
  name: text(160).min(1, "required"),
  days: z.coerce.number().int("a whole number").min(1, "at least 1").max(22, "at most 22"),
});

export async function createProgram(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin([...MANAGE], LIST);
  const input = programInput.safeParse(formObject(fd));
  if (!input.success) return problemsFrom(input.error, { name: "Name", days: "Days" });
  const db = await getDb();
  const { data, error } = await db.from("programs").insert(input.data).select("id").single();
  if (error) return dbProblem(error);
  redirect(programPage(data.id));
}

export async function saveProgram(id: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin([...MANAGE], programPage(id));
  const input = programInput.extend({ visibility: z.enum(["private", "published"]) }).safeParse(formObject(fd));
  if (!input.success) return problemsFrom(input.error, { name: "Name", days: "Days", visibility: "Visibility" });
  const db = await getDb();
  const { data: late } = await db
    .from("program_items")
    .select("day_number")
    .eq("program_id", id)
    .gt("day_number", input.data.days)
    .limit(1);
  if (late?.length) return failed(`Day ${late[0]!.day_number} has tours. Remove them before shortening the program.`);
  const { error } = await db.from("programs").update(input.data).eq("id", id);
  if (error) return dbProblem(error);
  revalidatePath(programPage(id));
  return saved("Program saved.");
}

export async function saveProgramTexts(id: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin([...TEXTS], programPage(id));
  const f = formObject(fd);
  const rows = LOCALES.map((locale) => ({
    program_id: id,
    locale,
    description: String(f[`description_${locale}`] ?? "").trim() || null,
  }));
  if (rows.some((r) => (r.description ?? "").length > 6000)) return failed("Each description has at most 6,000 characters.");
  const db = await getDb();
  const { error } = await db.from("program_translations").upsert(rows, { onConflict: "program_id,locale" });
  if (error) return dbProblem(error);
  revalidatePath(programPage(id));
  return saved("Descriptions saved.");
}

export async function addProgramItem(id: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin([...MANAGE], programPage(id));
  const input = z
    .object({ day_number: z.coerce.number().int().min(1, "choose a day").max(22), tour_id: z.uuid({ message: "choose a tour" }) })
    .safeParse(formObject(fd));
  if (!input.success) return problemsFrom(input.error, { day_number: "Day", tour_id: "Tour" });
  const db = await getDb();
  const { error } = await db.from("program_items").insert({ program_id: id, ...input.data });
  if (error) return error.code === "23505" ? failed("That tour is already on that day.") : dbProblem(error);
  revalidatePath(programPage(id));
  return saved("Tour added to the program.");
}

export async function removeProgramItem(
  id: string,
  day: number,
  tourId: string,
  _prev: ActionState,
  _fd: FormData,
): Promise<ActionState> {
  await requireAdmin([...MANAGE], programPage(id));
  const db = await getDb();
  const { error } = await db.from("program_items").delete().eq("program_id", id).eq("day_number", day).eq("tour_id", tourId);
  if (error) return dbProblem(error);
  revalidatePath(programPage(id));
  return saved("Removed.");
}

export async function saveProgramSchedules(id: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin([...MANAGE], programPage(id));
  const ids = fd
    .getAll("schedule_id")
    .map(String)
    .filter((v) => z.uuid().safeParse(v).success);
  const db = await getDb();
  const del = await db.from("program_schedules").delete().eq("program_id", id);
  if (del.error) return dbProblem(del.error);
  if (ids.length) {
    const ins = await db.from("program_schedules").insert(ids.map((schedule_id) => ({ program_id: id, schedule_id })));
    if (ins.error) return dbProblem(ins.error);
  }
  revalidatePath(programPage(id));
  return saved(
    ids.length ? `Linked to ${ids.length} cruise schedule${ids.length === 1 ? "" : "s"}.` : "Not linked to any schedule.",
  );
}
