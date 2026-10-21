import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { CompanyStatus } from "@/components/dashboard/CompanyStatus";
import { WorkspaceLayout } from "@/components/dashboard/WorkspaceLayout";
import { navFor } from "@/lib/auth/dashboard-nav";
import { getSession, requireOrgRole } from "@/server/auth";
import { isUuid } from "../../sections";

/** ADR-097: the Luxor and Aswan offices' workspace. */
export default async function OfficeLayout({ children, params }: { children: ReactNode; params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  if (!isUuid(orgId)) notFound();
  if (!(await getSession())) return children; // the page redirects to sign-in with its own address
  const { company } = await requireOrgRole(orgId, "any", {
    kind: "office",
    allowPending: true,
    returnTo: `/dashboard/office/${orgId}/`,
  });
  if (company.status !== "approved") return <CompanyStatus name={company.orgName} status={company.status} />;
  return (
    <WorkspaceLayout title={`${company.orgName} · Tour office`} base={`/dashboard/office/${orgId}/`} items={navFor(company)}>
      {children}
    </WorkspaceLayout>
  );
}
