"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "../Icon/Icon";
import type { SceneTime, VesselType } from "../lib/types";
import { useReducedMotion } from "../lib/useReducedMotion";
import { Media, type MediaProps } from "../Media/Media";
import styles from "./Gallery.module.css";

export type GalleryItem = {
  image?: MediaProps["image"];
  time?: SceneTime;
  vessel?: VesselType | null;
  temple?: boolean;
  /** Name the place and the day ("Leaving Esna"). */
  caption: string;
  meta?: string;
};

export type GalleryProps = { items: GalleryItem[]; label?: string };

/**
 * "Captured moments" carousel (COMP-Gallery): snap-scrolling frames that tilt in 3D as they pass centre,
 * with a counter, progress line and arrows. The tilt and smooth scrolling stop under reduced motion (A11Y-004).
 */
export function Gallery({ items, label }: GalleryProps) {
  const t = useTranslations("ds.gallery");
  const reduced = useReducedMotion();
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState(0);

  const update = useCallback(() => {
    const el = track.current;
    if (!el) return;
    const mid = el.scrollLeft + el.clientWidth / 2;
    let best = 0;
    let bestDistance = Infinity;
    Array.from(el.children).forEach((node, i) => {
      const c = node as HTMLElement;
      const centre = c.offsetLeft + c.offsetWidth / 2;
      const off = (centre - mid) / el.clientWidth;
      c.style.transform = reduced
        ? ""
        : `rotateY(${(-off * 18).toFixed(2)}deg) scale(${(1 - Math.min(Math.abs(off) * 0.12, 0.12)).toFixed(3)})`;
      if (Math.abs(centre - mid) < bestDistance) {
        bestDistance = Math.abs(centre - mid);
        best = i;
      }
    });
    setActive(best);
    const max = el.scrollWidth - el.clientWidth;
    setProgress(max > 0 ? el.scrollLeft / max : 0);
  }, [reduced]);

  useEffect(() => {
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [update]);

  function go(dir: number) {
    const el = track.current;
    const c = el?.children[Math.max(0, Math.min(items.length - 1, active + dir))] as HTMLElement | undefined;
    if (el && c)
      el.scrollTo({ left: c.offsetLeft - (el.clientWidth - c.offsetWidth) / 2, behavior: reduced ? "auto" : "smooth" });
  }
  function onKey(ev: KeyboardEvent) {
    if (ev.key === "ArrowRight") go(1);
    else if (ev.key === "ArrowLeft") go(-1);
    else return;
    ev.preventDefault();
  }

  const width = 100 / Math.max(items.length, 1);
  return (
    <section className={styles.gal} aria-roledescription="carousel" aria-label={label ?? t("label")}>
      {/* The track scrolls, so it must be reachable by keyboard; arrow keys move between frames. */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- arrow keys move between frames in this scrollable region (WCAG 2.1.1) */}
      <div
        className={styles.track}
        ref={track}
        onScroll={update}
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scrollable region must be keyboard-focusable (WCAG 2.1.1)
        tabIndex={0}
        onKeyDown={onKey}
        role="group"
        aria-label={label ?? t("label")}
      >
        {items.map((it, i) => (
          <figure
            key={`${it.caption}-${i}`}
            className={styles.item}
            aria-roledescription="slide"
            aria-label={t("slide", { n: i + 1, total: items.length })}
          >
            <Media
              image={it.image}
              time={it.time}
              vessel={it.vessel}
              temple={it.temple}
              sceneLabel={it.caption}
              sizes="(max-width: 760px) 72vw, 420px"
              className={styles.media}
            />
            <figcaption>
              <b>{it.caption}</b>
              {it.meta ? <span>{it.meta}</span> : null}
            </figcaption>
          </figure>
        ))}
      </div>
      <div className={styles.bar}>
        <span className={styles.count} aria-live="polite">
          {String(active + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}
        </span>
        <div className={styles.progress} aria-hidden="true">
          <i style={{ width: `${width}%`, left: `${progress * (100 - width)}%` }} />
        </div>
        <button type="button" className={styles.iconBtn} aria-label={t("prev")} disabled={active === 0} onClick={() => go(-1)}>
          <Icon name="chevron-left" />
        </button>
        <button
          type="button"
          className={styles.iconBtn}
          aria-label={t("next")}
          disabled={active === items.length - 1}
          onClick={() => go(1)}
        >
          <Icon name="chevron-right" />
        </button>
      </div>
    </section>
  );
}
