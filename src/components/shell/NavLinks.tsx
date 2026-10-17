"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { mainNav } from "./nav-items";
import styles from "./SiteHeader.module.css";

/** Client only to mark the current section with aria-current; the links work without JavaScript. */
export function NavLinks({ className }: { className?: string }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  return (
    <ul className={className}>
      {mainNav.map((item) => {
        const current = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <li key={item.key}>
            <Link href={item.href} className={styles.link} aria-current={current ? "page" : undefined}>
              {t(item.key)}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
