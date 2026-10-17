/**
 * ENG-008: full-page screenshots of each route at 375, 768 and 1440 px, in Day and Night.
 *   pnpm screenshots --batch 01 [--base http://localhost:3100] [--routes /,/es/]
 * Needs a running server (pnpm build && ENABLE_DEV_ROUTES=true pnpm start --port 3100).
 */
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";

const arg = (name: string, fallback: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1]! : fallback;
};
const batch = arg("batch", "01");
const base = arg("base", "http://localhost:3100");
const routes = arg("routes", "/,/es/,/ja/,/terms/,/privacy/,/no-such-page/,/dev/error-preview/").split(",");
const widths = [375, 768, 1440];
const themes = ["light", "dark"] as const;
const outDir = resolve(import.meta.dirname, `../docs/screenshots/batch-${batch}`);
mkdirSync(outDir, { recursive: true });

const slug = (route: string) => route.replace(/^\/|\/$/g, "").replace(/\//g, "-") || "home";

async function main() {
  const browser = await chromium.launch();
  let count = 0;
  for (const theme of themes) {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    await context.addInitScript((t) => localStorage.setItem("nc-theme", t), theme);
    const page = await context.newPage();
    for (const route of routes) {
      for (const width of widths) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(base + route, { waitUntil: "networkidle" });
        await page.evaluate(() => document.fonts.ready);
        const file = `${outDir}/${slug(route)}-${width}-${theme === "light" ? "day" : "night"}.png`;
        await page.screenshot({ path: file, fullPage: true });
        count++;
      }
    }
    await context.close();
  }
  await browser.close();
  console.log(`Saved ${count} screenshots to ${outDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
