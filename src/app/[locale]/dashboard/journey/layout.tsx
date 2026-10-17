import type { ReactNode } from "react";
import { WorkspaceLayout } from "@/components/dashboard/WorkspaceLayout";
import { navFor } from "@/lib/auth/dashboard-nav";
import { getSession } from "@/server/auth";

export default async function JourneyLayout({ children }: { children: ReactNode }) {
  if (!(await getSession())) return children; // the page redirects to sign-in with its own address
  return (
    <WorkspaceLayout title="My journey" base="/dashboard/journey/" items={navFor({ kind: "journey" })}>
      {children}
    </WorkspaceLayout>
  );
}
