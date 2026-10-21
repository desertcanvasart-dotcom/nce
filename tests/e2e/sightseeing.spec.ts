import { expect, test } from "@playwright/test";
import { adminDb, LOCAL, ORG, signIn, signInAdmin } from "../support/local-auth";

test.skip(!LOCAL, "needs the local Supabase stack: pnpm with-local-db pnpm test:e2e");
test.describe.configure({ mode: "serial", timeout: 180_000 });

/** Batch 8-3a (ADR-102): an admin approves a dahabiya to sell with sightseeing; its operator enters both prices. */
const RUN = Date.now();
const OWNER = "owner@operator-a.test";
let vesselId = "";
let scheduleId = "";
let departureId = "";
let otherScheduleId = "";
let otherVesselId = "";

test.beforeAll(async () => {
  const db = adminDb();
  const make = async (tag: string) => {
    const { data: v, error } = await db
      .from("vessels")
      .insert({
        slug: `sample-sight-${tag}-${RUN}`,
        name: `Sample Sight ${tag} ${RUN}`,
        type: "sail",
        operator_org_id: ORG.operatorA,
        is_sample: true,
      })
      .select("id")
      .single();
    if (error) throw error;
    await db.from("cabin_types").insert({ vessel_id: v.id, code: "DBL", name: "Double", deck: "Main", max_occupancy: 2 });
    const { data: s } = await db
      .from("schedules")
      .insert({
        vessel_id: v.id,
        code: "ES4",
        origin: "Esna",
        destination: "Aswan",
        nights: 4,
        sailing_days: [1, 2, 3, 4, 5, 6, 7],
      })
      .select("id")
      .single();
    const day = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
    const { data: d } = await db
      .from("departures")
      .insert({ schedule_id: s!.id, vessel_id: v.id, departs_on: day(30), returns_on: day(34) })
      .select("id")
      .single();
    return { v: v.id, s: s!.id, d: d!.id };
  };
  const a = await make("a");
  vesselId = a.v;
  scheduleId = a.s;
  departureId = a.d;
  const b = await make("b");
  otherVesselId = b.v;
  otherScheduleId = b.s;
});

test("a catalogue admin approves a vessel to sell with sightseeing", async ({ page }) => {
  await signInAdmin(page);
  await page.goto(`/dashboard/admin/catalogue/${vesselId}/#sightseeing`);
  const section = page.locator("section", { has: page.getByRole("heading", { name: "Sightseeing" }) });
  await expect(section).toContainText("Nilecruz sells sightseeing for this vessel");
  await section.getByRole("button", { name: "Approve to sell with sightseeing" }).click();
  await expect(section.getByText("Sells with sightseeing included")).toBeVisible();
});

test("its operator says what's included and adds a price with sightseeing", async ({ page }) => {
  await signIn(page, OWNER);
  const schedule = `/dashboard/operator/${ORG.operatorA}/schedules/${vesselId}/${scheduleId}/`;
  await page.goto(schedule);
  const section = page.locator("section", { has: page.getByRole("heading", { name: "Sightseeing" }) });
  await expect(section.getByText("Prices with sightseeing don’t show until you say what they include.")).toBeVisible();
  await section.getByLabel("An Egyptologist guide").check();
  await section.getByLabel("Temple and site entrance fees are included").check();
  await section.getByLabel("Sites visited").fill("Esna Temple\nEdfu Temple\nKom Ombo Temple");
  await section.getByRole("button", { name: "Save what’s included" }).click();
  await expect(section.getByText("Prices with sightseeing don’t show")).toHaveCount(0);

  const rates = page.locator("section", { has: page.getByRole("heading", { name: "Availability and prices" }) });
  await rates.getByLabel("Cabin type").selectOption({ label: "Double (Main)" });
  await rates.getByLabel("Package").selectOption("with_sightseeing");
  await rates.getByLabel("Price per person").fill("1400");
  await rates.getByRole("button", { name: "Apply to matching departures" }).click();
  await expect(rates.getByText(/Updated \d+ departure/)).toBeVisible();
  await page.goto(`${schedule}${departureId}/`);
  await expect(page.getByRole("list", { name: "Prices with sightseeing" })).toContainText(
    "With sightseeing · International · double · US$1,400",
  );
});

test("a vessel that isn't approved shows cruise-only prices, with sightseeing sold by Nilecruz", async ({ page }) => {
  await signIn(page, OWNER);
  await page.goto(`/dashboard/operator/${ORG.operatorA}/schedules/${otherVesselId}/${otherScheduleId}/`);
  await expect(page.getByText("Nilecruz sells the sightseeing for this vessel")).toBeVisible();
  await expect(page.getByLabel("Package")).toHaveCount(0);
});
