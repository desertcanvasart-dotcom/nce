import { expect, test, type APIRequestContext } from "@playwright/test";
import { refreshSignature, requestsTickSignature } from "@/lib/connections/signature";
import { actionToken } from "@/lib/requests/tokens";
import { FEED_PULL_TEST_SECRET } from "../support/feed-tls";
import { adminDb, LOCAL, newUser, signIn, signInAdmin } from "../support/local-auth";
import { ACTION_LINK_TEST_SECRET } from "../support/requests";
import { apiAs, sampleReservations } from "../support/sailing";
import { expectNoSeriousA11yIssues } from "./helpers";

test.skip(!LOCAL, "needs the local Supabase stack: pnpm with-local-db pnpm test:e2e");
test.describe.configure({ mode: "serial", timeout: 180_000 });

/**
 * Operator loop, Parts A and C (ADR-099): a cabin on manual data becomes a booking request; the operator answers with one
 * tap from the email, without signing in; reminders and the admin alert follow the reply time.
 */
const RUN = Date.now();
let S: Awaited<ReturnType<typeof sampleReservations>>;
let customer = { id: "", email: "", password: "" };
let slug = "";
let requestId = "";

async function refresh(request: APIRequestContext) {
  const ts = String(Math.floor(Date.now() / 1000));
  const r = await request.post("/api/internal/catalogue/refresh/", {
    headers: { "nilecruz-timestamp": ts, "nilecruz-signature": refreshSignature(FEED_PULL_TEST_SECRET, ts) },
  });
  expect(r.status()).toBe(200);
}
async function tick(request: APIRequestContext) {
  const ts = String(Math.floor(Date.now() / 1000));
  const r = await request.post("/api/internal/requests/tick/", {
    data: {},
    headers: { "nilecruz-timestamp": ts, "nilecruz-signature": requestsTickSignature(FEED_PULL_TEST_SECRET, ts) },
  });
  expect(r.status()).toBe(200);
  return (await r.json()) as { reminded: number; escalated: number };
}
const link = (id: string, action: "confirm" | "decline" | "hold" | "other") =>
  `/operator-reply/${actionToken(ACTION_LINK_TEST_SECRET, id, action)}/`;
async function available() {
  const { data } = await adminDb().from("inventory").select("available, source").eq("departure_id", S.departureId).single();
  return data!;
}
async function requestViaApi() {
  const c = await apiAs(customer.email, customer.password);
  const { data, error } = await c.rpc("customer_request_booking", {
    dep: S.departureId,
    cur: "USD",
    cabins: [{ cabin_type_id: S.cabinTypeId, ages: [40, 38] }],
    guests: [
      { full_name: "Sample Guest One", date_of_birth: "1980-02-02" },
      { full_name: "Sample Guest Two", date_of_birth: "1982-03-03" },
    ],
    terms_read: true,
  });
  if (error) throw error;
  return data as string;
}

test.beforeAll(async () => {
  customer = await newUser("request-customer");
  S = await sampleReservations({
    run: `${RUN}rq`,
    customer,
    ownerEmail: "owner@operator-a.test",
    bands: [{ from_days: 0, percent: 100 }],
    departsIn: 45,
    count: 0,
  });
  slug = `sample-cancel-${RUN}rq`;
  // Manual data from 3 days ago: available, but the operator confirms before the customer pays.
  await adminDb()
    .from("inventory")
    .update({ source: "manual", confirmed_at: new Date(Date.now() - 3 * 86_400_000).toISOString() })
    .eq("departure_id", S.departureId);
});

test("manual data can't be paid for instantly: it becomes a booking request [ADR-099 Part C]", async ({ page, request }) => {
  await refresh(request);
  await signIn(page, customer.email, customer.password);
  await page.goto(`/cruises/${slug}/reserve/?dep=${S.departureId}`);
  const cabin = page.getByRole("group", { name: "Main deck" }).getByLabel(/Double/);
  await expect(cabin).toBeVisible();
  await expect(page.getByText(/Available · confirmed within \d+ h/)).toBeVisible();
  await expect(page.getByText(/Only \d cabins? left|Last few cabins/)).toHaveCount(0); // never counts from manual data
  await cabin.check();
  await page.getByRole("button", { name: "See the price" }).click();
  await expect(page.getByText(/The operator confirms these cabins before you pay/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Reserve" })).toHaveCount(0);
  await page.getByLabel("Cabin 1, guest 1: full name").fill("Sample Guest One");
  await page.getByLabel("Date of birth").nth(0).fill("1980-02-02");
  await page.getByLabel("Nationality").fill("GB");
  await page.getByLabel("Cabin 1, guest 2: full name").fill("Sample Guest Two");
  await page.getByLabel("Date of birth").nth(1).fill("1982-03-03");
  await page.getByLabel("I have read the terms and the cancellation policy").check();
  await page.getByRole("button", { name: "Send booking request" }).click();
  await page.waitForURL(/\/dashboard\/journey\/requests\/booking\/[0-9a-f-]{36}\/$/);
  requestId = page.url().match(/booking\/([0-9a-f-]{36})\//)![1]!;
  await expect(page.getByText("Waiting for the operator", { exact: true })).toBeVisible();
  const { count } = await adminDb()
    .from("reservations")
    .select("id", { count: "exact", head: true })
    .eq("departure_id", S.departureId);
  expect(count).toBe(0); // no reservation, nothing to pay yet
});

test("the operator gets one message with four one-tap answers, guests by count only [ADR-099 Part A]", async () => {
  const { data } = await adminDb()
    .from("outbound_messages")
    .select("channel, kind, to_address, subject, body_text, status")
    .eq("booking_request_id", requestId);
  // No contacts yet: the operator's owners and reservations staff, by email (recorded, not sent, in tests).
  expect(data!.map((m) => m.to_address).sort()).toEqual(["owner@operator-a.test", "reservations@operator-a.test"]);
  const m = data![0]!;
  expect(m).toMatchObject({ channel: "email", kind: "booking_request.new", status: "skipped" });
  expect(m.body_text).toContain("Guests: 2 (lead guest's nationality: GB)");
  expect(m.body_text).not.toContain("Sample Guest One");
  expect(m.body_text).toMatch(/Your manual entry from \d+ \w+ showed 5 Double free\./);
  for (const label of ["Confirm", "Decline", "Hold 72h", "Offer other"])
    expect(m.body_text).toMatch(new RegExp(`${label}: http\\S+/operator-reply/`));
});

test("Confirm from the email link, without signing in: booked, availability updated, the link then shows the answer", async ({
  browser,
}) => {
  const { data } = await adminDb()
    .from("outbound_messages")
    .select("body_text")
    .eq("booking_request_id", requestId)
    .limit(1)
    .single();
  const href = new URL(data!.body_text!.match(/Confirm: (\S+)/)![1]!).pathname;
  const page = await (await browser.newContext()).newPage(); // not signed in
  await page.goto(href);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("request NQ-");
  await expect(page.getByText("Guests: 2 (lead guest's nationality: GB)")).toBeVisible();
  await expectNoSeriousA11yIssues(page);
  // Opening the link changed nothing (mail scanners open links); the button does.
  expect((await adminDb().from("booking_requests").select("status").eq("id", requestId).single()).data!.status).toBe("waiting");
  await page.getByRole("button", { name: "Confirm these cabins" }).click();
  await expect(page.getByText(/Confirmed\. The customer is asked to pay/)).toBeVisible();
  expect(await available()).toEqual({ available: 4, source: "tap" });
  await page.goto(href);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("is confirmed");
  await expect(page.getByText(/Recorded answer: Confirmed/)).toBeVisible();
});

test("the customer sees the confirmation and pays as for any booking", async ({ page }) => {
  await signIn(page, customer.email, customer.password);
  await page.goto(`/dashboard/journey/requests/booking/${requestId}/`);
  await expect(page.getByText("Confirmed", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Open your reservation and pay" }).click();
  await page.waitForURL(/\/dashboard\/journey\/reservations\/[0-9a-f-]{36}\/$/);
  await expect(page.getByText("US$2,000").first()).toBeVisible();
});

test("Decline sets that cabin type to none free; a broken or expired link shows a plain page", async ({ page }) => {
  await adminDb()
    .from("inventory")
    .update({ source: "manual", confirmed_at: new Date().toISOString() })
    .eq("departure_id", S.departureId);
  const id = await requestViaApi();
  await page.goto(link(id, "decline"));
  await page.getByRole("button", { name: "Decline" }).click();
  await expect(page.getByText(/Declined\. We've marked those cabins as full/)).toBeVisible();
  expect(await available()).toEqual({ available: 0, source: "tap" });
  await page.goto("/operator-reply/not-a-real-link/");
  await expect(page.getByRole("heading", { name: "This link isn’t valid" })).toBeVisible();
  const expired = actionToken(ACTION_LINK_TEST_SECRET, id, "confirm", Math.floor(Date.now() / 1000) - 8 * 86_400);
  await page.goto(`/operator-reply/${expired}/`);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("is declined"); // expired, but answered: the answer shows
});

test("a reminder at the reply time, then an alert to Nilecruz at twice it [ADR-099]", async ({ page, request }) => {
  await adminDb()
    .from("inventory")
    .update({ available: 3, source: "manual", confirmed_at: new Date().toISOString() })
    .eq("departure_id", S.departureId);
  const id = await requestViaApi();
  const db = adminDb();
  await db
    .from("booking_requests")
    .update({ created_at: new Date(Date.now() - 7 * 3_600_000).toISOString() })
    .eq("id", id);
  expect((await tick(request)).reminded).toBeGreaterThanOrEqual(1);
  const kinds = async () =>
    ((await db.from("outbound_messages").select("kind, to_address").eq("booking_request_id", id)).data ?? []).map(
      (m) => `${m.kind} ${m.to_address}`,
    );
  expect(await kinds()).toContain("booking_request.reminder owner@operator-a.test");
  await db
    .from("booking_requests")
    .update({ created_at: new Date(Date.now() - 13 * 3_600_000).toISOString() })
    .eq("id", id);
  expect((await tick(request)).escalated).toBeGreaterThanOrEqual(1);
  expect(await kinds()).toContain("booking_request.escalation alerts@nilecruz.test");
  // The admin sees it on the operator's page.
  await signInAdmin(page, "partners@nilecruz.test");
  await page.goto(`/dashboard/admin/operators/00000000-0000-4000-b000-00000000000a/#requests`);
  await expect(page.getByText("Phone the operator").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Booking requests: answers" })).toBeVisible();
});
