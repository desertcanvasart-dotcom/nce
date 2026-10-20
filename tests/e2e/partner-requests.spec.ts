import { expect, test } from "@playwright/test";
import { adminDb, LOCAL, newUser, ORG, signIn } from "../support/local-auth";
import { apiAs, sampleReservations } from "../support/sailing";
import { expectNoSeriousA11yIssues, setTheme } from "./helpers";

test.skip(!LOCAL, "needs the local Supabase stack: pnpm with-local-db pnpm test:e2e");
test.describe.configure({ mode: "serial", timeout: 180_000 });

/**
 * Batch 4h-2b (DASH-B2B-004, ADR-092): the Sample Partner's reservations user asks operators for offers for a client;
 * the operator sees a travel partner's request and offers at the trade rate; the owner compares and accepts it for the
 * company, with the client's reference and the agency's price.
 */
const RUN = Date.now();
const BOOKER = "reservations@partner.test";
const OWNER = "owner@partner.test";
const base = `/dashboard/partner/${ORG.partner}/requests/`;
let S: Awaited<ReturnType<typeof sampleReservations>>;
let requestUrl = "";
let requestId = "";

const shift = (iso: string, days: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

test.beforeAll(async () => {
  const someone = await newUser("partner-request-sailing");
  S = await sampleReservations({
    run: `${RUN}pr`,
    customer: someone,
    ownerEmail: "owner@operator-a.test",
    bands: [{ from_days: 0, percent: 100 }],
    departsIn: 50,
    count: 0,
  });
  const { error } = await adminDb().from("rates").insert({
    departure_id: S.departureId,
    cabin_type_id: S.cabinTypeId,
    vessel_id: S.vesselId,
    occupancy: 2,
    rate_plan: "trade",
    currency: "USD",
    amount_minor: 80000,
  });
  if (error) throw error;
});

test("the reservations user asks operators for offers for the company [DASH-B2B-004]", async ({ page }) => {
  await signIn(page, BOOKER);
  await page.goto(base);
  await page.getByLabel("Route").selectOption({ label: `${S.origin} → ${S.destination}` });
  await page.getByLabel("Earliest departure").fill(shift(S.departsOn, -5));
  await page.getByLabel("Latest departure").fill(shift(S.departsOn, 5));
  await page.getByLabel("Shortest stay (nights)").fill("4");
  await page.getByLabel("Longest stay (nights)").fill("4");
  await page.getByRole("button", { name: "Send request" }).click();
  await page.waitForURL(/\/requests\/[0-9a-f-]{36}\/$/);
  requestUrl = new URL(page.url()).pathname;
  requestId = requestUrl.match(/requests\/([0-9a-f-]{36})\//)![1]!;
  await expect(page.getByRole("heading", { level: 1, name: `${S.origin} → ${S.destination}` })).toBeVisible();
  await expect(page.getByText(/No offers yet/)).toBeVisible();
  // It's the company's request, not the booker's own: My journey doesn't list it.
  await page.goto("/dashboard/journey/requests/");
  await expect(page.getByRole("link", { name: new RegExp(S.origin) })).toHaveCount(0);
});

test("the operator sees a travel partner's request and offers at the trade rate", async ({ page }) => {
  await signIn(page, "owner@operator-a.test");
  await page.goto(`/dashboard/operator/${ORG.operatorA}/offers/`);
  const row = page.getByRole("row", { name: new RegExp(S.origin) });
  await expect(row).toContainText("Travel partner");
  await page.goto(`/dashboard/operator/${ORG.operatorA}/offers/${requestId}/?departure=${S.departureId}`);
  await expect(page.getByText("This request is from a travel partner booking for a client.")).toBeVisible();
  await expect(page.getByLabel("Rate plan")).toHaveValue("trade");
  // The offer itself goes through the database function the form calls (the form is covered in requests-offers).
  const op = await apiAs("owner@operator-a.test", "nilecruz-local-only");
  const { error } = await op.rpc("send_offer", {
    req: requestId,
    dep: S.departureId,
    plan: "trade",
    cur: "USD",
    cabins: [{ cabin_type_id: S.cabinTypeId, adults: 2, child_ages: [], price_minor: 160000 }],
    total: 160000,
    list_total: 160000,
    note: "",
    inclusions_text: "",
    terms_text: "Trade terms for the e2e test.",
    eligibility: "Two adults.",
    expires_in_hours: 72,
  });
  expect(error).toBeNull();
});

test("the owner compares the offers and accepts one for the client [DASH-B2B-004, 006, 007]", async ({ page }) => {
  await signIn(page, OWNER);
  await page.goto(requestUrl);
  await expect(page.getByText("US$1,600").first()).toBeVisible();
  await page.getByRole("link", { name: "Read the terms and accept for your client" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Accept for your client" })).toBeVisible();
  await expect(page.getByText("Trade terms for the e2e test.")).toBeVisible();
  await page.getByLabel("Guest 1: full name").fill("Sample Request One");
  await page.getByLabel("Date of birth").nth(0).fill("1979-03-01");
  await page.getByLabel("Guest 2: full name").fill("Sample Request Two");
  await page.getByLabel("Date of birth").nth(1).fill("1981-04-01");
  await page.getByLabel("Your client reference").fill(`REQ-${RUN}`);
  await page.getByLabel("Your selling price (USD, optional)").fill("2000");
  await page.getByLabel("The client has read the terms and the cancellation policy").check();
  await page.getByRole("button", { name: "Accept and reserve" }).click();
  await page.waitForURL(/\/bookings\/[0-9a-f-]{36}\/$/);
  const client = page.locator("section", { has: page.getByRole("heading", { name: "Your client" }) });
  await expect(client).toContainText(`REQ-${RUN}`);
  await expect(client).toContainText("US$1,600");
  await expect(client).toContainText("US$2,000");
  await expect(client).toContainText("US$400");
  await page.goto(requestUrl);
  await expect(page.getByText("An offer was accepted. The booking is in Company bookings.")).toBeVisible();
  await page.goto(`/dashboard/partner/${ORG.partner}/bookings/`);
  await expect(page.getByRole("row", { name: new RegExp(`REQ-${RUN}`) })).toBeVisible();
});

test("finance users don't open company requests", async ({ page }) => {
  await signIn(page, "finance@partner.test");
  expect((await page.goto(base))?.status()).toBe(403);
});

test.describe("company request screens are accessible", () => {
  for (const theme of ["light", "dark"] as const) {
    test(`requests, one request (${theme})`, async ({ page }) => {
      await setTheme(page, theme);
      await signIn(page, BOOKER);
      for (const path of [base, requestUrl]) {
        await page.goto(path);
        await expectNoSeriousA11yIssues(page);
      }
    });
  }
});
