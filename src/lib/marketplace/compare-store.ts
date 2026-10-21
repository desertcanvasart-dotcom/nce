/**
 * EXP-004: the vessels a traveller is comparing, kept on this device (localStorage) and shared by every listing and
 * vessel page in the tab, and across tabs. At most COMPARE_MAX; the comparison page itself reads its address.
 */
import { COMPARE_MAX } from "./listing";

export type Compared = { slug: string; name: string };
const KEY = "nc-compare-v1";
const EVENT = "nc-compare";

export function parseCompared(raw: string | null): Compared[] {
  try {
    const list = JSON.parse(raw ?? "[]") as unknown;
    if (!Array.isArray(list)) return [];
    return list
      .filter(
        (x): x is Compared =>
          !!x && typeof x.slug === "string" && typeof x.name === "string" && /^[a-z0-9-]{1,120}$/.test(x.slug),
      )
      .slice(0, COMPARE_MAX);
  } catch {
    return [];
  }
}

/** Adding past the limit changes nothing and says so. */
export function toggled(list: Compared[], item: Compared, on: boolean): { list: Compared[]; full: boolean } {
  const without = list.filter((x) => x.slug !== item.slug);
  if (!on) return { list: without, full: false };
  if (without.length >= COMPARE_MAX) return { list, full: true };
  return { list: [...without, item], full: false };
}

let cache: { raw: string | null; list: Compared[] } = { raw: null, list: [] };
export function readCompared(): Compared[] {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    // Storage blocked: nothing is remembered.
  }
  if (raw !== cache.raw) cache = { raw, list: parseCompared(raw) };
  return cache.list;
}
export function writeCompared(list: Compared[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // As above.
  }
  window.dispatchEvent(new Event(EVENT));
}
export function subscribeCompared(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(EVENT, onChange);
  };
}
const EMPTY: Compared[] = [];
export const serverCompared = () => EMPTY;
