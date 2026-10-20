/**
 * DASH-ROLE-001/006: which workspaces a signed-in person has, and where they land.
 * Pure logic, shared by the server guards and the dashboard navigation.
 */
export type OrgKind = "operator" | "partner" | "nilecruz" | "tour_office";
export type OrgStatus = "applied" | "approved" | "paused" | "rejected";
export type TeamRole = "owner" | "reservations" | "finance" | "viewer";
export type AdminRole = "super" | "catalogue" | "finance" | "content";

export type Membership = { orgId: string; orgName: string; kind: OrgKind; status: OrgStatus; teamRole: TeamRole };
export type Identity = { platformRole: "customer" | "admin"; adminRole: AdminRole | null; memberships: Membership[] };

export type Workspace =
  | { kind: "admin"; adminRole: AdminRole | null }
  | { kind: "operator" | "partner" | "office"; orgId: string; orgName: string; status: OrgStatus; teamRole: TeamRole }
  | { kind: "journey" };

export type WorkspaceKind = Workspace["kind"];

// A tour office (ADR-097) has the "office" workspace.
const COMPANY = { operator: "operator", partner: "partner", tour_office: "office" } as const;
const ORDER = ["operator", "partner", "office"];

/** Admin first, then companies (operators, partners, tour offices; each by name), then the personal journey. */
export function resolveWorkspaces(id: Identity): Workspace[] {
  const out: Workspace[] = [];
  if (id.platformRole === "admin") out.push({ kind: "admin", adminRole: id.adminRole });
  const companies = id.memberships
    .filter((m): m is Membership & { kind: keyof typeof COMPANY } => m.kind in COMPANY)
    .map((m) => ({ kind: COMPANY[m.kind], orgId: m.orgId, orgName: m.orgName, status: m.status, teamRole: m.teamRole }))
    .sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind) || a.orgName.localeCompare(b.orgName));
  out.push(...companies);
  out.push({ kind: "journey" });
  return out;
}

/** Where /dashboard/ sends someone: their first workspace. A company awaiting approval lands on its status page. */
export function landingWorkspace(id: Identity): Workspace {
  return resolveWorkspaces(id)[0]!;
}

export function workspacePath(w: Workspace): string {
  switch (w.kind) {
    case "admin":
      return "/dashboard/admin/";
    case "journey":
      return "/dashboard/journey/";
    default:
      return `/dashboard/${w.kind}/${w.orgId}/`;
  }
}

export const isActiveCompany = (w: Workspace) => w.kind === "admin" || w.kind === "journey" || w.status === "approved";
