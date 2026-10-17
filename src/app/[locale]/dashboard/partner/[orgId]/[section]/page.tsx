import { notFound } from "next/navigation";
import { requireOrgRole } from "@/server/auth";
import { isUuid, Section } from "../../../sections";

export default async function PartnerSection({ params }: { params: Promise<{ orgId: string; section: string }> }) {
  const { orgId, section } = await params;
  if (!isUuid(orgId)) notFound();
  const { company } = await requireOrgRole(orgId, "any", {
    kind: "partner",
    allowPending: true,
    returnTo: `/dashboard/partner/${orgId}/${section}/`,
  });
  if (company.status !== "approved") return null;
  return <Section workspace={company} slug={section} />;
}
