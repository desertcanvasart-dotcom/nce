import { radarPoints, ring, type RadarAxis } from "@/lib/evaluation/radar";
import styles from "./EvaluationRadar.module.css";

/**
 * EXP-009: the evaluation's seven dimensions as a radar that unfolds from the centre when it comes into view. Pure SVG,
 * no JavaScript; with reduced motion it simply appears. The table beside it stays the accessible, exact version.
 */
export function EvaluationRadar({ axes, score }: { axes: RadarAxis[]; score: number }) {
  const size = 320;
  const centre = size / 2;
  const radius = 110;
  const pad = 100;
  const pts = radarPoints(axes, radius, centre);
  const label = `Evaluation ${Math.round(score)} out of 100: ${axes
    .map((a) => `${a.label} ${a.points.toFixed(1)} of ${a.weight}`)
    .join(", ")}.`;
  return (
    <figure className={styles.radar}>
      {/* Side margins so the longest labels ("Cruise experience") fit inside the drawing. */}
      <svg viewBox={`${-pad} 0 ${size + 2 * pad} ${size}`} role="img" aria-label={label}>
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <polygon key={f} points={ring(axes.length, radius, centre, f)} className={styles.ring} />
        ))}
        {axes.map((a, i) => {
          const rim = radarPoints([{ ...a, points: a.weight }], radius, centre)[0]!;
          const angle = -Math.PI / 2 + (i * 2 * Math.PI) / axes.length;
          const lx = centre + Math.cos(angle) * (radius + 26);
          const ly = centre + Math.sin(angle) * (radius + 18);
          return (
            <g key={a.key}>
              <line x1={centre} y1={centre} x2={rim.x} y2={rim.y} className={styles.spoke} />
              <text
                x={lx}
                y={ly}
                className={styles.axis}
                textAnchor={Math.abs(Math.cos(angle)) < 0.2 ? "middle" : Math.cos(angle) > 0 ? "start" : "end"}
                dominantBaseline="middle"
              >
                {a.label}
              </text>
            </g>
          );
        })}
        <g className={styles.unfold} style={{ transformOrigin: `${centre}px ${centre}px` }}>
          <polygon points={pts.map((p) => `${p.x},${p.y}`).join(" ")} className={styles.shape} />
          {pts.map((p, i) => (
            <circle key={axes[i]!.key} cx={p.x} cy={p.y} r={3.5} className={styles.dot} />
          ))}
        </g>
      </svg>
      <figcaption className={styles.caption}>Each point reaches the rim at a full mark for that dimension.</figcaption>
    </figure>
  );
}
