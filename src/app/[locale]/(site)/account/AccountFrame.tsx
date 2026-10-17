import type { ReactNode } from "react";
import styles from "./account.module.css";

/** The narrow, centred column every account page uses. */
export function AccountFrame({ title, lede, children }: { title: string; lede?: string; children: ReactNode }) {
  return (
    <section className={styles.frame} aria-labelledby="account-title">
      <h1 id="account-title" className={styles.title}>
        {title}
      </h1>
      {lede ? <p className={styles.lede}>{lede}</p> : null}
      {children}
    </section>
  );
}

export function Notice({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "error" | "success" }) {
  const cls = [styles.message, tone === "error" && styles.error, tone === "success" && styles.success].filter(Boolean).join(" ");
  return (
    <p className={cls} role={tone === "error" ? "alert" : "status"}>
      {children}
    </p>
  );
}
