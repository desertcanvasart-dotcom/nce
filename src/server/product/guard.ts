import "server-only";
import { forbidden, notFound } from "next/navigation";
import { requireAdmin, requireUser, type Session } from "@/server/auth";
import { getDb } from "@/server/db";

export type ProductVessel = {
  id: string;
  name: string;
  type: "sail" | "motor" | "steam";
  operator_org_id: string | null;
  gratuity_usd_minor: number | null;
};

/**
 * DASH-OPR-001 / SEC-002: who may build a vessel's product. Owners and reservations staff of its approved
 * operator (promotions: owners only, DASH-OPR-012), or catalogue admins in a two-step session.
 * `orgId` is the operator workspace the request came from; the vessel must belong to it.
 */
export async function requireProductEditor(
  vesselId: string,
  returnTo: string,
  { orgId, promotions = false }: { orgId?: string; promotions?: boolean } = {},
): Promise<{ session: Session; vessel: ProductVessel; asAdmin: boolean }> {
  const session = await requireUser(returnTo);
  if (!orgId && session.platformRole === "admin") {
    await requireAdmin(["catalogue"], returnTo);
  }
  const db = await getDb();
  const { data: vessel } = await db
    .from("vessels")
    .select("id, name, type, operator_org_id, gratuity_usd_minor")
    .eq("id", vesselId)
    .maybeSingle();
  if (!vessel) notFound();
  if (!orgId) {
    if (session.platformRole !== "admin") forbidden();
    return { session, vessel, asAdmin: true };
  }
  if (vessel.operator_org_id !== orgId) notFound();
  const roles = promotions ? ["owner"] : ["owner", "reservations"];
  const m = session.memberships.find((x) => x.orgId === orgId && x.kind === "operator");
  if (!m || m.status !== "approved" || !roles.includes(m.teamRole)) forbidden();
  return { session, vessel, asAdmin: false };
}
