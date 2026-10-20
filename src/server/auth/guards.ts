import "server-only";
import { forbidden, redirect } from "next/navigation";
import type { AdminRole, TeamRole, Workspace } from "@/lib/auth/workspaces";
import { landingWorkspace, resolveWorkspaces, workspacePath } from "@/lib/auth/workspaces";
import { getSession, type Session } from "./session";

/**
 * SEC-002: every dashboard page, server action and route handler starts with one of these.
 * They decide on the server; the database's row-level security is the second wall.
 */

/** Signed in, or sent to sign-in and brought back afterwards. */
export async function requireUser(returnTo = "/dashboard/"): Promise<Session> {
  const session = await getSession();
  if (!session) redirect(`/account/sign-in/?next=${encodeURIComponent(returnTo)}`);
  return session;
}

/**
 * An admin in a two-step session (SEC-015). Without an authenticator they are sent to set one up;
 * with one but a password-only session, to the code screen. `roles` limits the admin sub-roles (DASH-ROLE-008).
 */
export async function requireAdmin(roles?: AdminRole[], returnTo = "/dashboard/admin/"): Promise<Session> {
  const session = await requireUser(returnTo);
  if (session.platformRole !== "admin") forbidden();
  if (session.aal !== "aal2") {
    const next = encodeURIComponent(returnTo);
    redirect(session.nextAal === "aal2" ? `/account/two-step/?next=${next}` : `/account/security/?setup=two-step&next=${next}`);
  }
  // Super admins can do everything (ADR-075); other sub-roles only what `roles` lists.
  if (roles && session.adminRole !== "super" && !(session.adminRole && roles.includes(session.adminRole))) forbidden();
  return session;
}

type Company = Extract<Workspace, { kind: "operator" | "partner" }>;

/**
 * A member of this company with one of `roles`. A company that is not approved is refused for actions
 * (`allowPending` lets the workspace page show its status instead; `allowPaused` lets a paused company keep reading its
 * own records, DASH-ADM-088).
 */
export async function requireOrgRole(
  orgId: string,
  roles: TeamRole[] | "any",
  {
    kind,
    allowPending = false,
    allowPaused = false,
    returnTo,
  }: { kind?: "operator" | "partner"; allowPending?: boolean; allowPaused?: boolean; returnTo?: string } = {},
): Promise<{ session: Session; company: Company }> {
  const session = await requireUser(returnTo ?? "/dashboard/");
  const company = resolveWorkspaces(session).find(
    (w): w is Company => (w.kind === "operator" || w.kind === "partner") && w.orgId === orgId,
  );
  if (!company || (kind && company.kind !== kind)) forbidden();
  if (roles !== "any" && !roles.includes(company.teamRole)) forbidden();
  if (!allowPending && company.status !== "approved" && !(allowPaused && company.status === "paused")) forbidden();
  return { session, company };
}

/**
 * Where someone goes after signing in when no page asked for them: straight to their workspace.
 * (A form action that redirects to /dashboard/, which redirects again, is not followed by the browser.)
 */
export async function landingPath(next: string): Promise<string> {
  if (next !== "/dashboard/") return next;
  const session = await getSession();
  return session ? workspacePath(landingWorkspace(session)) : next;
}

/** Marks a server action that is meant for people who are not signed in (sign-in, sign-up, reset). */
export function allowAnonymous(): void {}
