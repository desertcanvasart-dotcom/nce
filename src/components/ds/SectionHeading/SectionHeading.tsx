import type { ReactNode } from "react";
import { cx } from "../lib/cx";
import styles from "./SectionHeading.module.css";

export type SectionHeadingProps = {
  /** Six words or fewer; sentence case in source, uppercase by CSS (BRAND-004). */
  title: ReactNode;
  eyebrow?: string;
  intro?: ReactNode;
  align?: "center" | "left";
  as?: "h1" | "h2" | "h3";
  /** The ornament belongs only under section titles (BRAND-011). */
  ornament?: boolean;
};

/** Eyebrow, uppercase serif title, brass ornament and intro: the opening of every section (COMP-SectionHeading). */
export function SectionHeading({
  title,
  eyebrow,
  intro,
  align = "center",
  as: Tag = "h2",
  ornament = true,
}: SectionHeadingProps) {
  return (
    <header className={cx(styles.sh, align === "center" && styles.center)}>
      {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
      <Tag className={styles.title}>{title}</Tag>
      {ornament ? (
        <span className={styles.ornament} aria-hidden="true">
          <i />
        </span>
      ) : null}
      {intro ? <p className={styles.intro}>{intro}</p> : null}
    </header>
  );
}
