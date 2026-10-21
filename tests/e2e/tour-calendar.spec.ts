import { expect, test, type Page } from "@playwright/test";
import { refreshSignature } from "@/lib/connections/signature";
import { FEED_PULL_TEST_SECRET } from "../support/feed-tls";
import { adminDb, LOCAL, newUser, signIn } from "../support/local-auth";
import { sampleReservations } from "../support/sailing";
import { paidTourEvent } from "../support/stripe";
import { expectNoSeriousA11yIssues, setTheme } from "./helpers";

test.skip(!LOCAL, "needs the local Supabase stack: pnpm with-local-db pnpm test:e2e");
test.describe.configure({ mode: "serial", timeout: 180_000 });

/** Batch 7-2 (ADR-097): tours booked on a calendar, priced at once; the office sees and can cancel its starts. */
const RUN = Date.now();
const LUXOR_OFFICE = "00000000-0000-4000-b000-0000000000d1";
const OFFICE_LOGIN = "office@luxor-office.test";
let customer = { id: "", email: "", password: "" };
let tourId = "";
let transferId = "";
let orderId = "";
// A Thursday at least 9 days out, in Cairo (the shared tour runs Thursdays at 08:00).
const target = (() => {
  const d = new Date(Date.now() + 9 * 86_400_000);
  while (d.getUTCDay() !== 4) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
})();
const dayLabel = new Date(`${target}T12:00:00Z`).toLocaleDateString("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

async function refresh(request: import("@playwright/test").APIRequestContext) {
  const ts = String(Math.floor(Date.now() / 1000));
  const r = await request.post("/api/internal/catalogue/refresh/", {
    headers: { "nilecruz-timestamp": ts, "nilecruz-signature": refreshSignature(FEED_PULL_TEST_SECRET, ts) },
  });
  expect(r.status()).toBe(200);
}

/** Moves the calendar to the target's month and picks the day. */
async function pickDay(page: Page) {
  const month = new Date(`${target}T12:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
  for (let i = 0; i < 3 && !(await page.getByText(month, { exact: true }).isVisible()); i++)
    await page.getByRole("button", { name: "Next month" }).click();
  await page.getByRole("button", { name: new RegExp(`^${dayLabel}(,|$)`) }).click();
}

test.afterAll(async () => {
  await adminDb().from("platform_settings").update({ value: 7 }).eq("key", "tour_horizon_days");
});

test.beforeAll(async () => {
  const db = adminDb();
  // These tests book 9 days and more ahead; the 7-day window (Faris's sheet) is checked in pgTAP 280.
  await db.from("platform_settings").update({ value: 365 }).eq("key", "tour_horizon_days");
  const { data: t, error } = await db
    .from("tours")
    .insert({
      slug: `sample-calendar-tour-${RUN}`,
      kind: "excursion",
      name: `Sample Calendar Tour ${RUN}`,
      location: "Luxor",
      duration_minutes: 300,
      office_id: LUXOR_OFFICE,
      visibility: "published",
      is_sample: true,
    })
    .select("id")
    .single();
  if (error) throw error;
  tourId = t.id;
  await db
    .from("tour_translations")
    .insert({ tour_id: tourId, locale: "en", description: "A sample tour for the calendar tests." });
  const { error: re } = await db.from("tour_rates").insert([
    {
      tour_id: tourId,
      mode: "shared",
      days: [4],
      start_times: ["08:00"],
      prices: { adult: 6000, child611: 3000, child35: 1500 },
    },
    {
      tour_id: tourId,
      mode: "private",
      days: [4],
      start_times: ["08:00"],
      prices: {
        tiers: [
          { min: 1, max: 2, pp: 12000 },
          { min: 3, max: 8, pp: 8000 },
          { min: 9, max: null, pp: 6000 },
        ],
        child_pct: 50,
      },
    },
  ]);
  if (re) throw re;
  const { data: tr, error: te } = await db
    .from("tours")
    .insert({
      slug: `sample-calendar-transfer-${RUN}`,
      kind: "transfer",
      name: `Sample Calendar Transfer ${RUN}`,
      location: "Luxor",
      duration_minutes: 45,
      office_id: LUXOR_OFFICE,
      visibility: "published",
      is_sample: true,
    })
    .select("id")
    .single();
  if (te) throw te;
  transferId = tr.id;
  await db.from("tour_rates").insert({
    tour_id: transferId,
    mode: "transfer",
    label: "Airport → hotel",
    prices: {
      vehicles: [
        { name: "Car", max: 3, price: 2500 },
        { name: "Van", max: 8, price: 4000 },
      ],
      night_extra: 1000,
    },
  });
  customer = await newUser("calendar-customer");
  // Their cruise: day 3 is in Luxor on the tour's Thursday (Faris, 21 Oct: show where the ship is each day).
  const cairoToday = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" });
  const departsIn = Math.round((Date.parse(target) - Date.parse(cairoToday)) / 86_400_000) - 2;
  const cruise = await sampleReservations({
    run: `cal-${RUN}`,
    customer,
    ownerEmail: "owner@operator-a.test",
    bands: [{ from_days: 0, percent: 100 }],
    departsIn,
    count: 1,
  });
  await db
    .from("schedule_days")
    .insert({ schedule_id: cruise.scheduleId, day_number: 3, locale: "en", title: "Luxor: Karnak and Luxor Temple" });
});

test("a tour with rates shows its prices and the calendar link, not 'coming soon' [ADR-097]", async ({ page, request }) => {
  await refresh(request);
  await page.goto(`/tours-extras/sample-calendar-tour-${RUN}/`);
  await expect(page.getByText("Shared group: US$60 per adult")).toBeVisible();
  await expect(page.getByText("Private: from US$60 per person, less for bigger parties")).toBeVisible();
  await expect(page.getByText("Prices coming soon.")).toHaveCount(0);
  await expect(page.getByRole("link", { name: `Choose a date for Sample Calendar Tour ${RUN}` })).toBeVisible();
  const ld = (await page.locator('script[type="application/ld+json"]').allTextContents()).join("\n");
  expect(ld).toContain('"price":"60.00"');
});

test("a customer picks a date and time, books a shared tour for 2 and pays through the signed webhook [ADR-097, DATA-027]", async ({
  page,
  request,
}) => {
  await signIn(page, customer.email, customer.password);
  await page.goto(`/dashboard/journey/tours/book/${tourId}/`);
  await pickDay(page);
  await expect(page.getByLabel("Start time")).toHaveValue("08:00"); // the only start that day
  await expect(page.getByText("US$120 in all")).toBeVisible();
  await expect(page.getByText(/2 × US\$60 per adult · 8 places left/)).toBeVisible();
  await page.getByLabel("Lead guest's full name").fill("Sample Calendar Lead");
  await page.getByLabel("Pickup place and anything the guide should know").fill("Sample Hotel, Luxor");
  await page.getByLabel("I have read the tour details and the cancellation policy").check();
  await expect(page.getByText("Cancelled 2 days or more before the start: 0 % charged")).toBeVisible();
  await page.getByRole("button", { name: "Book and pay by card" }).click();
  await page.waitForURL(/\/dashboard\/journey\/tours\/[0-9a-f-]{36}\/$/);
  orderId = page.url().match(/tours\/([0-9a-f-]{36})\//)![1]!;
  await expect(page.getByText("Awaiting payment", { exact: true })).toBeVisible();
  await expect(page.getByText("US$120", { exact: true })).toBeVisible();
  const ev = paidTourEvent(orderId, 12000, "usd", `cal-${RUN}`);
  const r = await request.post("/api/stripe/webhook/", {
    data: ev.payload,
    headers: { "stripe-signature": ev.signature, "content-type": "application/json" },
  });
  expect(await r.json()).toMatchObject({ result: "recorded" });
  await page.reload();
  await expect(page.getByText("Confirmed", { exact: true })).toBeVisible();
  await expect(page.getByText("Shared", { exact: true })).toBeVisible();
});

test("the calendar shows where the customer's ship is each day and marks the days it's in the tour's city [Faris 21 Oct]", async ({
  page,
}) => {
  await signIn(page, customer.email, customer.password);
  await page.goto(`/dashboard/journey/tours/book/${tourId}/`);
  await expect(page.getByText("Your cruise, day by day.")).toBeVisible();
  await expect(page.getByText("Day 3: Luxor: Karnak and Luxor Temple (Luxor)")).toBeVisible();
  await expect(page.getByRole("button", { name: new RegExp(`^${dayLabel}, your cruise: Day 3`) })).toBeVisible();
  await pickDay(page);
  await expect(page.getByText("That day your ship is in Luxor: Day 3: Luxor: Karnak and Luxor Temple.")).toBeVisible();
});

test("the shared start has 6 places left; 7 more are refused and a party of 9 is offered private [ADR-097]", async ({ page }) => {
  await signIn(page, customer.email, customer.password);
  await page.goto(`/dashboard/journey/tours/book/${tourId}/`);
  await pickDay(page);
  await expect(page.getByText(/· 6 places left/)).toBeVisible();
  const adults = page.getByLabel("Adults and children 12 and over");
  await adults.fill("7");
  await expect(page.getByText("Only 6 places left at this time.", { exact: false })).toBeVisible();
  await adults.fill("9");
  await expect(page.getByText("Parties of 9 or more book the private tour.")).toBeVisible();
  await page.getByRole("button", { name: "Book it private" }).click();
  await expect(page.getByLabel("Private tour")).toBeChecked();
  await expect(page.getByText("US$540 in all")).toBeVisible(); // 9 × US$60, the 9+ price
  await expectNoSeriousA11yIssues(page);
  await setTheme(page, "dark");
  await page.reload();
  await pickDay(page);
  await expectNoSeriousA11yIssues(page);
});

test("a private transfer is priced by vehicle, with the night extra [ADR-097]", async ({ page }) => {
  await signIn(page, customer.email, customer.password);
  await page.goto(`/dashboard/journey/tours/book/${transferId}/`);
  await expect(page.getByText("Private transfer: Airport → hotel")).toBeVisible();
  await page.getByLabel("Adults and children 12 and over").fill("5");
  await pickDay(page);
  await page.getByLabel("Start time").selectOption("23:15");
  await expect(page.getByText("US$50 in all")).toBeVisible();
  await expect(page.getByText(/Van, one way · night extra US\$10/)).toBeVisible();
});

test("the office sees the booking by day and cancels the start; the customer is refunded in full [ADR-097]", async ({ page }) => {
  await signIn(page, OFFICE_LOGIN);
  await expect(page).toHaveURL(new RegExp(`/dashboard/office/${LUXOR_OFFICE}/$`));
  await page.goto(`/dashboard/office/${LUXOR_OFFICE}/?from=${target}`);
  const start = page.getByRole("article", { name: `Sample Calendar Tour ${RUN} at 08:00 Cairo` });
  await expect(start).toContainText("Sample Calendar Lead");
  await expect(start).toContainText("Pickup and notes: Sample Hotel, Luxor");
  await expect(start).toContainText("2 guests booked · 6 places left");
  await expectNoSeriousA11yIssues(page);
  await start.getByText("Can't run this start?").click();
  await start.getByLabel("Reason").fill("Sample: guide unwell");
  await start.getByRole("button", { name: "Cancel this start" }).click();
  // The start empties (its cancel form goes with it) and shows each booking struck through with the reason.
  await expect(start).toContainText("0 guests booked · 8 places left");
  await expect(start).toContainText("Cancelled by the tour office: Sample: guide unwell");

  const { data: o } = await adminDb()
    .from("tour_orders")
    .select("status, cancel_state, cancel_refund_minor")
    .eq("id", orderId)
    .single();
  expect(o).toMatchObject({ status: "cancelled", cancel_state: "approved", cancel_refund_minor: 12000 });
});
