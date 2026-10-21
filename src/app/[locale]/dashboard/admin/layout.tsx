import type { ReactNode } from "react";
import { WorkspaceLayout } from "@/components/dashboard/WorkspaceLayout";
import { navFor } from "@/lib/auth/dashboard-nav";
import { forbidden } from "next/navigation";
import { getSession } from "@/server/auth";
import { Notice } from "@/components/dashboard/ui";
import { emailConfigured } from "@/server/messaging/config";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  // Refuse here; sign-in and two-step redirects happen in the pages, which know their exact address.
  const session = await getSession();
  if (!session || session.aal !== "aal2") return children;
  if (session.platformRole !== "admin") forbidden();
  return (
    <WorkspaceLayout
      title="Nilecruz admin"
      base="/dashboard/admin/"
      items={navFor({ kind: "admin", adminRole: session.adminRole })}
    >
      {emailConfigured() ? null : (
        <Notice tone="error">
          Email isn’t set up on this server (RESEND_API_KEY and EMAIL_FROM), so no emails are going out: customers, travel
          partners and operators only see notices in their dashboards. Each message is recorded as not sent under Messages → Email
          delivery.
        </Notice>
      )}
      {children}
    </WorkspaceLayout>
  );
}
