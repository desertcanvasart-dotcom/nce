import { redirect } from "next/navigation";
import { landingWorkspace, workspacePath } from "@/lib/auth/workspaces";
import { requireUser } from "@/server/auth";

/** DASH-ROLE-001: everyone lands in their own workspace. */
export default async function DashboardHome() {
  const session = await requireUser("/dashboard/");
  redirect(workspacePath(landingWorkspace(session)));
}
