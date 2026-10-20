import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { CompanyStatus } from "@/components/dashboard/CompanyStatus";
import { WorkspaceLayout } from "@/components/dashboard/WorkspaceLayout";
import { Notice } from "@/components/dashboard/ui";
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
  // DASH-ADM-088: a paused agency keeps reading its bookings and payments, but can't search, reserve or request.
  if (company.status !== "approved" && company.status !== "paused")
    return <CompanyStatus name={company.orgName} status={company.status} />;
  const paused = company.status === "paused";
  const items = navFor(company).filter((i) => !paused || ["", "bookings", "payments"].includes(i.slug));
  return (
    <WorkspaceLayout title={`${company.orgName} · Travel partner`} base={`/dashboard/partner/${orgId}/`} items={items}>
      {paused ? (
        <Notice>
          Trade access for {company.orgName} is paused. You can see your bookings and payments, but searching, reserving and
          requests are off. Contact Nilecruz to find out why.
        </Notice>
      ) : null}
      {children}
    </WorkspaceLayout>
  );
}
