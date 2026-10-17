import type { ReactNode } from "react";
import { WorkspaceLayout } from "@/components/dashboard/WorkspaceLayout";
import { navFor } from "@/lib/auth/dashboard-nav";
import { forbidden } from "next/navigation";
import { getSession } from "@/server/auth";

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
      {children}
    </WorkspaceLayout>
  );
}
