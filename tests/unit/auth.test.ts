import { describe, expect, it } from "vitest";
import { safeNextPath } from "@/lib/auth/next-path";
import { landingWorkspace, resolveWorkspaces, workspacePath, type Identity, type Membership } from "@/lib/auth/workspaces";

const m = (over: Partial<Membership>): Membership => ({
  orgId: "org-a",
  orgName: "Operator A",
  kind: "operator",
  status: "approved",
  teamRole: "owner",
  ...over,
});
const customer: Identity = { platformRole: "customer", adminRole: null, memberships: [] };

describe("workspaces (DASH-ROLE-001, 006)", () => {
  it("a customer has only their journey", () => {
    expect(resolveWorkspaces(customer)).toEqual([{ kind: "journey" }]);
    expect(workspacePath(landingWorkspace(customer))).toBe("/dashboard/journey/");
  });
  it("an admin lands in admin and keeps a journey", () => {
    const id: Identity = { platformRole: "admin", adminRole: "super", memberships: [] };
    expect(resolveWorkspaces(id).map((w) => w.kind)).toEqual(["admin", "journey"]);
    expect(workspacePath(landingWorkspace(id))).toBe("/dashboard/admin/");
  });
  it("operators come before partners, then the journey", () => {
    const id: Identity = {
      ...customer,
      memberships: [
        m({ orgId: "p1", orgName: "Partner", kind: "partner", teamRole: "finance" }),
        m({ orgId: "o2", orgName: "Zed Cruises" }),
        m({ orgId: "o1", orgName: "Alpha Cruises", teamRole: "viewer" }),
      ],
    };
    expect(resolveWorkspaces(id).map((w) => (w.kind === "journey" || w.kind === "admin" ? w.kind : w.orgId))).toEqual([
      "o1",
      "o2",
      "p1",
      "journey",
    ]);
    expect(workspacePath(landingWorkspace(id))).toBe("/dashboard/operator/o1/");
  });
  it("a company awaiting approval still lands on its own (status) page", () => {
    const id: Identity = { ...customer, memberships: [m({ orgId: "b", status: "applied" })] };
    expect(landingWorkspace(id)).toMatchObject({ kind: "operator", orgId: "b", status: "applied" });
  });
  it("Nilecruz's own organisation is not a company workspace", () => {
    const id: Identity = { ...customer, memberships: [m({ kind: "nilecruz" })] };
    expect(resolveWorkspaces(id)).toEqual([{ kind: "journey" }]);
  });
});

describe("safe return paths (no open redirects)", () => {
  it.each([
    ["/dashboard/admin/", "/dashboard/admin/"],
    ["/es/cruises/?guests=2", "/es/cruises/?guests=2"],
    ["%2Fdashboard%2Fjourney%2F", "/dashboard/journey/"],
  ])("keeps %s", (raw, want) => expect(safeNextPath(raw)).toBe(want));
  it.each([
    "https://evil.example/",
    "//evil.example/",
    "/\\evil.example",
    "%2F%2Fevil.example",
    "javascript:alert(1)",
    "/account/sign-in/",
    "/es/account/security/",
    "dashboard",
    "",
  ])("refuses %s", (raw) => expect(safeNextPath(raw)).toBe("/dashboard/"));
  it("refuses malformed encoding", () => expect(safeNextPath("%E0%A4%A")).toBe("/dashboard/"));
});
