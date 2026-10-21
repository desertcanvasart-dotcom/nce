/**
 * EXP-009: the evaluation radar's geometry, kept pure so the points are tested against the scores. Each dimension is an
 * axis; its point sits at (points ÷ weight) of the radius, so a full mark reaches the rim whatever the weight.
 */
export type RadarAxis = { key: string; label: string; weight: number; points: number };

export function radarPoints(axes: RadarAxis[], radius: number, centre: number): { x: number; y: number; share: number }[] {
  return axes.map((a, i) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / axes.length;
    const share = a.weight > 0 ? Math.max(0, Math.min(1, a.points / a.weight)) : 0;
    return {
      x: Math.round((centre + Math.cos(angle) * radius * share) * 100) / 100,
      y: Math.round((centre + Math.sin(angle) * radius * share) * 100) / 100,
      share,
    };
  });
}

/** The rim (or a ring at a fraction of it) as an SVG polygon's points. */
export function ring(count: number, radius: number, centre: number, fraction = 1): string {
  return Array.from({ length: count }, (_, i) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / count;
    return `${Math.round((centre + Math.cos(angle) * radius * fraction) * 100) / 100},${Math.round((centre + Math.sin(angle) * radius * fraction) * 100) / 100}`;
  }).join(" ");
}
