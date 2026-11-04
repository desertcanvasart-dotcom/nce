import { expect, test } from "@playwright/test";
import { expectNoSeriousA11yIssues, setTheme } from "./helpers";

/** PAGE-074 (Islam's destinations brief, 4 Nov 2026): the river chart, the stops, who stops where, in three languages. */

test("the hub draws the river in the server's HTML, every stop in order, with no draft label", async ({ page }) => {
  await page.goto("/destinations/");
  await expect(page.getByRole("heading", { level: 1, name: "Temples and towns along the Nile" })).toBeVisible();
  const map = page.getByRole("navigation", { name: /River map from Luxor to Aswan/ });
  const names = await map.getByRole("listitem").allTextContents();
  expect(names.map((n) => n.trim())).toEqual([
    "Luxor",
    "Esna",
    "El Kab",
    "Edfu",
    "Gebel Silsila",
    "Kom Ombo",
    "Aswan",
    "Abu Simbel",
  ]);
  await expect(page.getByText("Not to scale")).toBeVisible();
  await expect(page.getByText("Upstream, sailing south →")).toBeVisible();
  for (const gone of ["Draft for review", "Cruises you can book", "In this guide", "Gebel Silsileh"])
    await expect(page.getByText(gone)).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Who stops where" })).toBeVisible();
  await expect(page.getByText("Which places does every cruise visit?")).toBeVisible();
  await expect(page.getByText(/No stop is on every cruise/)).toBeVisible();
  const ld = (await page.locator('script[type="application/ld+json"]').allTextContents()).join("\n");
  for (const type of ['"ItemList"', '"FAQPage"', '"Article"']) expect(ld).toContain(type);
  expect(ld).not.toMatch(/"(AggregateRating|Offer)"/);
});

test("the route control lights up each route's stops, by mouse and keyboard", async ({ page }) => {
  await page.goto("/destinations/");
  const map = page.getByRole("navigation", { name: /River map/ });
  const lit = async () =>
    map.locator("li").evaluateAll((lis) => lis.filter((l) => /lit/.test(l.className)).map((l) => l.textContent?.trim()));
  expect(await lit()).toEqual(["Luxor", "Edfu", "Kom Ombo", "Aswan"]);
  await page.getByRole("button", { name: "Esna–Aswan dahabiya" }).click();
  await expect(page.getByRole("button", { name: "Esna–Aswan dahabiya" })).toHaveAttribute("aria-pressed", "true");
  expect(await lit()).toEqual(["Esna", "El Kab", "Edfu", "Gebel Silsila", "Kom Ombo", "Aswan"]);
  const komOmbo = map.getByRole("link", { name: /^Kom Ombo, Stop 6/ });
  await komOmbo.focus();
  await page.keyboard.press("Enter");
  await expect(komOmbo).toHaveAttribute("aria-current", "true");
  await expect(page.getByRole("link", { name: "Read about Kom Ombo" })).toBeVisible();
});

test("on a phone the river runs downwards, the table becomes lists, and nothing scrolls sideways", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/destinations/");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  await expect(page.getByRole("table")).toBeHidden();
  await expect(page.getByRole("heading", { level: 3, name: "Esna–Aswan dahabiya" })).toBeVisible();
});

test("the hub reads in Spanish and Japanese", async ({ page }) => {
  await page.goto("/es/destinations/");
  await expect(page.getByRole("heading", { level: 1, name: "Templos y pueblos a orillas del Nilo" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Quién para dónde" })).toBeVisible();
  await page.goto("/ja/destinations/");
  await expect(page.getByRole("heading", { level: 1, name: "ナイル川沿いの神殿と町" })).toBeVisible();
  await expect(page.getByText("ゲベル・シルシラ").first()).toBeVisible();
});

test("a destination page shows its facts and its place on the river", async ({ page }) => {
  await page.goto("/destinations/edfu/");
  await expect(page.getByText("Typical visit About two hours", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "← Previous stop: Luxor" })).toHaveAttribute("href", "/destinations/luxor/");
  await expect(page.getByRole("link", { name: "Next stop: Kom Ombo →" })).toHaveAttribute("href", "/destinations/kom-ombo/");
  await expect(page.getByText("Cruises you can book")).toHaveCount(0);
});

for (const theme of ["light", "dark"] as const) {
  test(`the hub has no serious accessibility issues (${theme}) [A11Y-001]`, async ({ page }) => {
    await setTheme(page, theme);
    await page.goto("/destinations/");
    await expectNoSeriousA11yIssues(page);
  });
}
