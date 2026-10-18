/**
 * ENG-008: full-page screenshots of each route at 375, 768 and 1440 px, in Day and Night.
 *   pnpm screenshots --batch 01 [--base http://localhost:3100] [--routes /,/es/]
 *   pnpm screenshots --batch 04a --as customer@example.test --routes /dashboard/journey/   (signed in, local seed only)
 *   --two-step also captures the two-step code screen before entering the code (admins).
 *   --password for a local test account made by the end-to-end tests (default: the seed password).
 * Needs a running server (pnpm build && ENABLE_DEV_ROUTES=true pnpm start --port 3100).
 */
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { chromium, type Page } from "@playwright/test";
import { totp } from "../tests/support/totp";

const arg = (name: string, fallback: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1]! : fallback;
};
const batch = arg("batch", "01");
const base = arg("base", "http://localhost:3100");
const routes = arg("routes", "/,/es/,/ja/,/terms/,/privacy/,/no-such-page/,/dev/error-preview/").split(",");
// Signed-in screenshots use the LOCAL seed accounts only (supabase/seed-users.md); never a real account.
const as = arg("as", "");
const twoStep = process.argv.includes("--two-step");
const prefix = arg("prefix", as ? `${as.split("@")[0]}-${as.split("@")[1]!.split(".")[0]}-` : "");
const widths = [375, 768, 1440];
const themes = ["light", "dark"] as const;
const outDir = resolve(import.meta.dirname, `../docs/screenshots/batch-${batch}`);
mkdirSync(outDir, { recursive: true });

const slug = (route: string) =>
  prefix +
  (route
    .replace(/^\/|\/$/g, "")
    .replace(/\//g, "-")
    .replace(/0{8}-0{4}-4000-b000-0+/g, "org-") || "home");

async function shoot(page: Page, name: string, theme: "light" | "dark") {
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(300);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: `${outDir}/${name}-${width}-${theme === "light" ? "day" : "night"}.png`, fullPage: true });
  }
}

async function signIn(page: Page, theme: "light" | "dark") {
  await page.goto(`${base}/account/sign-in/`);
  await page.getByLabel("Email").fill(as);
  await page.getByLabel("Password", { exact: true }).fill(arg("password", "nilecruz-local-only"));
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL((u) => !u.pathname.endsWith("/account/sign-in/"));
  if (new URL(page.url()).pathname.endsWith("/account/two-step/")) {
    if (twoStep) await shoot(page, `${prefix}account-two-step`, theme);
    await page.getByLabel("Six-digit code").fill(totp());
    await page.getByRole("button", { name: "Continue" }).click();
    await page.waitForURL((u) => !u.pathname.endsWith("/account/two-step/"));
  }
}

async function main() {
  const browser = await chromium.launch();
  let count = 0;
  for (const theme of themes) {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    await context.addInitScript((t) => localStorage.setItem("nc-theme", t), theme);
    const page = await context.newPage();
    if (as) await signIn(page, theme);
    for (const route of routes) {
      for (const width of widths) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(base + route, { waitUntil: "load" });
        await page.waitForTimeout(400);
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
