"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionState } from "@/components/dashboard/ActionForm";
import { requireAdmin } from "@/server/auth";
import { dbProblem, failed, formObject, problemsFrom, saved } from "@/server/catalogue/form";
import { connectionProblem } from "@/server/connections/form";
import { pullFeed } from "@/server/connections/pull";
import { getDb } from "@/server/db";

/** DASH-ADM-042–044: review applications, approve or pause access, connect vessels. */
const statusInput = z
  .object({
    status: z.enum(["approved", "rejected", "paused"], { message: "choose a decision" }),
    reason: z.string().trim().max(500, "at most 500 characters"),
  })
  .refine((v) => v.status === "approved" || v.reason.length >= 5, {
    message: "explain the decision in a few words",
    path: ["reason"],
  });

const page = (orgId: string) => `/dashboard/admin/operators/${orgId}/`;

export async function setOperatorStatus(orgId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin(["catalogue"], page(orgId));
  const input = statusInput.safeParse(formObject(fd));
  if (!input.success) return problemsFrom(input.error, { status: "Decision", reason: "Reason" });
  const db = await getDb();
  const { error } = await db
    .from("organisations")
    .update({ status: input.data.status, status_reason: input.data.reason || null })
    .eq("id", orgId)
    .eq("kind", "operator");
  if (error) return dbProblem(error);
  revalidatePath(page(orgId));
  const words = {
    approved: "Approved: the operator can now work in its workspace.",
    rejected: "Rejected.",
    paused: "Paused: the operator sees a paused notice.",
  };
  return saved(words[input.data.status]);
}

export async function connectVessel(orgId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin(["catalogue"], page(orgId));
  const vesselId = String(fd.get("vessel_id") ?? "");
  if (!/^[0-9a-f-]{36}$/.test(vesselId)) return failed("Choose a vessel.");
  const db = await getDb();
  const { data: org } = await db.from("organisations").select("status").eq("id", orgId).maybeSingle();
  if (org?.status !== "approved") return failed("Approve the operator before connecting vessels.");
  const { error } = await db.from("vessels").update({ operator_org_id: orgId }).eq("id", vesselId);
  if (error) return dbProblem(error);
  revalidatePath(page(orgId));
  return saved("Vessel connected.");
}

export async function disconnectVessel(orgId: string, vesselId: string, _prev: ActionState, _fd: FormData): Promise<ActionState> {
  await requireAdmin(["catalogue"], page(orgId));
  const db = await getDb();
  const { error } = await db.from("vessels").update({ operator_org_id: null }).eq("id", vesselId).eq("operator_org_id", orgId);
  if (error) return dbProblem(error);
  revalidatePath(page(orgId));
  return saved("Vessel disconnected. It keeps its details and stays in the catalogue.");
}

// ── Inventory connections (DASH-ADM-045–047) ───────────────────────────────────────────────────────────────
const feedDecision = z
  .object({
    decision: z.enum(["active", "paused", "rejected"], { message: "choose a decision" }),
    reason: z.string().trim().max(500, "at most 500 characters"),
  })
  .refine((v) => v.decision === "active" || v.reason.length >= 5, {
    message: "tell the operator why, in a few words",
    path: ["reason"],
  });

/** DASH-ADM-047: a feed is pulled only after a catalogue admin approves it; approval pulls it once straight away. */
export async function decideFeed(orgId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin(["catalogue"], page(orgId));
  const input = feedDecision.safeParse(formObject(fd));
  if (!input.success) return problemsFrom(input.error, { decision: "Decision", reason: "Reason" });
  const db = await getDb();
  const { error } = await db.rpc("decide_inventory_feed", {
    target_org: orgId,
    decision: input.data.decision,
    reason: input.data.reason || undefined,
  });
  if (error) return connectionProblem(error);
  revalidatePath(page(orgId));
  if (input.data.decision !== "active") {
    return saved(input.data.decision === "paused" ? "Feed paused: it is not pulled until approved again." : "Feed not approved.");
  }
  const { data: feed } = await db.from("inventory_feeds").select("id, org_id, url").eq("org_id", orgId).single();
  const r = feed ? await pullFeed(feed) : null;
  revalidatePath(page(orgId));
  if (!r) return saved("Feed approved. It will be pulled within five minutes.");
  return r.ok
    ? saved(
        `Feed approved and pulled: ${r.changed} row${r.changed === 1 ? "" : "s"} changed${r.failed ? `, ${r.failed} with problems` : ""}. It is pulled every hour from now on.`,
      )
    : { ok: false, message: `Feed approved, but the first pull failed: ${r.error} It will be tried again within the hour.` };
}

export async function revokeOperatorKey(orgId: string, keyId: string, _prev: ActionState, _fd: FormData): Promise<ActionState> {
  await requireAdmin(["catalogue"], page(orgId));
  const db = await getDb();
  const { error } = await db.rpc("revoke_api_key", { target: keyId });
  if (error) return connectionProblem(error);
  revalidatePath(page(orgId));
  return saved("Key revoked. Requests signed with it are refused from now on.");
}
