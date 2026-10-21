"use server";

import { randomUUID } from "node:crypto";
import { imageSize } from "image-size";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionState } from "@/components/dashboard/ActionForm";
import { currenciesFor, MIN_GRATUITY_USD_MINOR, validBands, type Band, type RatePlan } from "@/lib/product/pricing";
import { bandsProblem, type CancellationBand } from "@/lib/tours/tours";
import { requireAdmin } from "@/server/auth";
import { dbProblem, failed, formObject, problemsFrom, saved } from "@/server/catalogue/form";
import { getDb } from "@/server/db";
import { requireProductEditor } from "@/server/product/guard";
import { productPaths } from "./paths";
import { periodOf, type SailingPeriod } from "@/lib/product/sailing-time";
import { revalidateCatalogue } from "@/server/marketplace/revalidate";

/**
 * Product actions (DASH-ADM-048–056, 074–085, DASH-OPR-008–012, DATA-015, 022, 023).
 * Every one starts with requireProductEditor (or requireAdmin); RLS checks the same rights again.
 */

const code = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9][A-Za-z0-9_.-]{0,39}$/, "letters, numbers, dot, dash or underscore (max 40)");
const optText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `at most ${max} characters`)
    .transform((v) => (v === "" ? null : v));
const money = z
  .string()
  .trim()
  .regex(/^\d{1,9}(\.\d{1,2})?$/, "an amount like 650 or 650.50")
  .transform((v) => Math.round(Number(v) * 100));
const isoDate = z.iso.date({ message: "a date" });

// ── Gratuity (DATA-015) ────────────────────────────────────────────────────────────────────────────────
export async function saveGratuity(
  orgId: string | null,
  vesselId: string,
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const p = productPaths(orgId, vesselId);
  await requireProductEditor(vesselId, p.cabins, { orgId: orgId ?? undefined });
  const r = money.safeParse(String(fd.get("gratuity") ?? ""));
  if (!r.success) return failed("Enter the gratuity in US dollars, for example 5 or 7.50.");
  if (r.data < MIN_GRATUITY_USD_MINOR) return failed("The crew gratuity is at least US$5 per person per night.");
  const db = await getDb();
  const { error } = await db.from("vessels").update({ gratuity_usd_minor: r.data }).eq("id", vesselId);
  if (error) return dbProblem(error);
  revalidatePath(p.cabins);
  revalidateCatalogue();
  return saved("Gratuity saved. It is shown separately, paid on board, and never added to the total.");
}

// ── Cabin types (DASH-ADM-048–050, DATA-023) ───────────────────────────────────────────────────────────
const cabinInput = z.object({
  code,
  name: z.string().trim().min(1, "required").max(120),
  deck: z.string().trim().min(1, "required").max(60),
  size_m2: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : Number(v)))
    .refine((v) => v === null || (Number.isFinite(v) && v > 0 && v < 1000), "a size in square metres"),
  bed_configuration: optText(120),
  max_occupancy: z.coerce.number().int().min(1, "1 to 3").max(3, "1 to 3"),
  view: optText(80),
  balcony: z
    .string()
    .optional()
    .transform((v) => v === "yes"),
  amenities: z
    .string()
    .trim()
    .max(1000)
    .transform((v) =>
      v
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean),
    ),
  active: z
    .string()
    .optional()
    .transform((v) => v === "yes"),
  description_en: optText(4000),
  name_es: optText(120),
  description_es: optText(4000),
  name_ja: optText(120),
  description_ja: optText(4000),
});
const CABIN_LABELS = {
  code: "Code",
  name: "Name",
  deck: "Deck",
  size_m2: "Size",
  bed_configuration: "Beds",
  max_occupancy: "Maximum occupancy",
  view: "View",
  amenities: "Amenities",
};

async function saveCabinTranslations(id: string, d: z.infer<typeof cabinInput>) {
  const db = await getDb();
  const rows = [
    { cabin_type_id: id, locale: "en" as const, name: d.name, description: d.description_en },
    { cabin_type_id: id, locale: "es" as const, name: d.name_es, description: d.description_es },
    { cabin_type_id: id, locale: "ja" as const, name: d.name_ja, description: d.description_ja },
  ];
  return db.from("cabin_type_translations").upsert(rows, { onConflict: "cabin_type_id,locale" });
}

export async function saveCabin(
  orgId: string | null,
  vesselId: string,
  cabinId: string | null,
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const p = productPaths(orgId, vesselId);
  await requireProductEditor(vesselId, p.cabins, { orgId: orgId ?? undefined });
  const input = cabinInput.safeParse(formObject(fd));
  if (!input.success) return problemsFrom(input.error, CABIN_LABELS);
  const d = input.data;
  const row = {
    vessel_id: vesselId,
    code: d.code,
    name: d.name,
    deck: d.deck,
    size_m2: d.size_m2,
    bed_configuration: d.bed_configuration,
    max_occupancy: d.max_occupancy,
    view: d.view,
    balcony: d.balcony,
    amenities: d.amenities,
    active: cabinId ? d.active : true,
  };
  const db = await getDb();
  const res = cabinId
    ? await db.from("cabin_types").update(row).eq("id", cabinId).eq("vessel_id", vesselId).select("id").single()
    : await db.from("cabin_types").insert(row).select("id").single();
  if (res.error?.code === "23505") return failed("Another cabin type of this vessel already uses that code.");
  if (res.error) return dbProblem(res.error);
  const t = await saveCabinTranslations(res.data.id, d);
  if (t.error) return dbProblem(t.error);
  revalidatePath(p.cabins);
  revalidateCatalogue();
  if (!cabinId) redirect(p.cabin(res.data.id));
  return saved("Cabin type saved.");
}

const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

export async function uploadCabinPhoto(
  orgId: string | null,
  vesselId: string,
  cabinId: string,
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const p = productPaths(orgId, vesselId);
  await requireProductEditor(vesselId, p.cabin(cabinId), { orgId: orgId ?? undefined });
  const file = fd.get("photo");
  if (!(file instanceof File) || file.size === 0) return failed("Choose a photo to upload.");
  const ext = IMAGE_TYPES[file.type];
  if (!ext) return failed("Use a JPEG, PNG, WebP or AVIF photo.");
  if (file.size > 15 * 1024 * 1024) return failed("The photo is larger than 15 MB.");
  const alt = String(fd.get("alt_en") ?? "").trim();
  const credit = String(fd.get("credit") ?? "").trim();
  if (!alt || !credit || fd.get("rights") !== "yes")
    return failed("Add a description, a credit, and confirm the right to publish.");
  const bytes = Buffer.from(await file.arrayBuffer());
  let size: { width?: number; height?: number };
  try {
    size = imageSize(bytes);
  } catch {
    return failed("That file isn't a readable photo.");
  }
  if (!size.width || !size.height) return failed("That file isn't a readable photo.");
  const db = await getDb();
  const path = `cabin-types/${cabinId}/${randomUUID()}.${ext}`;
  const up = await db.storage.from("media").upload(path, bytes, { contentType: file.type });
  if (up.error) return failed("The photo could not be stored. Try again.");
  const { data: m, error } = await db
    .from("media")
    .insert({ cabin_type_id: cabinId, storage_path: path, width: size.width, height: size.height, credit })
    .select("id")
    .single();
  if (error) {
    await db.storage.from("media").remove([path]);
    return dbProblem(error);
  }
  await db.from("media_translations").insert({ media_id: m.id, locale: "en", alt: alt.slice(0, 300) });
  revalidatePath(p.cabin(cabinId));
  revalidateCatalogue();
  return saved("Photo added.");
}

// ── Schedules, periods, itinerary, departures (DASH-ADM-051, 052) ───────────────────────────────────────
const scheduleInput = z.object({
  code,
  origin: z.string().trim().min(1, "required").max(80),
  destination: z.string().trim().min(1, "required").max(80),
  nights: z.coerce.number().int().min(1, "1 to 21").max(21, "1 to 21"),
  sailing_days: z.array(z.coerce.number().int().min(1).max(7)).min(1, "choose at least one day"),
  active: z
    .string()
    .optional()
    .transform((v) => v === "yes"),
  sailing_period: z.enum(["", "morning", "noon", "evening"]).optional(),
  sails_at: z.string().trim().max(5).optional(),
});

export async function saveSchedule(
  orgId: string | null,
  vesselId: string,
  scheduleId: string | null,
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const p = productPaths(orgId, vesselId);
  await requireProductEditor(vesselId, p.schedules, { orgId: orgId ?? undefined });
  const input = scheduleInput.safeParse(formObject(fd, ["sailing_days"]));
  if (!input.success)
    return problemsFrom(input.error, {
      code: "Code",
      origin: "From",
      destination: "To",
      nights: "Nights",
      sailing_days: "Sailing days",
    });
  const d = input.data;
  if (d.origin.toLowerCase() === d.destination.toLowerCase() && d.nights < 2)
    return failed("A round trip needs at least two nights.");
  // PROPOSED-019: a time decides the period; a period alone is enough. The database checks the same.
  const time = d.sails_at || null;
  const timePeriod = time ? periodOf(time) : null;
  if (time && !timePeriod) return failed("Give the sailing time as HH:MM, for example 08:00.");
  const period = (d.sailing_period || null) as SailingPeriod | null;
  if (period && timePeriod && period !== timePeriod)
    return failed(
      `${time} is ${timePeriod === "noon" ? "around noon" : `in the ${timePeriod}`}; choose that, or correct the time.`,
    );
  const db = await getDb();
  const row = {
    vessel_id: vesselId,
    sailing_period: timePeriod ?? period,
    sails_at: time,
    code: d.code,
    origin: d.origin,
    destination: d.destination,
    nights: d.nights,
    sailing_days: d.sailing_days,
    active: scheduleId ? d.active : true,
  };
  const res = scheduleId
    ? await db.from("schedules").update(row).eq("id", scheduleId).eq("vessel_id", vesselId).select("id").single()
    : await db.from("schedules").insert(row).select("id").single();
  if (res.error?.code === "23505") return failed("Another schedule of this vessel already uses that code.");
  if (res.error) return dbProblem(res.error);
  revalidatePath(p.schedules);
  revalidateCatalogue();
  if (!scheduleId) redirect(p.schedule(res.data.id));
  return saved("Schedule saved. Existing departures keep their dates; generate again to add new ones.");
}

export async function addPeriod(
  orgId: string | null,
  vesselId: string,
  scheduleId: string,
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const p = productPaths(orgId, vesselId);
  await requireProductEditor(vesselId, p.schedule(scheduleId), { orgId: orgId ?? undefined });
  const r = z.object({ starts_on: isoDate, ends_on: isoDate }).safeParse(formObject(fd));
  if (!r.success) return problemsFrom(r.error, { starts_on: "From", ends_on: "To" });
  if (r.data.ends_on < r.data.starts_on) return failed("The end date is before the start date.");
  const db = await getDb();
  const { error } = await db.from("schedule_periods").insert({ schedule_id: scheduleId, ...r.data });
  if (error) return dbProblem(error);
  revalidatePath(p.schedule(scheduleId));
  revalidateCatalogue();
  return saved("Operating period added.");
}

export async function removePeriod(
  orgId: string | null,
  vesselId: string,
  scheduleId: string,
  periodId: string,
  _prev: ActionState,
  _fd: FormData,
): Promise<ActionState> {
  const p = productPaths(orgId, vesselId);
  await requireProductEditor(vesselId, p.schedule(scheduleId), { orgId: orgId ?? undefined });
  const db = await getDb();
  const { error } = await db.from("schedule_periods").delete().eq("id", periodId).eq("schedule_id", scheduleId);
  if (error) return dbProblem(error);
  revalidatePath(p.schedule(scheduleId));
  revalidateCatalogue();
  return saved("Period removed. Departures already created stay until you cancel them.");
}

export async function saveItineraryDay(
  orgId: string | null,
  vesselId: string,
  scheduleId: string,
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const p = productPaths(orgId, vesselId);
  await requireProductEditor(vesselId, p.schedule(scheduleId), { orgId: orgId ?? undefined });
  const r = z
    .object({
      day_number: z.coerce.number().int().min(1).max(22),
      locale: z.enum(["en", "es", "ja"]),
      title: z.string().trim().min(1, "required").max(160),
      description: optText(4000),
    })
    .safeParse(formObject(fd));
  if (!r.success) return problemsFrom(r.error, { day_number: "Day", title: "Title", description: "Description" });
  const db = await getDb();
  const { error } = await db
    .from("schedule_days")
    .upsert({ schedule_id: scheduleId, ...r.data }, { onConflict: "schedule_id,day_number,locale" });
  if (error) return dbProblem(error);
  revalidatePath(p.schedule(scheduleId));
  revalidateCatalogue();
  return saved(`Day ${r.data.day_number} saved.`);
}

export async function generate(
  orgId: string | null,
  vesselId: string,
  scheduleId: string,
  _prev: ActionState,
  _fd: FormData,
): Promise<ActionState> {
  const p = productPaths(orgId, vesselId);
  await requireProductEditor(vesselId, p.schedule(scheduleId), { orgId: orgId ?? undefined });
  const db = await getDb();
  const { data, error } = await db.rpc("generate_departures", { target: scheduleId });
  if (error) return dbProblem(error);
  revalidatePath(p.schedule(scheduleId));
  revalidateCatalogue();
  return saved(
    data
      ? `${data} departure${data === 1 ? "" : "s"} created.`
      : "No new departures: every sailing day in the periods already has one.",
  );
}

export async function setDepartureStatus(
  orgId: string | null,
  vesselId: string,
  scheduleId: string,
  departureId: string,
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const p = productPaths(orgId, vesselId);
  await requireProductEditor(vesselId, p.schedule(scheduleId), { orgId: orgId ?? undefined });
  const status = fd.get("status") === "cancelled" ? "cancelled" : "scheduled";
  const db = await getDb();
  const { error } = await db.from("departures").update({ status }).eq("id", departureId).eq("schedule_id", scheduleId);
  if (error) return dbProblem(error);
  revalidatePath(p.schedule(scheduleId));
  revalidateCatalogue();
  return saved(status === "cancelled" ? "Departure cancelled." : "Departure restored.");
}

// ── Inventory and rates (DASH-ADM-053–056, DASH-OPR-010, ADR-082) ──────────────────────────────────────
const bulkInput = z.object({
  cabin_type_id: z.uuid({ message: "choose a cabin type" }),
  from: isoDate,
  to: isoDate,
  weekdays: z.array(z.coerce.number().int().min(1).max(7)),
  available: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : Number(v)))
    .refine((v) => v === null || (Number.isInteger(v) && v >= 0 && v <= 400), "0 to 400"),
  occupancy: z.coerce.number().int().min(1).max(3),
  rate_plan: z.enum(["international", "egyptian_citizen", "foreign_resident", "trade"]),
  // DASH-B2B-012: a trade price for one approved travel partner only.
  partner: z.string().trim().optional(),
  // ADR-102: "with_sightseeing" only on vessels Nilecruz approved (the database refuses it otherwise).
  package: z.enum(["cruise", "with_sightseeing"]).default("cruise"),
  currency: z.enum(["USD", "EUR", "EGP"]),
  amount: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .pipe(money.nullable()),
});

/** DASH-ADM-054: one departure, or every matching date of a schedule, in one go. Inventory is shared (DASH-ADM-056). */
export async function bulkUpdate(
  orgId: string | null,
  vesselId: string,
  scheduleId: string,
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const p = productPaths(orgId, vesselId);
  await requireProductEditor(vesselId, p.schedule(scheduleId), { orgId: orgId ?? undefined });
  const input = bulkInput.safeParse(formObject(fd, ["weekdays"]));
  if (!input.success) {
    return problemsFrom(input.error, {
      cabin_type_id: "Cabin type",
      from: "From",
      to: "To",
      available: "Cabins available",
      occupancy: "Occupancy",
      rate_plan: "Rate plan",
      currency: "Currency",
      amount: "Price per person",
    });
  }
  const d = input.data;
  if (d.available === null && d.amount === null) return failed("Enter cabins available, a price, or both.");
  if (d.amount !== null && !currenciesFor(d.rate_plan as RatePlan).includes(d.currency))
    return failed("E£ is only for the Egyptian-citizen and foreign-resident plans.");
  const db = await getDb();
  const q = db
    .from("departures")
    .select("id, departs_on")
    .eq("schedule_id", scheduleId)
    .eq("status", "scheduled")
    .gte("departs_on", d.from)
    .lte("departs_on", d.to);
  const { data: deps, error } = await q;
  if (error) return dbProblem(error);
  const day = (s: string) => ((new Date(`${s}T00:00:00Z`).getUTCDay() + 6) % 7) + 1;
  const targets = (deps ?? []).filter((x) => !d.weekdays.length || d.weekdays.includes(day(x.departs_on)));
  if (!targets.length) return failed("No scheduled departures match those dates.");
  if (d.available !== null) {
    const rows = targets.map((t) => ({
      departure_id: t.id,
      cabin_type_id: d.cabin_type_id,
      vessel_id: vesselId,
      available: d.available!,
      confirmed_at: new Date().toISOString(),
      source: "manual" as const,
    }));
    const r = await db.from("inventory").upsert(rows, { onConflict: "departure_id,cabin_type_id" });
    if (r.error) return dbProblem(r.error);
  }
  if (d.amount !== null && d.package === "with_sightseeing") {
    if (d.partner) return failed("A price with sightseeing is for every guest, not one travel partner.");
    const rows = targets.map((t) => ({
      departure_id: t.id,
      cabin_type_id: d.cabin_type_id,
      vessel_id: vesselId,
      occupancy: d.occupancy,
      rate_plan: d.rate_plan,
      currency: d.currency,
      amount_minor: d.amount!,
    }));
    const r = await db
      .from("sightseeing_rates")
      .upsert(rows, { onConflict: "departure_id,cabin_type_id,occupancy,rate_plan,currency" });
    if (r.error) return dbProblem(r.error);
  } else if (d.amount !== null && d.partner) {
    if (d.rate_plan !== "trade") return failed("A price for one travel partner uses the Trade plan.");
    if (d.currency === "EGP") return failed("Travel partner prices are in US$ or €.");
    const rows = targets.map((t) => ({
      partner_org_id: d.partner!,
      departure_id: t.id,
      cabin_type_id: d.cabin_type_id,
      vessel_id: vesselId,
      occupancy: d.occupancy,
      currency: d.currency as "USD" | "EUR",
      amount_minor: d.amount!,
    }));
    const r = await db
      .from("partner_rates")
      .upsert(rows, { onConflict: "partner_org_id,departure_id,cabin_type_id,occupancy,currency" });
    if (r.error) return dbProblem(r.error);
  } else if (d.amount !== null) {
    // The database fills in the child bands for new rates and keeps them on updates (DATA-022).
    const rows = targets.map((t) => ({
      departure_id: t.id,
      cabin_type_id: d.cabin_type_id,
      vessel_id: vesselId,
      occupancy: d.occupancy,
      rate_plan: d.rate_plan,
      currency: d.currency,
      amount_minor: d.amount!,
    }));
    const r = await db.from("rates").upsert(rows, { onConflict: "departure_id,cabin_type_id,occupancy,rate_plan,currency" });
    if (r.error) return dbProblem(r.error);
  }
  revalidatePath(p.schedule(scheduleId));
  revalidateCatalogue();
  return saved(`Updated ${targets.length} departure${targets.length === 1 ? "" : "s"}.`);
}

export async function confirmAvailability(
  orgId: string | null,
  vesselId: string,
  scheduleId: string,
  _prev: ActionState,
  _fd: FormData,
): Promise<ActionState> {
  const p = productPaths(orgId, vesselId);
  await requireProductEditor(vesselId, p.schedule(scheduleId), { orgId: orgId ?? undefined });
  const db = await getDb();
  const { data: deps } = await db
    .from("departures")
    .select("id")
    .eq("schedule_id", scheduleId)
    .gte("departs_on", new Date().toISOString().slice(0, 10));
  const ids = (deps ?? []).map((x) => x.id);
  if (!ids.length) return failed("No upcoming departures.");
  const { error, count } = await db
    .from("inventory")
    .update({ confirmed_at: new Date().toISOString(), source: "manual" }, { count: "exact" })
    .in("departure_id", ids);
  if (error) return dbProblem(error);
  revalidatePath(p.schedule(scheduleId));
  revalidateCatalogue();
  return saved(`Availability confirmed as of now for ${count ?? 0} cabin row${count === 1 ? "" : "s"}.`);
}

export async function deleteRate(
  orgId: string | null,
  vesselId: string,
  scheduleId: string,
  departureId: string,
  rateId: string,
  _prev: ActionState,
  _fd: FormData,
): Promise<ActionState> {
  const p = productPaths(orgId, vesselId);
  await requireProductEditor(vesselId, p.departure(scheduleId, departureId), { orgId: orgId ?? undefined });
  const db = await getDb();
  const { error } = await db.from("rates").delete().eq("id", rateId).eq("departure_id", departureId);
  if (error) return dbProblem(error);
  revalidatePath(p.departure(scheduleId, departureId));
  revalidateCatalogue();
  return saved("Rate removed.");
}

export async function deletePartnerRate(
  orgId: string | null,
  vesselId: string,
  scheduleId: string,
  departureId: string,
  rateId: string,
  _prev: ActionState,
  _fd: FormData,
): Promise<ActionState> {
  const p = productPaths(orgId, vesselId);
  await requireProductEditor(vesselId, p.departure(scheduleId, departureId), { orgId: orgId ?? undefined });
  const db = await getDb();
  const { error } = await db.from("partner_rates").delete().eq("id", rateId).eq("departure_id", departureId);
  if (error) return dbProblem(error);
  revalidatePath(p.departure(scheduleId, departureId));
  revalidateCatalogue();
  return saved("Company rate removed.");
}

// ── Promotions (DASH-ADM-074–085, DASH-OPR-012) ────────────────────────────────────────────────────────
const promoInput = z.object({
  kind: z.enum(["percent", "fixed", "extra", "upgrade"], { message: "choose a type" }),
  percent: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : Number(v))),
  fixed: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .pipe(money.nullable()),
  fixed_currency: z.enum(["", "USD", "EUR", "EGP"]).transform((v) => (v === "" ? null : v)),
  upgrade_to: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v)),
  booking_from: z.union([z.literal(""), isoDate]).transform((v) => v || null),
  booking_to: z.union([z.literal(""), isoDate]).transform((v) => v || null),
  departure_from: z.union([z.literal(""), isoDate]).transform((v) => v || null),
  departure_to: z.union([z.literal(""), isoDate]).transform((v) => v || null),
  benefit_en: z.string().trim().min(1, "describe the benefit").max(300),
  terms_en: optText(4000),
  benefit_es: optText(300),
  terms_es: optText(4000),
  benefit_ja: optText(300),
  terms_ja: optText(4000),
  cabin_types: z.array(z.uuid()).min(1, "choose at least one cabin type"),
  rate_plans: z
    .array(z.enum(["international", "egyptian_citizen", "foreign_resident", "trade"]))
    .min(1, "choose at least one plan"),
});

export async function savePromotion(
  orgId: string | null,
  vesselId: string,
  promoId: string | null,
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const p = productPaths(orgId, vesselId);
  await requireProductEditor(vesselId, p.promotions, { orgId: orgId ?? undefined, promotions: true });
  const input = promoInput.safeParse(formObject(fd, ["cabin_types", "rate_plans"]));
  if (!input.success) {
    return problemsFrom(input.error, {
      kind: "Type",
      benefit_en: "Benefit (English)",
      cabin_types: "Cabin types",
      rate_plans: "Rate plans",
      fixed: "Amount",
    });
  }
  const d = input.data;
  if (d.kind === "percent" && !(d.percent !== null && d.percent > 0 && d.percent < 100))
    return failed("A percentage is between 0 and 100.");
  if (d.kind === "fixed" && (d.fixed === null || !d.fixed_currency))
    return failed("A fixed discount needs an amount and a currency.");
  if (d.kind === "upgrade" && !d.upgrade_to) return failed("Choose the cabin type guests are upgraded to.");
  const db = await getDb();
  const row = {
    vessel_id: vesselId,
    kind: d.kind,
    percent: d.kind === "percent" ? d.percent : null,
    fixed_amount_minor: d.kind === "fixed" ? d.fixed : null,
    fixed_currency: d.kind === "fixed" ? d.fixed_currency : null,
    upgrade_to_cabin_type_id: d.kind === "upgrade" ? d.upgrade_to : null,
    booking_from: d.booking_from,
    booking_to: d.booking_to,
    departure_from: d.departure_from,
    departure_to: d.departure_to,
  };
  const res = promoId
    ? await db.from("promotions").update(row).eq("id", promoId).eq("vessel_id", vesselId).select("id").single()
    : await db.from("promotions").insert(row).select("id").single();
  if (res.error) return dbProblem(res.error);
  const id = res.data.id;
  const t = await db.from("promotion_translations").upsert(
    (["en", "es", "ja"] as const)
      .map((l) => ({
        promotion_id: id,
        locale: l,
        benefit: (l === "en" ? d.benefit_en : d[`benefit_${l}`]) ?? "",
        terms: d[`terms_${l}`],
      }))
      .filter((r) => r.benefit),
    { onConflict: "promotion_id,locale" },
  );
  if (t.error) return dbProblem(t.error);

  // DASH-ADM-081: the selected rates are resolved from cabin types, plans and departure dates.
  let rq = db
    .from("rates")
    .select("id, departure:departures!inner(departs_on)")
    .eq("vessel_id", vesselId)
    .in("cabin_type_id", d.cabin_types)
    .in("rate_plan", d.rate_plans);
  if (d.kind === "fixed" && d.fixed_currency) rq = rq.eq("currency", d.fixed_currency);
  if (d.departure_from) rq = rq.gte("departure.departs_on", d.departure_from);
  if (d.departure_to) rq = rq.lte("departure.departs_on", d.departure_to);
  const { data: rates } = await rq;
  await db.from("promotion_rates").delete().eq("promotion_id", id);
  let linked = 0;
  let skipped = 0;
  for (const r of rates ?? []) {
    const ins = await db.from("promotion_rates").insert({ promotion_id: id, rate_id: r.id });
    if (ins.error) skipped++;
    else linked++;
  }
  revalidatePath(p.promotions);
  revalidateCatalogue();
  if (!promoId) redirect(`${p.promotion(id)}?linked=${linked}&skipped=${skipped}`);
  return saved(
    `Saved. Applies to ${linked} rate${linked === 1 ? "" : "s"}${skipped ? `; ${skipped} skipped (already in another promotion, or no upgraded inventory)` : ""}.`,
  );
}

export async function setPromotionPaused(
  orgId: string | null,
  vesselId: string,
  promoId: string,
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const p = productPaths(orgId, vesselId);
  await requireProductEditor(vesselId, p.promotions, { orgId: orgId ?? undefined, promotions: true });
  const paused = fd.get("paused") === "yes";
  const db = await getDb();
  const { error } = await db.from("promotions").update({ paused }).eq("id", promoId).eq("vessel_id", vesselId);
  if (error) return dbProblem(error);
  revalidatePath(p.promotion(promoId));
  revalidateCatalogue();
  return saved(paused ? "Paused." : "Resumed.");
}

// ── Admin settings: child bands per operator (DATA-022), freshness (ADR-079) ────────────────────────────
const bandsInput = z.array(z.object({ from: z.number(), to: z.number().nullable(), percent: z.number() }));

function bandsFrom(fd: FormData): Band[] | null {
  const rows: Band[] = [];
  for (let i = 0; i < 6; i++) {
    const from = String(fd.get(`from_${i}`) ?? "").trim();
    const pct = String(fd.get(`percent_${i}`) ?? "").trim();
    if (from === "" && pct === "") continue;
    const to = String(fd.get(`to_${i}`) ?? "").trim();
    rows.push({ from: Number(from), to: to === "" ? null : Number(to), percent: Number(pct) });
  }
  const parsed = bandsInput.safeParse(rows);
  return parsed.success && validBands(parsed.data) ? parsed.data : null;
}

export async function saveOperatorBands(orgId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin(["catalogue"], `/dashboard/admin/operators/${orgId}/`);
  const db = await getDb();
  if (fd.get("reset") === "yes") {
    const { error } = await db.from("organisations").update({ child_bands: null }).eq("id", orgId);
    if (error) return dbProblem(error);
    revalidatePath(`/dashboard/admin/operators/${orgId}/`);
    revalidateCatalogue();
    return saved("This operator now uses the default bands for new rates.");
  }
  const bands = bandsFrom(fd);
  if (!bands)
    return failed("The bands must start at age 0, follow on without gaps, end open (no upper age), with shares from 0 to 100.");
  const { error } = await db.from("organisations").update({ child_bands: bands }).eq("id", orgId);
  if (error) return dbProblem(error);
  revalidatePath(`/dashboard/admin/operators/${orgId}/`);
  revalidateCatalogue();
  return saved("Saved. The new bands apply to rates created from now on; existing rates keep theirs.");
}

export async function saveFreshness(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin(["super"], "/dashboard/admin/settings/");
  const r = z
    .object({ manual: z.coerce.number().int().min(1).max(168), feed: z.coerce.number().int().min(1).max(48) })
    .safeParse({ manual: fd.get("manual"), feed: fd.get("feed") });
  if (!r.success) return failed("Manual: 1 to 168 hours; feeds and API: 1 to 48 hours.");
  const db = await getDb();
  const { error } = await db
    .from("platform_settings")
    .update({ value: { manual: r.data.manual, paste: r.data.manual, feed: r.data.feed, api: r.data.feed } })
    .eq("key", "freshness_hours");
  if (error) return dbProblem(error);
  revalidatePath("/dashboard/admin/settings/");
  revalidateCatalogue();
  return saved("Freshness thresholds saved.");
}

// ── Cancellation policy (ADR-088, DASH-BND-001): the vessel's default; calculation in 4f ─────────────────────
export async function savePolicy(orgId: string | null, vesselId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const p = productPaths(orgId, vesselId);
  await requireProductEditor(vesselId, p.cabins, { orgId: orgId ?? undefined });
  const f = formObject(fd);
  const bands: CancellationBand[] = [];
  for (let i = 0; i < 6; i++) {
    const d = String(f[`from_days_${i}`] ?? "").trim();
    const pc = String(f[`percent_${i}`] ?? "").trim();
    if (!d && !pc) continue;
    if (!/^\d{1,3}$/.test(d) || !/^\d{1,3}$/.test(pc))
      return failed(`Band ${i + 1}: give whole numbers for the days and the percentage.`);
    bands.push({ from_days: Number(d), percent: Number(pc) });
  }
  if (!bands.length) return failed("Add at least one band, including one from 0 days.");
  const problem = bandsProblem(bands);
  if (problem) return failed(problem);
  const terms = (["en", "es", "ja"] as const).map((locale) => ({ locale, terms: String(f[`terms_${locale}`] ?? "").trim() }));
  if (!terms[0]!.terms) return failed("Write the policy in English; Spanish and Japanese fall back to it.");
  if (terms.some((t) => t.terms.length > 4000)) return failed("Each wording has at most 4,000 characters.");
  const db = await getDb();
  const { data: existing } = await db
    .from("cancellation_policies")
    .select("id")
    .eq("vessel_id", vesselId)
    .is("schedule_id", null)
    .maybeSingle();
  const res = existing
    ? await db
        .from("cancellation_policies")
        .update({ bands: bands.sort((a, b) => b.from_days - a.from_days) })
        .eq("id", existing.id)
        .select("id")
        .single()
    : await db
        .from("cancellation_policies")
        .insert({ vessel_id: vesselId, bands: bands.sort((a, b) => b.from_days - a.from_days) })
        .select("id")
        .single();
  if (res.error) return dbProblem(res.error);
  for (const t of terms) {
    const r = t.terms
      ? await db
          .from("cancellation_policy_translations")
          .upsert({ policy_id: res.data.id, locale: t.locale, terms: t.terms }, { onConflict: "policy_id,locale" })
      : await db.from("cancellation_policy_translations").delete().eq("policy_id", res.data.id).eq("locale", t.locale);
    if (r.error) return dbProblem(r.error);
  }
  revalidatePath(p.cabins);
  revalidateCatalogue();
  return saved(
    "Cancellation policy saved. Travellers read and accept it before reserving; the charges are calculated with payments.",
  );
}

const sightseeingInput = z.object({
  guide: z.array(z.string()),
  tickets_included: z.array(z.string()),
  sites: z
    .string()
    .trim()
    .transform((v) =>
      v
        .split(/[\n,]/)
        .map((x) => x.trim())
        .filter(Boolean),
    )
    .refine((v) => v.length >= 1 && v.length <= 40, "list 1 to 40 sites, one per line")
    .refine((v) => v.every((x) => x.length <= 120), "keep each site under 120 characters"),
  note: z.string().trim().max(1000),
});

/** ADR-102: what an approved vessel's itinerary includes with sightseeing: guide, entrance fees, the sites. */
export async function saveScheduleSightseeing(
  orgId: string | null,
  vesselId: string,
  scheduleId: string,
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const p = productPaths(orgId, vesselId);
  const { vessel } = await requireProductEditor(vesselId, p.schedule(scheduleId), { orgId: orgId ?? undefined });
  if (!vessel.sightseeing_approved_at) return failed("Nilecruz sells sightseeing for this vessel.");
  const input = sightseeingInput.safeParse(formObject(fd, ["guide", "tickets_included"]));
  if (!input.success) return problemsFrom(input.error, { sites: "Sites visited", note: "Note" });
  const d = input.data;
  const db = await getDb();
  const { error } = await db.from("schedule_sightseeing").upsert(
    {
      schedule_id: scheduleId,
      vessel_id: vesselId,
      guide: d.guide.includes("yes"),
      tickets_included: d.tickets_included.includes("yes"),
      sites: d.sites,
      note: d.note || null,
    },
    { onConflict: "schedule_id" },
  );
  if (error) return dbProblem(error);
  revalidatePath(p.schedule(scheduleId));
  revalidateCatalogue();
  return saved("Saved what the sightseeing includes.");
}

export async function deleteSightseeingRate(
  orgId: string | null,
  vesselId: string,
  scheduleId: string,
  departureId: string,
  rateId: string,
  _prev: ActionState,
  _fd: FormData,
): Promise<ActionState> {
  const p = productPaths(orgId, vesselId);
  await requireProductEditor(vesselId, p.departure(scheduleId, departureId), { orgId: orgId ?? undefined });
  const db = await getDb();
  const { error } = await db.from("sightseeing_rates").delete().eq("id", rateId).eq("departure_id", departureId);
  if (error) return dbProblem(error);
  revalidatePath(p.departure(scheduleId, departureId));
  revalidateCatalogue();
  return saved("Rate with sightseeing removed.");
}
