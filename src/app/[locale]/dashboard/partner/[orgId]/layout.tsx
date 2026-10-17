import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { CompanyStatus } from "@/components/dashboard/CompanyStatus";
import { WorkspaceLayout } from "@/components/dashboard/WorkspaceLayout";
import { navFor } from "@/lib/auth/dashboard-nav";
import { getSession, requireOrgRole } from "@/server/auth";
import { isUuid } from "../../sections";

export default async function PartnerLayout({ children, params }: { children: ReactNode; params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  if (!isUuid(orgId)) notFound();
  if (!(await getSession())) return children; // the page redirects to sign-in with its own address
  const { company } = await requireOrgRole(orgId, "any", {
    kind: "partner",
    allowPending: true,
    returnTo: `/dashboard/partner/${orgId}/`,
  });
  if (company.status !== "approved") return <CompanyStatus name={company.orgName} status={company.status} />;
  return (
    <WorkspaceLayout title={`${company.orgName} · Travel partner`} base={`/dashboard/partner/${orgId}/`} items={navFor(company)}>
      {children}
    </WorkspaceLayout>
  );
}
