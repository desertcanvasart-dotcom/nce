import { expect, test } from "@playwright/test";
import { expectNoSeriousA11yIssues, locales, setTheme } from "./helpers";

/** PAGE-026, /vessels/ (Islam's vessels brief, ADR-106): the acceptance checks, in every language. */
test.describe("the vessels pillar", () => {
  for (const { code, prefix } of locales) {
    test(`${code}: all three types in the HTML, no drafts, no bookable claims [PAGE-026]`, async ({ page, request }) => {
      const html = await (await request.get(`${prefix}/vessels/`)).text();
      for (const banned of [
        "Draft for review",
        "Guests vary by vessel",
        "Cruises you can book",
        "6–8",
        "six to ten",
        "Information only",
      ])
        expect(html, banned).not.toContain(banned);
      await page.goto(`${prefix}/vessels/`);
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      // The comparison opens with all three types side by side.
      const table = page.getByRole("table");
      await expect(table.getByRole("columnheader")).toHaveCount(4);
      await expect(table.getByRole("meter")).toHaveCount(15);
      // Translated pages say so: no "shown in English" note, and the page is in its own language.
      if (code !== "en") await expect(page.locator("main")).not.toHaveAttribute("lang", "en");
      // Sample vessels: at most one of each type, none with a price or a booking claim.
      const cards = page.locator("#samples-heading ~ ul article");
      const n = await cards.count();
      expect(n).toBeLessThanOrEqual(3);
      const types = await cards.locator("p:first-of-type").allTextContents();
      expect(new Set(types).size).toBe(types.length);
      await expect(page.locator("#samples-heading ~ ul").getByText(/From, per person/)).toHaveCount(0);
    });
  }

  test("the chooser suggests a type for each answer path, by keyboard [PAGE-026]", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto("/vessels/");
    await page.getByRole("link", { name: "Help me choose" }).click();
    await expect(page).toHaveURL(/#chooser$/);
    const pick = async (group: string, name: string) => {
      const radio = page.getByRole("group", { name: group }).getByRole("radio", { name });
      await radio.focus();
      await page.keyboard.press("Space");
      await expect(radio).toBeChecked();
    };
    const result = page.locator("[aria-live='polite']").filter({ hasText: /suggestion|Answer all/ });
    await expect(result).toContainText("Answer all three questions");
    const paths: [string, string, string, RegExp, string][] = [
      [
        "Quiet and a small group",
        "Slowly, with time at small, quiet stops",
        "A couple or a small group",
        /sailing dahabiya/,
        "/vessels/dahabiya/",
      ],
      ["A pool, more facilities", "On a clear schedule", "A family", /motor cruise ship/, "/vessels/motor-cruise-ships/"],
      ["Historic character", "At a gentle pace", "Not sure yet", /paddle steamer/, "/vessels/paddle-steamers/"],
      // A tie (2 points each) goes to the first answer.
      ["Quiet and a small group", "On a clear schedule", "A family", /sailing dahabiya/, "/vessels/dahabiya/"],
    ];
    for (const [a, b, c, text, href] of paths) {
      await pick("Question 1: What matters most?", a);
      await pick("Question 2: How do you want to spend your days?", b);
      await pick("Question 3: Who is travelling?", c);
      await expect(result).toContainText(text);
      await expect(result.getByRole("link")).toHaveAttribute("href", href);
      await result.getByRole("button", { name: "Start over" }).press("Enter");
      await expect(result).toContainText("Answer all three questions");
      await expect(page.getByRole("radio", { name: "Quiet and a small group" })).toBeFocused();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  });

  test("shares with a large image and keeps its title [PAGE-026, SEO-002]", async ({ page, request }) => {
    await page.goto("/vessels/");
    await expect(page).toHaveTitle(/Nile cruise boat types: dahabiya, ship or steamer/);
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
    const og = await page.locator('meta[property="og:image"]').getAttribute("content");
    expect(og).toMatch(/\/images\/og\/vessels\.png$/);
    expect((await request.get(new URL(og!).pathname)).status()).toBe(200);
    const ld = (await page.locator('script[type="application/ld+json"]').allTextContents()).join("\n");
    for (const type of ['"BreadcrumbList"', '"Article"', '"FAQPage"']) expect(ld).toContain(type);
    expect(ld).toContain("How many nights should I choose on a dahabiya?");
  });

  for (const theme of ["light", "dark"] as const)
    test(`is accessible (${theme}) [A11Y-001]`, async ({ page }) => {
      await setTheme(page, theme);
      for (const path of ["/vessels/", "/es/vessels/", "/ja/vessels/", "/vessels/compare/"]) {
        await page.goto(path);
        await expectNoSeriousA11yIssues(page);
      }
    });
});
