import { expect, test } from "@playwright/test";
import { isTranslated } from "@/lib/seo/translations";
import { expectNoSeriousA11yIssues, locales, setTheme } from "./helpers";

for (const { code, prefix } of locales) {
  test.describe(`shell in ${code}`, () => {
    test("home renders with one H1, correct lang, canonical and the shell (ENG-018, SEO-002, SEO-006, I18N-001)", async ({
      page,
    }) => {
      const res = await page.goto(`${prefix}/`);
      expect(res?.status()).toBe(200);
      await expect(page.locator("html")).toHaveAttribute("lang", code);
      await expect(page.locator("h1")).toHaveCount(1);
      // Batch 10: a home page not yet translated points its canonical at the English home.
      const own = isTranslated("/", code);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        "href",
        new RegExp(`^https?://[^/]+${own ? prefix : ""}/$`),
      );
      await expect(page.locator("header")).toBeVisible();
      await expect(page.locator("footer")).toBeVisible();
      await expect(page.locator("main#main")).toBeVisible();
      expect(await page.title()).not.toBe("");
    });

    for (const theme of ["light", "dark"] as const) {
      test(`home has no serious accessibility issues in ${theme} (A11Y-001)`, async ({ page }) => {
        await setTheme(page, theme);
        await page.goto(`${prefix}/`);
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
        await expectNoSeriousA11yIssues(page);
      });
    }

    test("unknown page shows the branded 404 in this language (ENG-017)", async ({ page }) => {
      const res = await page.goto(`${prefix}/no-such-page/`);
      expect(res?.status()).toBe(404);
      await expect(page.locator("html")).toHaveAttribute("lang", code);
      await expect(page.locator("h1")).toHaveCount(1);
      await expectNoSeriousA11yIssues(page);
    });
  });
}

test("main navigation shows the five pillars plus Cruises and the CTA (SEO-015, BRAND-025)", async ({ page }) => {
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Main" });
  const links = nav.getByRole("link");
  await expect(links).toHaveText([
    "Cruises",
    "Vessels",
    "Why prices differ",
    "Nile cruise guide",
    "Destinations",
    "Tours & extras",
  ]);
  expect(await links.count()).toBeLessThanOrEqual(7);
  await expect(page.getByRole("link", { name: "Plan my cruise" }).first()).toHaveAttribute("href", "/plan-my-cruise/");
});

test("footer links to trust pages, silo roots and the draft legal pages (SEO-015, ENG-019)", async ({ page }) => {
  await page.goto("/");
  const footer = page.locator("footer");
  for (const href of [
    "/about/",
    "/how-we-choose-vessels/",
    "/contact/",
    "/cruises/",
    "/vessels/",
    "/nile-cruise-prices/",
    "/destinations/",
    "/tours-extras/",
    "/terms/",
    "/privacy/",
  ]) {
    await expect(footer.locator(`a[href="${href}"]`)).toHaveCount(1);
  }
});

test("language switch keeps the page and changes the language", async ({ page }) => {
  await page.goto("/");
  await page.locator("header").getByRole("link", { name: "ES", exact: true }).first().click();
  await expect(page).toHaveURL(/\/es\/$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await page.locator("header").getByRole("link", { name: "日本語" }).first().click();
  await expect(page).toHaveURL(/\/ja\/$/);
});

test("theme toggle switches to Night, persists across loads, with no flash (TOK-THEMES)", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByTestId("theme-toggle").first().click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  // The saved theme is applied by the inline head script, before React runs.
  await page.route("**/_next/static/chunks/**", (route) => route.abort());
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("skip link moves focus to the main content (A11Y-006)", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to content" });
  await expect(skip).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("main#main")).toBeFocused();
});

test.describe("without JavaScript (PERF-009)", () => {
  test.use({ javaScriptEnabled: false });
  test("the page is readable and navigable, and the theme button is hidden", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link")).toHaveCount(6);
    for (const toggle of await page.getByTestId("theme-toggle").all()) await expect(toggle).toBeHidden();
  });
});

test.describe("mobile menu", () => {
  test.use({ viewport: { width: 375, height: 812 } });
  test("opens without JavaScript-only controls and lists the navigation", async ({ page }) => {
    await page.goto("/");
    await page.getByText("Menu", { exact: true }).click();
    const nav = page.getByRole("navigation", { name: "Main" });
    await expect(nav.getByRole("link", { name: "Why prices differ" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "ES", exact: true })).toBeVisible();
    await expectNoSeriousA11yIssues(page);
  });
});

test("draft legal pages are marked draft and noindex; other locales 404 (ENG-019)", async ({ page }) => {
  for (const path of ["/terms/", "/privacy/"]) {
    const res = await page.goto(path);
    expect(res?.status()).toBe(200);
    await expect(page.getByRole("note")).toContainText("Draft");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expectNoSeriousA11yIssues(page);
  }
  expect((await page.goto("/es/terms/"))?.status()).toBe(404);
});

test("server errors show the branded 500 page with a retry (ENG-017)", async ({ page }) => {
  test.skip(process.env.ENABLE_DEV_ROUTES !== "true", "needs ENABLE_DEV_ROUTES=true on the server");
  await setTheme(page, "dark");
  await page.goto("/dev/error-preview/");
  await expect(page.locator("h1")).toHaveText("Something went wrong on our side");
  // Regression: the error page once re-mounted <html> and reset Night to Day.
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
  await expectNoSeriousA11yIssues(page);
});

test("the error preview route is closed unless explicitly enabled", async ({ page }) => {
  test.skip(process.env.ENABLE_DEV_ROUTES === "true", "only meaningful when dev routes are off");
  expect((await page.goto("/dev/error-preview/"))?.status()).toBe(404);
});
