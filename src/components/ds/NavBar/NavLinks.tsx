"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { cx } from "../lib/cx";
import styles from "./NavBar.module.css";

export type NavLink = { label: string; href: string };

/**
 * Link row with the sliding brass underline (COMP-NavBar). The current section is found from the URL.
 * Without JavaScript the links still work and the current one has a plain underline.
 */
export function NavLinks({ links, className }: { links: NavLink[]; className?: string }) {
  const pathname = usePathname();
  const listRef = useRef<HTMLUListElement>(null);
  const [ink, setInk] = useState<{ left: number; width: number } | null>(null);
  const activeIndex = links.findIndex((l) => pathname === l.href || pathname.startsWith(`${l.href}/`));

  const measure = useCallback(() => {
    const ul = listRef.current;
    const a = activeIndex >= 0 ? ul?.querySelectorAll("a")[activeIndex] : undefined;
    if (!ul || !a) return setInk(null);
    const ur = ul.getBoundingClientRect();
    const r = a.getBoundingClientRect();
    setInk({ left: r.left - ur.left, width: r.width });
  }, [activeIndex]);

  useLayoutEffect(() => {
    measure();
    // Fonts can change link widths after first paint.
    void document.fonts?.ready.then(measure);
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  return (
    <ul ref={listRef} className={cx(styles.links, className)} data-ink={ink ? "on" : "off"}>
      {links.map((l, i) => (
        <li key={l.href}>
          <Link href={l.href} className={styles.link} aria-current={i === activeIndex ? "page" : undefined}>
            {l.label}
          </Link>
        </li>
      ))}
      {ink ? <span className={styles.ink} style={{ left: ink.left, width: ink.width }} aria-hidden="true" /> : null}
    </ul>
  );
}

/** Plain vertical list for the phone menu (no sliding underline). */
export function MenuLinks({ links }: { links: NavLink[] }) {
  const pathname = usePathname();
  return (
    <ul className={styles.menuLinks}>
      {links.map((l) => (
        <li key={l.href}>
          <Link
            href={l.href}
            className={styles.link}
            aria-current={pathname === l.href || pathname.startsWith(`${l.href}/`) ? "page" : undefined}
          >
            {l.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
