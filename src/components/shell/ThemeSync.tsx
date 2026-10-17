"use client";

import { useLayoutEffect } from "react";
import { THEME_KEY } from "@/components/ds/NavBar/ThemeToggle";

/**
 * Re-applies the saved theme whenever the root layout mounts on the client. Normally the head
 * script has already done it; this covers client re-mounts (e.g. the error page), where React
 * rebuilds <html> and drops attributes it did not render.
 */
export function ThemeSync() {
  useLayoutEffect(() => {
    let theme = "light";
    try {
      theme = localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
    } catch {
      // Storage unavailable: Day.
    }
    if (document.documentElement.getAttribute("data-theme") !== theme) document.documentElement.setAttribute("data-theme", theme);
  }, []);
  return null;
}
