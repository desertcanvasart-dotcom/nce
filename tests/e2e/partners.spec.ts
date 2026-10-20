import { expect, test, type Browser, type Page } from "@playwright/test";
import { LOCAL, newUser, ORG, signIn, signInAdmin } from "../support/local-auth";
import { sampleReservations } from "../support/sailing";
import { expectNoSeriousA11yIssues, setTheme } from "./helpers";

test.skip(!LOCAL, "needs the local Supabase stack: pnpm with-local-db pnpm test:e2e");
test.describe.configure({ mode: "serial", timeout: 180_000 });

/** Batch 4h-1: an agency applies, is approved, builds its team, and searches at its company rate (ADR-092). */
const RUN = Date.now();
// Its own admin: two workers signing one account in with the same two-step code would collide.
const ADMIN = "partners@nilecruz.test";
const OWNER_OP = "owner@operator-a.test";
const AGENCY = `Sample Agency ${RUN}`;
let owner = { id: "", email: "", password: "" };
let booker = { id: "", email: "", password: "" };
let accountant = { id: "", email: "", password: "" };
let orgId = "";
let S: Awaited<ReturnType<typeof sampleReservations>>;

async function adminPage(browser: Browser) {
  const p = await (await browser.newContext()).newPage();
  await signInAdmin(p, ADMIN);
  return p;
}
async function join(browser: Browser, who: { email: string; password: string }) {
  const p = await (await browser.newContext()).newPage();
  await signIn(p, who.email, who.password);
  await p.getByRole("button", { name: `Join ${AGENCY}` }).click();
  await expect(p).toHaveURL(new RegExp(`/dashboard/partner/${orgId}/$`));
  return p;
}
const searchFor = async (p: Page) => {
  await p.goto(`/dashboard/partner/${orgId}/search/?from=${S.departsOn}&to=${S.departsOn}&adults=2`);
};

test.beforeAll(async () => {
  [owner, booker, accountant] = await Promise.all([newUser("agency-owner"), newUser("agency-booker"), newUser("agency-finance")]);
  // A bookable sailing with a public double rate (US$2,000 for two); no reservations needed.
  S = await sampleReservations({
    run: `${RUN}p`,
    customer: owner,
    ownerEmail: OWNER_OP,
    bands: [{ from_days: 0, percent: 100 }],
    departsIn: 50,
    count: 0,
  });
});

test("an agency applies for trade access and an admin approves it [DASH-B2B-011, DASH-ADM-086, 087]", async ({
  page,
  browser,
}) => {
  await signIn(page, owner.email, owner.password);
  await page.goto("/account/apply-partner/");
  await page.getByLabel("Agency name (as clients know it)").fill(AGENCY);
  await page.getByLabel("Country of registration").fill("Spain");
  await page.getByRole("button", { name: "Send application" }).click();
  await expect(page.getByText("This is needed to check your agency.")).toBeVisible();
  await page.getByLabel("Registration or licence number").fill(`CIAN-${RUN}`);
  await page.getByLabel("Contact name").fill("Ana Sample");
  await page.getByLabel("Contact phone").fill("+34 600 000 000");
  await page.getByRole("button", { name: "Send application" }).click();
  await page.waitForURL(/\/dashboard\/partner\/[0-9a-f-]{36}\/$/);
  orgId = page.url().match(/partner\/([0-9a-f-]{36})\//)![1]!;
  await expect(page.getByRole("heading", { name: `${AGENCY} is waiting for approval` })).toBeVisible();

  const admin = await adminPage(browser);
  await admin.goto("/dashboard/admin/partners/?status=applied");
  await admin.getByRole("link", { name: AGENCY }).click();
  await expect(admin.getByText(`CIAN-${RUN}`)).toBeVisible();
  await expect(admin.getByText("+34 600 000 000")).toBeVisible();
  await admin.getByLabel("Decision").selectOption("approved");
  await admin.getByRole("button", { name: "Save decision" }).click();
  await expect(admin.getByText(/Approved: the agency's team can search/)).toBeVisible();
  await admin.reload();
  await expect(admin.getByText("Licence renewal pending")).toHaveCount(0); // approving clears the pause reason
});

test("the owner builds a team of reservations and finance users [DASH-B2B-009, 010]", async ({ page, browser }) => {
  await signIn(page, owner.email, owner.password);
  await page.goto(`/dashboard/partner/${orgId}/team/`);
  const roles = await page.getByLabel("Role").locator("option").allInnerTexts();
  expect(roles.join("|")).not.toMatch(/Viewer/);
  for (const [who, role] of [
    [booker, "reservations"],
    [accountant, "finance"],
  ] as const) {
    await page.getByLabel("Email").fill(who.email);
    await page.getByLabel("Role").selectOption(role);
    await page.getByRole("button", { name: "Send invitation" }).click();
    await expect(page.getByText(/already has a Nilecruz account/)).toBeVisible();
    await (await join(browser, who)).close();
  }
});

test("the operator sets a company rate; the agency searches at it, its finance user can't search [DASH-B2B-001, 002, 012]", async ({
  page,
  browser,
}) => {
  const op = await (await browser.newContext()).newPage();
  await signIn(op, OWNER_OP);
  await op.goto(`/dashboard/operator/${ORG.operatorA}/schedules/${S.vesselId}/${S.scheduleId}/`);
  const form = op.locator("form", { has: op.getByRole("button", { name: "Apply to matching departures" }) });
  await form.getByLabel("Cabin type").selectOption({ index: 1 });
  await form.getByLabel("From").fill(S.departsOn);
  await form.getByLabel("To").fill(S.departsOn);
  await form.getByLabel("Rate plan").selectOption("trade");
  await form.getByLabel("Only for one travel partner").selectOption({ label: AGENCY });
  await form.getByLabel("Price per person").fill("700.00");
  await form.getByRole("button", { name: "Apply to matching departures" }).click();
  await expect(op.getByText(/Updated 1 departure/)).toBeVisible();

  await signIn(page, booker.email, booker.password);
  await searchFor(page);
  const result = page.getByRole("article", { name: new RegExp(`Sample Cancel Ship ${RUN}p`) });
  await expect(result).toContainText("US$1,400");
  await expect(result).toContainText("Your company rate");

  const fin = await (await browser.newContext()).newPage();
  await signIn(fin, accountant.email, accountant.password);
  expect((await fin.goto(`/dashboard/partner/${orgId}/search/`))?.status()).toBe(403);
});

test("pausing stops searching but keeps the workspace [DASH-ADM-088]", async ({ page, browser }) => {
  const admin = await adminPage(browser);
  await admin.goto(`/dashboard/admin/partners/${orgId}/`);
  await admin.getByLabel("Decision").selectOption("paused");
  await admin.getByRole("button", { name: "Save decision" }).click();
  await expect(
    admin.getByText("Explain the decision in a few words.").or(admin.getByText(/explain the decision/i)),
  ).toBeVisible();
  await admin.getByLabel("Reason").fill("Licence renewal pending");
  await admin.getByRole("button", { name: "Save decision" }).click();
  await expect(admin.getByText(/Paused: the team can still see its bookings/)).toBeVisible();

  await signIn(page, booker.email, booker.password);
  await page.goto(`/dashboard/partner/${orgId}/`);
  await expect(page.getByText(/Trade access for .* is paused/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Search departures" })).toHaveCount(0);
  expect((await page.goto(`/dashboard/partner/${orgId}/search/`))?.status()).toBe(403);

  await admin.getByLabel("Decision").selectOption("approved");
  await admin.getByRole("button", { name: "Save decision" }).click();
  await expect(admin.getByText(/Approved: the agency's team can search/)).toBeVisible();
  await admin.reload();
  await expect(admin.getByText("Licence renewal pending")).toHaveCount(0); // approving clears the pause reason
});

test.describe("partner screens are accessible", () => {
  for (const theme of ["light", "dark"] as const) {
    test(`apply, overview, search, team and admin (${theme})`, async ({ page, browser }) => {
      await setTheme(page, theme);
      await signIn(page, owner.email, owner.password);
      for (const path of ["/account/apply-partner/", `/dashboard/partner/${orgId}/`, `/dashboard/partner/${orgId}/team/`]) {
        await page.goto(path);
        await expectNoSeriousA11yIssues(page);
      }
      await searchFor(page);
      await expectNoSeriousA11yIssues(page);
      const ctx = await browser.newContext({ colorScheme: theme });
      const ad = await ctx.newPage();
      await setTheme(ad, theme);
      await signInAdmin(ad, ADMIN);
      for (const path of ["/dashboard/admin/partners/", `/dashboard/admin/partners/${orgId}/`]) {
        await ad.goto(path);
        await expectNoSeriousA11yIssues(ad);
      }
      await ctx.close();
    });
  }
});
