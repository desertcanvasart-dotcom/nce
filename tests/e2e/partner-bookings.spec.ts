import { expect, test } from "@playwright/test";
import { adminDb, LOCAL, newUser, ORG, signIn } from "../support/local-auth";
import { sampleReservations } from "../support/sailing";
import { paidCheckoutEvent } from "../support/stripe";
import { expectNoSeriousA11yIssues, setTheme } from "./helpers";

test.skip(!LOCAL, "needs the local Supabase stack: pnpm with-local-db pnpm test:e2e");
test.describe.configure({ mode: "serial", timeout: 180_000 });

/**
 * Batch 4h exit criterion: a partner team of three roles completes a client booking. The seeded Sample Partner team:
 * the reservations user books for a client, the finance user pays, the owner prints the client record (ADR-092).
 */
const RUN = Date.now();
const BOOKER = "reservations@partner.test";
const FINANCE = "finance@partner.test";
const OWNER = "owner@partner.test";
const base = `/dashboard/partner/${ORG.partner}/`;
let S: Awaited<ReturnType<typeof sampleReservations>>;
let bookingUrl = "";
let reservationId = "";
let reference = "";

test.beforeAll(async () => {
  const someone = await newUser("partner-sailing");
  S = await sampleReservations({
    run: `${RUN}pb`,
    customer: someone,
    ownerEmail: "owner@operator-a.test",
    bands: [{ from_days: 0, percent: 100 }],
    departsIn: 55,
    count: 0,
  });
  const { error } = await adminDb().from("partner_rates").insert({
    partner_org_id: ORG.partner,
    departure_id: S.departureId,
    cabin_type_id: S.cabinTypeId,
    vessel_id: S.vesselId,
    occupancy: 2,
    currency: "USD",
    amount_minor: 70000,
  });
  if (error) throw error;
});

test("the reservations user books for a client at the company rate [DASH-B2B-003, 006, 007]", async ({ page }) => {
  await signIn(page, BOOKER);
  await page.goto(`${base}search/?from=${S.departsOn}&to=${S.departsOn}&adults=2`);
  const result = page.getByRole("article", { name: new RegExp(`Sample Cancel Ship ${RUN}pb`) });
  await expect(result).toContainText("US$1,400");
  await result.getByRole("link", { name: "Reserve" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Reserve for a client" })).toBeVisible();
  await page.getByLabel("Cabin 1, guest 1: full name").fill("Sample Client One");
  await page.getByLabel("Date of birth").nth(0).fill("1980-05-01");
  await page.getByLabel("Nationality").fill("ES");
  await page.getByLabel("Cabin 1, guest 2: full name").fill("Sample Client Two");
  await page.getByLabel("Date of birth").nth(1).fill("1982-06-01");
  await page.getByLabel("Your client reference").fill(`CLIENT-${RUN}`);
  await page.getByLabel("Your selling price (USD, optional)").fill("1800");
  await page.getByLabel("The client has read the terms and the cancellation policy").check();
  await page.getByRole("button", { name: "Reserve" }).click();
  await page.waitForURL(/\/bookings\/[0-9a-f-]{36}\/$/);
  bookingUrl = new URL(page.url()).pathname;
  reservationId = bookingUrl.match(/bookings\/([0-9a-f-]{36})\//)![1]!;
  reference = (await page.getByRole("heading", { level: 1 }).textContent())!.replace("Reservation ", "").trim();

  const client = page.locator("section", { has: page.getByRole("heading", { name: "Your client" }) });
  await expect(client).toContainText(`CLIENT-${RUN}`);
  await expect(client).toContainText("US$1,400");
  await expect(client).toContainText("US$1,800");
  await expect(client).toContainText("US$400");
  // Reservations users don't pay; that's for finance and the owner.
  await expect(page.getByRole("button", { name: "Pay the balance by card" })).toHaveCount(0);
  await expect(page.getByText("Your finance colleagues or the owner pay this booking.")).toBeVisible();
  // The booking stays out of the booker's own My journey.
  await page.goto("/dashboard/journey/reservations/");
  await expect(page.getByText(reference)).toHaveCount(0);
});

test("the finance user pays; the booking is confirmed [DASH-B2B-005]", async ({ page, request }) => {
  await signIn(page, FINANCE);
  await page.goto(bookingUrl);
  await page.getByLabel("I have read the cancellation policy below").check();
  await page.getByRole("button", { name: "Pay the balance by card" }).click();
  await expect(page.getByText(/Card payments aren.t switched on yet/)).toBeVisible();
  const ev = paidCheckoutEvent(reservationId, 140000, "usd", `${RUN}pb`);
  const r = await request.post("/api/stripe/webhook/", {
    data: ev.payload,
    headers: { "stripe-signature": ev.signature, "content-type": "application/json" },
  });
  expect(await r.json()).toMatchObject({ result: "recorded" });
  await page.reload();
  await expect(page.getByText("Confirmed", { exact: true }).first()).toBeVisible();
  await page.goto(`${base}payments/`);
  await expect(page.locator("li", { hasText: reference })).toContainText("Received");
  // Finance users see the client details but can't change them.
  await page.goto(bookingUrl);
  await expect(page.getByRole("button", { name: "Save client details" })).toHaveCount(0);
});

test("the owner prints the client record: the agency and its price, never the trade price [DASH-B2B-008]", async ({ page }) => {
  await signIn(page, OWNER);
  await page.goto(`${bookingUrl}client/`);
  const record = page.getByRole("article", { name: "Client booking record" });
  await expect(record).toContainText("Sample Partner");
  await expect(record).toContainText(`CLIENT-${RUN}`);
  await expect(record).toContainText("US$1,800");
  await expect(record).toContainText("Sample Client One");
  await expect(record).toContainText("Booked through Nilecruz");
  await expect(record).not.toContainText("US$1,400");
  await expect(record).not.toContainText("Account holder");
});

test("the operator sees the agency's booking, never its selling price [DASH-ADM-089]", async ({ page }) => {
  await signIn(page, "owner@operator-a.test");
  await page.goto(`/dashboard/operator/${ORG.operatorA}/bookings/${reservationId}/`);
  await expect(page.getByText("Trade booking for Sample Partner, a Nilecruz travel partner.")).toBeVisible();
  await expect(page.getByText("US$1,800")).toHaveCount(0);
  await expect(page.getByText(`CLIENT-${RUN}`)).toHaveCount(0);
});

test.describe("partner booking screens are accessible", () => {
  for (const theme of ["light", "dark"] as const) {
    test(`reserve, booking, client record, bookings and payments (${theme})`, async ({ page }) => {
      await setTheme(page, theme);
      await signIn(page, OWNER);
      for (const path of [
        `${base}reserve/?dep=${S.departureId}&cabin=${S.cabinTypeId}&cur=USD&adults=2&children=`,
        bookingUrl,
        `${bookingUrl}client/`,
        `${base}bookings/`,
        `${base}payments/`,
      ]) {
        await page.goto(path);
        await expectNoSeriousA11yIssues(page);
      }
    });
  }
});
