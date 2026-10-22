"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "../Badge/Badge";
import { Icon } from "../Icon/Icon";
import { cx } from "../lib/cx";
import type { VesselType } from "../lib/types";
import { useReducedMotion } from "../lib/useReducedMotion";
import { VesselArt } from "../VesselArt/VesselArt";
import styles from "./ItineraryTimeline.module.css";

export type ItineraryStop = { day: number; place: string; title: string; body: string; tags?: string[] };

export type ItineraryTimelineProps = {
  /** One sentence per stop; the detail belongs on the cruise page. */
  stops: ItineraryStop[];
  vessel?: VesselType;
  /**
   * EXP-003: every day listed in the page under a pinned river; the boat sails to the day being read as you scroll.
   * Without JavaScript the days are simply an ordered list.
   */
  scroll?: boolean;
};

/**
 * Day-by-day route drawn as a river (COMP-ItineraryTimeline): pick a stop or press play and the boat sails there.
 * Arrow keys move between days (A11Y-009). Without JavaScript the full list of days is shown.
 */
export function ItineraryTimeline({ stops, vessel = "sail", scroll = false }: ItineraryTimelineProps) {
  const t = useTranslations("ds.itinerary");
  const [cur, setCur] = useState(0);
  const [playing, setPlaying] = useState(false);
  const pathRef = useRef<SVGPathElement>(null);
  const [len, setLen] = useState(1000);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const uid = useId();
  const days = useRef<(HTMLLIElement | null)[]>([]);
  const reduced = useReducedMotion();

  // EXP-003: the day nearest the middle of the screen is the current one.
  useEffect(() => {
    if (!scroll || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setCur(Number((e.target as HTMLElement).dataset.i));
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    days.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [scroll, stops.length]);

  useEffect(() => {
    // Guarded: environments without SVG geometry (tests, very old browsers) keep the fallback length.
    const path = pathRef.current;
    if (path && typeof path.getTotalLength === "function") setLen(path.getTotalLength());
  }, [stops.length]);

  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(
      () =>
        setCur((c) => {
          if (c >= stops.length - 1) {
            setPlaying(false);
            return c;
          }
          if (scroll) days.current[c + 1]?.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" });
          return c + 1;
        }),
      2400,
    );
    return () => clearInterval(timer);
  }, [playing, stops.length, scroll, reduced]);

  if (stops.length === 0) return null;
  const n = stops.length;
  const pts = stops.map((_, i) => [n === 1 ? 50 : 4 + (92 * i) / (n - 1), 50 + Math.sin(i * 1.3) * 22] as const);
  const d = pts
    .map((p, i) => {
      if (!i) return `M${p[0] * 10} ${p[1] * 1.8}`;
      const q = pts[i - 1]!;
      const mx = (q[0] + p[0]) * 5;
      return `C${mx} ${q[1] * 1.8} ${mx} ${p[1] * 1.8} ${p[0] * 10} ${p[1] * 1.8}`;
    })
    .join("");
  const frac = n === 1 ? 1 : cur / (n - 1);
  const s = stops[cur]!;
  const pos = pts[cur]!;

  function go(i: number) {
    const next = Math.max(0, Math.min(n - 1, i));
    setCur(next);
    tabs.current[next]?.focus();
    if (scroll) days.current[next]?.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" });
  }
  function onKey(ev: KeyboardEvent) {
    if (ev.key === "ArrowRight") go(cur + 1);
    else if (ev.key === "ArrowLeft") go(cur - 1);
    else if (ev.key === "Home") go(0);
    else if (ev.key === "End") go(n - 1);
    else return;
    ev.preventDefault();
    setPlaying(false);
  }

  return (
    <section className={cx(styles.itin, scroll && styles.scrolling)}>
      <div className={styles.map} role="tablist" aria-label={t("label")}>
        <svg viewBox="0 0 1000 180" preserveAspectRatio="none" aria-hidden="true">
          <path className={styles.river} d={d} />
          <path className={styles.path} d={d} ref={pathRef} />
          <path className={styles.done} d={d} style={{ strokeDasharray: len, strokeDashoffset: len * (1 - frac) }} />
        </svg>
        {stops.map((st, i) => (
          <button
            key={`${st.day}-${st.place}`}
            ref={(el) => {
              tabs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`${uid}-tab-${i}`}
            aria-selected={i === cur}
            aria-controls={`${uid}-panel`}
            tabIndex={i === cur ? 0 : -1}
            aria-label={st.place ? undefined : `${t("day")} ${st.day}`}
            onKeyDown={onKey}
            className={cx(styles.stop, i < cur && styles.past, pts[i]![1] > 50 && styles.up)}
            style={{ left: `${pts[i]![0]}%`, top: `${pts[i]![1]}%` }}
            onClick={() => {
              setCur(i);
              setPlaying(false);
              if (scroll) days.current[i]?.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" });
            }}
          >
            <span className={styles.dot} />
            <span className={styles.name}>{st.place}</span>
          </button>
        ))}
        <div className={styles.boat} style={{ left: `${pos[0]}%`, top: `${pos[1]}%` }} aria-hidden="true">
          <VesselArt type={vessel} waterline={false} decorative />
        </div>
      </div>
      {scroll ? (
        <ol className={styles.days} id={`${uid}-panel`}>
          {stops.map((st, i) => (
            <li
              key={`${st.day}-${st.place}`}
              ref={(el) => {
                days.current[i] = el;
              }}
              data-i={i}
              aria-current={i === cur ? "step" : undefined}
              className={styles.dayItem}
            >
              <div className={styles.day}>
                <small>{t("day")}</small>
                {String(st.day).padStart(2, "0")}
              </div>
              <div>
                {st.place ? <p className={styles.eyebrow}>{st.place}</p> : null}
                <h3>{st.title}</h3>
                <p>{st.body}</p>
              </div>
            </li>
          ))}
        </ol>
      ) : null}
      {scroll ? null : (
        <div className={styles.panel} role="tabpanel" id={`${uid}-panel`} aria-labelledby={`${uid}-tab-${cur}`}>
          <div className={styles.day}>
            <small>{t("day")}</small>
            {String(s.day).padStart(2, "0")}
          </div>
          <div key={cur} className={styles.anim}>
            <p className={styles.eyebrow}>{s.place}</p>
            <h3>{s.title}</h3>
            <p>{s.body}</p>
            {s.tags?.length ? (
              <ul>
                {s.tags.map((tag) => (
                  <li key={tag}>
                    <Badge tone="accent">{tag}</Badge>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <div className={styles.ctrl}>
            <button
              type="button"
              className={styles.iconBtn}
              aria-label={t("prevDay")}
              disabled={cur === 0}
              onClick={() => (setCur(cur - 1), setPlaying(false))}
            >
              <Icon name="chevron-left" />
            </button>
            <button
              type="button"
              className={styles.iconBtn}
              aria-label={playing ? t("pause") : t("play")}
              onClick={() => {
                if (!playing && cur === n - 1) setCur(0);
                setPlaying(!playing);
              }}
            >
              <Icon name={playing ? "pause" : "play"} />
            </button>
            <button
              type="button"
              className={styles.iconBtn}
              aria-label={t("nextDay")}
              disabled={cur === n - 1}
              onClick={() => (setCur(cur + 1), setPlaying(false))}
            >
              <Icon name="chevron-right" />
            </button>
          </div>
        </div>
      )}
      {/* Without JavaScript only the first day would be reachable, so list every day. */}
      {scroll ? null : (
        <noscript>
          <ol className={styles.noscript}>
            {stops.map((st) => (
              <li key={`${st.day}-${st.place}`}>
                <b>
                  {t("day")} {st.day} · {st.place}: {st.title}
                </b>{" "}
                {st.body}
              </li>
            ))}
          </ol>
        </noscript>
      )}
    </section>
  );
}
