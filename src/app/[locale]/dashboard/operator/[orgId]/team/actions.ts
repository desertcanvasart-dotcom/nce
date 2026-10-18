"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionState } from "@/components/dashboard/ActionForm";
import { siteUrl } from "@/lib/env";
import { requireOrgRole } from "@/server/auth";
import { dbProblem, failed, problemsFrom, saved } from "@/server/catalogue/form";
import { getDb } from "@/server/db";
import { accountExists, sendAuthInvite } from "@/server/teams/people";

/** DASH-ROLE-007 / ADR-073: owners invite staff, change their roles and remove them. */
const page = (orgId: string) => `/dashboard/operator/${orgId}/team/`;
const role = z.enum(["reservations", "finance", "viewer"], { message: "choose a role" });

export async function inviteMember(orgId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireOrgRole(orgId, ["owner"], { kind: "operator", returnTo: page(orgId) });
  const input = z
    .object({
      email: z
        .string()
        .trim()
        .toLowerCase()
        .pipe(z.email({ message: "an email address like name@example.com" })),
      team_role: role,
    })
    .safeParse({ email: fd.get("email"), team_role: fd.get("team_role") });
  if (!input.success) return problemsFrom(input.error, { email: "Email", team_role: "Role" });
  const { email, team_role } = input.data;
  const db = await getDb();
  const { error } = await db.from("org_invitations").insert({ org_id: orgId, email, team_role });
  if (error?.code === "23505") return failed("There is already an open invitation for this address.");
  if (error) return dbProblem(error);
  revalidatePath(page(orgId));
  if (await accountExists(email)) {
    return saved(`Invitation saved. ${email} already has a Nilecruz account and will see it when they sign in.`);
  }
  const sent = await sendAuthInvite(email, `${siteUrl}/account/confirm/`);
  if (!sent.ok) {
    return sent.rateLimited
      ? saved(
          `Invitation saved, but the email limit was reached. Ask ${email} to create an account with this address; the invitation will be waiting.`,
        )
      : saved(
          `Invitation saved, but the email could not be sent. Ask ${email} to create an account with this address; the invitation will be waiting.`,
        );
  }
  return saved(`Invitation sent to ${email}.`);
}

export async function changeRole(orgId: string, userId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireOrgRole(orgId, ["owner"], { kind: "operator", returnTo: page(orgId) });
  const r = role.safeParse(fd.get("team_role"));
  if (!r.success) return failed("Choose a role.");
  const db = await getDb();
  const { data, error } = await db
    .from("memberships")
    .update({ team_role: r.data })
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .select("user_id");
  if (error) return dbProblem(error);
  if (!data?.length) return failed("You can't change this person's role (owners keep theirs).");
  revalidatePath(page(orgId));
  return saved("Role changed.");
}

export async function removeMember(orgId: string, userId: string, _prev: ActionState, _fd: FormData): Promise<ActionState> {
  await requireOrgRole(orgId, ["owner"], { kind: "operator", returnTo: page(orgId) });
  const db = await getDb();
  const { data, error } = await db.from("memberships").delete().eq("org_id", orgId).eq("user_id", userId).select("user_id");
  if (error) return dbProblem(error);
  if (!data?.length) return failed("You can't remove this person (owners stay).");
  revalidatePath(page(orgId));
  return saved("Removed from the team. Their own account still exists.");
}

export async function revokeInvitation(
  orgId: string,
  invitationId: string,
  _prev: ActionState,
  _fd: FormData,
): Promise<ActionState> {
  await requireOrgRole(orgId, ["owner"], { kind: "operator", returnTo: page(orgId) });
  const db = await getDb();
  const { error } = await db
    .from("org_invitations")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", invitationId)
    .eq("org_id", orgId);
  if (error) return dbProblem(error);
  revalidatePath(page(orgId));
  return saved("Invitation cancelled.");
}
