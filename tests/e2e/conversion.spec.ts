import { expect, test, type APIRequestContext } from "@playwright/test";
import { requestsTickSignature } from "@/lib/connections/signature";
import { adminDb, latestLink, LOCAL, newUser, signIn, signInAdmin } from "../support/local-auth";
import { FEED_PULL_TEST_SECRET } from "../support/feed-tls";
import { apiAs, sampleReservations } from "../support/sailing";
import { expectNoSeriousA11yIssues, setTheme } from "./helpers";

test.skip(!LOCAL, "needs the local Supabase stack: pnpm with-local-db pnpm test:e2e");
test.describe.configure({ mode: "serial", timeout: 180_000 });

/**
 * Batch 8-2a exit criterion (ADR-101): an anonymous visitor plans a cruise, creates an account, sends the request, and
 * gets an email when an offer arrives. Without a sender (as in tests) the email is recorded as not sent and admins see why.
 */
const RUN = Date.now();
const OWNER = "owner@operator-a.test";
let S: Awaited<ReturnType<typeof sampleReservations>>;

async function tick(request: APIRequestContext) {
  const ts = String(Math.floor(Date.now() / 1000));
  const r = await request.post("/api/internal/requests/tick/", {
    data: {},
    headers: { "nilecruz-timestamp": ts, "nilecruz-signature": requestsTickSignature(FEED_PULL_TEST_SECRET, ts) },
  });
  expect(r.status()).toBe(200);
  return (await r.json()) as { notices: { sent: number; skipped: number; failed: number } };
}

test.beforeAll(async () => {
  // A sailing of operator A's to make the offer on (no reservations needed).
  S = await sampleReservations({
    run: `${RUN}cv`,
    customer: await newUser("conv-unused"),
    ownerEmail: OWNER,
    bands: [{ from_days: 0, percent: 100 }],
    departsIn: 45,
    count: 0,
  });
});

test("a visitor plans a cruise, signs up, sends it, and the offer is emailed (PAGE-105, DASH-PUB-007, DASH-BND-007)", async ({
  page,
  request,
}) => {
  const email = `planner.${RUN}@example.test`;
  await page.goto("/plan-my-cruise/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const plan = page.locator("section", { has: page.getByRole("heading", { name: "Your plan" }) });
  await plan.getByLabel("Adults (18 and over)").fill("3");
  await plan.getByLabel(/Children’s ages/).fill("7");
  await plan.getByLabel(/Anything else operators should know/).fill(`Quiet cabin please ${RUN}`);
  // Mistakes are explained before anything leaves the page.
  await plan.getByLabel("Longest stay (nights)").fill("2");
  await plan.getByRole("button", { name: "Send to operators" }).click();
  await expect(plan.getByRole("alert")).toContainText("Nights are 1 to 21");
  await plan.getByLabel("Longest stay (nights)").fill("6");

  // The plan is kept on this device: a reload brings it back.
  await page.reload();
  await expect(plan.getByText("We kept your plan on this device from last time.")).toBeVisible();
  await expect(plan.getByLabel("Adults (18 and over)")).toHaveValue("3");

  // Sending asks for an account; this visitor creates one.
  await plan.getByRole("button", { name: "Send to operators" }).click();
  await expect(page).toHaveURL(/\/account\/sign-in\/\?next=/);
  const since = Date.now() - 1000;
  await page.goto("/account/sign-up/");
  await page.getByLabel("Your name").fill("Plan Tester");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("Felucca-at-dawn-1");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.goto(await latestLink(email, since));
  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(page).toHaveURL(/\/dashboard\/journey\/$/);

  // My journey offers the plan from this device; the request form opens with it, nothing retyped.
  await page.getByRole("link", { name: "Continue with your plan" }).click();
  await expect(page).toHaveURL(/\/dashboard\/journey\/requests\/\?.*nmin=3/);
  const form = page.locator("section", { has: page.locator("h2#new") });
  await expect(form.getByLabel("Adults (18 and over)")).toHaveValue("3");
  await expect(form.getByLabel("Children’s ages")).toHaveValue("7");
  await expect(form.getByLabel("Longest stay (nights)")).toHaveValue("6");
  await expect(form.getByLabel(/Anything else operators should know/)).toHaveValue(`Quiet cabin please ${RUN}`);
  // Handed over: the device copy is forgotten.
  expect(await page.evaluate(() => localStorage.getItem("nc-plan-v1"))).toBeNull();

  // The visitor checks it, picks the sailing's route and dates, and sends it.
  await form.getByLabel("Route").selectOption(`${S.origin}→${S.destination}`);
  const day = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
  await form.getByLabel("Earliest departure").fill(day(40));
  await form.getByLabel("Latest departure").fill(day(50));
  await form.getByRole("button", { name: "Send request" }).click();
  await expect(page).toHaveURL(/\/dashboard\/journey\/requests\/[0-9a-f-]{36}\/$/);
  const requestId = page.url().match(/requests\/([0-9a-f-]{36})\//)![1]!;

  // An operator offers; the next tick emails the notice (recorded as not sent: tests have no sender).
  const op = await apiAs(OWNER, "nilecruz-local-only");
  const { error } = await op.rpc("send_offer", {
    req: requestId,
    dep: S.departureId,
    plan: "international",
    cur: "USD",
    cabins: [{ cabin_type_id: S.cabinTypeId, adults: 3, child_ages: [7], price_minor: 300000 }],
    total: 300000,
    list_total: 300000,
    note: "",
    inclusions_text: "",
    terms_text: "Sample terms.",
    eligibility: "Three adults and a child.",
    expires_in_hours: 72,
  });
  if (error) throw error;
  await tick(request);
  const db = adminDb();
  const { data: sent } = await db
    .from("outbound_messages")
    .select("kind, to_address, subject, body_text, status")
    .eq("to_address", email);
  const offerMail = (sent ?? []).find((m) => m.kind === "notice.offer.new");
  expect(offerMail, JSON.stringify(sent)).toBeTruthy();
  expect(offerMail!.body_text).toContain("Open it to compare the offer and accept it before it expires.");
  expect(offerMail!.body_text).toContain("/account/security/#sec-emails");
  const customerId = (await db.from("cruise_requests").select("customer_id").eq("id", requestId).single()).data!.customer_id;
  const { data: n } = await db.from("notifications").select("email_status").eq("kind", "offer.new").eq("user_id", customerId);
  expect((n ?? []).map((x) => x.email_status)).not.toContain("pending");
});

test("signing in keeps the plan in the address (DASH-PUB-007)", async ({ page }) => {
  const user = await newUser("plan-signin");
  await page.goto("/plan-my-cruise/");
  const plan = page.locator("section", { has: page.getByRole("heading", { name: "Your plan" }) });
  await plan.getByLabel("Cabins").fill("2");
  await plan.getByRole("button", { name: "Send to operators" }).click();
  await expect(page).toHaveURL(/\/account\/sign-in\/\?next=/);
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password", { exact: true }).fill(user.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/journey\/requests\/\?.*cabins=2/);
  await expect(page.locator("section", { has: page.locator("h2#new") }).getByLabel("Cabins")).toHaveValue("2");
});

test("Plan my cruise passes axe in Day and Night", async ({ page }) => {
  await page.goto("/plan-my-cruise/");
  await expectNoSeriousA11yIssues(page);
  await setTheme(page, "dark");
  await page.goto("/plan-my-cruise/");
  await expectNoSeriousA11yIssues(page);
});

test("after 10 wrong passwords an account's sign-in waits, even with the right one (SEC-006)", async ({ page }) => {
  const user = await newUser("limited");
  for (let i = 0; i < 10; i++) {
    await signIn(page, user.email, "wrong-password-123", "/account/sign-in/", { expectFailure: true });
    await expect(page.getByRole("alert")).toBeVisible();
  }
  await signIn(page, user.email, user.password, "/account/sign-in/", { expectFailure: true });
  await expect(page.getByText("Too many attempts. Wait a few minutes and try again.")).toBeVisible();
  await expect(page).toHaveURL(/\/account\/sign-in\//);
});

test("without a sender, admins see why no emails go out (DASH-BND-007)", async ({ page }) => {
  await signInAdmin(page);
  await page.goto("/dashboard/admin/");
  await expect(page.getByText(/Email isn’t set up on this server/)).toBeVisible();
  await page.goto("/dashboard/admin/messages/");
  await expect(page.getByRole("heading", { name: "Email delivery" })).toBeVisible();
});

test("a sign-up with the hidden field filled in looks sent but makes no account (SEC-006)", async ({ page }) => {
  const email = `bot.${RUN}@example.test`;
  await page.goto("/account/sign-up/");
  await page.getByLabel("Your name").fill("Bot");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("Felucca-at-dawn-1");
  await page.locator('input[name="website"]').evaluate((el: HTMLInputElement) => (el.value = "https://spam.example"));
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText(/we have sent a link to confirm it/)).toBeVisible();
  const { data } = await adminDb().auth.admin.listUsers({ perPage: 1000 });
  expect(data.users.some((u) => u.email === email)).toBe(false);
});
