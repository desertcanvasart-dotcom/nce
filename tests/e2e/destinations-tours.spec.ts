import { expect, test } from "@playwright/test";
import { refreshSignature } from "@/lib/connections/signature";
import { FEED_PULL_TEST_SECRET } from "../support/feed-tls";
import { adminDb, LOCAL, newUser, signInAdmin } from "../support/local-auth";
import { sampleReservations } from "../support/sailing";
import { expectNoSeriousA11yIssues, setTheme } from "./helpers";

test.skip(!LOCAL, "needs the local Supabase stack: pnpm with-local-db pnpm test:e2e");

async function refresh(request: import("@playwright/test").APIRequestContext) {
  const ts = String(Math.floor(Date.now() / 1000));
  const r = await request.post("/api/internal/catalogue/refresh/", {
    headers: { "nilecruz-timestamp": ts, "nilecruz-signature": refreshSignature(FEED_PULL_TEST_SECRET, ts) },
  });
  expect(r.status()).toBe(200);
}

/** Batch 7-1 (ADR-097): destinations, tour pages as information, trust pages, Contact and its inbox, tour redirects. */

test("destination pages carry their data and link the stops [PAGE-074-090]", async ({ page }) => {
  await page.goto("/destinations/");
  await expect(page.getByRole("heading", { level: 1, name: "Temples and towns along the Nile" })).toBeVisible();
  await page.goto("/destinations/edfu/");
  await expect(page.getByRole("heading", { level: 1, name: "Edfu and the Temple of Horus" })).toBeVisible();
  const ld = (await page.locator('script[type="application/ld+json"]').allTextContents()).join("\n");
  expect(ld).toContain('"TouristDestination"');
  expect(ld).toContain('"FAQPage"');
});

test("tour pages explain the tour and say prices are coming; nothing is bookable yet [DASH-PUB-006, ADR-097]", async ({
  page,
  request,
}) => {
  // Publish the imported Abu Simbel tour for this check (the local seed may not have it).
  const db = adminDb();
  const { data: t } = await db.from("tours").select("slug").eq("slug", "abu-simbel-day-trip-from-aswan-by-road").maybeSingle();
  test.skip(!t, "the nilecruz.com tours aren't imported into this database");
  await db.from("tours").update({ visibility: "published" }).eq("slug", "abu-simbel-day-trip-from-aswan-by-road");
  await refresh(request); // changed straight in the database, so the cached catalogue is refreshed
  await page.goto("/tours-extras/abu-simbel-day-trip-from-aswan-by-road/");
  await page.waitForURL(/\/tours-extras\/abu-simbel-day-trip\/$/); // one page per tour (SEO-022)
  await expect(page.getByText("Prices coming soon.")).toBeVisible();
  await expect(page.getByRole("button", { name: /book|reserve/i })).toHaveCount(0);
});

test("live nilecruz.com tour addresses redirect to their new page [SEO-022]", async ({ page }) => {
  // The site adds the trailing slash first (308), then the permanent redirect (301) to the new page.
  await page.goto("/tours/17100001-0000-4000-8000-000000000007");
  await expect(page).toHaveURL(/\/tours-extras\/abu-simbel-day-trip\/$/);
  await page.goto("/tours/17100001-0000-4000-8000-000000000003");
  await expect(page).toHaveURL(/\/tours-extras\/transfers\/$/);
});

test("the balloon is information only [PAGE-095]", async ({ page }) => {
  await page.goto("/tours-extras/luxor-hot-air-balloon/");
  await expect(page.getByText(/We don’t take bookings for balloon flights yet/)).toBeVisible();
});

test("How we choose vessels shows the method's weights from the code [PAGE-102]", async ({ page }) => {
  await page.goto("/how-we-choose-vessels/");
  const table = page.getByRole("table", { name: "The seven dimensions and their weights" });
  await expect(table.getByRole("row")).toHaveCount(8);
  await expect(table).toContainText("20 of 100");
});

test("a visitor's Contact message reaches the admin inbox, and bots are ignored [PAGE-106]", async ({ page, browser }) => {
  const stamp = `Sample question ${Date.now()} about a dahabiya in March.`;
  await page.goto("/contact/");
  await page.getByLabel("Your name").fill("Sample Visitor");
  await page.getByLabel("Email").fill("visitor@example.test");
  await page.getByLabel("Message").fill(stamp);
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByText(/Thank you. We reply by email/)).toBeVisible();
  // A bot fills the hidden field: it is told the same, and nothing is kept.
  await page.goto("/contact/");
  await page.getByLabel("Your name").fill("Bot");
  await page.getByLabel("Email").fill("bot@example.test");
  await page.getByLabel("Message").fill(`${stamp} BOT`);
  await page.locator("input[name=website]").fill("https://spam.example");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByText(/Thank you. We reply by email/)).toBeVisible();
  const { count } = await adminDb()
    .from("contact_messages")
    .select("id", { count: "exact", head: true })
    .eq("message", `${stamp} BOT`);
  expect(count).toBe(0);

  const admin = await browser.newPage();
  await signInAdmin(admin, "messages@nilecruz.test");
  await admin.goto("/dashboard/admin/messages/");
  const item = admin.locator("li", { hasText: stamp });
  await expect(item).toContainText("visitor@example.test");
  await item.getByRole("button", { name: "Mark as handled" }).click();
  // Filed: it moves to the Handled list, where it can be reopened.
  const handled = admin.locator("section", { has: admin.getByRole("heading", { name: "Handled" }) });
  await expect(handled.locator("li", { hasText: stamp }).getByRole("button", { name: "Reopen" })).toBeVisible();
  await admin.close();
});

test("a vessel's itinerary links its stops and the transfers page [SEO-013, DATA-018]", async ({ page }) => {
  const someone = await newUser("stops-sailing");
  const S = await sampleReservations({
    run: `${Date.now()}st`,
    customer: someone,
    ownerEmail: "owner@operator-a.test",
    bands: [{ from_days: 0, percent: 100 }],
    departsIn: 50,
    count: 0,
  });
  await adminDb().from("schedules").update({ origin: "Luxor", destination: "Aswan" }).eq("id", S.scheduleId);
  const { data: v } = await adminDb().from("vessels").select("slug").eq("id", S.vesselId).single();
  await page.goto(`/cruises/${v!.slug}/`);
  const stops = page.getByText(/^Stops:/);
  await expect(stops.getByRole("link", { name: "Edfu" })).toHaveAttribute("href", "/destinations/edfu/");
  await expect(stops.getByRole("link", { name: "Kom Ombo" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Airport and hotel transfers" }).first()).toHaveAttribute(
    "href",
    "/tours-extras/transfers/",
  );
});

test.describe("destination, tour and trust pages are accessible", () => {
  for (const theme of ["light", "dark"] as const) {
    test(`a destination, the tours hub, a tour page, About and Contact (${theme})`, async ({ page }) => {
      await setTheme(page, theme);
      for (const path of ["/destinations/luxor/", "/tours-extras/", "/tours-extras/transfers/", "/about/", "/contact/"]) {
        await page.goto(path);
        await expectNoSeriousA11yIssues(page);
      }
    });
  }
});
