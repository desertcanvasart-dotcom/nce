import { Cormorant_Garamond, Jost } from "next/font/google";

/**
 * Self-hosted at build time (PERF-006, Q15). Weights match the design system's bundle.css import.
 * Each face is exposed as a CSS variable that the generated --font-display / --font-sans stacks read.
 * Only the Latin files needed for first paint are preloaded; the rest load on demand.
 *
 * Japanese: no web font is downloaded (ADR-035). The stacks name Noto Serif JP / Noto Sans JP,
 * which devices that have them use; others fall back to their own Japanese faces. Self-hosting
 * them added ~200 KB of render-blocking @font-face CSS to every page and ~720 KB of fonts on /ja/,
 * pushing mobile LCP to 4–8 s.
 */
export const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
  preload: false,
  variable: "--font-face-cormorant",
});

export const jost = Jost({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  display: "swap",
  variable: "--font-face-jost",
});

export function fontVariables(_locale: string): string {
  return [cormorant.variable, jost.variable].join(" ");
}
