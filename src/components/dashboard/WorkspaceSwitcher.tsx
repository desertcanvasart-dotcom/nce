"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WORKSPACE_LABEL } from "@/lib/auth/dashboard-nav";
import { workspacePath, type Workspace } from "@/lib/auth/workspaces";
import styles from "./dashboard.module.css";

/** For people with more than one workspace (an operator who also books a trip, an admin's own journey). */
export function WorkspaceSwitcher({ workspaces }: { workspaces: Workspace[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Workspaces">
      <ul className={styles.switcher}>
        {workspaces.map((w) => {
          const href = workspacePath(w);
          const label = w.kind === "operator" || w.kind === "partner" ? w.orgName : WORKSPACE_LABEL[w.kind];
          return (
            <li key={href}>
              <Link href={href} aria-current={pathname.startsWith(href) ? "page" : undefined}>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
