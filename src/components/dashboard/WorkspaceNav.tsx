"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "@/lib/auth/dashboard-nav";
import styles from "./dashboard.module.css";

/**
 * The workspace sidebar; the current section is marked for screen readers and by the brass bar.
 * On phones it folds into a <details> "Sections" menu (no JavaScript needed), so content comes first.
 */
export function WorkspaceNav({ title, base, items }: { title: string; base: string; items: NavItem[] }) {
  const pathname = usePathname();
  const current = items.find((i) => (i.slug ? `${base}${i.slug}/` : base) === pathname);
  const list = (
    <ul className={styles.sideList}>
      {items.map((item) => {
        const href = item.slug ? `${base}${item.slug}/` : base;
        return (
          <li key={item.slug || "overview"}>
            <Link href={href} aria-current={pathname === href ? "page" : undefined}>
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
  return (
    <>
      <nav aria-label={`${title} sections`} className={`${styles.side} ${styles.sideWide}`}>
        <p className={styles.sideTitle}>{title}</p>
        {list}
      </nav>
      <nav aria-label={`${title} sections`} className={`${styles.side} ${styles.sideNarrow}`}>
        <details className={styles.sections}>
          <summary className={styles.sectionsButton}>
            <span className={styles.sideTitle}>{title}</span>
            <span>{current ? current.label : "Sections"}</span>
          </summary>
          {list}
        </details>
      </nav>
    </>
  );
}
