import { expect, test } from "@playwright/test";
import { expectNoSeriousA11yIssues, locales, setTheme } from "./helpers";

/** PAGE-002, /nile-cruise-guide/ (Islam's guide brief, 4 Nov 2026): the acceptance checks, in every language. */
test.describe("the guide hub", () => {
  for (const { code, prefix } of locales) {
    test(`${code}: plans the trip and leaves boats to /vessels/ [PAGE-002]`, async ({ page, request }) => {
      const html = await (await request.get(`${prefix}/nile-cruise-guide/`)).text();
      for (const banned of ["Draft for review", "Cruises you can book", "Information only"])
        expect(html, banned).not.toContain(banned);
      await page.goto(`${prefix}/nile-cruise-guide/`);
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      // No comparison widget, scores or specifications.
      await expect(page.getByRole("table")).toHaveCount(0);
      await expect(page.getByRole("meter")).toHaveCount(0);
      // /vessels/ is linked twice: the hero's button and the callout after the four decisions.
      await expect(page.locator("main a[href$='/vessels/']")).toHaveCount(2);
      if (code !== "en") await expect(page.locator("main")).not.toHaveAttribute("lang", "en");
    });
  }

  test("the planner answers by keyboard, with links and the season's note [PAGE-002]", async ({ page, request }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto("/nile-cruise-guide/");
    await page.getByRole("link", { name: "Plan my route" }).click();
    await expect(page).toHaveURL(/#planner$/);
    const pick = async (group: string, name: string) => {
      const radio = page.getByRole("group", { name: group }).getByRole("radio", { name, exact: true });
      await radio.focus();
      await page.keyboard.press("Space");
      await expect(radio).toBeChecked();
    };
    const result = page.locator("[aria-live='polite']");
    await expect(result).toContainText("Answer all three questions");
    const paths: [string, string, string, string, RegExp, string[]][] = [
      [
        "Up to 3",
        "See the main temples on a set schedule",
        "November to February",
        "Aswan to Luxor, 3 nights.",
        /Christmas and New Year/,
        ["/nile-cruise-guide/routes/aswan-to-luxor/", "/cruises/aswan-to-luxor/"],
      ],
      [
        "4",
        "Go slowly, with time at small, quiet stops",
        "October, March or April",
        "Luxor to Aswan, 4 nights.",
        /fewer crowds and lower prices/,
        ["/nile-cruise-guide/routes/luxor-to-aswan/", "/cruises/luxor-to-aswan/"],
      ],
      [
        "5 or more",
        "Go slowly, with time at small, quiet stops",
        "May to September",
        "Esna to Aswan by dahabiya, 5 nights.",
        /Some dahabiyas don’t sail from June to August/,
        ["/nile-cruise-guide/routes/esna-to-aswan/", "/cruises/dahabiyas/"],
      ],
      [
        "5 or more",
        "See the main temples on a set schedule",
        "Not sure yet",
        "Luxor to Aswan, 4 nights.",
        /See when to go/,
        ["/nile-cruise-guide/when-to-go/", "/nile-cruise-guide/routes/luxor-to-aswan/", "/cruises/luxor-to-aswan/"],
      ],
    ];
    for (const [a, b, c, route, note, hrefs] of paths) {
      await pick("Step 1: How many nights do you have?", a);
      await pick("Step 2: How do you want to travel?", b);
      await pick("Step 3: When do you want to go?", c);
      await expect(result.locator("strong")).toHaveText(route);
      await expect(result).toContainText(note);
      await expect(result).toContainText("Check the cruise’s check-in and check-out times before you book flights.");
      const links = await result
        .getByRole("link")
        .evaluateAll((as) => as.map((a) => new URL((a as HTMLAnchorElement).href).pathname));
      expect(links).toEqual(hrefs);
      for (const h of links) expect((await request.get(h)).status(), h).toBe(200);
      await result.getByRole("button", { name: "Start over" }).press("Enter");
      await expect(result).toContainText("Answer all three questions");
      await expect(page.getByRole("radio", { name: "Up to 3" })).toBeFocused();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  });

  test("shares with a large image and keeps its title and structured data [PAGE-002, SEO-002]", async ({ page, request }) => {
    await page.goto("/nile-cruise-guide/");
    await expect(page).toHaveTitle("Nile cruise guide: routes, seasons and planning | Nilecruz");
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
    const og = await page.locator('meta[property="og:image"]').getAttribute("content");
    expect(og).toMatch(/\/images\/og\/nile-cruise-guide\.png$/);
    expect((await request.get(new URL(og!).pathname)).status()).toBe(200);
    await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute("content", og!);
    const ld = (await page.locator('script[type="application/ld+json"]').allTextContents()).join("\n");
    for (const type of ['"BreadcrumbList"', '"Article"', '"FAQPage"']) expect(ld).toContain(type);
    expect(ld).toContain("How long is a Nile cruise?");
  });

  for (const theme of ["light", "dark"] as const)
    test(`is accessible (${theme}) [A11Y-001]`, async ({ page }) => {
      await setTheme(page, theme);
      for (const path of ["/nile-cruise-guide/", "/es/nile-cruise-guide/", "/ja/nile-cruise-guide/"]) {
        await page.goto(path);
        await expectNoSeriousA11yIssues(page);
      }
    });
});

test.describe("the guide's pages", () => {
  for (const path of ["/nile-cruise-guide/routes/", "/nile-cruise-guide/when-to-go/", "/nile-cruise-guide/planning/"])
    test(`${path} shows vessels to explore, one of each type, never "you can book" [PAGE-002]`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByText("Cruises you can book")).toHaveCount(0);
      const row = page.locator("#closing-cruises ~ ul article");
      const n = await row.count();
      if (n) {
        await expect(page.getByRole("heading", { name: "Vessels to explore" })).toBeVisible();
        expect(n).toBeLessThanOrEqual(3);
        // Each card's first line is its vessel type (the price line is a paragraph too).
        const types = await row.evaluateAll((as) => as.map((a) => a.querySelector("p")?.textContent ?? ""));
        expect(new Set(types).size).toBe(types.length);
      }
    });

  test("when to go says some dahabiyas stop in summer, and the payment deadline isn't past [PAGE-002, EXP-006]", async ({
    page,
  }) => {
    await page.goto("/nile-cruise-guide/when-to-go/");
    await expect(page.getByText("Many Nile ships sail all year, though some dahabiyas stop from June to August.")).toBeVisible();
    await expect(page.getByText("Check that your boat is sailing, as some dahabiyas stop from June to August.")).toBeVisible();
    const status = await page.getByRole("region", { name: "Seasons and payment deadlines" }).getByRole("status").textContent();
    const due = status!.match(/pay in full by \w+, (\d+ \w+ \d{4})/)![1]!;
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" });
    expect(new Date(`${due} UTC`).toISOString().slice(0, 10) >= today).toBe(true);
  });

  test("routes recommends five nights on a dahabiya [PAGE-002]", async ({ page }) => {
    await page.goto("/nile-cruise-guide/routes/");
    await expect(
      page.getByText(
        "Most dahabiya cruises take four or five nights. We recommend five, which gives you the most time at quiet moorings.",
      ),
    ).toBeVisible();
  });
});
