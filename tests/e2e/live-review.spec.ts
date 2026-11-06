import { expect, test } from "@playwright/test";

/** Islam's review of the live site, 6 Nov 2026: what every page must and mustn't say. */
for (const lang of ["", "/es", "/ja"]) {
  test(`${lang || "/en"}: the homepage leads with "Find the right Nile cruise", and the header shows the name only`, async ({
    page,
  }) => {
    await page.goto(`${lang}/`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Find the right Nile cruise");
    // The footer keeps the brand line; the hero no longer repeats it as an eyebrow.
    await expect(page.locator("main").getByText("Nile cruises, explained", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Draft for review")).toHaveCount(0);
    const logos = await page.locator("header img").evaluateAll((is) => is.map((i) => i.getAttribute("src") ?? ""));
    expect(logos.length).toBeGreaterThan(0);
    for (const src of logos) expect(src).toMatch(/nilecruz-wordmark-/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  });
}

test("'Cruises you can book' only heads a row where every cruise can be booked; no 'ten times'", async ({ page }) => {
  for (const url of ["/", "/vessels/compare/", "/vessels/dahabiya/", "/how-we-choose-vessels/", "/nile-cruise-prices/"]) {
    await page.goto(url);
    const main = page.locator("main");
    await expect(main, url).not.toContainText(/\bten times\b|tenfold|obligatory|Silsileh|US\$/);
    const row = page.locator("section", { has: page.getByRole("heading", { name: "Cruises you can book" }) });
    if (await row.count()) await expect(row, url).not.toContainText(/Information only|Booking unavailable through us/);
  }
});
