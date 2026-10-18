import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { DashboardFrame } from "@/components/dashboard/DashboardFrame";
import { resolveWorkspaces } from "@/lib/auth/workspaces";
import { getSession } from "@/server/auth";
import { Invitations } from "./Invitations";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false, follow: false } };

/** Dashboards are signed-in only and in English (DASH-BND-006); /es/ and /ja/ addresses are redirected by the proxy. */
export default async function DashboardLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  if ((await params).locale !== "en") notFound();
  // No redirect here: each page sends people to sign-in with its own exact address as the way back.
  const session = await getSession();
  if (!session) return children;
  return (
    <DashboardFrame email={session.email} workspaces={resolveWorkspaces(session)} notices={<Invitations />}>
      {children}
    </DashboardFrame>
  );
}
