"use client";

import { useState, type MouseEvent } from "react";
import { Media } from "@/components/ds/Media/Media";
import { VesselArt } from "@/components/ds/VesselArt/VesselArt";
import { cx } from "@/components/ds/lib/cx";
import type { RouteKey } from "@/content/river-stops";
import styles from "./destinations.module.css";

export type MapStop = {
  key: string;
  n: number;
  name: string;
  summary: string;
  beyond: boolean;
  onMap: Record<RouteKey, "stop" | "end" | null>;
  image: { src: string; alt: string; width: number; height: number } | null;
  /** The stop's own section on the page, its words ("Read about Edfu") and its label on the map ("Stop 4"). */
  read: string;
  label: string;
};

type Labels = {
  map: string;
  list: string;
  notToScale: string;
  direction: string;
  routeLabel: string;
  routes: Record<RouteKey, string>;
  lake: string;
  optional: string;
  end: string;
  onRoute: string;
};

const ROUTES: RouteKey[] = ["classic", "dahabiya"];

/**
 * Where each stop sits on the drawing, in percent: the river bends like the cruise page's route, upstream to the
 * right on a wide screen and downwards on a phone; Abu Simbel stands apart, past a break, on Lake Nasser.
 */
function place(stops: MapStop[]) {
  const river = stops.filter((s) => !s.beyond);
  return stops.map((s) => {
    const i = river.indexOf(s);
    const wave = i < 0 ? 0 : Math.sin(i * 1.3);
    const along = i < 0 ? 0 : i / Math.max(1, river.length - 1);
    return s.beyond
      ? { key: s.key, hx: 95, hy: 50, vx: 34, vy: 95 }
      : { key: s.key, hx: 4 + along * 74, hy: 50 + wave * 22, vx: 34 + wave * 14, vy: 3 + along * 77 };
  });
}

/** A smooth line through points (percent), drawn in an SVG of the given size. */
function curve(pts: { x: number; y: number }[], w: number, h: number, vertical: boolean) {
  return pts
    .map((p, i) => {
      if (!i) return `M${(p.x * w) / 100} ${(p.y * h) / 100}`;
      const q = pts[i - 1]!;
      if (vertical) {
        const my = ((q.y + p.y) / 2) * (h / 100);
        return `C${(q.x * w) / 100} ${my} ${(p.x * w) / 100} ${my} ${(p.x * w) / 100} ${(p.y * h) / 100}`;
      }
      const mx = ((q.x + p.x) / 2) * (w / 100);
      return `C${mx} ${(q.y * h) / 100} ${mx} ${(p.y * h) / 100} ${(p.x * w) / 100} ${(p.y * h) / 100}`;
    })
    .join("");
}

/**
 * The destinations hub's river (Islam's brief, 4 Nov 2026): every stop in river order, a route control that lights up
 * a classic ship's stops or a dahabiya's, and a panel for the chosen stop. Each stop is a link to its section, so the
 * map works without JavaScript; with it, a click, tap or Enter chooses the stop instead. Not to scale.
 */
export function RiverMap({ stops, labels }: { stops: MapStop[]; labels: Labels }) {
  const [route, setRoute] = useState<RouteKey>("classic");
  const firstOn = (r: RouteKey) => stops.find((s) => s.onMap[r] === "stop")?.key ?? stops[0]!.key;
  const [picked, setPicked] = useState(firstOn("classic"));
  const pos = place(stops);
  const at = (key: string) => pos.find((p) => p.key === key)!;
  const river = stops.filter((s) => !s.beyond);
  const lakeStop = stops.find((s) => s.beyond);
  const riverPts = (axis: "h" | "v") =>
    river.map((s) => (axis === "h" ? { x: at(s.key).hx, y: at(s.key).hy } : { x: at(s.key).vx, y: at(s.key).vy }));
  // Crescents halfway between the stops a route calls at: the nights spent on the river between them.
  const lit = stops.filter((s) => s.onMap[route]);
  const nights = lit.slice(1).map((s, i) => {
    const a = at(lit[i]!.key);
    const b = at(s.key);
    return {
      key: `${lit[i]!.key}-${s.key}`,
      hx: (a.hx + b.hx) / 2,
      hy: (a.hy + b.hy) / 2,
      vx: (a.vx + b.vx) / 2,
      vy: (a.vy + b.vy) / 2,
    };
  });
  const cur = stops.find((s) => s.key === picked)!;
  const boat = at(picked);
  const status = (s: MapStop) =>
    s.beyond ? labels.optional : s.onMap[route] === "end" ? labels.end : s.onMap[route] ? labels.onRoute : null;

  function choose(ev: MouseEvent, key: string) {
    ev.preventDefault();
    setPicked(key);
  }

  return (
    <div className={styles.riverMap}>
      <div className={styles.mapBar}>
        <div className={styles.routes} role="group" aria-label={labels.routeLabel}>
          {ROUTES.map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={route === r}
              onClick={() => {
                setRoute(r);
                setPicked(firstOn(r));
              }}
            >
              {labels.routes[r]}
            </button>
          ))}
        </div>
        <p className={styles.mapNotes}>
          <span>{labels.direction}</span>
          <span>{labels.notToScale}</span>
        </p>
      </div>

      <nav className={styles.mapCanvas} aria-label={labels.map} data-route={route}>
        <svg className={styles.horizontal} viewBox="0 0 1000 220" preserveAspectRatio="none" aria-hidden="true">
          <path className={styles.water} d={curve(riverPts("h"), 1000, 220, false)} />
          <path className={styles.track} d={curve(riverPts("h"), 1000, 220, false)} />
          {lakeStop ? (
            <path
              className={styles.lakeTrack}
              d={`M${(riverPts("h").at(-1)!.x * 1000) / 100} ${(riverPts("h").at(-1)!.y * 220) / 100} L${at(lakeStop.key).hx * 10} ${at(lakeStop.key).hy * 2.2}`}
            />
          ) : null}
        </svg>
        <svg className={styles.vertical} viewBox="0 0 300 1000" preserveAspectRatio="none" aria-hidden="true">
          <path className={styles.water} d={curve(riverPts("v"), 300, 1000, true)} />
          <path className={styles.track} d={curve(riverPts("v"), 300, 1000, true)} />
          {lakeStop ? (
            <path
              className={styles.lakeTrack}
              d={`M${riverPts("v").at(-1)!.x * 3} ${riverPts("v").at(-1)!.y * 10} L${at(lakeStop.key).vx * 3} ${at(lakeStop.key).vy * 10}`}
            />
          ) : null}
        </svg>
        {lakeStop ? (
          <span
            className={styles.lakeLabel}
            style={{
              ["--hx" as string]: `${at(lakeStop.key).hx}%`,
              ["--hy" as string]: `${at(lakeStop.key).hy}%`,
              ["--vx" as string]: `${at(lakeStop.key).vx}%`,
              ["--vy" as string]: `${at(lakeStop.key).vy}%`,
            }}
            aria-hidden="true"
          >
            {labels.lake}
          </span>
        ) : null}
        {nights.map((m) => (
          <span
            key={m.key}
            className={styles.moon}
            style={{
              ["--hx" as string]: `${m.hx}%`,
              ["--hy" as string]: `${m.hy}%`,
              ["--vx" as string]: `${m.vx}%`,
              ["--vy" as string]: `${m.vy}%`,
            }}
            aria-hidden="true"
          >
            <svg viewBox="0 0 16 16">
              <path d="M10.5 1.5a6.5 6.5 0 1 0 4 11.6A5.5 5.5 0 0 1 10.5 1.5Z" />
            </svg>
          </span>
        ))}
        <ol className={styles.mapStops} aria-label={labels.list}>
          {stops.map((s) => {
            const p = at(s.key);
            const on = s.onMap[route];
            const words = status(s);
            return (
              <li
                key={s.key}
                className={cx(
                  styles.mapStop,
                  on && styles.lit,
                  on === "end" && styles.endStop,
                  s.beyond && styles.apart,
                  p.hy > 50 && styles.labelUp,
                )}
                style={{
                  ["--hx" as string]: `${p.hx}%`,
                  ["--hy" as string]: `${p.hy}%`,
                  ["--vx" as string]: `${p.vx}%`,
                  ["--vy" as string]: `${p.vy}%`,
                }}
              >
                <a
                  href={`#stop-${s.key}`}
                  aria-current={picked === s.key ? "true" : undefined}
                  aria-label={`${s.name}, ${s.label}${words ? `, ${words}` : ""}`}
                  onClick={(ev) => choose(ev, s.key)}
                >
                  <span className={styles.mapDot} aria-hidden="true" />
                  <span className={styles.mapName} aria-hidden="true">
                    {s.name}
                  </span>
                </a>
              </li>
            );
          })}
        </ol>
        <div
          className={styles.mapBoat}
          style={{
            ["--hx" as string]: `${boat.hx}%`,
            ["--hy" as string]: `${boat.hy}%`,
            ["--vx" as string]: `${boat.vx}%`,
            ["--vy" as string]: `${boat.vy}%`,
          }}
          aria-hidden="true"
        >
          <VesselArt type={route === "classic" ? "motor" : "sail"} waterline={false} decorative />
        </div>
      </nav>

      <div className={styles.mapPanel} aria-live="polite">
        {cur.image ? <Media image={cur.image} sizes="(min-width: 900px) 30vw, 100vw" className={styles.panelPhoto} /> : null}
        <div>
          <p className={styles.eyebrow}>
            {cur.label}
            {status(cur) ? ` · ${status(cur)}` : ""}
          </p>
          <p className={styles.panelName}>{cur.name}</p>
          <p>{cur.summary}</p>
          <p>
            <a href={`#stop-${cur.key}`} className={styles.more}>
              {cur.read}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
