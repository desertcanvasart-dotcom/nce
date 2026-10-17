import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { cx } from "../lib/cx";
import { Icon, type IconName } from "../Icon/Icon";
import styles from "./Button.module.css";

export type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  /** primary: the one main action per view · outline: secondary · ghost: tertiary · link: inline navigation. */
  variant?: "primary" | "outline" | "ghost" | "link";
  size?: "sm" | "md" | "lg";
  /** arrow-right for forward actions, arrow-up-right for leaving the page. */
  icon?: IconName;
  onMedia?: boolean;
  block?: boolean;
  /** Renders a link. Internal paths ("/cruises") are locale-aware; external URLs are plain links. */
  href?: string;
  children?: ReactNode;
};

/** The action button (COMP-Button). Outline buttons fill from the left on hover. */
export function Button({
  variant = "outline",
  size = "md",
  icon,
  onMedia,
  block,
  href,
  children,
  className,
  ...rest
}: ButtonProps) {
  const cls = cx(
    styles.btn,
    styles[variant],
    size !== "md" && styles[size],
    onMedia && styles.media,
    block && styles.block,
    className,
  );
  const iconEl = icon ? (
    <Icon name={icon} className={cx(icon === "arrow-right" && styles.arrow, icon === "arrow-up-right" && styles.out)} />
  ) : null;

  if (href) {
    const internal = href.startsWith("/");
    return internal ? (
      <Link className={cls} href={href}>
        {children}
        {iconEl}
      </Link>
    ) : (
      <a className={cls} href={href}>
        {children}
        {iconEl}
      </a>
    );
  }
  return (
    <button type="button" className={cls} {...rest}>
      {children}
      {iconEl}
    </button>
  );
}
