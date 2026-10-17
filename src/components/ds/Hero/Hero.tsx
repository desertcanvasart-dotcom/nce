import type { ReactNode } from "react";
import { cx } from "../lib/cx";
import type { SceneTime, VesselType } from "../lib/types";
import { Media, type MediaProps } from "../Media/Media";
import { Scene } from "../Scene/Scene";
import styles from "./Hero.module.css";

export type HeroProps = {
  /** Short, one idea. The page's only H1 and only display-xl headline. */
  title: ReactNode;
  eyebrow?: string;
  subtitle?: ReactNode;
  /** Usually a link Button with onMedia. */
  action?: ReactNode;
  /** Usually <NavBar overMedia />. */
  nav?: ReactNode;
  /** Photo (preferred); loaded with priority because it is usually the LCP element. */
  image?: MediaProps["image"];
  time?: SceneTime;
  vessel?: VesselType | null;
  /** Minimum height in px (default 640). */
  height?: number;
  /** Floating slot, usually CruiseSearch. */
  children?: ReactNode;
};

/** Full-bleed opening: photo or scene, scrim, eyebrow, display headline, lead and a floating slot (COMP-Hero). One per page. */
export function Hero({
  title,
  eyebrow,
  subtitle,
  action,
  nav,
  image,
  time = "dusk",
  vessel = null,
  height,
  children,
}: HeroProps) {
  return (
    <section className={styles.hero} style={height ? { minHeight: height } : undefined}>
      <div className={styles.media}>
        {image ? (
          <Media image={image} priority sizes="100vw" className={styles.fill} />
        ) : (
          <Scene time={time} vessel={vessel} parallax />
        )}
      </div>
      {nav}
      <div className={styles.body}>
        {eyebrow ? <p className={cx(styles.eyebrow, styles.rise)}>{eyebrow}</p> : null}
        <h1 className={cx(styles.title, styles.rise)}>{title}</h1>
        {subtitle ? <p className={cx(styles.sub, styles.rise)}>{subtitle}</p> : null}
        {action}
      </div>
      {children ? <div className={styles.slot}>{children}</div> : null}
    </section>
  );
}
