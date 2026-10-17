import { notFound } from "next/navigation";
import { requireOrgRole } from "@/server/auth";
import { isUuid, Section } from "../../sections";

export default async function OperatorOverview({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  if (!isUuid(orgId)) notFound();
  const { company } = await requireOrgRole(orgId, "any", {
    kind: "operator",
    allowPending: true,
    returnTo: `/dashboard/operator/${orgId}/`,
  });
  if (company.status !== "approved") return null; // the layout shows the company's status instead
  return <Section workspace={company} slug="" />;
}
