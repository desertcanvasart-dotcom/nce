"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionState } from "@/components/dashboard/ActionForm";
import { passengersProblem, requestProblems, type Passenger } from "@/lib/bookings/bookings";
import { priceToMinor } from "@/lib/connections/format";
import { ageOn } from "@/lib/product/pricing";
import { cairoDate } from "@/lib/tours/tours";
import { requireUser } from "@/server/auth";
import { failed, formObject, problemsFrom, saved } from "@/server/catalogue/form";
import { connectionProblem } from "@/server/connections/form";
import { getDb } from "@/server/db";

/** My journey: cruise requests, accepting offers, eligibility proof (DASH-CUS-004–007, 014, 015, ADR-088). */
const REQUESTS = "/dashboard/journey/requests/";

const requestInput = z.object({
  route: z.string(),
  earliest_departure: z.iso.date({ message: "choose a date" }),
  latest_departure: z.iso.date({ message: "choose a date" }),
  latest_finish: z
    .string()
    .transform((v) => (v === "" ? null : v))
    .pipe(z.iso.date({ message: "a date" }).nullable()),
  nights_min: z.coerce.number().int("a whole number").min(1).max(21),
  nights_max: z.coerce.number().int("a whole number").min(1).max(21),
  adults: z.coerce.number().int("a whole number").min(1, "at least one adult").max(30),
  child_ages: z.string().trim().max(80),
  cabins: z.coerce.number().int("a whole number").min(1).max(30),
  cabin_notes: z.string().trim().max(500),
  budget: z.string().trim(),
  budget_currency: z.enum(["USD", "EUR", "EGP"]),
  notes: z.string().trim().max(2000),
});

export async function createRequest(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser(REQUESTS);
  const input = requestInput.safeParse(formObject(fd));
  if (!input.success) {
    return problemsFrom(input.error, {
      earliest_departure: "Earliest departure",
      latest_departure: "Latest departure",
      latest_finish: "Back by",
      nights_min: "Shortest stay",
      nights_max: "Longest stay",
      adults: "Adults",
      cabins: "Cabins",
      child_ages: "Children's ages",
    });
  }
  const d = input.data;
  const ages = d.child_ages ? d.child_ages.split(/[\s,]+/).filter(Boolean) : [];
  if (ages.some((a) => !/^\d{1,2}$/.test(a))) return failed("Give each child's age as a whole number, separated by commas, for example “7, 4”.");
  const child_ages = ages.map(Number);
  const problems = requestProblems({ ...d, child_ages }, cairoDate(new Date()));
  if (problems.length) return { ok: false, message: "The request can't be sent yet:", problems };
  let budget_minor: number | null = null;
  if (d.budget) {
    budget_minor = priceToMinor(d.budget.replace(/,/g, ""));
    if (budget_minor === null) return failed("Give the budget as an amount, for example 4000.");
  }
  const [origin, destination] = d.route ? d.route.split("→") : [null, null];
  const db = await getDb();
  const { data, error } = await db
    .from("cruise_requests")
    .insert({
      origin: origin || null,
      destination: destination || null,
      earliest_departure: d.earliest_departure,
      latest_departure: d.latest_departure,
      latest_finish: d.latest_finish,
      nights_min: d.nights_min,
      nights_max: d.nights_max,
      adults: d.adults,
      child_ages,
      cabins: d.cabins,
      cabin_notes: d.cabin_notes || null,
      budget_minor,
      budget_currency: budget_minor === null ? null : d.budget_currency,
      notes: d.notes || null,
    })
    .select("id")
    .single();
  if (error) return connectionProblem(error);
  redirect(`${REQUESTS}${data.id}/`);
}

export async function closeRequest(id: string, _prev: ActionState, _fd: FormData): Promise<ActionState> {
  await requireUser(`${REQUESTS}${id}/`);
  const db = await getDb();
  const { error } = await db.from("cruise_requests").update({ status: "closed" }).eq("id", id).eq("status", "open");
  if (error) return connectionProblem(error);
  revalidatePath(`${REQUESTS}${id}/`);
  return saved("Request closed. Operators can no longer send offers for it.");
}

/** DASH-CUS-007, DASH-OPR-021: one database transaction re-checks everything and takes the cabins. */
export async function acceptOffer(
  requestId: string,
  offerId: string,
  departsOn: string,
  offered: { adults: number; childAges: number[] },
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  await requireUser(`${REQUESTS}${requestId}/accept/${offerId}/`);
  const f = formObject(fd, ["terms"]);
  const total = offered.adults + offered.childAges.length;
  const guests: Passenger[] = Array.from({ length: total }, (_, i) => ({
    full_name: String(f[`name_${i}`] ?? "").trim(),
    date_of_birth: String(f[`dob_${i}`] ?? ""),
    ...(i === 0 ? { nationality: String(f.nationality ?? "").trim().toUpperCase() } : {}),
  }));
  if (!(f.terms as string[]).includes("yes")) return failed("Tick that you have read the terms and the cancellation policy.");
  const problem = passengersProblem(guests, departsOn, offered, ageOn);
  if (problem) return failed(problem);
  const db = await getDb();
  const { data: reference, error } = await db.rpc("accept_offer", { target: offerId, guests, terms_read: true });
  if (error) return connectionProblem(error);
  const { data: res } = await db.from("reservations").select("id").eq("reference", reference as string).single();
  redirect(`/dashboard/journey/reservations/${res!.id}/`);
}

const PROOF_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "application/pdf": "pdf" };

/** ADR-078, ADR-088: proof of Egyptian citizenship or residence, readable only by the customer, the operator and admins. */
export async function uploadProof(reservationId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser(`/dashboard/journey/reservations/${reservationId}/`);
  const file = fd.get("proof");
  if (!(file instanceof File) || file.size === 0) return failed("Choose a file.");
  const ext = PROOF_TYPES[file.type];
  if (!ext) return failed("Use a PDF, JPEG or PNG file.");
  if (file.size > 10 * 1024 * 1024) return failed("The file is larger than 10 MB.");
  const db = await getDb();
  const path = `reservations/${reservationId}/${randomUUID()}.${ext}`;
  const up = await db.storage.from("eligibility").upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false });
  if (up.error) return failed("The file could not be stored. Try again.");
  const { error } = await db.from("eligibility_proofs").insert({ reservation_id: reservationId, storage_path: path });
  if (error) {
    await db.storage.from("eligibility").remove([path]);
    return connectionProblem(error);
  }
  revalidatePath(`/dashboard/journey/reservations/${reservationId}/`);
  return saved("Proof uploaded. The operator checks it before payment is due.");
}

export async function markNoticesRead(_prev: ActionState, _fd: FormData): Promise<ActionState> {
  const session = await requireUser("/dashboard/journey/");
  const db = await getDb();
  await db.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", session.userId).is("read_at", null);
  revalidatePath("/dashboard/journey/");
  return saved("Marked as read.");
}
