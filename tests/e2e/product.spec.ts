import { PNG } from "pngjs";
import { expect, test } from "@playwright/test";
import { adminDb, LOCAL, ORG, signIn, signInAdmin } from "../support/local-auth";
import { expectNoSeriousA11yIssues, setTheme } from "./helpers";

test.skip(!LOCAL, "needs the local Supabase stack: pnpm with-local-db pnpm test:e2e");
// Its own admin account and run-unique data, so it never collides with other files or a second CI pass.
test.describe.configure({ mode: "serial", timeout: 120_000 });

const ADMIN = "product@nilecruz.test";
const RUN = Date.now();
let vesselId = "";

function png(): Buffer {
  const img = new PNG({ width: 48, height: 32 });
  img.data.fill(120);
  return PNG.sync.write(img);
}
const isoIn = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

test.beforeAll(async () => {
  // A complete vessel profile for operator A, so only the product decides readiness.
  const db = adminDb();
  const { data: v, error } = await db
    .from("vessels")
    .insert({
      slug: `sample-product-${RUN}`,
      name: `Sample Product Ship ${RUN}`,
      type: "motor",
      visibility: "private",
      operator_org_id: ORG.operatorA,
      category: "standard",
      route_text: "Luxor–Aswan",
      cabin_count: 40,
      max_guests: 80,
      is_sample: true,
    })
    .select("id")
    .single();
  if (error) throw error;
  vesselId = v.id;
  await db
    .from("vessel_translations")
    .insert({ vessel_id: vesselId, locale: "en", description: "A sample vessel for the product test." });
  const path = `vessels/${vesselId}/sample.png`;
  await db.storage.from("media").upload(path, png(), { contentType: "image/png" });
  const { data: m } = await db
    .from("media")
    .insert({ vessel_id: vesselId, storage_path: path, width: 48, height: 32, credit: "Sample fixture" })
    .select("id")
    .single();
  await db.from("media_translations").insert({ media_id: m!.id, locale: "en", alt: "Grey test card" });
});

test("the operator sets the gratuity (at least US$5)", async ({ page }) => {
  await signIn(page, "owner@operator-a.test");
  await page.goto(`/dashboard/operator/${ORG.operatorA}/cabins/`);
  await page.getByRole("link", { name: `Sample Product Ship ${RUN}` }).click();
  const g = page.locator("form", { has: page.getByRole("button", { name: "Save gratuity" }) });
  await g.getByLabel("US$ per person per night").fill("4");
  await g.getByRole("button", { name: "Save gratuity" }).click();
  await expect(page.getByText("The crew gratuity is at least US$5 per person per night.")).toBeVisible();
  await g.getByLabel("US$ per person per night").fill("7.50");
  await g.getByRole("button", { name: "Save gratuity" }).click();
  await expect(page.getByText(/Gratuity saved/)).toBeVisible();
});

test("the operator adds cabin types on two decks", async ({ page }) => {
  await signIn(page, "owner@operator-a.test");
  await page.goto(`/dashboard/operator/${ORG.operatorA}/cabins/${vesselId}/`);
  const add = page.locator("form", { has: page.getByRole("button", { name: "Add cabin type" }) });
  await add.getByRole("textbox", { name: "Name", exact: true }).fill("Standard double");
  await add.getByLabel("Code").fill("STD-M");
  await add.getByLabel("Deck").fill("Middle");
  await add.getByLabel("Maximum occupancy").fill("2");
  await add.getByRole("button", { name: "Add cabin type" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Standard double · Middle deck");

  await page.goto(`/dashboard/operator/${ORG.operatorA}/cabins/${vesselId}/`);
  await add.getByRole("textbox", { name: "Name", exact: true }).fill("Standard double");
  await add.getByLabel("Code").fill("STD-U");
  await add.getByLabel("Deck").fill("Upper");
  await add.getByLabel("Maximum occupancy").fill("4");
  await add.getByRole("button", { name: "Add cabin type" }).click();
  await expect(page.getByText(/Maximum occupancy: 1 to 3/)).toBeVisible();
  await add.getByLabel("Maximum occupancy").fill("3");
  await add.getByRole("button", { name: "Add cabin type" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Standard double · Upper deck");
});

test("the operator builds a schedule, departures, availability and prices", async ({ page }) => {
  await signIn(page, "owner@operator-a.test");
  await page.goto(`/dashboard/operator/${ORG.operatorA}/schedules/${vesselId}/`);
  const add = page.locator("form", { has: page.getByRole("button", { name: "Add schedule" }) });
  await add.getByRole("textbox", { name: "From", exact: true }).fill("Luxor");
  await add.getByRole("textbox", { name: "To", exact: true }).fill("Aswan");
  await add.getByLabel("Nights").fill("4");
  await add.getByLabel("Code").fill("LXR-ASW-4");
  await add.getByLabel("Monday").check();
  await add.getByLabel("Friday").check();
  await add.getByRole("button", { name: "Add schedule" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Luxor → Aswan, 4 nights");

  const period = page.locator("form", { has: page.getByRole("button", { name: "Add period" }) });
  await period.getByRole("textbox", { name: "From", exact: true }).fill(isoIn(0));
  await period.getByRole("textbox", { name: "To", exact: true }).fill(isoIn(27));
  await period.getByRole("button", { name: "Add period" }).click();
  await expect(page.getByText(`${isoIn(0)} to ${isoIn(27)}`)).toBeVisible();
  await page.getByRole("button", { name: "Create departures" }).click();
  await expect(page.getByText(/^8 departures created\.$/)).toBeVisible();

  const day = page.locator("form", { has: page.getByRole("button", { name: "Save day" }) });
  await day.getByLabel("Title").fill("Luxor: Karnak and Luxor temples");
  await day.getByRole("button", { name: "Save day" }).click();
  await expect(page.getByText("Day 1: Luxor: Karnak and Luxor temples")).toBeVisible();

  const bulk = page.locator("form", { has: page.getByRole("button", { name: "Apply to matching departures" }) });
  await bulk.getByLabel("Cabin type").selectOption({ label: "Standard double (Middle)" });
  await bulk.getByLabel("Currency").selectOption("EGP");
  await bulk.getByLabel("Price per person").fill("30000");
  await bulk.getByRole("button", { name: "Apply to matching departures" }).click();
  await expect(page.getByText("E£ is only for the Egyptian-citizen and foreign-resident plans.")).toBeVisible();
  await bulk.getByLabel("Currency").selectOption("USD");
  await bulk.getByLabel("Cabins available").fill("6");
  await bulk.getByLabel("Price per person").fill("650");
  await bulk.getByRole("button", { name: "Apply to matching departures" }).click();
  await expect(page.getByText(/^Updated 8 departures\.$/)).toBeVisible();
  await page.reload();
  await expect(page.getByText("6 left").first()).toBeVisible();
  await expect(page.getByText("US$650").first()).toBeVisible();

  // A second currency never adds cabins.
  await bulk.getByLabel("Cabin type").selectOption({ label: "Standard double (Middle)" });
  await bulk.getByLabel("Currency").selectOption("EUR");
  await bulk.getByLabel("Price per person").fill("600");
  await bulk.getByRole("button", { name: "Apply to matching departures" }).click();
  await expect(page.getByText(/^Updated 8 departures\.$/)).toBeVisible();
  const { data } = await adminDb().from("inventory").select("available").eq("vessel_id", vesselId);
  expect(new Set(data?.map((r) => r.available))).toEqual(new Set([6]));
  expect(data).toHaveLength(8);
});

test("promotions: owners only, applied to existing rates, never stacked", async ({ page }) => {
  await signIn(page, "reservations@operator-a.test");
  const denied = await page.goto(`/dashboard/operator/${ORG.operatorA}/promotions/${vesselId}/`);
  expect(denied?.status()).toBe(403);
  await page.getByRole("link", { name: "Go to your dashboard" }).waitFor();
  await page.goto("/dashboard/journey/");
  await page.getByRole("button", { name: "Sign out" }).click();

  await signIn(page, "owner@operator-a.test");
  await page.goto(`/dashboard/operator/${ORG.operatorA}/promotions/${vesselId}/`);
  const form = page.locator("form", { has: page.getByRole("button", { name: "Create promotion" }) });
  await form.getByLabel("Type").selectOption("percent");
  await form.getByLabel("Percentage (for a percentage discount)").fill("10");
  await form.getByLabel("Standard double (Middle)").check();
  await form.getByLabel("Benefit (English)").fill("10% off early sailings");
  await form.getByRole("button", { name: "Create promotion" }).click();
  await expect(page.getByText(/Created\. Applies to 16 rates/)).toBeVisible();

  await page.goto(`/dashboard/operator/${ORG.operatorA}/promotions/${vesselId}/`);
  await form.getByLabel("Type").selectOption("fixed");
  await form.getByLabel("Amount off per person (for a fixed discount)").fill("50");
  await form.getByLabel("Currency of the fixed amount").selectOption("USD");
  await form.getByLabel("Standard double (Middle)").check();
  await form.getByLabel("Benefit (English)").fill("US$50 off");
  await form.getByRole("button", { name: "Create promotion" }).click();
  await expect(page.getByText(/Created\. Applies to 0 rates; 8 skipped/)).toBeVisible();
  await page.getByRole("button", { name: "Pause" }).click();
  await expect(page.getByText("Paused", { exact: true })).toBeVisible();
});

test("the operator overview shows upcoming departures and the vessel can now be published", async ({ page, browser }) => {
  await signIn(page, "owner@operator-a.test");
  await page.goto(`/dashboard/operator/${ORG.operatorA}/`);
  await expect(page.getByRole("cell", { name: `Sample Product Ship ${RUN}` }).first()).toBeVisible();

  const ctx = await browser.newContext();
  const admin = await ctx.newPage();
  await signInAdmin(admin, ADMIN);
  await admin.goto(`/dashboard/admin/catalogue/${vesselId}/`);
  await expect(admin.getByText("✓ Cabin types and decks")).toBeVisible();
  await expect(admin.getByText("✓ Departures with rates and availability")).toBeVisible();
  await admin.getByRole("button", { name: "Publish" }).click();
  await expect(admin.getByText("Visibility now: Published")).toBeVisible();
  await ctx.close();
});

test("an admin overrides child bands for an operator; existing rates keep theirs", async ({ page }) => {
  await signInAdmin(page, ADMIN);
  await page.goto(`/dashboard/admin/operators/${ORG.operatorA}/`);
  const f = page.locator("form", { has: page.getByRole("button", { name: "Save bands" }) });
  await f.getByLabel("Band 2: from age").fill("4");
  await f.getByRole("button", { name: "Save bands" }).click();
  await expect(page.getByText(/must start at age 0, follow on without gaps/)).toBeVisible();
  await f.getByLabel("Band 2: from age").fill("3");
  await f.getByLabel("% of adult rate").nth(1).fill("30");
  await f.getByRole("button", { name: "Save bands" }).click();
  await expect(page.getByText(/apply to rates created from now on/)).toBeVisible();
  const { data } = await adminDb().from("rates").select("child_bands").eq("vessel_id", vesselId).limit(1).single();
  expect((data!.child_bands as { percent: number }[])[1]!.percent).toBe(25);
  await page.getByRole("button", { name: "Use the default bands again" }).click();
  await expect(page.getByText(/This operator uses the default bands\./)).toBeVisible();
});

test.describe("product screens are accessible", () => {
  for (const theme of ["light", "dark"] as const) {
    test(`cabins, schedule, departure, promotions, overview (${theme})`, async ({ page }) => {
      await setTheme(page, theme);
      await signIn(page, "owner@operator-a.test");
      const { data: s } = await adminDb().from("schedules").select("id").eq("vessel_id", vesselId).single();
      const { data: d } = await adminDb().from("departures").select("id").eq("schedule_id", s!.id).limit(1).single();
      for (const path of [
        `/dashboard/operator/${ORG.operatorA}/`,
        `/dashboard/operator/${ORG.operatorA}/cabins/${vesselId}/`,
        `/dashboard/operator/${ORG.operatorA}/schedules/${vesselId}/${s!.id}/`,
        `/dashboard/operator/${ORG.operatorA}/schedules/${vesselId}/${s!.id}/${d!.id}/`,
        `/dashboard/operator/${ORG.operatorA}/promotions/${vesselId}/`,
      ]) {
        await page.goto(path);
        await expectNoSeriousA11yIssues(page);
      }
    });
  }
});
