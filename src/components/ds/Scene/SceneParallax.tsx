"use client";

import { useRef, type ReactNode } from "react";
import { useReducedMotion } from "../lib/useReducedMotion";

type Props = { className?: string; children: ReactNode; role?: "img"; "aria-label"?: string; "aria-hidden"?: true };

/** Layers follow the pointer (BRAND-BOOK §Motion); off under reduced motion (A11Y-004). */
export function SceneParallax({ children, ...rest }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  return (
    <div
      ref={ref}
      {...rest}
      onPointerMove={
        reduced
          ? undefined
          : (ev) => {
              const el = ref.current;
              if (!el) return;
              const r = el.getBoundingClientRect();
              el.style.setProperty("--px", (((ev.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
              el.style.setProperty("--py", (((ev.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
            }
      }
    >
      {children}
    </div>
  );
}
