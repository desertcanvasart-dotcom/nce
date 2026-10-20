import { expect, test, type Page } from "@playwright/test";
import { adminDb, LOCAL, newUser, signIn } from "../support/local-auth";
import { apiAs, sampleReservations } from "../support/sailing";
import { expectNoSeriousA11yIssues, setTheme } from "./helpers";

test.skip(!LOCAL, "needs the local Supabase stack: pnpm with-local-db pnpm test:e2e");
test.describe.configure({ mode: "serial", timeout: 180_000 });

/**
 * Batch 4g exit criterion: a customer sees exactly their own state. One customer with a record in each state:
 * an unpaid reservation, a paid one, a cancelled one, a paid local-rate one without proof, a past trip,
 * an open request with a live offer, a closed request, and a tour order on hold.
 */
const RUN = Date.now();
const OWNER = "owner@operator-a.test";
let customer = { id: "", email: "", password: "" };
let A: Awaited<ReturnType<typeof sampleReservations>>;
let B: Awaited<ReturnType<typeof sampleReservations>>;
let tourName = "";
const cairoDay = (offset: number) => {
  const d = new Date(Date.now() + 3 * 3_600_000); // close enough to Cairo for a date 10+ days away
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
};
const section = (page: Page, name: string | RegExp) => page.locator("section", { has: page.getByRole("heading", { name }) });

test.beforeAll(async () => {
  const db = adminDb();
  customer = await newUser("journey-customer");
  const bands = [{ from_days: 0, percent: 100 }];
  A = await sampleReservations({ run: `${RUN}a`, customer, ownerEmail: OWNER, bands, departsIn: 60, count: 4 });
  B = await sampleReservations({ run: `${RUN}b`, customer, ownerEmail: OWNER, bands, departsIn: 30, count: 1 });
  // A[1] and A[3] paid by card; A[3] at a local rate with no proof yet; A[2] cancelled.
  for (const i of [1, 3]) {
    const { error } = await db.rpc("service_card_payment", {
      res: A.ids[i]!,
      session_id: `cs_j_${RUN}_${i}`,
      intent: `pi_j_${RUN}_${i}`,
      amount: 200000,
      cur: "usd",
    });
    if (error) throw error;
  }
  await db.from("reservations").update({ rate_plan: "egyptian_citizen" }).eq("id", A.ids[3]!);
  await db.from("reservations").update({ status: "cancelled", cancelled_at: new Date().toISOString() }).eq("id", A.ids[2]!);
  // B's sailing is over.
  await db
    .from("departures")
    .update({ departs_on: cairoDay(-12), returns_on: cairoDay(-8) })
    .eq("id", B.departureId);

  // An open request with a live offer, and a closed request.
  const cust = await apiAs(customer.email, customer.password);
  const op = await apiAs(OWNER, "nilecruz-local-only");
  const ask = async () => {
    const { data, error } = await cust
      .from("cruise_requests")
      .insert({
        origin: A.origin,
        destination: A.destination,
        earliest_departure: cairoDay(50),
        latest_departure: cairoDay(70),
        nights_min: 4,
        nights_max: 4,
        adults: 2,
        cabins: 1,
      })
      .select("id")
      .single();
    if (error) throw error;
    return data.id as string;
  };
  const open = await ask();
  const { error: oe } = await op.rpc("send_offer", {
    req: open,
    dep: A.departureId,
    plan: "international",
    cur: "USD",
    cabins: [{ cabin_type_id: A.cabinTypeId, adults: 2, child_ages: [], price_minor: 200000 }],
    total: 200000,
    list_total: 200000,
    note: "",
    inclusions_text: "",
    terms_text: "Sample terms.",
    eligibility: "Two adults.",
    expires_in_hours: 72,
  });
  if (oe) throw oe;
  const closed = await ask();
  await cust.from("cruise_requests").update({ status: "closed" }).eq("id", closed);

  // A bookable tour linked to A's schedule, on the second day of the sailing, and an order on hold for it.
  const { data: sup } = await db
    .from("tour_suppliers")
    .insert({ name: `Journey Supplier ${RUN}`, email: `js.${RUN}@example.test` })
    .select("id")
    .single();
  tourName = `Journey Sample Tour ${RUN}`;
  const { data: t, error: te } = await db
    .from("tours")
    .insert({
      slug: `journey-tour-${RUN}`,
      kind: "excursion",
      name: tourName,
      location: "Luxor",
      duration_minutes: 240,
      supplier_id: sup!.id,
      visibility: "published",
      is_sample: true,
      cancellation_bands: [{ from_days: 0, percent: 100 }],
    })
    .select("id")
    .single();
  if (te) throw te;
  await db.from("tour_schedules").insert({ tour_id: t.id, schedule_id: A.scheduleId });
  const day2 = new Date(`${cairoDay(61)}T09:00:00Z`).toISOString();
  const { data: s } = await db
    .from("tour_sessions")
    .insert({
      tour_id: t.id,
      starts_at: day2,
      ends_at: new Date(Date.parse(day2) + 4 * 3_600_000).toISOString(),
      kind: "shared",
      pricing: "per_guest",
      capacity: 10,
      currency: "USD",
      price_minor: 5000,
    })
    .select("id")
    .single();
  const { error: ordErr } = await cust.rpc("order_tour", {
    sess: s!.id,
    guest_ages: [40],
    lead: "Journey Lead",
    order_notes: "",
    terms_read: true,
  });
  if (ordErr) throw ordErr;
});

test("the Overview shows exactly this customer's actions, next trip and upcoming bookings [DASH-CUS-001, 003]", async ({
  page,
}) => {
  await signIn(page, customer.email, customer.password);
  await page.goto("/dashboard/journey/");
  await expect(page.getByRole("heading", { level: 1, name: "My journey" })).toBeVisible();
  const actions = section(page, "Needs your attention").locator("li");
  await expect(actions).toHaveCount(4);
  await expect(actions.nth(0)).toContainText(`Finish paying for ${tourName}`);
  await expect(actions.nth(1)).toContainText("1 offer for your request");
  const rest = (await actions.allInnerTexts()).slice(2).join("\n");
  expect(rest).toContain(`Pay for ${A.refs[0]}`);
  expect(rest).toContain(`Upload eligibility proof for ${A.refs[3]}`);
  expect(rest).not.toContain(A.refs[1]!);
  expect(rest).not.toContain(A.refs[2]!);

  await expect(section(page, "Next trip")).toContainText(`Sample Cancel Ship ${RUN}a`);
  await expect(section(page, "Next trip")).toContainText(tourName);
  // Three live reservations and the held tour; not the cancelled one or the past trip.
  await expect(section(page, "Coming up").locator("li")).toHaveCount(4);

  await actions.nth(2).getByRole("link").click();
  await expect(page).toHaveURL(/\/dashboard\/journey\/reservations\/[0-9a-f-]{36}\/#(pay|proof)$/);
});

test("Bookings, Tours and Past trips show the rest, and nothing else [DASH-CUS-002, 011, 012]", async ({ page }) => {
  await signIn(page, customer.email, customer.password);
  await page.goto("/dashboard/journey/reservations/");
  await expect(page.getByRole("heading", { level: 1, name: "Bookings" })).toBeVisible();
  await expect(section(page, "Cruise reservations").locator("li")).toHaveCount(5);
  await expect(section(page, "Tour orders").locator("li")).toHaveCount(1);

  await page.goto("/dashboard/journey/tours/");
  const suggested = section(page, `Suggested for your cruise ${A.refs[0]}`);
  await expect(suggested).toContainText(tourName);
  await expect(suggested).toContainText(cairoDay(61));
  await expect(page.getByRole("heading", { name: `Suggested for your cruise ${A.refs[2]}` })).toHaveCount(0);

  await page.goto("/dashboard/journey/past/");
  await expect(section(page, "Cruises").locator("li")).toHaveCount(2);
  await expect(section(page, "Cruises")).toContainText(A.refs[2]!);
  await expect(section(page, "Cruises")).toContainText(B.refs[0]!);
  await expect(section(page, "Closed requests").locator("li")).toHaveCount(1);
  await expect(section(page, "Closed requests")).toContainText("Closed");
  await expect(section(page, "Tours")).toContainText("No past tours.");

  await page.goto("/dashboard/journey/requests/");
  await expect(page.getByRole("heading", { level: 1, name: "Requests and offers" })).toBeVisible();
  await page.getByRole("link", { name: "All offers you have received" }).click();
  await expect(page).toHaveURL(/\/dashboard\/journey\/offers\/$/);
  await page.goto("/dashboard/journey/account/");
  await expect(page).toHaveURL(/\/account\/security\/$/);
});

test("another customer sees none of it [DASH-CUS-003]", async ({ page }) => {
  const other = await newUser("journey-other");
  await signIn(page, other.email, other.password);
  await page.goto("/dashboard/journey/");
  await expect(page.getByText("Nothing needs doing right now.")).toBeVisible();
  await expect(page.getByText(/No trip booked yet/)).toBeVisible();
  await expect(page.getByText(tourName)).toHaveCount(0);
  await page.goto("/dashboard/journey/past/");
  await expect(page.getByText("No past cruises.")).toBeVisible();
});

test.describe("My journey screens are accessible", () => {
  for (const theme of ["light", "dark"] as const) {
    test(`overview, bookings, tours and past trips (${theme})`, async ({ page }) => {
      await setTheme(page, theme);
      await signIn(page, customer.email, customer.password);
      for (const path of [
        "/dashboard/journey/",
        "/dashboard/journey/reservations/",
        "/dashboard/journey/tours/",
        "/dashboard/journey/past/",
      ]) {
        await page.goto(path);
        await expectNoSeriousA11yIssues(page);
      }
    });
  }
});
