import type { ReactNode } from "react";
import { cx } from "../lib/cx";
import { Icon, type IconName } from "../Icon/Icon";
import styles from "./Badge.module.css";

export type BadgeProps = {
  /** neutral · accent (scarcity, highlights) · success · danger · media (on photos). Status tones need a word (BRAND-019). */
  tone?: "neutral" | "accent" | "success" | "danger" | "media";
  icon?: IconName;
  children: ReactNode;
};

/** Small uppercase label for vessel type, scarcity or status; three words or fewer (COMP-Badge). */
export function Badge({ tone = "neutral", icon, children }: BadgeProps) {
  return (
    <span className={cx(styles.badge, tone !== "neutral" && styles[tone])}>
      {icon ? <Icon name={icon} /> : null}
      {children}
    </span>
  );
}
