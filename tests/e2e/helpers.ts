import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

export const locales = [
  { code: "en", prefix: "" },
  { code: "es", prefix: "/es" },
  { code: "ja", prefix: "/ja" },
] as const;

/** A11Y-001: no serious or critical axe violations, in whichever theme the page is in. */
export async function expectNoSeriousA11yIssues(page: Page) {
  // Measure the settled page: text that is still fading in reads as low contrast under load.
  await page
    .waitForFunction(
      () => document.getAnimations().every((a) => a.playState !== "running" || a.effect?.getTiming().iterations === Infinity),
      null,
      {
        timeout: 5_000,
      },
    )
    .catch(() => undefined);
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
}

export async function setTheme(page: Page, theme: "light" | "dark") {
  await page.addInitScript((t) => localStorage.setItem("nc-theme", t), theme);
}
