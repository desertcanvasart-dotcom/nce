/**
 * PERF-004: no route may ship more than ~200 KB of gzipped JavaScript without a logged reason.
 * Reads every prerendered page in .next/server/app, collects the <script src> chunks it loads,
 * and sums their gzipped size. Run after `pnpm build`.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { gzipSync } from "node:zlib";

const BUDGET_KB = 200;
// Routes allowed above budget, each with its reason (also logged in DECISIONS).
const EXCEPTIONS: Record<string, string> = {};

const root = resolve(import.meta.dirname, "..");
const appDir = join(root, ".next/server/app");
if (!existsSync(appDir)) {
  console.error("No build found. Run `pnpm build` first.");
  process.exit(1);
}

const walk = (d: string, out: string[] = []) => {
  for (const n of readdirSync(d)) {
    const p = join(d, n);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith(".html")) out.push(p);
  }
  return out;
};

const gzCache = new Map<string, number>();
const gz = (file: string) => {
  if (!gzCache.has(file)) gzCache.set(file, existsSync(file) ? gzipSync(readFileSync(file)).length : 0);
  return gzCache.get(file)!;
};

let failed = false;
const rows: string[] = [];
for (const html of walk(appDir)) {
  const route =
    "/" +
    relative(appDir, html)
      .replace(/\.html$/, "")
      .replace(/index$/, "");
  // Legacy polyfills (noModule) are skipped by every modern browser, so they do not count.
  const tags = [...readFileSync(html, "utf8").matchAll(/<script[^>]*>/g)].map((m) => m[0]).filter((t) => !/noModule/i.test(t));
  const srcs = new Set(tags.map((t) => /src="([^"]+\.js)"/.exec(t)?.[1]).filter((s): s is string => !!s));
  const bytes = [...srcs].reduce((sum, src) => sum + gz(join(root, ".next", src.replace(/^\/_next\//, ""))), 0);
  const kb = bytes / 1024;
  const over = kb > BUDGET_KB && !EXCEPTIONS[route];
  if (over) failed = true;
  rows.push(`${over ? "OVER" : "ok  "}  ${kb.toFixed(1).padStart(7)} KB  ${route}`);
}
console.log(rows.sort().join("\n"));
console.log(`\nBudget: ${BUDGET_KB} KB gzipped JS per route.`);
if (failed) process.exit(1);
