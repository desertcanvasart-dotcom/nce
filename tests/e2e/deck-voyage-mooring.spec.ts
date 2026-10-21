import { expect, test } from "@playwright/test";
import { refreshSignature } from "@/lib/connections/signature";
import { FEED_PULL_TEST_SECRET } from "../support/feed-tls";
import { adminDb, LOCAL, newUser, signIn } from "../support/local-auth";
import { sampleReservations } from "../support/sailing";
import { expectNoSeriousA11yIssues, setTheme } from "./helpers";

test.skip(!LOCAL, "needs the local Supabase stack: pnpm with-local-db pnpm test:e2e");
test.describe.configure({ mode: "serial", timeout: 120_000 });

/**
 * Batch 9-2a: the deck view (EXP-002), the voyage (EXP-003) and the mooring explainer (EXP-005) on a published sample
 * motor ship with two decks, a five-day programme, rafted mooring and three shared spaces.
 */
const RUN = `${Date.now()}dv`;
let S: Awaited<ReturnType<typeof sampleReservations>>;
const slug = `sample-cancel-${RUN}`;

test.beforeAll(async ({ request }) => {
  S = await sampleReservations({
    run: RUN,
    customer: await newUser("deck-view"),
    ownerEmail: "owner@operator-a.test",
    bands: [{ from_days: 0, percent: 100 }],
    departsIn: 45,
    count: 0,
  });
  const db = adminDb();
  await db
    .from("vessels")
    .update({ max_guests: 40, mooring: "rafted", shared_spaces: ["sun_deck", "pool", "dining_room"] })
    .eq("id", S.vesselId);
  await db
    .from("cabin_types")
    .insert({ vessel_id: S.vesselId, code: "STE", name: "Suite", deck: "Upper", max_occupancy: 2, size_m2: 30, balcony: true });
  await db.from("inventory").update({ source: "feed", confirmed_at: new Date().toISOString() }).eq("vessel_id", S.vesselId);
  await db.from("schedule_days").insert(
    [1, 2, 3, 4, 5].map((n) => ({
      schedule_id: S.scheduleId,
      day_number: n,
      locale: "en" as const,
      title: `Sample day ${n}`,
      description: "A sample day on the river.",
    })),
  );
  const ts = String(Math.floor(Date.now() / 1000));
  await request.post("/api/internal/catalogue/refresh/", {
    headers: { "nilecruz-timestamp": ts, "nilecruz-signature": refreshSignature(FEED_PULL_TEST_SECRET, ts) },
  });
});

test("the deck view with the keyboard only: deck, cabin type, its details [EXP-002, DASH-CUS-016, 017, DASH-BND-003]", async ({
  page,
}) => {
  await page.goto(`/cruises/${slug}/`);
  const cabins = page.locator("#cabins");
  await expect(cabins.getByText("Up to 40 guests share the sun deck, pool and dining room.")).toBeVisible();
  await expect(cabins.getByText(/Schematic: not a floor plan/)).toBeVisible();
  const upper = cabins.getByRole("tab", { name: "Upper deck" });
  await expect(upper).toHaveAttribute("aria-selected", "true");
  await upper.focus();
  await page.keyboard.press("ArrowRight");
  const main = cabins.getByRole("tab", { name: "Main deck" });
  await expect(main).toBeFocused();
  await expect(main).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("Tab");
  await expect(cabins.getByRole("button", { name: "Double" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(cabins.getByRole("heading", { name: "Double" })).toBeVisible();
  await expect(cabins.getByText("sleeps 2", { exact: true })).toBeVisible();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Home");
  await expect(upper).toHaveAttribute("aria-selected", "true");
  // No numbered cabins, ever.
  await expect(cabins.getByText(/Cabin \d+|No\. ?\d+/)).toHaveCount(0);
});

test("the mooring explainer opens on the vessel's practice and switches with the arrow keys [EXP-005]", async ({ page }) => {
  await page.goto(`/cruises/${slug}/`);
  const m = page.locator("#mooring");
  await expect(m.getByText(/This vessel moors alongside other ships/)).toBeVisible();
  const rafted = m.getByRole("button", { name: "Rafted, six abreast" });
  await expect(rafted).toHaveAttribute("aria-pressed", "true");
  await expect(m.getByText(/Only the first touches the bank/)).toBeVisible();
  await rafted.focus();
  await page.keyboard.press("ArrowRight");
  await expect(m.getByRole("button", { name: "A private riverbank" })).toHaveAttribute("aria-pressed", "true");
  await expect(m.getByText(/ties up alone at its own bank/)).toBeVisible();
});

test("the voyage follows the day you're reading, with reduced motion [EXP-003]", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`/cruises/${slug}/`);
  const days = page.locator("#itinerary ol > li");
  await expect(days).toHaveCount(5);
  await days.nth(3).scrollIntoViewIfNeeded();
  await page.evaluate(() => document.querySelectorAll("#itinerary ol > li")[3]!.scrollIntoView({ block: "center" }));
  await expect(days.nth(3)).toHaveAttribute("aria-current", "step");
  await page.getByRole("tab", { name: S.destination }).click();
  await expect(days.nth(4)).toHaveAttribute("aria-current", "step");
});

test("without JavaScript: the decks as a list, both mooring drawings, every day [EXP-002, 003, 005]", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(`/cruises/${slug}/`);
  await expect(page.locator("#cabins").getByRole("heading", { name: "Upper deck" })).toBeVisible();
  await expect(page.locator("#cabins").getByRole("heading", { name: "Main deck" })).toBeVisible();
  await expect(page.locator("#mooring figure")).toHaveCount(2);
  await expect(page.locator("#itinerary ol > li")).toHaveCount(5);
  await context.close();
});

test("on a chosen sailing each cabin type shows how it books, and can be chosen [EXP-002, ADR-099]", async ({ page }) => {
  const customer = await newUser("deck-booker");
  await signIn(page, customer.email, customer.password, `/cruises/${slug}/reserve/?itinerary=CX4&dep=${S.departureId}`);
  await page.waitForURL(/\/reserve\/\?/);
  const view = page.getByRole("tabpanel");
  await view.getByRole("button", { name: /^Double/ }).click();
  await expect(view.getByText("Instant confirmation.")).toBeVisible();
  await view.getByRole("button", { name: "Choose Double" }).click();
  await expect(page.locator(`input[name="cabin"][value="${S.cabinTypeId}"]`)).toBeChecked();
});

for (const theme of ["light", "dark"] as const) {
  test(`the deck view, voyage and mooring pass axe in ${theme === "light" ? "Day" : "Night"} [A11Y-001]`, async ({ page }) => {
    await setTheme(page, theme);
    await page.goto(`/cruises/${slug}/`);
    await page.locator("#cabins").getByRole("button", { name: "Suite" }).click();
    await expectNoSeriousA11yIssues(page);
  });
}
