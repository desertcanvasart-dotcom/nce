"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "@/lib/auth/dashboard-nav";
import styles from "./dashboard.module.css";

/** The workspace sidebar; the current section is marked for screen readers and by the brass bar. */
export function WorkspaceNav({ title, base, items }: { title: string; base: string; items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label={`${title} sections`} className={styles.side}>
      <p className={styles.sideTitle}>{title}</p>
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
    </nav>
  );
}
