import { notFound } from "next/navigation";
import { requireOrgRole } from "@/server/auth";
import { isUuid, Section } from "../../sections";

export default async function PartnerOverview({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  if (!isUuid(orgId)) notFound();
  const { company } = await requireOrgRole(orgId, "any", {
    kind: "partner",
    allowPending: true,
    returnTo: `/dashboard/partner/${orgId}/`,
  });
  if (company.status !== "approved") return null; // the layout shows the company's status instead
  return <Section workspace={company} slug="" />;
}
