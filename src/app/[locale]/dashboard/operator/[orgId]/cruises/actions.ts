"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionState } from "@/components/dashboard/ActionForm";
import { PROPOSAL_FIELDS, type Proposal } from "@/lib/catalogue/proposal";
import { requireOrgRole } from "@/server/auth";
import { dbProblem, failed, problemsFrom, saved } from "@/server/catalogue/form";
import { getDb } from "@/server/db";

/** DASH-OPR-006, 007 / DASH-ADM-035: operators prepare vessel information and submit it for review. */
const EDITORS = ["owner", "reservations"] as const;
const list = (orgId: string) => `/dashboard/operator/${orgId}/cruises/`;
const one = (orgId: string, id: string) => `${list(orgId)}${id}/`;

const intOrEmpty = (min: number, max: number) =>
  z
    .string()
    .trim()
    .refine((v) => v === "" || (/^\d+$/.test(v) && Number(v) >= min && Number(v) <= max), `a whole number from ${min} to ${max}`);

const proposalInput = z.object({
  name: z.string().trim().min(1, "required").max(120, "at most 120 characters"),
  type: z.enum(["sail", "motor", "steam"], { message: "choose a type" }),
  route_text: z.string().trim().max(200, "at most 200 characters"),
  cabin_count: intOrEmpty(1, 400),
  max_guests: intOrEmpty(1, 800),
  deck_count: intOrEmpty(1, 10),
  year_built: intOrEmpty(1850, 2100),
  description_en: z.string().trim().max(4000, "at most 4,000 characters"),
});
const LABELS = Object.fromEntries(PROPOSAL_FIELDS.map((f) => [f.key, f.label]));

export async function startSubmission(
  orgId: string,
  vesselId: string | null,
  _prev: ActionState,
  _fd: FormData,
): Promise<ActionState> {
  await requireOrgRole(orgId, [...EDITORS], { kind: "operator", returnTo: list(orgId) });
  const db = await getDb();
  let proposal: Proposal = {};
  if (vesselId) {
    const { data: v } = await db
      .from("vessels")
      .select(
        "name, type, route_text, cabin_count, max_guests, deck_count, year_built, operator_org_id, vessel_translations(locale, description)",
      )
      .eq("id", vesselId)
      .maybeSingle();
    if (!v || v.operator_org_id !== orgId) return failed("That vessel isn't connected to your company.");
    proposal = {
      name: v.name,
      type: v.type,
      route_text: v.route_text ?? "",
      cabin_count: v.cabin_count?.toString() ?? "",
      max_guests: v.max_guests?.toString() ?? "",
      deck_count: v.deck_count?.toString() ?? "",
      year_built: v.year_built?.toString() ?? "",
      description_en: v.vessel_translations.find((t) => t.locale === "en")?.description ?? "",
    };
  }
  const { data, error } = await db
    .from("vessel_submissions")
    .insert({ org_id: orgId, vessel_id: vesselId, proposal })
    .select("id")
    .single();
  if (error?.code === "23505") return failed("This vessel already has an open submission. Continue that one.");
  if (error) return dbProblem(error);
  redirect(one(orgId, data.id));
}

export async function saveProposal(orgId: string, id: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireOrgRole(orgId, [...EDITORS], { kind: "operator", returnTo: one(orgId, id) });
  const input = proposalInput.safeParse(Object.fromEntries(PROPOSAL_FIELDS.map((f) => [f.key, String(fd.get(f.key) ?? "")])));
  if (!input.success) return problemsFrom(input.error, LABELS);
  const db = await getDb();
  const { data, error } = await db
    .from("vessel_submissions")
    .update({ proposal: input.data })
    .eq("id", id)
    .eq("org_id", orgId)
    .select("id");
  if (error) return dbProblem(error);
  if (!data?.length) return failed("This submission can't be edited now (it is under review or decided).");
  revalidatePath(one(orgId, id));
  return saved("Draft saved. Nilecruz sees it only when you submit it.");
}

export async function submitForReview(orgId: string, id: string, _prev: ActionState, _fd: FormData): Promise<ActionState> {
  await requireOrgRole(orgId, [...EDITORS], { kind: "operator", returnTo: one(orgId, id) });
  const db = await getDb();
  const { data: s } = await db.from("vessel_submissions").select("proposal").eq("id", id).eq("org_id", orgId).maybeSingle();
  const check = proposalInput.safeParse(s?.proposal ?? {});
  if (!check.success)
    return { ...problemsFrom(check.error, LABELS), message: "Save a complete draft first. Missing or invalid:" };
  const { error } = await db.rpc("submit_submission", { target: id });
  if (error) return dbProblem(error);
  revalidatePath(one(orgId, id));
  return saved("Submitted. It is locked while Nilecruz reviews it.");
}

export async function deleteDraft(orgId: string, id: string, _prev: ActionState, _fd: FormData): Promise<ActionState> {
  await requireOrgRole(orgId, [...EDITORS], { kind: "operator", returnTo: one(orgId, id) });
  const db = await getDb();
  const { data, error } = await db.from("vessel_submissions").delete().eq("id", id).eq("org_id", orgId).select("id");
  if (error) return dbProblem(error);
  if (!data?.length) return failed("Only drafts that were never submitted can be deleted.");
  redirect(list(orgId));
}
