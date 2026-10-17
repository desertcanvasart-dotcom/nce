import Image from "next/image";
import { cx } from "../lib/cx";
import type { SceneTime, VesselType } from "../lib/types";
import { Scene } from "../Scene/Scene";
import styles from "./Media.module.css";

export type MediaProps = {
  /** A real photograph wins (BRAND-013); without one the Scene placeholder is drawn. */
  image?: { src: string; alt: string; width: number; height: number };
  /** Responsive size hint for next/image (PERF-005). */
  sizes?: string;
  priority?: boolean;
  time?: SceneTime;
  vessel?: VesselType | null;
  temple?: boolean;
  /** Label for the placeholder scene, when the picture carries meaning. */
  sceneLabel?: string;
  className?: string;
};

/** Frame for a photo or its placeholder scene. Internal helper shared by cards, Hero and Gallery. */
export function Media({ image, sizes = "100vw", priority, time = "dusk", vessel, temple, sceneLabel, className }: MediaProps) {
  return (
    <div className={cx(styles.media, className)}>
      {image ? (
        <Image
          src={image.src}
          alt={image.alt}
          width={image.width}
          height={image.height}
          sizes={sizes}
          priority={priority}
          className={styles.fill}
        />
      ) : (
        <Scene time={time} vessel={vessel} temple={temple} label={sceneLabel} className={styles.fill} />
      )}
    </div>
  );
}
