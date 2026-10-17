import { forbidden, notFound } from "next/navigation";
import { ComingSoon } from "@/components/dashboard/WorkspaceLayout";
import { navFor, sectionAccess } from "@/lib/auth/dashboard-nav";
import type { Workspace } from "@/lib/auth/workspaces";

/** Renders a workspace section after checking this person may see it: unknown → 404, not theirs → 403. */
export function Section({ workspace, slug, intro }: { workspace: Workspace; slug: string; intro?: string }) {
  const access = sectionAccess(workspace, slug);
  if (access === "unknown") notFound();
  if (access === "forbidden") forbidden();
  const item = navFor(workspace).find((i) => i.slug === slug)!;
  return <ComingSoon label={item.label} batch={item.batch} intro={intro} />;
}

export const isUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
