import { useId } from "react";
import { cx } from "../lib/cx";
import type { SceneTime, VesselType } from "../lib/types";
import { vesselShapes } from "../VesselArt/shapes";
import { SceneParallax } from "./SceneParallax";
import styles from "./Scene.module.css";

export type SceneProps = {
  time?: SceneTime;
  /** Vessel on the water, or null for none. No felucca (ADR-008). */
  vessel?: VesselType | null;
  temple?: boolean;
  /** Pointer-follow layers (off under reduced motion). */
  parallax?: boolean;
  /** Give a label only if the scene carries meaning; otherwise it is decorative. */
  label?: string;
  className?: string;
};

type Light = {
  sky: [string, string, string];
  sun: string;
  sx: number;
  sy: number;
  sr: number;
  hills: string;
  water: [string, string];
  sil: string;
  glow: string;
  stars?: boolean;
};

// Palette tokens only, constant across themes (COMP-Scene README).
const SKY: Record<SceneTime, Light> = {
  night: {
    sky: ["--nile-950", "--nile-800", "--nile-600"],
    sun: "--sand-100",
    sx: 620,
    sy: 110,
    sr: 16,
    hills: "--nile-950",
    water: ["--nile-800", "--nile-950"],
    sil: "--nile-950",
    glow: "--brass-300",
    stars: true,
  },
  dusk: {
    sky: ["--nile-800", "--dusk-500", "--dusk-300"],
    sun: "--dusk-300",
    sx: 540,
    sy: 296,
    sr: 44,
    hills: "--nile-800",
    water: ["--dusk-500", "--nile-800"],
    sil: "--nile-950",
    glow: "--brass-300",
  },
  dawn: {
    sky: ["--nile-300", "--sand-200", "--dusk-300"],
    sun: "--sand-100",
    sx: 250,
    sy: 286,
    sr: 30,
    hills: "--nile-600",
    water: ["--nile-300", "--nile-600"],
    sil: "--nile-800",
    glow: "--sand-100",
  },
  day: {
    sky: ["--nile-600", "--nile-300", "--sand-100"],
    sun: "--sand-100",
    sx: 640,
    sy: 90,
    sr: 24,
    hills: "--brass-300",
    water: ["--nile-600", "--nile-800"],
    sil: "--nile-800",
    glow: "--sand-100",
  },
};

// Deterministic star field (same seed as the design system), so server and client render identically.
const STARS = (() => {
  const s: [number, number, number, number][] = [];
  let seed = 7;
  for (let i = 0; i < 46; i++) {
    seed = (seed * 9301 + 49297) % 233280;
    const a = seed / 233280;
    seed = (seed * 9301 + 49297) % 233280;
    const b = seed / 233280;
    s.push([Math.round(a * 800), Math.round(b * 230), i % 5 === 0 ? 1.6 : 0.9, (i % 7) * 0.5]);
  }
  return s;
})();

const FRONDS = [
  [40, 6, 18, -12],
  [-40, 8, -18, -12],
  [30, -12, 14, -20],
  [-28, -14, -12, -22],
  [24, 18, 16, -2],
  [-22, 20, -12, -2],
] as const;

function Palm({ x, base, h, color }: { x: number; base: number; h: number; color: string }) {
  const tx = x + 4;
  const ty = base - h;
  const trunk = `M${x} ${base}Q${x + 8} ${base - h / 2} ${tx} ${ty}`;
  const fronds = FRONDS.map((f) => `M${tx} ${ty}Q${tx + f[2]} ${ty + f[3]} ${tx + f[0]} ${ty + f[1]}`).join("");
  return (
    <g stroke={color} fill="none" strokeLinecap="round">
      <path d={trunk} strokeWidth={5} />
      <path d={fronds} strokeWidth={3.5} />
    </g>
  );
}

const v = (name: string) => `var(${name})`;

/** Placeholder river art in four lights (COMP-Scene). Replace with real photography as soon as it exists (BRAND-013). */
export function Scene({ time = "dusk", vessel = "sail", temple = true, parallax, label, className }: SceneProps) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const t = SKY[time];
  const sil = v(t.sil);
  const boatColors = {
    body: sil,
    win: v(t.glow),
    sail: time === "night" ? v("--nile-600") : v("--sand-100"),
    smoke: v("--sand-200"),
  };

  const svg = (
    <svg viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id={`${id}s`} x1={0} y1={0} x2={0} y2={1}>
          <stop offset={0} style={{ stopColor: v(t.sky[0]) }} />
          <stop offset={0.6} style={{ stopColor: v(t.sky[1]) }} />
          <stop offset={1} style={{ stopColor: v(t.sky[2]) }} />
        </linearGradient>
        <linearGradient id={`${id}w`} x1={0} y1={0} x2={0} y2={1}>
          <stop offset={0} style={{ stopColor: v(t.water[0]) }} />
          <stop offset={1} style={{ stopColor: v(t.water[1]) }} />
        </linearGradient>
      </defs>
      <rect width={800} height={310} fill={`url(#${id}s)`} />
      {t.stars ? (
        <g>
          {STARS.map((s, k) => (
            <circle
              key={k}
              className={styles.star}
              cx={s[0]}
              cy={s[1]}
              r={s[2]}
              fill={v("--sand-100")}
              style={{ animationDelay: `${s[3]}s` }}
            />
          ))}
        </g>
      ) : null}
      <circle cx={t.sx} cy={t.sy} r={t.sr} fill={v(t.sun)} />
      <g className={styles.far}>
        <path
          d="M-40 302V248Q40 238 120 246L200 234Q300 222 380 238L470 230Q560 220 650 236L840 226V302Z"
          fill={v(t.hills)}
          opacity={0.55}
        />
        {temple ? (
          <g fill={sil} opacity={0.9}>
            <path d="M110 304L118 246H160L164 304ZM170 304L174 246H216L224 304Z" />
            <rect x={160} y={262} width={14} height={5} />
          </g>
        ) : null}
      </g>
      <rect y={300} width={800} height={200} fill={`url(#${id}w)`} />
      <path d="M-40 300H840V310Q600 304 400 312T-40 308Z" fill={sil} />
      <g>
        {Array.from({ length: 9 }, (_, i) => {
          const w = Math.max(10, t.sr * 2.4 - i * 9);
          return (
            <rect
              key={i}
              className={styles.glint}
              x={t.sx - w / 2 + (i % 2 ? 6 : -6)}
              y={314 + i * 18}
              width={w}
              height={2.5}
              rx={1.25}
              fill={v(t.sun)}
              style={{ animationDelay: `${i * 0.35}s` }}
            />
          );
        })}
      </g>
      {vessel ? (
        <g className={styles.mid}>
          <g className={styles.drift}>
            <g opacity={0.22} transform="translate(0 704) scale(1 -1)">
              <g transform="translate(300 240) scale(1.1)">{vesselShapes(vessel, boatColors)}</g>
            </g>
            <g className={styles.boat}>
              <g transform="translate(300 240) scale(1.1)">{vesselShapes(vessel, boatColors)}</g>
            </g>
          </g>
        </g>
      ) : null}
      <g className={styles.near}>
        <Palm x={30} base={330} h={170} color={sil} />
        <Palm x={78} base={330} h={128} color={sil} />
        <Palm x={712} base={330} h={140} color={sil} />
        <Palm x={760} base={334} h={186} color={sil} />
        <path d="M-40 330Q120 318 240 332T520 336T840 326V340H-40Z" fill={sil} />
      </g>
    </svg>
  );

  const a11y = label ? { role: "img" as const, "aria-label": label } : { "aria-hidden": true as const };
  return parallax ? (
    <SceneParallax className={cx(styles.scene, className)} {...a11y}>
      {svg}
    </SceneParallax>
  ) : (
    <div className={cx(styles.scene, className)} {...a11y}>
      {svg}
    </div>
  );
}
