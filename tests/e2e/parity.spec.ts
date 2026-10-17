import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { expect, test, type Page } from "@playwright/test";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { registryMeta as registry, slug } from "../../src/components/ds/registry-meta";

/**
 * Visual parity (ENG-009): each component's parity story in the build vs its preview.html in the vendored design system,
 * same viewport, Day and Night. Over 1% different pixels must be listed, with a reason, in parity-allowlist.json.
 * Images and a JSON report are written to docs/screenshots/batch-02/parity/.
 */
test.skip(process.env.ENABLE_DEV_ROUTES !== "true", "parity frame needs ENABLE_DEV_ROUTES=true");

const root = resolve(__dirname, "../..");
const out = resolve(root, "docs/screenshots/batch-02/parity");
const allow: Record<string, string> = JSON.parse(readFileSync(resolve(__dirname, "parity-allowlist.json"), "utf8"));
const THRESHOLD = 0.01;
const reportPath = resolve(out, "report.json");
// Merge into the existing report so a partial run (-g) never drops other components' results.
const report: Record<string, Record<string, number>> = existsSync(reportPath) ? JSON.parse(readFileSync(reportPath, "utf8")) : {};

async function shot(page: Page, url: string, selector: string) {
  await page.goto(url, { waitUntil: "load" });
  // document.fonts.ready only covers fonts that already started loading. Load every family and weight the page
  // actually uses, so a cold browser (CI) never screenshots fallback text (it did: AmenityGrid 1.1% vs 0.09%).
  await page.evaluate(async () => {
    const wanted = new Set<string>();
    for (const el of Array.from(document.querySelectorAll("body *"))) {
      const cs = getComputedStyle(el);
      if (el.textContent?.trim()) wanted.add(`${cs.fontStyle} ${cs.fontWeight} 16px ${cs.fontFamily}`);
    }
    await Promise.all([...wanted].map((f) => document.fonts.load(f).catch(() => [])));
    await document.fonts.ready;
  });
  await page.waitForTimeout(150);
  return PNG.sync.read(await page.locator(selector).first().screenshot());
}

// Independent tests: one component failing must not skip the others.
test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });

for (const entry of registry.filter((e) => e.ds && e.parity)) {
  for (const theme of ["light", "dark"] as const) {
    test(`parity ${entry.name} ${theme}`, async ({ page }) => {
      mkdirSync(out, { recursive: true });
      const preview =
        pathToFileURL(resolve(root, `vendor/design-system/components/${entry.name}/preview.html`)).href + `?theme=${theme}`;
      const ds = await shot(page, preview, "#root");
      const build = await shot(page, `/dev-parity/${slug(entry.name)}/?theme=${theme}`, "#parity-root");
      const w = Math.min(ds.width, build.width);
      const h = Math.min(ds.height, build.height);
      const crop = (img: PNG) => {
        const c = new PNG({ width: w, height: h });
        PNG.bitblt(img, c, 0, 0, w, h, 0, 0);
        return c;
      };
      const diff = new PNG({ width: w, height: h });
      const changed = pixelmatch(crop(ds).data, crop(build).data, diff.data, w, h, { threshold: 0.1 });
      // Size differences count as changed area too.
      const area = Math.max(ds.width, build.width) * Math.max(ds.height, build.height);
      const ratio = (changed + (area - w * h)) / area;
      const base = `${out}/${entry.name}-${theme === "light" ? "day" : "night"}`;
      writeFileSync(`${base}-ds.png`, PNG.sync.write(ds));
      writeFileSync(`${base}-build.png`, PNG.sync.write(build));
      writeFileSync(`${base}-diff.png`, PNG.sync.write(diff));
      // One small file per result (safe when tests run in parallel), then merge them all into report.json.
      const resultsDir = resolve(out, "results");
      mkdirSync(resultsDir, { recursive: true });
      writeFileSync(
        `${resultsDir}/${entry.name}-${theme}.json`,
        JSON.stringify({ name: entry.name, theme, percent: Math.round(ratio * 10000) / 100 }),
      );
      for (const f of readdirSync(resultsDir)) {
        const r = JSON.parse(readFileSync(`${resultsDir}/${f}`, "utf8")) as { name: string; theme: string; percent: number };
        (report[r.name] ??= {})[r.theme] = r.percent;
      }
      writeFileSync(reportPath, JSON.stringify(report, null, 2));
      if (ratio > THRESHOLD)
        expect(
          allow[entry.name],
          `${entry.name} ${theme}: ${(ratio * 100).toFixed(1)}% different and not in parity-allowlist.json`,
        ).toBeTruthy();
    });
  }
}
