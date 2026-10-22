import { expect, test } from "@playwright/test";
import { LOCAL } from "../support/local-auth";
import { expectNoSeriousA11yIssues, setTheme } from "./helpers";

test.skip(!LOCAL, "needs the local Supabase stack: pnpm with-local-db pnpm test:e2e");

/** Batch 9-1: the price's "Why?", the compare tray, the season calendar and the evaluation radar (EXP-001, 004, 006, 009). */
const card = (page: import("@playwright/test").Page, name: string) => page.getByRole("article", { name });

test("a card's price explains itself from facts [EXP-001]", async ({ page }) => {
  await page.goto("/cruises/");
  const why = page.getByRole("button", { name: /^Why US\$/ }).first();
  await why.click();
  const sheet = page.getByRole("dialog", { name: /^Why US\$/ });
  await expect(sheet).toBeVisible();
  await expect(sheet).toContainText("per person for two sharing the lowest-priced cabin");
  await expect(sheet).toContainText("Not in this price");
  await page.keyboard.press("Escape");
  await expect(sheet).toBeHidden();
});

test("the compare tray: three at most, kept onto a vessel page, with the keyboard [EXP-004, DASH-PUB-004]", async ({ page }) => {
  await page.goto("/cruises/");
  await page.evaluate(() => localStorage.removeItem("nc-compare-v1"));
  await page.reload();
  const boxes = page.getByRole("list", { name: "Cruises" }).getByLabel("Compare");
  expect(await boxes.count()).toBeGreaterThanOrEqual(4);
  for (const i of [0, 1, 2]) {
    await boxes.nth(i).focus();
    await page.keyboard.press("Space");
  }
  const tray = page.getByRole("complementary", { name: "Compare" });
  await expect(tray.getByRole("link", { name: "Compare 3 vessels" })).toBeVisible();
  await boxes.nth(3).focus();
  await page.keyboard.press("Space");
  await expect(tray).toContainText("Compare up to 3 vessels at a time. Remove one first.");
  await expect(boxes.nth(3)).not.toBeChecked();

  // The tray follows you to a vessel page, which can remove from it too.
  const first = await tray
    .getByRole("button", { name: /^Remove .* from the comparison$/ })
    .first()
    .getAttribute("aria-label");
  await tray.getByRole("button", { name: first! }).click();
  await expect(tray.getByRole("link", { name: "Compare 2 vessels" })).toBeVisible();
  await page.goto("/cruises/sample-motor-one/");
  await expect(
    page.getByRole("complementary", { name: "Compare" }).getByRole("link", { name: "Compare 2 vessels" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Add to compare" }).click();
  await expect(page.getByRole("link", { name: "Compare 3 vessels" })).toBeVisible();
  await page.getByRole("link", { name: "Compare 3 vessels" }).click();
  await page.waitForURL(/\/cruises\/compare\/\?v=/);
  await expect(page.getByRole("table", { name: "Vessels compared" }).getByRole("columnheader")).toHaveCount(3);
});

test("the season calendar says each day's deadline, by keyboard [EXP-006, ADR-027]", async ({ page }) => {
  await page.goto("/nile-cruise-guide/when-to-go/");
  const cal = page.getByRole("region", { name: "Seasons and payment deadlines" });
  const status = cal.getByRole("status");
  await expect(status).toContainText("Book today and pay in full by");
  const pressed = cal.locator('button[aria-pressed="true"]');
  const before = await pressed.getAttribute("aria-label");
  await pressed.focus();
  await page.keyboard.press("ArrowRight");
  const after = await cal.locator('button[aria-pressed="true"]').getAttribute("aria-label");
  expect(after).not.toBe(before);
  await expect(status).toHaveText(after!);
  await expect(cal.locator('button[aria-pressed="true"]')).toBeFocused();
  await page.keyboard.press("End");
  await expect(status).toHaveText((await cal.locator('button[aria-pressed="true"]').getAttribute("aria-label"))!);
});

for (const theme of ["light", "dark"] as const) {
  test(`the four interactions pass axe in ${theme === "light" ? "Day" : "Night"} [EXP-001, 004, 006, 009, A11Y-001]`, async ({
    page,
  }) => {
    await setTheme(page, theme);
    await page.goto("/cruises/");
    await card(page, "Sample Motor Ship One").getByLabel("Compare").check();
    await page
      .getByRole("button", { name: /^Why US\$/ })
      .first()
      .click();
    await expectNoSeriousA11yIssues(page);
    await page.goto("/nile-cruise-guide/when-to-go/");
    await expectNoSeriousA11yIssues(page);
  });
}
