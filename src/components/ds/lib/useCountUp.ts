"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "./useReducedMotion";

/**
 * Totals count up to their new value (BRAND-BOOK §Motion, 700 ms ease-out cubic as in the design system).
 * Under reduced motion the value jumps straight to the target (A11Y-004).
 */
export function useCountUp(target: number, durationMs = 700): number {
  const reduced = useReducedMotion();
  const [value, setValue] = useState(target);
  const from = useRef(target);

  useEffect(() => {
    if (reduced) {
      from.current = target;
      return;
    }
    let raf = 0;
    let start: number | null = null;
    const begin = from.current;
    const step = (ts: number) => {
      if (start === null) start = ts;
      const p = Math.min(1, (ts - start) / durationMs);
      const k = 1 - Math.pow(1 - p, 3);
      const n = begin + (target - begin) * k;
      from.current = n;
      setValue(n);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs, reduced]);

  return reduced ? target : value;
}
