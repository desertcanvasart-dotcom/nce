import type { ReactNode } from "react";
import type { NavItem } from "@/lib/auth/dashboard-nav";
import { WorkspaceNav } from "./WorkspaceNav";
import styles from "./dashboard.module.css";

export function WorkspaceLayout({
  title,
  base,
  items,
  children,
}: {
  title: string;
  base: string;
  items: NavItem[];
  children: ReactNode;
}) {
  return (
    <div className={styles.body}>
      <WorkspaceNav title={title} base={base} items={items} />
      <main id="main" tabIndex={-1} className={styles.main}>
        {children}
      </main>
    </div>
  );
}

/** A section that a later batch builds: an honest placeholder, never a broken link. */
export function ComingSoon({ label, batch, intro }: { label: string; batch: string; intro?: string }) {
  return (
    <>
      <h1 className={styles.title}>{label}</h1>
      {intro ? <p className={styles.text}>{intro}</p> : null}
      <p className={styles.text} data-batch={batch}>
        This section is being built and arrives in a later release (planned for Batch {batch}).
      </p>
    </>
  );
}
