/**
 * Batches 9-1 and 9-2a: screenshots of the interactions in their open states (EXP-001–006, 009), at 375, 768 and 1440 px, in
 * Day and Night. Needs a running server with the local sample data: pnpm -s tsx scripts/interaction-shots.ts
 */
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";

const base = "http://localhost:3100";
const out = resolve(import.meta.dirname, "../docs/screenshots/batch-09");
mkdirSync(out, { recursive: true });
async function main() {
  const browser = await chromium.launch();
  for (const theme of ["light", "dark"] as const) {
    for (const width of [375, 768, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      await page.addInitScript((t) => localStorage.setItem("nc-theme", t), theme);
      const name = (what: string) => `${out}/9-1-${what}-${width}-${theme === "light" ? "day" : "night"}.png`;
      await page.goto(`${base}/cruises/`);
      await page.evaluate(() => localStorage.removeItem("nc-compare-v1"));
      await page.reload();
      const boxes = page.getByRole("list", { name: "Cruises" }).getByLabel("Compare");
      for (const i of [0, 1]) await boxes.nth(i).check();
      await page.screenshot({ path: name("compare-tray") });
      await page
        .getByRole("button", { name: /^Why US\$/ })
        .first()
        .click();
      await page.waitForTimeout(300);
      await page.screenshot({ path: name("price-why") });
      await page.goto(`${base}/nile-cruise-guide/when-to-go/`);
      const cal = page.getByRole("region", { name: "Seasons and payment deadlines" });
      await cal.locator('button[aria-pressed="true"]').focus();
      await page.keyboard.press("ArrowDown");
      await cal.screenshot({ path: name("season-calendar") });
      await page.evaluate(() => localStorage.removeItem("nc-compare-v1"));
      await page.goto(`${base}/cruises/sample-dahabiya-nefertari/`);
      const radar = page.getByRole("img", { name: /^Evaluation / });
      await radar.scrollIntoViewIfNeeded();
      await page.waitForTimeout(1200);
      await radar.screenshot({ path: name("evaluation-radar") });
      // Batch 9-2a: the deck view with a cabin type open, both mooring states, the voyage part-way.
      const cabins = page.locator("#cabins");
      await cabins.getByRole("tabpanel").getByRole("button").first().click();
      await cabins.screenshot({ path: name("deck-view").replace("9-1-", "9-2a-") });
      const mooring = page.locator("#mooring");
      await mooring.screenshot({ path: name("mooring-private").replace("9-1-", "9-2a-") });
      await mooring.getByRole("button", { name: "Rafted, six abreast" }).click();
      await page.waitForTimeout(500);
      await mooring.screenshot({ path: name("mooring-rafted").replace("9-1-", "9-2a-") });
      await page.evaluate(() => document.querySelectorAll("#itinerary ol > li")[2]?.scrollIntoView({ block: "center" }));
      await page.waitForTimeout(1200);
      await page.screenshot({ path: name("voyage").replace("9-1-", "9-2a-") });
      await page.close();
    }
  }
  await browser.close();
}

void main();
