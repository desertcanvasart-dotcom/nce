import Link from "next/link";
import type { OrgStatus } from "@/lib/auth/workspaces";
import styles from "./dashboard.module.css";

const COPY: Record<Exclude<OrgStatus, "approved">, { title: string; body: string }> = {
  applied: {
    title: "is waiting for approval",
    body: "Nilecruz checks every company before it can sell or book through the marketplace. We will email you when the check is done.",
  },
  paused: {
    title: "is paused",
    body: "Selling and booking are paused for this company. Contact Nilecruz to find out why and what happens next.",
  },
  rejected: {
    title: "was not approved",
    body: "This company can't sell or book through Nilecruz. Contact us if you think this is a mistake.",
  },
};

/** A company that is not approved sees its status, never its workspace (DASH-ROLE-003, 005). */
export function CompanyStatus({ name, status }: { name: string; status: Exclude<OrgStatus, "approved"> }) {
  const c = COPY[status];
  return (
    <main id="main" tabIndex={-1} className={styles.main}>
      <h1 className={styles.title}>
        {name} {c.title}
      </h1>
      <p className={styles.text}>{c.body}</p>
      <p className={styles.text}>
        You can still plan your own travel in <Link href="/dashboard/journey/">My journey</Link>.
      </p>
    </main>
  );
}
