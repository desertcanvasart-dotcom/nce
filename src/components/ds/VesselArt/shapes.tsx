import type { ReactElement } from "react";
import type { VesselType } from "../lib/types";

/**
 * Side profiles drawn on a 240×120 grid with the waterline at y=96, ported from the design system's
 * vesselShapes(). The felucca variant is intentionally not ported (ADR-008, BRAND-027).
 */
export type VesselColors = { body: string; win: string; sail: string; smoke?: string };

function range(a: number, b: number, s: number): number[] {
  const out: number[] = [];
  for (let x = a; x <= b; x += s) out.push(x);
  return out;
}

export function vesselShapes(
  type: VesselType,
  col: VesselColors,
  classes: { sail?: string; puff?: string } = {},
): ReactElement[] {
  const { body, win, sail } = col;
  const smoke = col.smoke ?? col.sail;
  const s: ReactElement[] = [];
  const rect = (x: number, y: number, w: number, h: number, fill: string) =>
    s.push(<rect key={`r${s.length}`} x={x} y={y} width={w} height={h} fill={fill} />);
  const path = (d: string, fill: string, extra: Record<string, unknown> = {}) =>
    s.push(<path key={`p${s.length}`} d={d} fill={fill} {...extra} />);

  if (type === "motor") {
    path("M6 82H236L222 104H20Z", body);
    rect(16, 66, 206, 16, body);
    rect(26, 50, 186, 16, body);
    rect(40, 36, 150, 14, body);
    rect(176, 27, 22, 9, body);
    rect(66, 24, 96, 3, body);
    rect(70, 27, 2, 9, body);
    rect(156, 27, 2, 9, body);
    rect(112, 27, 2, 9, body);
    range(24, 212, 10).forEach((x) => rect(x, 71, 6, 6, win));
    range(34, 202, 10).forEach((x) => rect(x, 54, 6, 6, win));
    range(48, 182, 12).forEach((x) => rect(x, 40, 7, 5, win));
    rect(180, 29, 14, 4, win);
  } else if (type === "sail") {
    path("M2 80H238Q230 98 206 102H34Q12 98 2 80Z", body);
    rect(38, 64, 154, 16, body);
    range(46, 182, 14).forEach((x) => rect(x, 68, 8, 8, win));
    rect(50, 56, 112, 3, body);
    rect(54, 59, 2, 5, body);
    rect(156, 59, 2, 5, body);
    rect(104, 59, 2, 5, body);
    path("M236 64L150 4L200 66Z", sail, { className: classes.sail });
    path("M120 58L70 18L96 60Z", sail, { className: classes.sail });
    path("M238 66L146 0", "none", { stroke: body, strokeWidth: 2 });
    path("M122 60L67 15", "none", { stroke: body, strokeWidth: 1.6 });
    rect(197, 10, 2.6, 70, body);
    rect(93, 24, 2.2, 42, body);
  } else {
    path("M4 82H236L226 104H16Z", body);
    rect(14, 64, 214, 18, body);
    rect(30, 48, 172, 16, body);
    rect(150, 36, 38, 12, body);
    range(98, 220, 11).forEach((x) => rect(x, 69, 6, 8, win));
    range(22, 40, 11).forEach((x) => rect(x, 69, 6, 8, win));
    range(38, 194, 11).forEach((x) => rect(x, 52, 6, 7, win));
    rect(156, 39, 26, 4, win);
    path("M46 84A24 24 0 0 1 94 84Z", body);
    path("M54 84A16 16 0 0 1 86 84M70 84V68M70 84L59 73M70 84L81 73", "none", { stroke: win, strokeWidth: 1.5 });
    rect(112, 12, 10, 36, body);
    rect(110, 9, 14, 4, sail);
    (
      [
        [118, 2, 5, 0],
        [130, -6, 7, 1.2],
        [146, -12, 9, 2.4],
      ] as const
    ).forEach(([cx, cy, r, delay], i) =>
      s.push(
        <circle
          key={`sm${i}`}
          className={classes.puff}
          cx={cx}
          cy={cy}
          r={r}
          fill={smoke}
          style={{ animationDelay: `${delay}s` }}
        />,
      ),
    );
  }
  return s;
}
