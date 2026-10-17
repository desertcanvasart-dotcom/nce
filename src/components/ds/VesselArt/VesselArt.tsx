import { useTranslations } from "next-intl";
import { cx } from "../lib/cx";
import type { VesselType } from "../lib/types";
import { vesselShapes } from "./shapes";
import styles from "./VesselArt.module.css";

export type VesselArtProps = {
  type: VesselType;
  /** Accessible name; defaults to the vessel type's name. */
  title?: string;
  waterline?: boolean;
  /** Decorative use (e.g. beside visible text): hidden from assistive technology. */
  decorative?: boolean;
  className?: string;
};

/** Side-profile illustration of a vessel type; sails billow and steam puffs (COMP-VesselArt). */
export function VesselArt({ type, title, waterline = true, decorative, className }: VesselArtProps) {
  const t = useTranslations("ds.vesselTypes");
  return (
    <svg
      className={cx(styles.vessel, className)}
      viewBox="0 -20 240 140"
      preserveAspectRatio="xMidYMax meet"
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : (title ?? t(type))}
      aria-hidden={decorative ? true : undefined}
    >
      {vesselShapes(
        type,
        { body: "currentColor", win: "var(--surface-raised)", sail: "var(--brass-300)", smoke: "var(--line)" },
        { sail: styles.sail, puff: styles.puff },
      )}
      {waterline ? <path d="M0 104H240" stroke="var(--line)" strokeWidth={1} /> : null}
    </svg>
  );
}
