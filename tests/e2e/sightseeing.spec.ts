import { expect, test } from "@playwright/test";
import { adminDb, LOCAL, newUser, ORG, signIn, signInAdmin } from "../support/local-auth";

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

test("a customer books an approved vessel with its sightseeing, at that price (8-3b-1)", async ({ page }) => {
  const db = adminDb();
  const slug = `sample-pkg-${RUN}`;
  const { data: v } = await db
    .from("vessels")
    .insert({
      slug,
      name: `Sample Package Dahabiya ${RUN}`,
      type: "sail",
      visibility: "published",
      published_at: new Date().toISOString(),
      operator_org_id: ORG.operatorA,
      is_sample: true,
      sightseeing_approved_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  const { data: c } = await db
    .from("cabin_types")
    .insert({ vessel_id: v!.id, code: "DBL", name: "Double", deck: "Main", max_occupancy: 2, balcony: false })
    .select("id")
    .single();
  const { data: s } = await db
    .from("schedules")
    .insert({
      vessel_id: v!.id,
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
    .insert({ schedule_id: s!.id, vessel_id: v!.id, departs_on: day(45), returns_on: day(49) })
    .select("id")
    .single();
  await db.from("inventory").insert({
    departure_id: d!.id,
    cabin_type_id: c!.id,
    vessel_id: v!.id,
    available: 4,
    confirmed_at: new Date().toISOString(),
    source: "feed",
  });
  await db.from("rates").insert({
    departure_id: d!.id,
    cabin_type_id: c!.id,
    vessel_id: v!.id,
    occupancy: 2,
    rate_plan: "international",
    currency: "USD",
    amount_minor: 100000,
  });
  await db
    .from("sightseeing_rates")
    .insert({ departure_id: d!.id, cabin_type_id: c!.id, vessel_id: v!.id, occupancy: 2, currency: "USD", amount_minor: 130000 });
  await db
    .from("schedule_sightseeing")
    .insert({ schedule_id: s!.id, vessel_id: v!.id, guide: true, tickets_included: true, sites: ["Edfu Temple"] });
  await db.from("cancellation_policies").insert({ vessel_id: v!.id, bands: [{ from_days: 0, percent: 100 }] });

  const customer = await newUser("sightseeing-customer");
  await signIn(page, customer.email, customer.password);
  await page.goto(
    `/cruises/${slug}/reserve/?itinerary=ES4&pkg=with_sightseeing&dep=${d!.id}&cabin=${c!.id}&adults=2&children=&cabins=1`,
  );
  await expect(
    page.getByText(
      "The vessel's own sightseeing is in the price: An Egyptologist guide, entrance fees included; visiting Edfu Temple.",
    ),
  ).toBeVisible();
  await expect(page.getByText("US$2,600", { exact: true })).toBeVisible();
  await page.getByLabel("Cabin 1, guest 1: full name").fill("Sample Guest One");
  await page.getByLabel("Date of birth").first().fill("1975-03-14");
  await page.getByLabel("Cabin 1, guest 2: full name").fill("Sample Guest Two");
  await page.getByLabel("Date of birth").nth(1).fill("1978-08-02");
  await page.getByLabel("I have read the terms and the cancellation policy").check();
  await page.getByRole("button", { name: "Reserve" }).click();
  await expect(page).toHaveURL(/\/dashboard\/journey\/reservations\/[0-9a-f-]{36}\/$/);
  await expect(page.getByText(/With the vessel’s sightseeing: An Egyptologist guide/)).toBeVisible();
  const { data: r } = await db.from("reservations").select("package, total_minor").eq("departure_id", d!.id).single();
  expect(r).toEqual({ package: "with_sightseeing", total_minor: 260000 });
});
