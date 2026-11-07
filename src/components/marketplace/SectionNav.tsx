"use client";

import { useEffect, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import styles from "./VesselPage.module.css";

export type NavItem = { id: string; label: string };

/**
 * The vessel page's sections in a bar that stays at the top of the window, with the main action at its end. It scrolls
 * sideways on narrow screens and marks the section being read. Sections keep a scroll margin the bar's height, so a
 * link never lands under it. Without JavaScript it is a plain row of anchor links.
 */
export function SectionNav({
  items,
  label,
  action,
}: {
  items: NavItem[];
  label: string;
  /** The main action; a mailto: link (an enquiry partner's address) is a plain link. None for no action. */
  action?: { href: string; label: string };
}) {
  const [current, setCurrent] = useState<string | null>(null);
  const strip = useRef<HTMLUListElement>(null);
  const ids = items.map((i) => i.id).join(" ");

  useEffect(() => {
    const els = ids
      .split(" ")
      .map((id) => document.getElementById(id))
      .filter((e): e is HTMLElement => !!e);
    let frame = 0;
    const read = () => {
      frame = 0;
      // The last section whose top has passed a line just below the bar; none above the first.
      let on: string | null = null;
      for (const e of els) if (e.getBoundingClientRect().top <= 140) on = e.id;
      setCurrent(on);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };
    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [ids]);

  // Keep the marked link in view inside the strip, without moving the page.
  useEffect(() => {
    const ul = strip.current;
    const a = current ? ul?.querySelector<HTMLElement>(`a[href="#${current}"]`) : null;
    if (!ul || !a) return;
    const left = a.offsetLeft - ul.offsetLeft;
    if (left < ul.scrollLeft || left + a.offsetWidth > ul.scrollLeft + ul.clientWidth)
      ul.scrollTo({ left: Math.max(0, left - 16) });
  }, [current]);

  return (
    <nav className={styles.sectionNav} aria-label={label}>
      <ul ref={strip}>
        {items.map((i) => (
          <li key={i.id}>
            <a href={`#${i.id}`} aria-current={current === i.id ? "true" : undefined}>
              {i.label}
            </a>
          </li>
        ))}
      </ul>
      {!action ? null : action.href.startsWith("mailto:") ? (
        <a className={styles.navAction} href={action.href}>
          {action.label}
        </a>
      ) : (
        <Link className={styles.navAction} href={action.href}>
          {action.label}
        </Link>
      )}
    </nav>
  );
}
