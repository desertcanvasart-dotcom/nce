import { expect, test, type APIRequestContext } from "@playwright/test";
import { refreshSignature } from "@/lib/connections/signature";
import { FEED_PULL_TEST_SECRET, FEED_TEST_ORIGIN } from "../support/feed-tls";
import { adminDb, LOCAL, newUser, ORG, signIn, signInAdmin } from "../support/local-auth";
import { sampleReservations } from "../support/sailing";
import { expectNoSeriousA11yIssues } from "./helpers";

test.skip(!LOCAL, "needs the local Supabase stack: pnpm with-local-db pnpm test:e2e");
test.describe.configure({ mode: "serial", timeout: 180_000 });

/** ADR-103: stop-sales, supplements, holds, freesale and webhooks, through their forms. */
const RUN = Date.now();
const OWNER = "owner@operator-a.test";
let S: Awaited<ReturnType<typeof sampleReservations>>;
const plusDays = (iso: string, n: number) => new Date(Date.parse(iso) + n * 86_400_000).toISOString().slice(0, 10);

async function refresh(request: APIRequestContext) {
  const ts = String(Math.floor(Date.now() / 1000));
  const r = await request.post("/api/internal/catalogue/refresh/", {
    headers: { "nilecruz-timestamp": ts, "nilecruz-signature": refreshSignature(FEED_PULL_TEST_SECRET, ts) },
  });
  expect(r.status()).toBe(200);
}

test.beforeAll(async () => {
  S = await sampleReservations({
    run: `${RUN}vs`,
    customer: await newUser("spec-gaps-sailing"),
    ownerEmail: OWNER,
    bands: [{ from_days: 0, percent: 100 }],
    departsIn: 45,
    count: 0,
  });
  // A second cabin type on the same deck, to stop-sell while the Double stays open.
  const db = adminDb();
  const { data: suite } = await db
    .from("cabin_types")
    .insert({ vessel_id: S.vesselId, code: "STE", name: "Suite", deck: "Main", max_occupancy: 2 })
    .select("id")
    .single();
  await db
    .from("inventory")
    .insert({ departure_id: S.departureId, cabin_type_id: suite!.id, vessel_id: S.vesselId, available: 3 });
  await db.from("rates").insert({
    departure_id: S.departureId,
    cabin_type_id: suite!.id,
    vessel_id: S.vesselId,
    occupancy: 2,
    rate_plan: "international",
    currency: "USD",
    amount_minor: 150000,
  });
});

test("the operator stops sales on one cabin type and adds a gala supplement; the customer sees both [ADR-103]", async ({
  page,
  browser,
  request,
}) => {
  await signIn(page, OWNER);
  await page.goto(`/dashboard/operator/${ORG.operatorA}/schedules/${S.vesselId}/`);

  const stops = page.locator("#stop-sales").locator("..");
  await stops.getByLabel("Cabin type").selectOption({ label: "Suite" });
  await stops.locator('input[name="starts_on"]').fill(plusDays(S.departsOn, -1));
  await stops.locator('input[name="ends_on"]').fill(plusDays(S.departsOn, 1));
  await stops.getByLabel("Reason (optional)").fill("Charter");
  await stops.getByRole("button", { name: "Stop sales" }).click();
  await expect(page.getByText("Sales stopped for those departures.")).toBeVisible();
  await expect(stops.getByText(/Suite · departures .* · Charter/)).toBeVisible();

  const supps = page.locator("#supplements").locator("..");
  await supps.getByLabel("Name").fill("Sample gala dinner");
  await supps.getByLabel("Kind").selectOption("gala_dinner");
  await supps.getByLabel("First night").fill(plusDays(S.departsOn, 1));
  await supps.getByLabel("Last night").fill(plusDays(S.departsOn, 1));
  await supps.getByLabel("Currency").selectOption("USD");
  await supps.getByLabel("Per guest").fill("85");
  await supps.getByRole("button", { name: "Add supplement" }).click();
  await expect(page.getByText("Supplement added. New bookings of those nights include it.")).toBeVisible();
  await expect(supps.getByText(/Sample gala dinner.*gala dinner.*All cabins/)).toBeVisible();
  await expectNoSeriousA11yIssues(page);

  // The departure page marks the stop-sale.
  await page.goto(`/dashboard/operator/${ORG.operatorA}/schedules/${S.vesselId}/${S.scheduleId}/${S.departureId}/`);
  await expect(page.getByText(/3 free · 0 held · 0 booked.* · stop-sale/)).toBeVisible();

  await refresh(request);
  const customer = await newUser("spec-gaps-booker");
  const c = await (await browser.newContext()).newPage();
  await signIn(c, customer.email, customer.password);
  await c.goto(`/cruises/sample-cancel-${RUN}vs/reserve/?dep=${S.departureId}`);
  const deck = c.getByRole("group", { name: "Main deck" });
  await expect(deck.getByLabel(/Suite/)).toBeDisabled();
  await expect(deck.getByLabel(/Double/).locator("..")).toContainText(/US\$85(\.00)? per adult in supplements/);
  await expect(deck.getByText(/Availability updated/)).toHaveCount(1); // the Double only; sold out shows no date
  await deck.getByLabel(/Double/).check();
  await c.getByRole("button", { name: "See the price" }).click();
  await expect(c.getByText(/The total includes US\$85(\.00)? per adult in compulsory supplements/)).toBeVisible();
  await expect(c.getByText(/US\$2,170/).first()).toBeVisible(); // 2 × 1,000 + 2 × 85

  // Lifting the stop-sale and switching the supplement off.
  await page.goto(`/dashboard/operator/${ORG.operatorA}/schedules/${S.vesselId}/`);
  await page.locator("#stop-sales").locator("..").getByRole("button", { name: "Lift" }).click();
  // The row goes, and its message with it: the list is the confirmation.
  await expect(page.locator("#stop-sales").locator("..").getByText("No stop-sales.")).toBeVisible();
  await page
    .locator("#supplements")
    .locator("..")
    .locator("li", { hasText: "Sample gala dinner" })
    .getByRole("button", { name: "Switch off" })
    .click();
  await expect(page.getByText("Supplement switched off. Bookings already made keep it.")).toBeVisible();
});

test("an admin holds cabins and adds a freesale; the operator sees the hold, read-only [ADR-103]", async ({ page, browser }) => {
  await signInAdmin(page, "product@nilecruz.test");
  await page.goto(`/dashboard/admin/operators/${ORG.operatorA}/#holds`);
  const holds = page.locator("#holds").locator("..");
  await holds.getByLabel("Ship and cabin type").selectOption({ label: `Sample Cancel Ship ${RUN}vs · Double` });
  await holds.getByLabel("Departure").fill(S.departsOn);
  await holds.getByLabel("Cabins").fill("2");
  await holds.getByLabel("For (hours)").fill("48");
  await holds.getByLabel("Note").fill(`Sample group ${RUN}`);
  await holds.getByRole("button", { name: "Place hold" }).click();
  await expect(page.getByText("Holding 2 cabins for 48 hours.")).toBeVisible();
  const held = holds.locator("li", { hasText: `Sample group ${RUN}` });
  await expect(held).toContainText("2 cabins");
  await expect(held).toContainText("placed by Nilecruz");

  // No sailing on that date: refused in words.
  await holds.getByLabel("Ship and cabin type").selectOption({ label: `Sample Cancel Ship ${RUN}vs · Double` });
  await holds.getByLabel("Departure").fill(plusDays(S.departsOn, 2));
  await holds.getByRole("button", { name: "Place hold" }).click();
  await expect(page.getByText("That ship has no scheduled sailing on that date.")).toBeVisible();

  const free = page.locator("#freesale").locator("..");
  await free.getByLabel("Ship and cabin type").selectOption({ label: `Sample Cancel Ship ${RUN}vs · Double` });
  await free.locator('input[name="starts_on"]').fill(plusDays(S.departsOn, -10));
  await free.locator('input[name="ends_on"]').fill(plusDays(S.departsOn, 10));
  await free.getByLabel("Contract reference").fill(`FREESALE-${RUN}`);
  await free.getByRole("button", { name: "Add freesale" }).click();
  await expect(page.getByText(/Freesale added/)).toBeVisible();
  await expectNoSeriousA11yIssues(page);

  // The operator's departure and Overview show the hold; only Nilecruz edits it.
  const op = await (await browser.newContext()).newPage();
  await signIn(op, OWNER);
  await op.goto(`/dashboard/operator/${ORG.operatorA}/schedules/${S.vesselId}/${S.scheduleId}/${S.departureId}/`);
  await expect(op.getByText(/3 free · 2 held · 0 booked.* · freesale/)).toBeVisible();
  await op.goto(`/dashboard/operator/${ORG.operatorA}/`);
  const opHolds = op.locator("#holds").locator("..");
  await expect(opHolds.locator("li", { hasText: `Sample group ${RUN}` })).toBeVisible();
  await expect(opHolds.getByRole("button", { name: "Release" })).toHaveCount(0);

  // Releasing gives the cabins back.
  await held.getByRole("button", { name: "Release" }).click();
  await expect(holds.locator("li", { hasText: `Sample group ${RUN}` })).toHaveCount(0);
  await op.goto(`/dashboard/operator/${ORG.operatorA}/schedules/${S.vesselId}/${S.scheduleId}/${S.departureId}/`);
  await expect(op.getByText(/5 free · 0 held · 0 booked/)).toBeVisible();
});

test("the operator's owner sets a webhook address; private addresses are refused [ADR-103, SEC]", async ({ page }) => {
  await signIn(page, OWNER);
  await page.goto(`/dashboard/operator/${ORG.operatorA}/inventory/#webhooks`);
  const hooks = page.locator("#webhooks").locator("..");
  await hooks.getByLabel("Webhook address").fill("https://10.0.0.5/hook");
  await hooks.getByRole("button", { name: "Save webhook address" }).click();
  await expect(page.getByText(/^Webhook address: /)).toBeVisible();

  // The test feed origin is the one address the local server accepts (NILECRUZ_FEED_TEST_ORIGINS).
  await hooks.getByLabel("Webhook address").fill(`${FEED_TEST_ORIGIN}/hook-${RUN}`);
  await hooks.getByRole("button", { name: "Save webhook address" }).click();
  await expect(page.getByText("Webhook address saved. Changes from now on are sent to it.")).toBeVisible();
  const { data } = await adminDb().from("webhook_endpoints").select("url").eq("org_id", ORG.operatorA).single();
  expect(data!.url).toBe(`${FEED_TEST_ORIGIN}/hook-${RUN}`);

  await hooks.getByLabel("Webhook address").fill("");
  await hooks.getByRole("button", { name: "Save webhook address" }).click();
  await expect(page.getByText("Webhook address removed. Nothing more is sent.")).toBeVisible();
});
