import { expect, test, type Browser } from "@playwright/test";
import { adminDb, LOCAL, newUser, ORG, signIn, signInAdmin } from "../support/local-auth";
import { sampleReservations } from "../support/sailing";
import { paidCheckoutEvent } from "../support/stripe";
import { expectNoSeriousA11yIssues, setTheme } from "./helpers";

test.skip(!LOCAL, "needs the local Supabase stack: pnpm with-local-db pnpm test:e2e");
test.describe.configure({ mode: "serial", timeout: 180_000 });

const RUN = Date.now();
// Its own admin: two workers signing one account in with the same two-step code would collide.
const ADMIN = "refunds@nilecruz.test";
const OWNER = "owner@operator-a.test";
// The standard (non-luxury) bands supplied 19 Oct 2026; 75 days out falls in the 90–60 day band: 35 %.
const STANDARD = [
  { from_days: 121, percent: 0 },
  { from_days: 91, percent: 25 },
  { from_days: 60, percent: 35 },
  { from_days: 30, percent: 50 },
  { from_days: 0, percent: 100 },
];
let customer = { id: "", email: "", password: "" };
let res: string[] = [];
let refs: string[] = [];
let departureId = "";
let cabinTypeId = "";
let vesselId = "";
const mine = (i: number) => `/dashboard/journey/reservations/${res[i]}/`;

async function adminPage(browser: Browser) {
  const p = await (await browser.newContext()).newPage();
  await signInAdmin(p, ADMIN);
  return p;
}
const available = async () =>
  (
    await adminDb()
      .from("inventory")
      .select("available")
      .eq("departure_id", departureId)
      .eq("cabin_type_id", cabinTypeId)
      .single()
  ).data!.available;

test.beforeAll(async ({ request }) => {
  customer = await newUser("cancel-customer");
  ({
    ids: res,
    refs,
    departureId,
    cabinTypeId,
    vesselId,
  } = await sampleReservations({
    run: RUN,
    customer,
    ownerEmail: OWNER,
    bands: STANDARD,
    departsIn: 75,
    count: 3,
  }));
  // The first two paid in full by card, through signed webhooks as Stripe would send them; the third stays unpaid.
  for (const [i, id] of res.slice(0, 2).entries()) {
    const ev = paidCheckoutEvent(id, 200000, "usd", `${RUN}-c${i}`);
    const r = await request.post("/api/stripe/webhook/", {
      data: ev.payload,
      headers: { "stripe-signature": ev.signature, "content-type": "application/json" },
    });
    expect(r.status()).toBe(200);
  }
});

test("a customer asks to cancel; the operator confirms; a finance admin approves and records the refund [DASH-CUS-010, DASH-PAY-011, 012, DASH-OPR-015, DASH-ADM-005, 095, 104, 105, DATA-029, 036]", async ({
  page,
  browser,
}) => {
  await signIn(page, customer.email, customer.password);
  await page.goto(mine(0));
  const cancel = page.locator("section", { has: page.getByRole("heading", { name: "Cancel this reservation" }) });
  await expect(cancel).toContainText("75 days before departure");
  await expect(cancel).toContainText("35 %");
  await expect(cancel).toContainText("US$700");
  await expect(cancel).toContainText("US$1,300 would be refunded");
  await cancel.getByRole("button", { name: "Ask to cancel" }).click();
  await expect(page.getByText("Tick that you have read the cancellation policy and the charge.")).toBeVisible();
  await cancel.getByLabel("Reason (optional)").fill("Change of plans");
  await cancel.getByLabel("I have read the cancellation policy and the charge above").check();
  await cancel.getByRole("button", { name: "Ask to cancel" }).click();
  // The form leaves once the request exists; the outcome is read from the page (ADR-076).
  await expect(page.getByText("Cancellation requested", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Cancel this reservation" })).toHaveCount(0);

  const op = await (await browser.newContext()).newPage();
  await signIn(op, OWNER);
  await op.goto(`/dashboard/operator/${ORG.operatorA}/bookings/${res[0]}/`);
  await expect(op.getByText("Waiting for the operator to check the figures.")).toBeVisible();
  await op.getByLabel("Are the figures right?").selectOption("contested");
  await op.getByRole("button", { name: "Send to Nilecruz" }).click();
  await expect(op.getByText("Say what is wrong with the figures.")).toBeVisible();
  await op.getByLabel("Are the figures right?").selectOption("confirmed");
  await op.getByRole("button", { name: "Send to Nilecruz" }).click();
  await expect(op.getByText("The operator confirmed the figures.")).toBeVisible();
  await expect(op.getByRole("button", { name: /Refund|Approve|Record/ })).toHaveCount(0);

  const before = await available();
  const admin = await adminPage(browser);
  await admin.goto("/dashboard/admin/");
  await expect(admin.getByRole("link", { name: /Cancellation requests and refund reviews/ })).toBeVisible();
  await admin.goto("/dashboard/admin/finance/");
  await admin.getByRole("link", { name: refs[0]! }).first().click();
  await expect(admin.getByText("The operator confirmed the figures.")).toBeVisible();
  await admin.getByLabel("Decision").selectOption("approve");
  await admin.getByRole("button", { name: "Save decision" }).click();
  await expect(admin.getByText("Still to refund: US$1,300")).toBeVisible();
  await expect(admin.getByText("Cancelled, refund being issued")).toBeVisible();
  expect(await available()).toBe(before + 1);

  // No Stripe key in tests: the card refund says so and records nothing (DATA-029).
  await admin.getByRole("button", { name: "Refund to the card through Stripe" }).click();
  await expect(admin.getByText(/Card refunds aren't switched on/)).toBeVisible();

  const manual = admin.locator("form", { has: admin.getByRole("button", { name: "Record a manual refund" }) });
  await manual.getByLabel("Amount (USD)").fill("1300.00");
  await manual.getByLabel("How").fill("Bank transfer");
  await manual.getByLabel("Reference").fill(`RF-${RUN}`);
  await manual.getByRole("button", { name: "Record a manual refund" }).click();
  await expect(admin.getByText(new RegExp(`Refunded US\\$1,300 · Bank transfer · ref. RF-${RUN}`))).toBeVisible();
  await expect(manual).toHaveCount(0);

  const { data: entries } = await adminDb()
    .from("commission_entries")
    .select("commission_minor, payable_minor")
    .eq("reservation_id", res[0]!);
  expect(entries!.reduce((n, e) => n + Number(e.commission_minor), 0)).toBe(7000);
  expect(entries!.reduce((n, e) => n + Number(e.payable_minor), 0)).toBe(63000);

  await page.reload();
  await expect(page.getByText("Cancelled", { exact: true }).first()).toBeVisible();
  await expect(page.getByText(new RegExp(`Refunded US\\$1,300 · Bank transfer · ref. RF-${RUN}`))).toBeVisible();
  await expect(page.getByRole("link", { name: `Your refund for reservation ${refs[0]} has been issued` })).toHaveCount(0);
  await page.goto("/dashboard/journey/");
  await expect(page.getByRole("link", { name: `Your refund for reservation ${refs[0]} has been issued` })).toBeVisible();
});

test("a request can be withdrawn, and refused only with a reason [DASH-CUS-010, DASH-ADM-095]", async ({ page, browser }) => {
  await signIn(page, customer.email, customer.password);
  await page.goto(mine(1));
  const cancel = page.locator("section", { has: page.getByRole("heading", { name: "Cancel this reservation" }) });
  await cancel.getByLabel("I have read the cancellation policy and the charge above").check();
  await cancel.getByRole("button", { name: "Ask to cancel" }).click();
  await page.getByRole("button", { name: "Withdraw the request" }).click();
  await expect(page.getByText("Request withdrawn", { exact: true })).toBeVisible();

  const again = page.locator("section", { has: page.getByRole("heading", { name: "Cancel this reservation" }) });
  await again.getByLabel("I have read the cancellation policy and the charge above").check();
  await again.getByRole("button", { name: "Ask to cancel" }).click();
  await expect(page.getByText("Cancellation requested", { exact: true })).toBeVisible();

  const admin = await adminPage(browser);
  await admin.goto(`/dashboard/admin/bookings/${res[1]}/`);
  await admin.getByLabel("Decision").selectOption("reject");
  await admin.getByRole("button", { name: "Save decision" }).click();
  await expect(admin.getByText("Give the reason for refusing.")).toBeVisible();
  await admin.getByLabel("Note").fill("The guests have already boarded a connecting tour.");
  await admin.getByRole("button", { name: "Save decision" }).click();
  await expect(admin.getByText("Cancellation not accepted")).toBeVisible();

  await page.reload();
  await expect(page.getByText("Cancellation not accepted")).toBeVisible();
  await expect(page.getByText(/Nilecruz’s note: The guests have already boarded/)).toBeVisible();
  const { data: r } = await adminDb().from("reservations").select("status").eq("id", res[1]!).single();
  expect(r!.status).toBe("confirmed");
});

test("finance admins keep the bank details; customers paying by transfer see them with their reference [CONTENT-NEEDED #5]", async ({
  page,
  browser,
}) => {
  const admin = await adminPage(browser);
  await admin.goto("/dashboard/admin/finance/#bank");
  const form = admin.locator("form", { has: admin.getByRole("button", { name: "Save bank details" }) });
  await form.getByLabel("Account holder").fill("Sample Holder Ltd");
  await form.getByRole("textbox", { name: /^Bank/ }).fill("Sample Bank");
  await form.getByLabel("SWIFT / BIC").fill("SAMPLEXX");
  await form.getByLabel("IBAN").fill("");
  await form.getByRole("button", { name: "Save bank details" }).click();
  await expect(admin.getByText(/Bank details saved/)).toBeVisible();

  await signIn(page, customer.email, customer.password);
  await page.goto(mine(2));
  const pay = page.locator("section", { has: page.getByRole("heading", { name: "Pay" }) });
  await expect(pay.getByText("Sample Holder Ltd")).toBeVisible();
  await expect(pay.getByText("SAMPLEXX")).toBeVisible();
  await expect(pay.getByText("IBAN")).toHaveCount(0);
  await expect(pay.getByText(refs[2]!, { exact: true })).toBeVisible();
  await expect(page.getByText(/Draft wording: ask Nilecruz/)).toHaveCount(0);
});

test("an operator starts from the Nilecruz standard cancellation policy [CONTENT-NEEDED #4]", async ({ browser }) => {
  const op = await (await browser.newContext()).newPage();
  await signIn(op, OWNER);
  await op.goto(`/dashboard/operator/${ORG.operatorA}/cabins/${vesselId}/`);
  await expect(op.getByText("(suggested for this vessel)")).toBeVisible();
  await op.getByRole("link", { name: "Luxury and branded vessels" }).click();
  await expect(op.getByText(/Filled in with the standard policy for luxury and branded vessels/)).toBeVisible();
  await expect(op.getByLabel("Band 1: days before departure")).toHaveValue("181");
  await op.getByRole("button", { name: "Save policy" }).click();
  await expect(op.getByText(/Cancellation policy saved/)).toBeVisible();
  const { data } = await adminDb()
    .from("cancellation_policies")
    .select("bands")
    .eq("vessel_id", vesselId)
    .is("schedule_id", null)
    .single();
  expect(data!.bands).toEqual([
    { from_days: 181, percent: 0 },
    { from_days: 121, percent: 15 },
    { from_days: 91, percent: 50 },
    { from_days: 0, percent: 100 },
  ]);
});

test.describe("cancellation screens are accessible", () => {
  for (const theme of ["light", "dark"] as const) {
    test(`customer, operator and admin (${theme})`, async ({ page, browser }) => {
      await setTheme(page, theme);
      await signIn(page, customer.email, customer.password);
      for (const path of [mine(0), mine(1)]) {
        await page.goto(path);
        await expectNoSeriousA11yIssues(page);
      }
      const opCtx = await browser.newContext({ colorScheme: theme });
      const op = await opCtx.newPage();
      await setTheme(op, theme);
      await signIn(op, OWNER);
      await op.goto(`/dashboard/operator/${ORG.operatorA}/bookings/${res[0]}/`);
      await expectNoSeriousA11yIssues(op);
      await opCtx.close();
      const adCtx = await browser.newContext({ colorScheme: theme });
      const ad = await adCtx.newPage();
      await setTheme(ad, theme);
      await signInAdmin(ad, ADMIN);
      for (const path of [`/dashboard/admin/bookings/${res[0]}/`, "/dashboard/admin/finance/", "/dashboard/admin/"]) {
        await ad.goto(path);
        await expectNoSeriousA11yIssues(ad);
      }
      await adCtx.close();
    });
  }
});
