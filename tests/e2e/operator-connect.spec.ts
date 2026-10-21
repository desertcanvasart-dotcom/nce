import { expect, test } from "@playwright/test";
import { WAYS } from "@/content/operator-connect";
import { expectNoSeriousA11yIssues, setTheme } from "./helpers";

/** PAGE-107 (Faris, 21 Oct 2026): how operators connect, linked from the footer only. */
const URL = "/operators/connect/";

test("explains each way to connect, with the comparison, the booking rule and the questions", async ({ page }) => {
  await page.goto(URL);
  await expect(page.getByRole("heading", { level: 1, name: "How operators connect to Nilecruz" })).toBeVisible();
  for (const w of WAYS) await expect(page.getByRole("heading", { level: 2, name: w.title })).toBeVisible();
  const table = page.getByRole("table");
  await expect(table.getByRole("row")).toHaveCount(WAYS.length + 1);
  await table.getByRole("link", { name: "Answer booking requests with one tap" }).click();
  await expect(page).toHaveURL(/#one-tap$/);
  await expect(page.getByRole("heading", { name: "How each way changes the way guests book" })).toBeVisible();
  // Every screenshot on the page has alt text.
  for (const img of await page.locator("figure img").all()) expect((await img.getAttribute("alt"))?.length).toBeGreaterThan(40);
  const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').last().textContent())!);
  expect(ld["@type"]).toBe("FAQPage");
  await expect(page.getByText(/commission/i)).toHaveCount(0);
  await page.getByRole("link", { name: "Apply as an operator" }).click();
  await expect(page).toHaveURL(/\/account\/(sign-in|apply-operator)\//);
});

test("is in the footer, not the main menu", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("contentinfo").getByRole("link", { name: "For operators" })).toHaveAttribute(
    "href",
    /\/operators\/connect\/?$/,
  );
  await expect(page.getByRole("banner").getByRole("link", { name: "For operators" })).toHaveCount(0);
});

test("passes axe in Day and Night", async ({ page }) => {
  await page.goto(URL);
  await expectNoSeriousA11yIssues(page);
  await setTheme(page, "dark");
  await page.goto(URL);
  await expectNoSeriousA11yIssues(page);
});
