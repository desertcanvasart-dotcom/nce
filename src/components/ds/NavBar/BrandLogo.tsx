import Image from "next/image";
import { cx } from "../lib/cx";
import styles from "./BrandLogo.module.css";

/** The final logo files in /public (Islam, 4 Nov 2026), each in a version for light and for dark backgrounds. */
const FILES = {
  strapline: {
    light: "/nilecruz-logo-strapline-dark-on-light.svg",
    dark: "/nilecruz-logo-strapline-light-on-dark.svg",
    w: 337,
    h: 112,
  },
  wordmark: { light: "/nilecruz-wordmark-dark-on-light.svg", dark: "/nilecruz-wordmark-light-on-dark.svg", w: 337, h: 96 },
} as const;

/**
 * The Nilecruz logo: the wordmark, or the wordmark with its English strapline. Both colour versions are in the page and
 * the theme shows one (Day: dark on light; Night, or over a photo: light on dark), so it never flashes on load.
 */
export function BrandLogo({
  variant,
  alt,
  onMedia = false,
  className,
}: {
  variant: keyof typeof FILES;
  /** What the logo says, e.g. "Nilecruz" or "Nilecruz: Nile cruises, explained". */
  alt: string;
  /** Over a photo or scene the light version is always used. */
  onMedia?: boolean;
  className?: string;
}) {
  const f = FILES[variant];
  return (
    <span className={cx(styles.logo, onMedia && styles.onMedia, className)}>
      <Image src={f.light} alt={alt} width={f.w} height={f.h} unoptimized priority className={styles.forLight} />
      <Image src={f.dark} alt={alt} width={f.w} height={f.h} unoptimized priority className={styles.forDark} />
    </span>
  );
}
