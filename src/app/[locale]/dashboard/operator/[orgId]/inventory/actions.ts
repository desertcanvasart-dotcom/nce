"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionState } from "@/components/dashboard/ActionForm";
import { FormatError, LIMITS, parseInventory } from "@/lib/connections/format";
import { addressProblem } from "@/lib/connections/safe-fetch";
import { generateApiKeyPair } from "@/lib/connections/signature";
import { requireOrgRole } from "@/server/auth";
import { failed, saved } from "@/server/catalogue/form";
import { connectionProblem } from "@/server/connections/form";
import { fetchPolicy } from "@/server/connections/policy";
import { getDb } from "@/server/db";

/**
 * Inventory connections (DASH-OPR-016, 024–026). Owners only, as in the dashboard menu; the database checks the
 * same rights again in every function it runs.
 */
const page = (orgId: string) => `/dashboard/operator/${orgId}/inventory/`;

// ── Paste (DASH-OPR-024) ──────────────────────────────────────────────────────────────────────────────────
export async function previewPaste(orgId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireOrgRole(orgId, ["owner"], { kind: "operator", returnTo: page(orgId) });
  const file = fd.get("file");
  let raw = String(fd.get("data") ?? "");
  let label = "Pasted data";
  if (file instanceof File && file.size > 0) {
    if (file.size > LIMITS.pasteBytes) return failed("The file is larger than 2 MB. Send the data in smaller parts.");
    raw = new TextDecoder("utf-8").decode(await file.arrayBuffer());
    label = file.name.slice(0, 200);
  }
  if (!raw.trim()) return failed("Paste the JSON or XML, or choose a file.");
  let rows;
  try {
    rows = parseInventory(raw, { maxBytes: LIMITS.pasteBytes });
  } catch (e) {
    if (e instanceof FormatError) return failed(`Nothing was checked: ${e.message}`);
    throw e;
  }
  const db = await getDb();
  const { data, error } = await db.rpc("preview_inventory_paste", { target_org: orgId, input: rows, label });
  if (error) return connectionProblem(error);
  redirect(`${page(orgId)}?run=${data}#paste`);
}

export async function applyPaste(orgId: string, runId: string, _prev: ActionState, _fd: FormData): Promise<ActionState> {
  await requireOrgRole(orgId, ["owner"], { kind: "operator", returnTo: page(orgId) });
  const db = await getDb();
  const { error } = await db.rpc("apply_inventory_paste", { run: runId });
  if (error) return connectionProblem(error);
  revalidatePath(page(orgId));
  redirect(`${page(orgId)}?run=${runId}#paste`);
}

export async function discardPaste(orgId: string, runId: string, _prev: ActionState, _fd: FormData): Promise<ActionState> {
  await requireOrgRole(orgId, ["owner"], { kind: "operator", returnTo: page(orgId) });
  const db = await getDb();
  const { error } = await db.rpc("discard_inventory_paste", { run: runId });
  if (error) return connectionProblem(error);
  redirect(`${page(orgId)}#paste`);
}

// ── Feed (DASH-OPR-025, SEC-007) ──────────────────────────────────────────────────────────────────────────
export async function saveFeed(orgId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireOrgRole(orgId, ["owner"], { kind: "operator", returnTo: page(orgId) });
  const url = String(fd.get("url") ?? "").trim();
  if (!url) return failed("Enter the feed’s address.");
  if (url.length > 2000) return failed("That address is longer than 2,000 characters.");
  // Checked now, and again on every pull: a name can be pointed somewhere else after it was saved.
  const problem = await addressProblem(url, fetchPolicy());
  if (problem) return failed(problem);
  const db = await getDb();
  const { error } = await db.rpc("save_inventory_feed", { target_org: orgId, feed_url: url });
  if (error) return connectionProblem(error);
  revalidatePath(page(orgId));
  return saved("Feed address saved. Nilecruz reviews it before the first pull; until then nothing is fetched.");
}

export async function removeFeed(orgId: string, _prev: ActionState, _fd: FormData): Promise<ActionState> {
  await requireOrgRole(orgId, ["owner"], { kind: "operator", returnTo: page(orgId) });
  const db = await getDb();
  const { error } = await db.rpc("remove_inventory_feed", { target_org: orgId });
  if (error) return connectionProblem(error);
  revalidatePath(page(orgId));
  return saved("Feed removed. Availability already received stays until it is changed.");
}

// ── API keys (DASH-OPR-026, SEC-008) ──────────────────────────────────────────────────────────────────────
const keyLabel = z
  .string()
  .trim()
  .min(1, "Give the key a name, such as the system that will use it.")
  .max(80, "At most 80 characters.");

export async function createKey(orgId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireOrgRole(orgId, ["owner"], { kind: "operator", returnTo: page(orgId) });
  const label = keyLabel.safeParse(String(fd.get("label") ?? ""));
  if (!label.success) return failed(label.error.issues[0]!.message);
  // The private key exists only in this response: Nilecruz stores the public key and never sees it again.
  const pair = generateApiKeyPair();
  const db = await getDb();
  const { data, error } = await db.rpc("create_api_key", {
    target_org: orgId,
    key_label: label.data,
    key_public: pair.publicKey,
  });
  if (error) return connectionProblem(error);
  revalidatePath(page(orgId));
  return {
    ok: true,
    message: `Key ${data[0]!.key_id} created. Copy the private key below into your system now: it is shown only once, and Nilecruz doesn’t keep a copy.`,
    secret: { label: `Private key for ${data[0]!.key_id}`, value: pair.privateKeyPem },
  };
}

export async function revokeKey(orgId: string, keyId: string, _prev: ActionState, _fd: FormData): Promise<ActionState> {
  await requireOrgRole(orgId, ["owner"], { kind: "operator", returnTo: page(orgId) });
  const db = await getDb();
  const { error } = await db.rpc("revoke_api_key", { target: keyId });
  if (error) return connectionProblem(error);
  revalidatePath(page(orgId));
  return saved("Key revoked. Requests signed with it are refused from now on.");
}
