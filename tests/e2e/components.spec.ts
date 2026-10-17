import { expect, test } from "@playwright/test";
import { registryMeta as registry, slug } from "../../src/components/ds/registry-meta";
import { expectNoSeriousA11yIssues, setTheme } from "./helpers";

// The gallery only exists with ENABLE_DEV_ROUTES=true; CI runs this file in its dev-routes pass.
test.skip(process.env.ENABLE_DEV_ROUTES !== "true", "gallery needs ENABLE_DEV_ROUTES=true");

test.describe("gallery", () => {
  for (const entry of registry) {
    for (const theme of ["light", "dark"] as const) {
      test(`gallery ${entry.name} has no serious accessibility issues in ${theme} (A11Y-001, A11Y-005)`, async ({ page }) => {
        await setTheme(page, theme);
        const res = await page.goto(`/dev/components/${slug(entry.name)}/`);
        expect(res?.status()).toBe(200);
        await expect(page.locator("[data-testid^=story-]")).toHaveCount(entry.stories);
        await expectNoSeriousA11yIssues(page);
      });
    }
  }

  test("gallery pages never scroll sideways on a 375px phone (I18N-007, BRAND-022)", async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } });
    const page = await ctx.newPage();
    const overflowing: string[] = [];
    for (const entry of registry) {
      await page.goto(`/dev/components/${slug(entry.name)}/`, { waitUntil: "load" });
      const wide = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (wide > 1) overflowing.push(`${entry.name} (+${wide}px)`);
    }
    expect(overflowing).toEqual([]);
    await ctx.close();
  });

  test("gallery index lists every design-system component (ENG-007)", async ({ page }) => {
    await page.goto("/dev/components/");
    for (const e of registry) await expect(page.getByRole("link", { name: new RegExp(`^${e.name}\\b`) })).toBeVisible();
    expect(registry.filter((e) => e.ds)).toHaveLength(22);
  });

  test("gallery: every focusable control shows the 2px focus ring (A11Y-002, A11Y-003)", async ({ page }) => {
    await page.goto("/dev/components/cruise-search/");
    const main = page.locator("main");
    await main.focus();
    let checked = 0;
    for (let i = 0; i < 25; i++) {
      await page.keyboard.press("Tab");
      const info = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || !el.closest("main")) return null;
        const s = getComputedStyle(el);
        const ring = s.outlineStyle !== "none" && parseFloat(s.outlineWidth) >= 2;
        // Some controls draw their ring on a wrapper (:has) or a child; accept either.
        const wrapper = el.closest("label") as HTMLElement | null;
        const wrapRing = wrapper ? getComputedStyle(wrapper).outlineStyle !== "none" : false;
        return { tag: el.tagName, ring: ring || wrapRing };
      });
      if (!info) continue;
      expect(info.ring, `focus ring on ${info.tag} #${i}`).toBe(true);
      checked++;
    }
    expect(checked).toBeGreaterThan(5);
  });

  test("gallery: reduced motion stops CSS and JS motion (A11Y-004)", async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: "reduce" });
    const page = await ctx.newPage();
    for (const name of ["scene", "gallery", "price-anatomy", "vessel-art"]) {
      await page.goto(`/dev/components/${name}/`, { waitUntil: "load" });
      await page.waitForTimeout(100);
      const running = await page.evaluate(() => document.getAnimations().filter((a) => a.playState === "running").length);
      expect(running, `${name}: running animations`).toBe(0);
    }
    // Gallery frames must not tilt in 3D under reduced motion.
    await page.goto("/dev/components/gallery/");
    const transforms = await page.locator("figure").evaluateAll((els) => els.map((e) => (e as HTMLElement).style.transform));
    expect(transforms.every((t) => t === "")).toBe(true);
    await ctx.close();
  });

  test("gallery: count-up totals jump straight to the value under reduced motion", async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: "reduce" });
    const page = await ctx.newPage();
    await page.goto("/dev/components/price-anatomy/");
    await page.getByRole("button", { name: "The US$8,000 five-star" }).click();
    await expect(page.getByText("US$8,000", { exact: true })).toBeVisible({ timeout: 100 });
    await ctx.close();
  });
});

test.describe("gallery without JavaScript (PERF-009)", () => {
  test.use({ javaScriptEnabled: false });
  test("gallery server-rendered components are readable", async ({ page }) => {
    await page.goto("/dev/components/cruise-card/");
    await expect(page.getByRole("heading", { name: "Dahabiya Meroe" })).toBeVisible();
    await page.goto("/dev/components/itinerary-timeline/");
    await expect(page.getByText(/Day 6 · Aswan/).first()).toBeAttached();
    await page.goto("/dev/components/cabin-picker/");
    await expect(page.getByRole("radio", { name: /Junior suite/ }).first()).toBeAttached();
  });
});
