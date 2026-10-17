import { cx } from "../lib/cx";
import { icons, type IconName } from "./icons";
import styles from "./Icon.module.css";

export type { IconName } from "./icons";

export type IconProps = {
  name: IconName;
  /** Give a label whenever the icon stands alone, so it is announced; omit it when visible text sits beside it. */
  label?: string;
  /** Fixed px size; by default the icon follows the font size (1em). */
  size?: number;
  filled?: boolean;
  className?: string;
};

/** 24px line icon from the system's own set (COMP-Icon, BRAND-015). */
export function Icon({ name, label, size, filled, className }: IconProps) {
  return (
    <svg
      className={cx(styles.icon, filled && styles.filled, className)}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      style={size ? { fontSize: size } : undefined}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      {icons[name].map((shape, i) => {
        const [tag, attrs] = shape;
        if (tag === "path") return <path key={i} d={attrs.d} />;
        if (tag === "circle")
          return <circle key={i} cx={attrs.cx} cy={attrs.cy} r={attrs.r} fill={"fill" in attrs ? attrs.fill : undefined} />;
        return (
          <rect
            key={i}
            x={attrs.x}
            y={attrs.y}
            width={attrs.width}
            height={attrs.height}
            rx={"rx" in attrs ? attrs.rx : undefined}
          />
        );
      })}
    </svg>
  );
}
