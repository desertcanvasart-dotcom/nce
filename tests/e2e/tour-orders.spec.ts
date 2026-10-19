import { expect, test, type Browser } from "@playwright/test";
import { adminDb, LOCAL, newUser, signIn, signInAdmin } from "../support/local-auth";
import { paidTourEvent } from "../support/stripe";
import { expectNoSeriousA11yIssues, setTheme } from "./helpers";

test.skip(!LOCAL, "needs the local Supabase stack: pnpm with-local-db pnpm test:e2e");
test.describe.configure({ mode: "serial", timeout: 180_000 });

const RUN = Date.now();
// Its own admin: two workers signing one account in with the same two-step code would collide.
const ADMIN = "orders@nilecruz.test";
const at = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();
let customer = { id: "", email: "", password: "" };
let tourId = "";
let orderId = "";

async function adminPage(browser: Browser) {
  const p = await (await browser.newContext()).newPage();
  await signInAdmin(p, ADMIN);
  return p;
}

test.beforeAll(async () => {
  const db = adminDb();
  const { data: sup, error } = await db
    .from("tour_suppliers")
    .insert({ name: `Sample Supplier ${RUN}`, email: `supplier.${RUN}@example.test` })
    .select("id")
    .single();
  if (error) throw error;
  const { data: t, error: te } = await db
    .from("tours")
    .insert({
      slug: `sample-order-tour-${RUN}`,
      kind: "excursion",
      name: `Sample Order Tour ${RUN}`,
      location: "Aswan",
      duration_minutes: 600,
      supplier_id: sup.id,
      visibility: "published",
      is_sample: true,
      cancellation_bands: [
        { from_days: 30, percent: 0 },
        { from_days: 7, percent: 50 },
        { from_days: 0, percent: 100 },
      ],
    })
    .select("id")
    .single();
  if (te) throw te;
  tourId = t.id;
  await db.from("tour_translations").insert({
    tour_id: tourId,
    locale: "en",
    description: "A sample excursion for the tour-order tests.",
    meeting_point: "Your ship in Aswan.",
    cancellation_terms: "Sample tour cancellation wording.",
  });
  await db.from("tour_sessions").insert([
    {
      tour_id: tourId,
      starts_at: at(40),
      ends_at: at(40.4),
      kind: "shared",
      pricing: "per_guest",
      capacity: 3,
      currency: "USD",
      price_minor: 10000,
    },
    {
      tour_id: tourId,
      starts_at: at(41),
      ends_at: at(41.4),
      kind: "private",
      pricing: "per_group",
      capacity: 4,
      currency: "USD",
      price_minor: 50000,
    },
  ]);
  customer = await newUser("tour-customer");
});

test("a customer books places, pays by card through a signed webhook, and the order is confirmed [DASH-PAY-014, DATA-027, 041]", async ({
  page,
  request,
}) => {
  await signIn(page, customer.email, customer.password);
  await page.goto("/dashboard/journey/tours/");
  await page.getByRole("link", { name: `Sample Order Tour ${RUN}` }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(`Sample Order Tour ${RUN}`);
  await expect(page.getByText("Cancelled 30 days or more before the start: 0 % charged")).toBeVisible();
  const session = page.getByLabel("Date and time (Cairo)");
  await expect(session.locator("option", { hasText: "Shared" })).toContainText("3 places left");
  await session.selectOption({ index: 1 });
  await page.getByLabel("Ages of everyone coming").fill("40, 2");
  await page.getByLabel("Lead guest's full name").fill("Sample Lead Guest");
  await page.getByRole("button", { name: "Book and pay by card" }).click();
  await expect(page.getByText("Tick that you have read the terms and the cancellation policy.")).toBeVisible();
  await page.getByLabel("I have read the tour details and the cancellation policy").check();
  await page.getByRole("button", { name: "Book and pay by card" }).click();
  await page.waitForURL(/\/dashboard\/journey\/tours\/[0-9a-f-]{36}\/$/);
  orderId = page.url().match(/tours\/([0-9a-f-]{36})\//)![1]!;
  await expect(page.getByText("Awaiting payment", { exact: true })).toBeVisible();
  await expect(page.getByText("US$100", { exact: true })).toBeVisible();
  await expect(page.getByText(/Your places are held until/)).toBeVisible();

  // No Stripe key in tests: the button says so (ADR-089). Only a signed webhook marks it paid.
  await page.getByRole("button", { name: "Pay by card" }).click();
  await expect(page.getByText(/Card payments aren.t switched on yet/)).toBeVisible();
  const ev = paidTourEvent(orderId, 10000, "usd", `${RUN}`);
  const post = () =>
    request.post("/api/stripe/webhook/", {
      data: ev.payload,
      headers: { "stripe-signature": ev.signature, "content-type": "application/json" },
    });
  expect(await (await post()).json()).toMatchObject({ result: "recorded" });
  expect(await (await post()).json()).toMatchObject({ result: "duplicate" });
  await page.reload();
  await expect(page.getByText("Confirmed", { exact: true })).toBeVisible();
  await expect(page.getByText(/Receipt NCR-\d{4}-\d{6}/)).toBeVisible();
  // Nilecruz's own sale: no cruise payment and no commission entry.
  const { count } = await adminDb()
    .from("payments")
    .select("id", { count: "exact", head: true })
    .like("stripe_payment_intent_id", `pi_test_tour_${RUN}%`);
  expect(count).toBe(0);
  await page.goto("/dashboard/journey/tours/");
  await expect(
    page
      .locator("section", { has: page.getByRole("heading", { name: "Your tour orders" }) })
      .locator("li", { hasText: `Sample Order Tour ${RUN}` }),
  ).toContainText("Confirmed");
});

test("a paid tour is cancelled by the tour's bands; a finance admin approves and records the refund [DASH-PAY-014]", async ({
  page,
  browser,
}) => {
  await signIn(page, customer.email, customer.password);
  await page.goto(`/dashboard/journey/tours/${orderId}/`);
  const cancel = page.locator("section", { has: page.getByRole("heading", { name: "Cancel this tour" }) });
  await expect(cancel).toContainText("0 %");
  await expect(cancel).toContainText("US$100 would be refunded");
  await cancel.getByLabel("I have read the cancellation policy and the charge above").check();
  await cancel.getByRole("button", { name: "Ask to cancel" }).click();
  await expect(page.getByText("Cancellation requested: Nilecruz is checking it")).toBeVisible();

  const admin = await adminPage(browser);
  await admin.goto("/dashboard/admin/finance/#tour-orders");
  await admin
    .locator("section", { has: admin.getByRole("heading", { name: /^Tour orders/ }) })
    .getByRole("link", { name: /^NT-/ })
    .first()
    .click();
  await admin.getByLabel("Decision").selectOption("approve");
  await admin.getByRole("button", { name: "Save decision" }).click();
  await expect(admin.getByText("Still to refund: US$100")).toBeVisible();
  await admin.getByRole("button", { name: "Refund to the card through Stripe" }).click();
  await expect(admin.getByText(/Card refunds aren't switched on/)).toBeVisible();
  const manual = admin.locator("form", { has: admin.getByRole("button", { name: "Record a manual refund" }) });
  await manual.getByLabel("Amount (USD)").fill("100.00");
  await manual.getByLabel("How").fill("Bank transfer");
  await manual.getByLabel("Reference").fill(`TRF-${RUN}`);
  await manual.getByRole("button", { name: "Record a manual refund" }).click();
  await expect(admin.getByText(new RegExp(`Refunded US\\$100 · Bank transfer · ref. TRF-${RUN}`))).toBeVisible();

  await page.reload();
  await expect(page.getByText("Cancelled", { exact: true })).toBeVisible();
  await expect(page.getByText(new RegExp(`Refunded US\\$100 · Bank transfer · ref. TRF-${RUN}`))).toBeVisible();
});

test.describe("tour order screens are accessible", () => {
  for (const theme of ["light", "dark"] as const) {
    test(`customer and admin (${theme})`, async ({ page, browser }) => {
      await setTheme(page, theme);
      await signIn(page, customer.email, customer.password);
      for (const path of [
        "/dashboard/journey/tours/",
        `/dashboard/journey/tours/book/${tourId}/`,
        `/dashboard/journey/tours/${orderId}/`,
      ]) {
        await page.goto(path);
        await expectNoSeriousA11yIssues(page);
      }
      const ctx = await browser.newContext({ colorScheme: theme });
      const ad = await ctx.newPage();
      await setTheme(ad, theme);
      await signInAdmin(ad, ADMIN);
      await ad.goto(`/dashboard/admin/finance/tour-orders/${orderId}/`);
      await expectNoSeriousA11yIssues(ad);
      await ctx.close();
    });
  }
});
