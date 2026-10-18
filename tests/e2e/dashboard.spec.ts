import { expect, test, type Page } from "@playwright/test";
import { adminDb, LOCAL, newUser, ORG, signIn, signInAdmin } from "../support/local-auth";
import { expectNoSeriousA11yIssues, setTheme } from "./helpers";

test.skip(!LOCAL, "needs the local Supabase stack: pnpm with-local-db pnpm test:e2e");

const sections = async (page: Page) =>
  page
    .getByRole("navigation", { name: /sections/ })
    .getByRole("link")
    .allTextContents();

const landings: [string, RegExp, string][] = [
  ["customer@example.test", /\/dashboard\/journey\/$/, "My journey"],
  ["owner@operator-a.test", new RegExp(`/dashboard/operator/${ORG.operatorA}/$`), "Overview"],
  ["reservations@operator-a.test", new RegExp(`/dashboard/operator/${ORG.operatorA}/$`), "Overview"],
  ["finance@operator-a.test", new RegExp(`/dashboard/operator/${ORG.operatorA}/$`), "Overview"],
  ["viewer@operator-a.test", new RegExp(`/dashboard/operator/${ORG.operatorA}/$`), "Overview"],
  ["owner@partner.test", new RegExp(`/dashboard/partner/${ORG.partner}/$`), "Overview"],
  ["reservations@partner.test", new RegExp(`/dashboard/partner/${ORG.partner}/$`), "Overview"],
  ["finance@partner.test", new RegExp(`/dashboard/partner/${ORG.partner}/$`), "Overview"],
];

test.describe("each role lands in its own workspace (DASH-ROLE-001)", () => {
  for (const [email, url, heading] of landings) {
    test(email, async ({ page }) => {
      await signIn(page, email);
      await expect(page).toHaveURL(url);
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
    });
  }

  test("an operator awaiting approval sees its status, not its workspace", async ({ page }) => {
    await signIn(page, "owner@operator-b.test");
    await expect(page).toHaveURL(new RegExp(`/dashboard/operator/${ORG.operatorB}/$`));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sample Operator B is waiting for approval");
    await expect(page.getByRole("navigation", { name: /sections/ })).toHaveCount(0);
    const res = await page.goto(`/dashboard/operator/${ORG.operatorB}/cruises/`);
    expect(res?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("waiting for approval");
  });

  test("the dashboard shows Cairo time (DATA-003)", async ({ page }) => {
    await signIn(page, "customer@example.test");
    await expect(page.getByText(/Times shown in Cairo time · now \d{1,2} \w{3} \d{4} \d{2}:\d{2} Cairo/)).toBeVisible();
    await expect(page.locator("header time")).toHaveAttribute("datetime", /Z$/);
  });
});

test.describe("navigation changes with role (DASH-ROLE-006, 007, 008)", () => {
  test("operator owner sees every operator section; a viewer sees fewer", async ({ page }) => {
    await signIn(page, "owner@operator-a.test");
    expect(await sections(page)).toEqual([
      "Overview",
      "Cruises and submissions",
      "Cabins and decks",
      "Routes, schedules and rates",
      "Promotions and upgrades",
      "Inventory connections",
      "Requests and offers",
      "Bookings and payments",
      "Team",
    ]);
    await page.getByRole("button", { name: "Sign out" }).click();
    await signIn(page, "viewer@operator-a.test");
    expect(await sections(page)).toEqual([
      "Overview",
      "Cabins and decks",
      "Routes, schedules and rates",
      "Requests and offers",
      "Bookings and payments",
    ]);
  });

  test("partner finance sees payments but not search", async ({ page }) => {
    await signIn(page, "finance@partner.test");
    expect(await sections(page)).toEqual(["Overview", "Company bookings", "Payments"]);
  });

  test("a section that a later batch builds says so", async ({ page }) => {
    await signIn(page, "customer@example.test");
    // Offers were built in 4e; past trips arrive with 4g.
    await page.getByRole("link", { name: "Past trips" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Past trips" })).toBeVisible();
    await expect(page.getByText(/arrives in a later release \(planned for Batch 4g\)/)).toBeVisible();
    await expect(page.getByRole("link", { name: "Past trips" })).toHaveAttribute("aria-current", "page");
  });
});

test.describe("cross-role access is refused with 403 (SEC-002, DASH-ROLE-002–005)", () => {
  const forbidden: [string, string][] = [
    ["customer@example.test", "/dashboard/admin/"],
    ["customer@example.test", `/dashboard/operator/${ORG.operatorA}/`],
    ["customer@example.test", `/dashboard/partner/${ORG.partner}/`],
    ["owner@operator-a.test", "/dashboard/admin/catalogue/"],
    ["owner@operator-a.test", `/dashboard/operator/${ORG.operatorB}/`],
    ["owner@operator-a.test", `/dashboard/partner/${ORG.partner}/`],
    ["viewer@operator-a.test", `/dashboard/operator/${ORG.operatorA}/team/`],
    ["finance@operator-a.test", `/dashboard/operator/${ORG.operatorA}/cruises/`],
    ["finance@partner.test", `/dashboard/partner/${ORG.partner}/search/`],
    ["reservations@partner.test", `/dashboard/partner/${ORG.partner}/payments/`],
    ["owner@partner.test", `/dashboard/operator/${ORG.operatorA}/`],
  ];
  for (const [email, path] of forbidden) {
    test(`${email} → ${path}`, async ({ page }) => {
      await signIn(page, email);
      await page.waitForURL(/\/dashboard\//);
      const res = await page.goto(path);
      expect(res?.status()).toBe(403);
      await expect(page.getByRole("heading", { level: 1, name: "This is not part of your account" })).toBeVisible();
      await expect(page.getByRole("navigation", { name: /sections/ })).toHaveCount(0);
    });
  }

  test("unknown sections and malformed company ids are 404", async ({ page }) => {
    await signIn(page, "owner@operator-a.test");
    await page.waitForURL(/\/dashboard\//);
    expect((await page.goto(`/dashboard/operator/${ORG.operatorA}/no-such-section/`))?.status()).toBe(404);
    expect((await page.goto("/dashboard/operator/not-a-uuid/"))?.status()).toBe(404);
  });

  test("visitors who are not signed in are sent to sign-in and brought back", async ({ page }) => {
    await page.goto(`/dashboard/operator/${ORG.operatorA}/team/`);
    await expect(page).toHaveURL(/\/account\/sign-in\/\?next=/);
    await page.getByLabel("Email").fill("owner@operator-a.test");
    await page.getByLabel("Password", { exact: true }).fill("nilecruz-local-only");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/dashboard/operator/${ORG.operatorA}/team/$`));
  });

  test("dashboards in Spanish or Japanese addresses go to the English dashboard", async ({ request }) => {
    const res = await request.get("/es/dashboard/journey/", { maxRedirects: 0 });
    expect(res.status()).toBe(308);
    expect(res.headers().location).toMatch(/\/dashboard\/journey\/$/);
  });
});

test.describe("admins need two-step sign-in (SEC-015, ADR-064)", () => {
  // Completing two-step ends the same person's other password-only sessions (Supabase Auth), so tests that
  // share a seeded admin account run one after another rather than knocking each other out.
  test.describe.configure({ mode: "serial" });

  test("a catalogue admin sees catalogue sections, not finance", async ({ page }) => {
    await signInAdmin(page, "catalogue@nilecruz.test");
    await expect(page).toHaveURL(/\/dashboard\/admin\/$/);
    const s = await sections(page);
    expect(s).toContain("Catalogue");
    expect(s).not.toContain("Deposits and commission");
  });

  test("a catalogue admin is refused the finance section", async ({ page }) => {
    await signInAdmin(page, "catalogue@nilecruz.test");
    const res = await page.goto("/dashboard/admin/finance/");
    expect(res?.status()).toBe(403);
  });

  test("the seeded admin is asked for a code and then reaches the admin workspace", async ({ page }) => {
    await signInAdmin(page);
    await expect(page).toHaveURL(/\/dashboard\/admin\/$/);
    await expect(page.getByRole("heading", { level: 1, name: "Overview" })).toBeVisible();
  });

  test("an admin without an authenticator is sent to set one up", async ({ page }) => {
    const user = await newUser("newadmin");
    const { error } = await adminDb()
      .from("profiles")
      .update({ platform_role: "admin", admin_role: "content" })
      .eq("id", user.id);
    expect(error).toBeNull();
    await signIn(page, user.email, user.password);
    await page.goto("/dashboard/admin/");
    await expect(page).toHaveURL(/\/account\/security\/\?setup=two-step/);
    await expect(page.getByText("Admins need two-step sign-in. Set it up below to continue.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Set up two-step sign-in" })).toBeVisible();
  });

  test("admins can't turn two-step sign-in off", async ({ page }) => {
    await signInAdmin(page);
    await page.goto("/account/security/");
    await expect(page.getByText(/On\. Each sign-in asks for a code/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Turn off two-step sign-in" })).toHaveCount(0);
  });
});

test.describe("dashboard accessibility", () => {
  for (const theme of ["light", "dark"] as const) {
    test(`workspaces have no serious accessibility issues (${theme})`, async ({ page }) => {
      await setTheme(page, theme);
      await signIn(page, "owner@operator-a.test");
      await page.waitForURL(/\/dashboard\/operator\//);
      await expectNoSeriousA11yIssues(page);
      await page.goto("/dashboard/journey/");
      await expectNoSeriousA11yIssues(page);
      await page.goto("/dashboard/admin/");
      await expectNoSeriousA11yIssues(page); // the 403 page
    });
  }
});
