import { expect, test, type APIRequestContext } from "@playwright/test";
import { refreshSignature } from "@/lib/connections/signature";
import { actionToken } from "@/lib/requests/tokens";
import { FEED_PULL_TEST_SECRET } from "../support/feed-tls";
import { adminDb, LOCAL, newUser, ORG, signIn, signInAdmin } from "../support/local-auth";
import { ACTION_LINK_TEST_SECRET } from "../support/requests";
import { sampleReservations } from "../support/sailing";
import { expectNoSeriousA11yIssues } from "./helpers";

test.skip(!LOCAL, "needs the local Supabase stack: pnpm with-local-db pnpm test:e2e");
test.describe.configure({ mode: "serial", timeout: 180_000 });

/** ADR-100: allotments book instantly; travel partners follow the reservable rule, with booking requests. */
const RUN = Date.now();
let A: Awaited<ReturnType<typeof sampleReservations>>;
let P: Awaited<ReturnType<typeof sampleReservations>>;
const days = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

async function refresh(request: APIRequestContext) {
  const ts = String(Math.floor(Date.now() / 1000));
  const r = await request.post("/api/internal/catalogue/refresh/", {
    headers: { "nilecruz-timestamp": ts, "nilecruz-signature": refreshSignature(FEED_PULL_TEST_SECRET, ts) },
  });
  expect(r.status()).toBe(200);
}

test.beforeAll(async () => {
  const someone = await newUser("allotment-sailing");
  // A ship whose own availability is 10 days old: not bookable or requestable on its own.
  A = await sampleReservations({
    run: `${RUN}al`,
    customer: someone,
    ownerEmail: "owner@operator-a.test",
    bands: [{ from_days: 0, percent: 100 }],
    departsIn: 40,
    count: 0,
  });
  await adminDb()
    .from("inventory")
    .update({ confirmed_at: new Date(Date.now() - 10 * 86_400_000).toISOString() })
    .eq("departure_id", A.departureId);
  // A ship with fresh manual availability: a booking request.
  P = await sampleReservations({
    run: `${RUN}ag`,
    customer: someone,
    ownerEmail: "owner@operator-a.test",
    bands: [{ from_days: 0, percent: 100 }],
    departsIn: 50,
    count: 0,
  });
  await adminDb()
    .from("inventory")
    .update({ source: "manual", confirmed_at: new Date(Date.now() - 86_400_000).toISOString() })
    .eq("departure_id", P.departureId);
});

test("an admin adds an allotment; its cabins book instantly though the operator's own data is old [ADR-100]", async ({
  page,
  browser,
  request,
}) => {
  await signInAdmin(page, "product@nilecruz.test");
  await page.goto(`/dashboard/admin/operators/${ORG.operatorA}/#allotments`);
  const section = page.locator("#allotments").locator("..");
  await page.getByLabel("Ship and cabin type").selectOption({ label: `Sample Cancel Ship ${RUN}al · Double` });
  await page.locator('input[name="starts_on"]').fill(days(1));
  await page.locator('input[name="ends_on"]').fill(days(90));
  await page.getByLabel("Cabins per sailing").fill("2");
  await page.getByLabel("Contract reference").fill(`SAMPLE-${RUN}`);
  await page.getByRole("button", { name: "Add allotment" }).click();
  await expect(page.getByText(/Allotment added/)).toBeVisible();
  await expect(section.getByText(`Sample Cancel Ship ${RUN}al · Double`).first()).toBeVisible();

  await refresh(request);
  const customer = await newUser("allotment-booker");
  const c = await (await browser.newContext()).newPage();
  await signIn(c, customer.email, customer.password);
  await c.goto(`/cruises/sample-cancel-${RUN}al/reserve/?dep=${A.departureId}`);
  await expect(c.getByText("Last few cabins")).toBeVisible(); // 2 left in the allotment: instant, and low
  await c
    .getByRole("group", { name: "Main deck" })
    .getByLabel(/Double/)
    .check();
  await c.getByRole("button", { name: "See the price" }).click();
  await c.getByLabel("Cabin 1, guest 1: full name").fill("Sample Guest One");
  await c.getByLabel("Date of birth").nth(0).fill("1980-02-02");
  await c.getByLabel("Cabin 1, guest 2: full name").fill("Sample Guest Two");
  await c.getByLabel("Date of birth").nth(1).fill("1982-03-03");
  await c.getByLabel("I have read the terms and the cancellation policy").check();
  await c.getByRole("button", { name: "Reserve" }).click();
  await c.waitForURL(/\/dashboard\/journey\/reservations\/[0-9a-f-]{36}\/$/);
  const id = c.url().match(/reservations\/([0-9a-f-]{36})\//)![1]!;
  const { data } = await adminDb().from("reservation_cabins").select("allotment_id").eq("reservation_id", id).single();
  expect(data!.allotment_id).not.toBeNull();

  // The operator sees what was booked from it.
  const op = await (await browser.newContext()).newPage();
  await signIn(op, "owner@operator-a.test");
  await op.goto(`/dashboard/operator/${ORG.operatorA}/inventory/#allotments`);
  // Scoped to this run's ship: CI runs the suite twice on one database, so earlier allotments are listed too.
  const mine = op.locator("li", { hasText: `Sample Cancel Ship ${RUN}al · Double` });
  await expect(mine.getByText(`${A.departsOn}: 1 of 2 booked`)).toBeVisible();
  await expect(op.getByRole("button", { name: "Add allotment" })).toHaveCount(0); // read-only for the operator
});

test("a travel partner can't book manual data instantly: it sends a booking request the operator confirms [ADR-100]", async ({
  page,
}) => {
  await signIn(page, "reservations@partner.test");
  await page.goto(`/dashboard/partner/${ORG.partner}/search/?from=${P.departsOn}&to=${P.departsOn}&adults=2`);
  const result = page.getByRole("article", { name: new RegExp(`Sample Cancel Ship ${RUN}ag`) });
  await expect(result.getByText(/Available · confirmed within \d+ h/)).toBeVisible();
  await expect(result.getByText(/cabins? left/)).toHaveCount(0); // no counts from manual data
  await result.getByRole("link", { name: "Request" }).click();
  await expect(page.getByText(/The operator confirms these cabins before you pay/)).toBeVisible();
  await page.getByLabel("Cabin 1, guest 1: full name").fill("Sample Client One");
  await page.getByLabel("Date of birth").nth(0).fill("1980-02-02");
  await page.getByLabel("Cabin 1, guest 2: full name").fill("Sample Client Two");
  await page.getByLabel("Date of birth").nth(1).fill("1982-03-03");
  await page.getByLabel("Your client reference").fill(`CLIENT-${RUN}`);
  await page.getByLabel("The client has read the terms and the cancellation policy").check();
  await page.getByRole("button", { name: "Send booking request" }).click();
  await page.waitForURL(/\/dashboard\/partner\/[0-9a-f-]{36}\/requests\/booking\/[0-9a-f-]{36}\/$/);
  const id = page.url().match(/booking\/([0-9a-f-]{36})\//)![1]!;
  await expect(page.getByText("Waiting for the operator", { exact: true })).toBeVisible();
  await expectNoSeriousA11yIssues(page);

  // The operator's message names the agency; the operator confirms from the link.
  const { data: msg } = await adminDb()
    .from("outbound_messages")
    .select("body_text")
    .eq("booking_request_id", id)
    .limit(1)
    .single();
  expect(msg!.body_text).toContain("Travel partner: Sample Partner (trade booking)");
  const op = await (await page.context().browser()!.newContext()).newPage();
  await op.goto(`/operator-reply/${actionToken(ACTION_LINK_TEST_SECRET, id, "confirm")}/`);
  await op.getByRole("button", { name: "Confirm these cabins" }).click();
  await expect(op.getByText(/Confirmed\./)).toBeVisible();

  await page.reload();
  await expect(page.getByText("Confirmed", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Open the booking" }).click();
  await page.waitForURL(/\/dashboard\/partner\/[0-9a-f-]{36}\/bookings\/[0-9a-f-]{36}\/$/);
  await expect(page.getByText(`CLIENT-${RUN}`).first()).toBeVisible();
});
