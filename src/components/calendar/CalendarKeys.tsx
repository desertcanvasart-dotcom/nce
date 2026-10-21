"use client";

import { useEffect } from "react";

const STEP: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 7, ArrowUp: -7 };
const DAY = 86_400_000;
const add = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);

/**
 * EXP-006: the season calendar's behaviour, on server-rendered days. One set of listeners on the grid moves the
 * chosen day with the arrow keys (a day or a week), Home and End, focus, hover or a click, and the status line reads it.
 */
export function CalendarKeys({ grid, status }: { grid: string; status: string }) {
  useEffect(() => {
    const root = document.getElementById(grid);
    const line = document.getElementById(status);
    if (!root || !line) return;
    const days = () => [...root.querySelectorAll<HTMLButtonElement>("button[data-day]")];
    const choose = (b: HTMLButtonElement, focus: boolean) => {
      const was = root.querySelector<HTMLButtonElement>('button[aria-pressed="true"]');
      if (was === b) return;
      if (was) {
        was.setAttribute("aria-pressed", "false");
        was.tabIndex = -1;
      }
      b.setAttribute("aria-pressed", "true");
      b.tabIndex = 0;
      line.textContent = b.getAttribute("aria-label");
      if (focus) b.focus();
    };
    const dayOf = (t: EventTarget | null) => (t instanceof Element ? t.closest<HTMLButtonElement>("button[data-day]") : null);
    const onKey = (e: KeyboardEvent) => {
      const b = dayOf(e.target);
      if (!b) return;
      const all = days();
      let to: HTMLButtonElement | null | undefined;
      if (STEP[e.key]) to = root.querySelector<HTMLButtonElement>(`button[data-day="${add(b.dataset.day!, STEP[e.key]!)}"]`);
      else if (e.key === "Home") to = all[0];
      else if (e.key === "End") to = all.at(-1);
      else return;
      e.preventDefault();
      if (to) choose(to, true);
    };
    const onPick = (e: Event) => {
      const b = dayOf(e.target);
      if (b) choose(b, false);
    };
    root.addEventListener("keydown", onKey);
    root.addEventListener("focusin", onPick);
    root.addEventListener("mouseover", onPick);
    root.addEventListener("click", onPick);
    return () => {
      root.removeEventListener("keydown", onKey);
      root.removeEventListener("focusin", onPick);
      root.removeEventListener("mouseover", onPick);
      root.removeEventListener("click", onPick);
    };
  }, [grid, status]);
  return null;
}
