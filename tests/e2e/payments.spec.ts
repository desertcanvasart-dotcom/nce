import { createClient } from "@supabase/supabase-js";
import { expect, test, type Browser } from "@playwright/test";
import { adminDb, LOCAL, newUser, ORG, signIn, signInAdmin } from "../support/local-auth";
import { paidCheckoutEvent } from "../support/stripe";
import { expectNoSeriousA11yIssues, setTheme } from "./helpers";

test.skip(!LOCAL, "needs the local Supabase stack: pnpm with-local-db pnpm test:e2e");
// Its own sailing, customer and reservations per run, so it never collides with other files or a second CI pass.
test.describe.configure({ mode: "serial", timeout: 180_000 });

const RUN = Date.now();
const ADMIN = "bookings@nilecruz.test";
const OWNER = "owner@operator-a.test";
const isoIn = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
let customer = { id: "", email: "", password: "" };
const res: string[] = [];
const refs: string[] = [];

/** A customer signed in through the real API (to set up reservations quickly; the screens are tested below). */
async function apiAs(email: string, password: string) {
  const c = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false },
  });
  const { error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return c;
}

test.beforeAll(async () => {
  const db = adminDb();
  const { data: v, error } = await db
    .from("vessels")
    .insert({
      slug: `sample-payments-${RUN}`,
      name: `Sample Payments Ship ${RUN}`,
      type: "motor",
      visibility: "published",
      published_at: new Date().toISOString(),
      operator_org_id: ORG.operatorA,
      is_sample: true,
    })
    .select("id")
    .single();
  if (error) throw error;
  const { data: c } = await db
    .from("cabin_types")
    .insert({ vessel_id: v.id, code: "DBL", name: "Double", deck: "Main", max_occupancy: 2 })
    .select("id")
    .single();
  const { data: s } = await db
    .from("schedules")
    .insert({
      vessel_id: v.id,
      code: "PY4",
      origin: `Pay Port ${RUN}`,
      destination: `Pay Harbour ${RUN}`,
      nights: 4,
      sailing_days: [1, 2, 3, 4, 5, 6, 7],
    })
    .select("id")
    .single();
  const { data: d } = await db
    .from("departures")
    .insert({ schedule_id: s!.id, vessel_id: v.id, departs_on: isoIn(60), returns_on: isoIn(64) })
    .select("id")
    .single();
  await db.from("inventory").insert({ departure_id: d!.id, cabin_type_id: c!.id, vessel_id: v.id, available: 5 });
  await db.from("rates").insert({
    departure_id: d!.id,
    cabin_type_id: c!.id,
    vessel_id: v.id,
    occupancy: 2,
    rate_plan: "international",
    currency: "USD",
    amount_minor: 100000,
  });
  const { data: p } = await db
    .from("cancellation_policies")
    .insert({ vessel_id: v.id, bands: [{ from_days: 0, percent: 100 }] })
    .select("id")
    .single();
  await db
    .from("cancellation_policy_translations")
    .insert({ policy_id: p!.id, locale: "en", terms: "Sample policy wording for the payments tests." });

  customer = await newUser("payments-customer");
  const cust = await apiAs(customer.email, customer.password);
  const op = await apiAs(OWNER, "nilecruz-local-only");
  for (let i = 0; i < 3; i++) {
    const { data: r, error: re } = await cust
      .from("cruise_requests")
      .insert({
        origin: `Pay Port ${RUN}`,
        destination: `Pay Harbour ${RUN}`,
        earliest_departure: isoIn(50),
        latest_departure: isoIn(70),
        nights_min: 4,
        nights_max: 4,
        adults: 2,
        cabins: 1,
      })
      .select("id")
      .single();
    if (re) throw re;
    const { data: offer, error: oe } = await op.rpc("send_offer", {
      req: r.id,
      dep: d!.id,
      plan: "international",
      cur: "USD",
      cabins: [{ cabin_type_id: c!.id, adults: 2, child_ages: [], price_minor: 200000 }],
      total: 200000,
      list_total: 200000,
      note: "",
      inclusions_text: "",
      terms_text: "Sample terms.",
      eligibility: "Two adults.",
      expires_in_hours: 72,
    });
    if (oe) throw oe;
    const guests = [
      { full_name: "Sample Payer One", date_of_birth: "1980-01-01", nationality: "GB" },
      { full_name: "Sample Payer Two", date_of_birth: "1981-01-01" },
    ];
    const { data: ref, error: ae } = await cust.rpc("accept_offer", { target: offer, guests, terms_read: true });
    if (ae) throw ae;
    refs.push(ref as string);
    res.push((await db.from("reservations").select("id").eq("reference", ref).single()).data!.id);
  }
});

const page0 = (i: number) => `/dashboard/journey/reservations/${res[i]}/`;

test("a card payment is recorded only from a signed Stripe webhook, once, with a receipt [DATA-026, 028, DASH-CUS-008, DASH-ADM-102]", async ({
  page,
  request,
}) => {
  await signIn(page, customer.email, customer.password);
  await page.goto(page0(0));
  await expect(page.getByText("Pay in full by")).toBeVisible();
  await expect(
    page.getByText(
      /October–April departures are paid within 7 days|May–September departures are paid within 14 days|within 3 days/,
    ),
  ).toBeVisible();
  // No Stripe key locally: the button says so rather than pretending (ADR-089).
  await page.getByLabel("I have read the cancellation policy below").check();
  await page.getByRole("button", { name: "Pay the balance by card" }).click();
  await expect(page.getByText(/Card payments aren’t switched on yet|Card payments aren't switched on yet/)).toBeVisible();

  // The browser can't mark it paid; only a signed webhook can.
  expect(
    (await request.post("/api/stripe/webhook/", { data: "{}", headers: { "stripe-signature": "t=1,v1=bad" } })).status(),
  ).toBe(400);
  const ev = paidCheckoutEvent(res[0]!, 200000, "usd", `${RUN}`);
  const post = () =>
    request.post("/api/stripe/webhook/", {
      data: ev.payload,
      headers: { "stripe-signature": ev.signature, "content-type": "application/json" },
    });
  expect((await post()).status()).toBe(200);
  expect(await (await post()).json()).toMatchObject({ result: "duplicate" });
  // A payment for a reservation this database doesn't have is acknowledged, not retried forever.
  for (const unknown of ["00000000-0000-4000-8000-000000000000", "not-a-uuid"]) {
    const other = paidCheckoutEvent(unknown, 100, "usd", `${RUN}-${unknown}`);
    const r = await request.post("/api/stripe/webhook/", {
      data: other.payload,
      headers: { "stripe-signature": other.signature, "content-type": "application/json" },
    });
    expect(r.status()).toBe(200);
    expect(await r.json()).toMatchObject({ ignored: "unknown_reservation" });
  }

  await page.reload();
  await expect(page.getByText("Confirmed", { exact: true }).first()).toBeVisible();
  await page.getByRole("link", { name: /^Receipt NCR-\d{4}-\d{6}$/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: /^Receipt NCR-/ })).toBeVisible();
  // ADR-094: Nilecruz receives the payment as the operator's booking agent.
  await expect(page.getByText("Nilecruz, as booking agent")).toBeVisible();
  await expect(page.getByText("On behalf of (seller)")).toBeVisible();
  await expect(page.getByText("US$2,000")).toBeVisible();
  const { count } = await adminDb().from("payments").select("id", { count: "exact", head: true }).eq("reservation_id", res[0]!);
  expect(count).toBe(1);
});

test("a reported transfer is checked by a finance admin; the operator sees its payable [DASH-CUS-009, DASH-ADM-097, 106, DATA-037, 038]", async ({
  page,
  browser,
}) => {
  await signIn(page, customer.email, customer.password);
  await page.goto(page0(1));
  const f = page.locator("form", { has: page.getByRole("button", { name: "Report the transfer" }) });
  await f.getByLabel("Amount sent (USD)").fill("2000.00");
  await f.getByLabel("Date sent").fill(isoIn(0));
  await f.getByLabel("Bank reference").fill(`TRF-${RUN}`);
  await f.getByRole("button", { name: "Report the transfer" }).click();
  await expect(page.getByText(/Nilecruz checks the transfer/)).toBeVisible();
  await page.reload();
  const row = page.locator("li", { hasText: `TRF-${RUN}` });
  await expect(row).toContainText("Reported, being checked");

  const admin = await adminPage(browser);
  await admin.goto("/dashboard/admin/");
  await expect(admin.getByRole("link", { name: /Payments awaiting verification/ })).toBeVisible();
  await admin.goto("/dashboard/admin/finance/");
  const decide = admin.locator("form", { has: admin.getByRole("button", { name: `Save decision for ${refs[1]}` }) });
  await decide.getByLabel("Seen on the bank statement?").selectOption("verified");
  await decide.getByRole("button", { name: `Save decision for ${refs[1]}` }).click();
  // The decision form leaves with the reported payment, so the outcome is read from the page (ADR-076).
  await expect(decide).toHaveCount(0);
  await expect(admin.getByRole("row", { name: /Sample Operator A \(USD\)/ })).toBeVisible();

  await page.reload();
  await expect(row).toContainText("Received");
  const op = await (await browser.newContext()).newPage();
  await signIn(op, OWNER);
  await op.goto(`/dashboard/operator/${ORG.operatorA}/bookings/`);
  await expect(op.getByText(/USD: earned .* · paid out .* · owed/)).toBeVisible();
});

test("operators remind; only admins record money (ADR-089) [DASH-OPR-013, 014, DATA-043]", async ({ page, browser }) => {
  const op = await (await browser.newContext()).newPage();
  await signIn(op, OWNER);
  await op.goto(`/dashboard/operator/${ORG.operatorA}/bookings/${res[2]}/`);
  await expect(op.getByText("Payments are received and recorded by Nilecruz; you see their status here.")).toBeVisible();
  await expect(op.getByRole("button", { name: /Record/ })).toHaveCount(0);
  const remind = op.getByRole("button", { name: "Send the customer a payment reminder" });
  await remind.click();
  await expect(op.getByText("Reminder sent. The customer sees it in My journey.")).toBeVisible();
  await remind.click();
  await expect(op.getByText("A reminder was sent in the last 12 hours.")).toBeVisible();
  expect((await op.goto("/dashboard/admin/finance/"))?.status()).toBe(403);

  await signIn(page, customer.email, customer.password);
  await page.goto("/dashboard/journey/");
  await expect(page.getByRole("link", { name: `Reminder: reservation ${refs[2]} is waiting for payment` })).toBeVisible();
});

test("finance admins keep the premium calendar and record payouts [DASH-ADM-099, DASH-PAY-006, DATA-037]", async ({
  browser,
}) => {
  const admin = await adminPage(browser);
  await admin.goto("/dashboard/admin/finance/");
  await expect(admin.locator('input[value="Western Easter 2027"]')).toBeVisible();
  const add = admin.locator("form", { has: admin.getByRole("button", { name: "Add premium period" }) });
  await add.getByLabel("Name").fill(`Sample period ${RUN}`);
  await add.getByLabel("From").fill("2028-04-10");
  await add.getByLabel("To").fill("2028-04-17");
  await add.getByRole("button", { name: "Add premium period" }).click();
  await expect(admin.getByText(/Premium period saved/)).toBeVisible();
  const payout = admin.locator("form", { has: admin.getByRole("button", { name: "Record payout" }) });
  await payout.getByLabel("Operator").selectOption({ label: "Sample Operator A" });
  await payout.getByLabel("Amount").fill("100.00");
  await payout.getByLabel("Paid on").fill(isoIn(0));
  await payout.getByLabel("Reference").fill(`PO-${RUN}`);
  await payout.getByRole("button", { name: "Record payout" }).click();
  await expect(admin.getByText(/Payout recorded. This records a transfer you made; it doesn't send money./)).toBeVisible();
});

async function adminPage(browser: Browser) {
  const p = await (await browser.newContext()).newPage();
  await signInAdmin(p, ADMIN);
  return p;
}

test.describe("payment screens are accessible", () => {
  for (const theme of ["light", "dark"] as const) {
    test(`reservation payment, receipt, operator bookings, finance (${theme})`, async ({ page, browser }) => {
      await setTheme(page, theme);
      await signIn(page, customer.email, customer.password);
      const { data: pay } = await adminDb().from("payments").select("id").eq("reservation_id", res[0]!).single();
      for (const path of [page0(0), page0(1), `${page0(0)}receipts/${pay!.id}/`]) {
        await page.goto(path);
        await expectNoSeriousA11yIssues(page);
      }
      const opCtx = await browser.newContext({ colorScheme: theme });
      const op = await opCtx.newPage();
      await setTheme(op, theme);
      await signIn(op, OWNER);
      for (const path of [
        `/dashboard/operator/${ORG.operatorA}/bookings/`,
        `/dashboard/operator/${ORG.operatorA}/bookings/${res[1]}/`,
      ]) {
        await op.goto(path);
        await expectNoSeriousA11yIssues(op);
      }
      await opCtx.close();
      const adCtx = await browser.newContext({ colorScheme: theme });
      const ad = await adCtx.newPage();
      await setTheme(ad, theme);
      await signInAdmin(ad, ADMIN);
      for (const path of ["/dashboard/admin/finance/", `/dashboard/admin/finance/receipts/${pay!.id}/`]) {
        await ad.goto(path);
        await expectNoSeriousA11yIssues(ad);
      }
      await adCtx.close();
    });
  }
});
