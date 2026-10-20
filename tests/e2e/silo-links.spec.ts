import { expect, test } from "@playwright/test";
import { allowedLinks, BUILT, expectedLinks, LINK_MAP } from "@/lib/seo/links";
import { expectNoSeriousA11yIssues, setTheme } from "./helpers";

/**
 * The CI link check (SEO-008–014, ADR-096): every built education page against its row in the silo workbook
 * (src/lib/seo/link-map.json). Links in the page's main content must be the row's own (up, down, across, bridges, the
 * closing listing) or vessel pages from the cruise cards; every one of them must exist; anchors are never "click here"
 * or a bare URL.
 */
const EDUCATION = [...BUILT].filter((u) => !u.startsWith("/cruises/"));
// Home and the pillars link to many pages; each link is fetched to prove it exists.
test.describe.configure({ timeout: 90_000 });

for (const url of EDUCATION) {
  test(`${url} links as the workbook says [SEO-008–014]`, async ({ page, request }) => {
    const row = LINK_MAP[url]!;
    await page.goto(url);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(row.h1);
    if (url !== "/") await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toBeVisible();

    const links = await page
      .locator("main a[href^='/']")
      .evaluateAll((as) =>
        as.map((a) => ({ href: new URL((a as HTMLAnchorElement).href).pathname, text: a.textContent?.trim() ?? "" })),
      );
    const hrefs = new Set(links.map((l) => l.href));

    // Everything the workbook asks for is there (up, children, siblings, bridges, the closing listing).
    for (const want of expectedLinks(url)) expect([...hrefs], `${url} should link to ${want}`).toContain(want);

    // Nothing else: other education pages only where the row allows (SEO-011); vessel pages only from cruise cards.
    const allowed = allowedLinks(url);
    for (const { href } of links) {
      const isVesselPage = /^\/cruises\/[a-z0-9-]+\/$/.test(href) && !LINK_MAP[href];
      // Utility links (sign-in, contact) are not silo links.
      if (isVesselPage || href === "/cruises/compare/" || href.startsWith("/account/") || href === "/contact/") continue;
      if (url === "/") {
        // Home links the pillars and featured hubs.
        expect(BUILT.has(href) || href === "/", `${href} on home`).toBe(true);
        continue;
      }
      expect(allowed.has(href), `${url} links to ${href}, which its workbook row doesn't list`).toBe(true);
    }

    // SEO-014: descriptive anchors.
    for (const { text, href } of links) {
      expect(text.toLowerCase(), `anchor to ${href}`).not.toMatch(/^(click here|here|read more|https?:\/\/)/);
    }

    // No silo link to a page that doesn't exist (ADR-093). Vessel pages in the cruise row are the marketplace tests'
    // job: other specs change test vessels straight in the database, so a cached row can briefly name one.
    const statuses = await Promise.all(
      [...hrefs]
        .filter((h) => !h.startsWith("/account/") && !(/^\/cruises\/[a-z0-9-]+\/$/.test(h) && !LINK_MAP[h]))
        .map(async (h) => [h, (await request.get(h)).status()] as const),
    );
    for (const [href, status] of statuses) expect(status, `${url} → ${href}`).toBe(200);
  });
}

test("education pages say they are drafts and carry their structured data [ADR-096, SEO-028]", async ({ page }) => {
  await page.goto("/vessels/dahabiya/");
  await expect(page.getByText("Draft for review")).toBeVisible();
  const ld = (await page.locator('script[type="application/ld+json"]').allTextContents()).join("\n");
  expect(ld).toContain('"BreadcrumbList"');
  expect(ld).toContain('"Article"');
  expect(ld).toContain('"FAQPage"');
  await page.goto("/");
  const home = (await page.locator('script[type="application/ld+json"]').allTextContents()).join("\n");
  expect(home).toContain('"Organization"');
  expect(home).toContain('"SearchAction"');
  expect(home).toContain("/cruises/?q={search_term_string}");
});

test("the vessel comparison shows real figures, never sample prices [DATA-009]", async ({ page }) => {
  await page.goto("/vessels/compare/");
  await expect(page.getByText("See current prices on each dahabiya").first()).toBeVisible();
  await expect(page.getByText(/US\$2,000–9,000/)).toHaveCount(0); // the design system's sample price
});

test("unbuilt and felucca pages don't exist [ADR-008]", async ({ request }) => {
  for (const u of ["/vessels/felucca/", "/vessels/dahabiya/history/", "/vessels/compare/dahabiya-vs-felucca/"])
    expect((await request.get(u)).status(), u).toBe(404);
});

test.describe("education pages are accessible", () => {
  for (const theme of ["light", "dark"] as const) {
    test(`home, a pillar, a hub, an article and a comparison (${theme})`, async ({ page }) => {
      await setTheme(page, theme);
      for (const path of [
        "/",
        "/vessels/",
        "/vessels/dahabiya/",
        "/vessels/dahabiya/a-day-on-board/",
        "/vessels/compare/dahabiya-vs-cruise-ship/",
      ]) {
        await page.goto(path);
        await expectNoSeriousA11yIssues(page);
      }
    });
  }
});

test("the price calculator changes with each choice and says it isn't a quote [PAGE-059, DATA-008]", async ({ page }) => {
  await page.goto("/nile-cruise-prices/price-calculator/");
  await expect(page.getByText("Sample data").first()).toBeVisible();
  await expect(page.getByText(/They are not quotes/)).toBeVisible();
  const total = page.locator("[aria-live='polite']").first();
  const before = await total.textContent();
  await page.getByRole("radiogroup", { name: "Cabin" }).getByRole("radio", { name: /Suite/ }).first().click();
  await expect(total).not.toHaveText(before ?? "");
  const ld = (await page.locator('script[type="application/ld+json"]').allTextContents()).join("\n");
  expect(ld).toContain('"WebApplication"');
});

test("route guides show the days and the vessels, never a price grid [SEO-023]", async ({ page }) => {
  for (const url of ["/nile-cruise-guide/routes/luxor-to-aswan/", "/nile-cruise-guide/routes/esna-to-aswan/"]) {
    await page.goto(url);
    await expect(page.getByText(/Edfu/).first()).toBeVisible();
    // The only prices allowed are on the closing cruise cards (a "from" price per vessel).
    const article = page.locator("article").first();
    await expect(article.locator("table")).toHaveCount(0);
    await expect(article.getByText(/How a price is built/)).toHaveCount(0);
  }
});
