import { expect, test } from "@playwright/test";
import { LOCAL } from "../support/local-auth";

test.skip(!LOCAL, "needs the local Supabase stack: pnpm with-local-db pnpm test:e2e");

/**
 * BRAND-010 (Batch 11): every selling template carries at least one honest, explanatory fact, shown as data rather
 * than adjectives. The reserve page's payment deadline is checked in payments.spec.ts and interactions.spec.ts; the
 * price's "Why?" in interactions.spec.ts; guests per vessel on cards in marketplace.spec.ts.
 */
test("the listing: each card's size signal, and a price explains itself [BRAND-010]", async ({ page }) => {
  await page.goto("/cruises/");
  const cards = page.getByRole("list", { name: "Cruises" }).getByRole("article");
  expect(await cards.count()).toBeGreaterThan(0);
  await expect(page.getByText(/\d+ guests max|\d+ nights/).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /^Why US\$/ }).first()).toBeVisible();
});

test("the vessel page: guests, cabins and decks as facts, and its evaluation status said plainly [BRAND-010]", async ({
  page,
}) => {
  await page.goto("/cruises/sample-sail-one/");
  for (const term of ["Guests on board", "Cabins", "Decks", "From, per person"])
    await expect(page.locator("dt", { hasText: term }).first()).toBeVisible();
  await expect(page.getByText(/\d+\/100|Not evaluated yet/).first()).toBeVisible();
  await expect(page.getByText(/Schematic: not a floor plan|hasn’t listed this vessel’s cabin types yet/)).toBeVisible();
});

test("the comparison: the same facts side by side [BRAND-010]", async ({ page }) => {
  await page.goto("/cruises/compare/?v=sample-sail-one,sample-motor-one");
  const table = page.getByRole("table", { name: "Vessels compared" });
  for (const row of ["Guests on board", "Cabins", "From, per person"])
    await expect(table.getByRole("rowheader", { name: row })).toBeVisible();
});

test("a tour page: what happens when, in hours [BRAND-010]", async ({ page }) => {
  await page.goto("/tours-extras/abu-simbel-day-trip/");
  await expect(page.getByText(/\bhours?\b/).first()).toBeVisible();
});
