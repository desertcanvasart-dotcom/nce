import Link from "next/link";
import type { ReactNode } from "react";
import { ThemeToggle } from "@/components/ds/NavBar/ThemeToggle";
import { CairoTime } from "@/components/shell/CairoTime";
import type { Workspace } from "@/lib/auth/workspaces";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import styles from "./dashboard.module.css";

/**
 * The dashboard frame (DASH-ROLE-006), in English (DASH-BND-006): wordmark, workspace switcher,
 * Cairo time (DATA-003), account security, Day/Night and sign-out. Each workspace adds its sidebar.
 */
export function DashboardFrame({
  email,
  workspaces,
  notices,
  children,
}: {
  email: string;
  workspaces: Workspace[];
  notices?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={styles.frame}>
      <header className={styles.top}>
        <Link href="/" className={styles.brand}>
          Nilecruz
        </Link>
        {workspaces.length > 1 ? <WorkspaceSwitcher workspaces={workspaces} /> : null}
        <div className={styles.tools}>
          <span className={styles.time}>
            Times shown in Cairo time · now <CairoTime value={new Date()} />
          </span>
          <Link href="/account/security/" title={email}>
            Account security
          </Link>
          <ThemeToggle />
          <form method="post" action="/account/sign-out/" className={styles.signOut}>
            <button type="submit" className={styles.signOutButton}>
              Sign out
            </button>
          </form>
        </div>
      </header>
      {notices}
      {children}
    </div>
  );
}
