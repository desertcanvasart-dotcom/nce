import { expect, test, type Page } from "@playwright/test";
import { refreshSignature } from "@/lib/connections/signature";
import { routeId } from "@/lib/marketplace/listing";
import { FEED_PULL_TEST_SECRET } from "../support/feed-tls";
import { adminDb, LOCAL, newUser } from "../support/local-auth";
import { sampleReservations } from "../support/sailing";
import { expectNoSeriousA11yIssues, setTheme } from "./helpers";

test.skip(!LOCAL, "needs the local Supabase stack: pnpm with-local-db pnpm test:e2e");
test.describe.configure({ mode: "serial", timeout: 120_000 });

/**
 * Batch 5-1: the public marketplace. A published, bookable sample sailing (Operator A, US$1,000 per person for two)
 * with a published evaluation, plus the seeded showcase motor ship, which is information only.
 */
const RUN = Date.now();
const NAME = `Sample Cancel Ship ${RUN}mk`;
let S: Awaited<ReturnType<typeof sampleReservations>>;
const card = (page: Page, name: string) => page.getByRole("article", { name });

async function refresh(request: import("@playwright/test").APIRequestContext) {
  const ts = String(Math.floor(Date.now() / 1000));
  const r = await request.post("/api/internal/catalogue/refresh/", {
    headers: { "nilecruz-timestamp": ts, "nilecruz-signature": refreshSignature(FEED_PULL_TEST_SECRET, ts) },
  });
  expect(r.status()).toBe(200);
}

test.beforeAll(async () => {
  const someone = await newUser("market-sailing");
  S = await sampleReservations({
    run: `${RUN}mk`,
    customer: someone,
    ownerEmail: "owner@operator-a.test",
    bands: [{ from_days: 0, percent: 100 }],
    departsIn: 60,
    count: 0,
  });
  const db = adminDb();
  const { error } = await db.from("vessels").update({ max_guests: 60, category: "luxury" }).eq("id", S.vesselId);
  if (error) throw error;
  const fours = [4, 4, 4, 4];
  const { error: ee } = await db.from("evaluations").insert({
    vessel_id: S.vesselId,
    assessed_on: "2026-10-01",
    evaluator: "Sample evaluator",
    verdict: "recommended",
    scores: Object.fromEntries(
      ["hygiene", "service", "food", "amenities", "management", "cabin_vessel", "cruise_experience"].map((d) => [d, fours]),
    ),
    published: true,
    published_at: new Date().toISOString(),
  });
  if (ee) throw ee;
});

test("the refresh route needs the scheduler's signature", async ({ request }) => {
  expect((await request.post("/api/internal/catalogue/refresh/")).status()).toBe(401);
  await refresh(request);
});

test("/cruises/ lists vessels with guests, the Nilecruz score and one 'from' price [PAGE-060, DASH-PUB-001, 002, 005, BRAND-026, 028]", async ({
  page,
}) => {
  await page.goto("/cruises/");
  await expect(page.getByRole("heading", { level: 1, name: "Compare Nile cruises" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toContainText("Home");
  const mine = card(page, NAME);
  await expect(mine).toContainText("60 guests max");
  await expect(mine).toContainText("80/100 · Nilecruz evaluation");
  await expect(mine).toContainText("From, per person");
  await expect(mine).toContainText("US$1,000");
  await expect(mine).toContainText("Sample data");
  // No stars anywhere until verified reviews exist (ADR-009).
  await expect(mine.getByRole("img", { name: /out of 5/ })).toHaveCount(0);
  // The seeded showcase ship is listed, information only, with no price (DASH-PUB-010).
  const showcase = card(page, "Sample Motor Ship One");
  await expect(showcase).toContainText("Information only");
  await expect(showcase).not.toContainText("US$");
  // Indexable, with its own canonical; structured data: breadcrumbs and the item list, no ratings or offers.
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/cruises\/$/);
  const ld = (await page.locator('script[type="application/ld+json"]').allTextContents()).join("\n");
  expect(ld).toContain('"BreadcrumbList"');
  expect(ld).toContain('"CollectionPage"');
  expect(ld).toContain(NAME);
  expect(ld).not.toMatch(/AggregateRating|"Offer"/);
});

test("the five filtered pages list only their vessels [PAGE-061, 062, 064, 066, 067, SEO-016]", async ({ page }) => {
  await page.goto("/cruises/luxury/");
  await expect(page.getByRole("heading", { level: 1, name: "Luxury Nile cruises" })).toBeVisible();
  await expect(card(page, NAME)).toBeVisible();
  await expect(card(page, "Sample Motor Ship One")).toHaveCount(0); // standard, not luxury
  await page.goto("/cruises/dahabiyas/");
  await expect(card(page, NAME)).toHaveCount(0);
  await expect(card(page, "Sample Dahabiya One")).toBeVisible();
  await page.goto("/cruises/motor-ships/");
  await expect(card(page, NAME)).toBeVisible();
  for (const [slug, h1] of [
    ["luxor-to-aswan", "Luxor to Aswan cruises"],
    ["aswan-to-luxor", "Aswan to Luxor cruises"],
  ]) {
    const res = await page.goto(`/cruises/${slug}/`);
    expect(res?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: h1 })).toBeVisible();
  }
  // Facets that aren't listed don't exist (Phase 2 rows come later).
  expect((await page.goto("/cruises/value/"))?.status()).toBe(404);
});

test("a search narrows the hub to real departures and stays out of the index [DATA-012, SEO-016]", async ({ page }) => {
  const route = routeId(S.origin, S.destination);
  await page.goto(`/cruises/?route=${route}&vessel=motor&date=${S.departsOn}&adults=2`);
  await expect(card(page, NAME)).toBeVisible();
  await expect(page.getByRole("article")).toHaveCount(1);
  await expect(page.getByText("1 vessel · 1 matching departure")).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/cruises\/$/);
  await page.goto(`/cruises/?route=${route}&vessel=sail`);
  await expect(page.getByText("No sailings fit that search.")).toBeVisible();
});

test("ticking two vessels compares them side by side [DASH-PUB-004]", async ({ page }) => {
  await page.goto("/cruises/");
  await card(page, NAME).getByLabel("Compare").check();
  await expect(page.getByText("Tick one more vessel to compare.")).toBeVisible();
  await card(page, "Sample Motor Ship One").getByLabel("Compare").check();
  await page.getByRole("link", { name: "Compare 2 vessels" }).click();
  await page.waitForURL(/\/cruises\/compare\/\?v=/);
  const table = page.getByRole("table", { name: "Vessels compared" });
  await expect(table.getByRole("columnheader", { name: NAME })).toBeVisible();
  await expect(table).toContainText("80/100");
  await expect(table).toContainText("US$1,000");
  await expect(table).toContainText("Information only");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
});

test("a vessel removed from sale leaves the listing once the catalogue refreshes [PERF-010]", async ({ page, request }) => {
  await adminDb().from("vessels").update({ visibility: "private" }).eq("id", S.vesselId);
  // Another worker may be rendering /cruises/ from the old data at this moment and cache it again just after the
  // refresh; the next refresh corrects that. So refresh and reload until it's gone, as a visitor would see it.
  await expect
    .poll(
      async () => {
        await refresh(request);
        await page.goto("/cruises/");
        return card(page, NAME).count();
      },
      { timeout: 30_000, intervals: [500, 1_000, 2_000] },
    )
    .toBe(0);
  await adminDb().from("vessels").update({ visibility: "published" }).eq("id", S.vesselId);
  await refresh(request);
});

test.describe("marketplace screens are accessible", () => {
  for (const theme of ["light", "dark"] as const) {
    test(`hub, a filtered page and the comparison (${theme})`, async ({ page }) => {
      await setTheme(page, theme);
      for (const path of ["/cruises/", "/cruises/luxury/", "/cruises/compare/?v=sample-sail-one,sample-motor-one"]) {
        await page.goto(path);
        await expectNoSeriousA11yIssues(page);
      }
    });
  }
});
