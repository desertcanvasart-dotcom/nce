import { expect, test, type Page } from "@playwright/test";
import { adminDb, LOCAL, newUser, ORG, signIn, signInAdmin } from "../support/local-auth";
import { expectNoSeriousA11yIssues, setTheme } from "./helpers";

test.skip(!LOCAL, "needs the local Supabase stack: pnpm with-local-db pnpm test:e2e");
// Its own route, vessels, customers and second operator per run, so it never collides with other files or a second CI pass.
test.describe.configure({ mode: "serial", timeout: 180_000 });

const RUN = Date.now();
const ORIGIN = `E2E Port ${RUN}`;
const DESTINATION = `E2E Harbour ${RUN}`;
const ADMIN = "bookings@nilecruz.test";
const isoIn = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
const DEPARTS = isoIn(25);
let customer = { id: "", email: "", password: "" };
let second = { id: "", email: "", password: "" };
let rival = { id: "", email: "", password: "" };
let rivalOrg = "";
let requestId = "";
let reference = "";
let reservationId = "";
const cabin: Record<string, string> = {};

/** A published, bookable sailing on the route: triple cabins on two decks, rates, availability, a policy. */
async function sailing(orgId: string, name: string, upperCabins: number) {
  const db = adminDb();
  const { data: v, error } = await db
    .from("vessels")
    .insert({
      slug: `sample-bookings-${name.toLowerCase().replace(/\W+/g, "-")}-${RUN}`,
      name: `Sample ${name} ${RUN}`,
      type: "motor",
      visibility: "published",
      published_at: new Date().toISOString(),
      operator_org_id: orgId,
      gratuity_usd_minor: 600,
      is_sample: true,
    })
    .select("id")
    .single();
  if (error) throw error;
  const { data: cabins } = await db
    .from("cabin_types")
    .insert([
      { vessel_id: v.id, code: "TRI-M", name: "Triple", deck: "Middle", max_occupancy: 3 },
      { vessel_id: v.id, code: "TRI-U", name: "Triple", deck: "Upper", max_occupancy: 3 },
    ])
    .select("id, code");
  const { data: s } = await db
    .from("schedules")
    .insert({
      vessel_id: v.id,
      code: "E4",
      origin: ORIGIN,
      destination: DESTINATION,
      nights: 4,
      sailing_days: [1, 2, 3, 4, 5, 6, 7],
    })
    .select("id")
    .single();
  const { data: d } = await db
    .from("departures")
    .insert({ schedule_id: s!.id, vessel_id: v.id, departs_on: DEPARTS, returns_on: isoIn(29) })
    .select("id")
    .single();
  for (const c of cabins!) {
    await db
      .from("inventory")
      .insert({ departure_id: d!.id, cabin_type_id: c.id, vessel_id: v.id, available: c.code === "TRI-U" ? upperCabins : 5 });
    await db.from("rates").insert({
      departure_id: d!.id,
      cabin_type_id: c.id,
      vessel_id: v.id,
      occupancy: 3,
      rate_plan: "international",
      currency: "USD",
      amount_minor: c.code === "TRI-U" ? 100000 : 90000,
    });
  }
  const { data: p } = await db
    .from("cancellation_policies")
    .insert({
      vessel_id: v.id,
      bands: [
        { from_days: 30, percent: 20 },
        { from_days: 0, percent: 100 },
      ],
    })
    .select("id")
    .single();
  await db
    .from("cancellation_policy_translations")
    .insert({ policy_id: p!.id, locale: "en", terms: "Sample policy wording for the tests." });
  return { vesselId: v.id, departureId: d!.id, cabins: Object.fromEntries(cabins!.map((c) => [c.code, c.id])) };
}

async function askForOffers(page: Page) {
  await page.goto("/dashboard/journey/requests/");
  const f = page.locator("form", { has: page.getByRole("button", { name: "Send request" }) });
  await f.getByLabel("Route").selectOption({ label: `${ORIGIN} → ${DESTINATION}` });
  await f.getByLabel("Earliest departure").fill(isoIn(20));
  await f.getByLabel("Latest departure").fill(isoIn(30));
  await f.getByLabel("Shortest stay (nights)").fill("4");
  await f.getByLabel("Longest stay (nights)").fill("4");
  await f.getByLabel("Adults (18 and over)").fill("2");
  await f.getByLabel("Children’s ages").fill("7");
  await f.getByLabel("Cabins").fill("1");
  await f.getByRole("button", { name: "Send request" }).click();
  await expect(page.getByText(/No offers yet/)).toBeVisible({ timeout: 20_000 });
  return page.url().match(/requests\/([0-9a-f-]{36})\//)![1]!;
}

async function sendOffer(page: Page, orgId: string, reqId: string, deck: "Middle" | "Upper") {
  await page.goto(`/dashboard/operator/${orgId}/offers/${reqId}/`);
  await page.getByRole("link", { name: new RegExp(`^${DEPARTS} · `) }).click();
  const f = page.locator("form", { has: page.getByRole("button", { name: /Send/ }) });
  await f.getByLabel("Cabin type").selectOption({ label: `Triple (${deck} deck)` });
  await f.getByRole("textbox", { name: /^Terms/ }).fill("Full board. Sample terms for the tests.");
  await f.getByLabel("Who this offer is for").fill("Two adults and a child aged 7.");
  await f.getByRole("button", { name: /Send/ }).click();
  await expect(page.getByText(/Offer sent/)).toBeVisible({ timeout: 20_000 });
}

async function acceptLatest(page: Page, reqId: string, vessel: string) {
  await page.goto(`/dashboard/journey/requests/${reqId}/`);
  const card = page.locator("div", { has: page.getByRole("article", { name: new RegExp(vessel) }) }).last();
  await card.getByRole("link", { name: "Read the terms and accept this offer" }).click();
  await page.getByLabel("Guest 1: full name").fill("Sample Lead Traveller");
  await page.getByLabel("Date of birth").nth(0).fill("1980-05-01");
  await page.getByLabel("Nationality").fill("GB");
  await page.getByLabel("Guest 2: full name").fill("Sample Second Traveller");
  await page.getByLabel("Date of birth").nth(1).fill("1982-06-01");
  await page.getByLabel("Guest 3: full name").fill("Sample Young Traveller");
  const child = new Date(Date.parse(`${DEPARTS}T00:00:00Z`) - (7 * 365 + 60) * 86_400_000).toISOString().slice(0, 10);
  await page.getByLabel("Date of birth").nth(2).fill(child);
  await page.getByLabel("I have read the terms and the cancellation policy").check();
  await page.getByRole("button", { name: "Accept and reserve" }).click();
}

let ours: Awaited<ReturnType<typeof sailing>>;
test.beforeAll(async () => {
  ours = await sailing(ORG.operatorA, "Bookings Ship", 1);
  Object.assign(cabin, ours.cabins);
  customer = await newUser("bookings-customer");
  second = await newUser("bookings-second");
  rival = await newUser("bookings-rival");
  const db = adminDb();
  const { data: org } = await db
    .from("organisations")
    .insert({ kind: "operator", status: "approved", display_name: `Sample Rival Cruises ${RUN}` })
    .select("id")
    .single();
  rivalOrg = org!.id;
  await db.from("memberships").insert({ org_id: rivalOrg, user_id: rival.id, team_role: "owner" });
  await sailing(rivalOrg, "Rival Ship", 3);
});

test("a request gets two offers; a deck change makes version 2; accepting reserves the cabin [DASH-CUS-004-007, 014, DASH-OPR-011, 017-023]", async ({
  page,
  browser,
}) => {
  await signIn(page, customer.email, customer.password);
  requestId = await askForOffers(page);
  await expect(page.getByText(/2 adults, a child aged 7 · 1 cabin/)).toBeVisible();

  // Operator A answers (Middle deck), then changes the deck: version 2 (DASH-OPR-023).
  const a = await (await browser.newContext()).newPage();
  await signIn(a, "owner@operator-a.test");
  await a.goto(`/dashboard/operator/${ORG.operatorA}/`);
  await expect(a.getByText("New requests to answer")).toBeVisible();
  await sendOffer(a, ORG.operatorA, requestId, "Middle");
  expect(
    (await adminDb().from("inventory").select("available").eq("cabin_type_id", cabin["TRI-M"]!).single()).data!.available,
  ).toBe(5); // DASH-OPR-020
  await a.getByRole("link", { name: /Change it \(sends version 2\)/ }).click();
  const f = a.locator("form", { has: a.getByRole("button", { name: "Send the new version" }) });
  await f.getByLabel("Cabin type").selectOption({ label: "Triple (Upper deck)" });
  await f.getByLabel("Price for this cabin").fill("");
  await f.getByRole("button", { name: "Send the new version" }).click();
  await expect(a.getByText(/Offer sent/)).toBeVisible({ timeout: 20_000 });
  const v1 = (await adminDb().from("offers").select("id, status").eq("request_id", requestId).eq("version", 1).single()).data!;
  expect(v1.status).toBe("superseded");

  // A second operator answers too.
  const r = await (await browser.newContext()).newPage();
  await signIn(r, rival.email, rival.password);
  await sendOffer(r, rivalOrg, requestId, "Middle");

  // The customer compares: two offers (latest versions), the replaced one can't be accepted.
  await page.reload();
  await expect(page.getByRole("heading", { name: "Offers (2)" })).toBeVisible();
  await expect(page.getByText("1 earlier version was replaced by an operator’s update.", { exact: false })).toBeVisible();
  await expect(page.getByText("Triple, Upper deck")).toBeVisible();
  await page.goto(`/dashboard/journey/requests/${requestId}/accept/${v1.id}/`);
  await expect(page.getByText("This offer can no longer be accepted.")).toBeVisible();

  await acceptLatest(page, requestId, `Sample Bookings Ship ${RUN}`);
  await expect(page.getByRole("heading", { level: 1, name: /Reservation NC-/ })).toBeVisible({ timeout: 30_000 });
  reference = (await page.getByRole("heading", { level: 1 }).textContent())!.replace("Reservation ", "").trim();
  reservationId = page.url().match(/reservations\/([0-9a-f-]{36})\//)![1]!;
  await expect(page.getByText("Awaiting payment")).toBeVisible();
  await expect(page.getByText(/Sample Young Traveller/)).toBeVisible();
  expect(
    (await adminDb().from("inventory").select("available").eq("cabin_type_id", cabin["TRI-U"]!).single()).data!.available,
  ).toBe(0);
  const others = await adminDb().from("offers").select("status").eq("request_id", requestId).eq("org_id", rivalOrg);
  expect(others.data!.map((o) => o.status)).toEqual(["closed"]);

  // The operator sees the booking with its guests (SEC-013) and a notice.
  await a.goto(`/dashboard/operator/${ORG.operatorA}/bookings/`);
  await a.getByRole("link", { name: new RegExp(reference) }).click();
  await expect(a.getByText(/Sample Lead Traveller · born 1980-05-01 · lead passenger, GB/)).toBeVisible();
  await a.goto(`/dashboard/operator/${ORG.operatorA}/`);
  await expect(a.getByRole("link", { name: `Offer accepted: reservation ${reference}` })).toBeVisible();
  // The rival operator sees none of it.
  await r.goto(`/dashboard/operator/${rivalOrg}/bookings/`);
  await expect(r.getByText(reference)).toHaveCount(0);
});

test("once the cabins are gone, another customer's acceptance books nothing [DASH-OPR-021, DASH-ADM-057]", async ({
  page,
  browser,
}) => {
  await signIn(page, second.email, second.password);
  const req = await askForOffers(page);
  const a = await (await browser.newContext()).newPage();
  await signIn(a, "owner@operator-a.test");
  // Upper is sold out, but sending an offer holds nothing, so it can still be sent.
  await sendOffer(a, ORG.operatorA, req, "Upper");
  await acceptLatest(page, req, `Sample Bookings Ship ${RUN}`);
  await expect(page.getByText(/no cabins left or can’t be booked right now|Not enough cabins left/)).toBeVisible({
    timeout: 30_000,
  });
  const { count } = await adminDb()
    .from("reservations")
    .select("id", { count: "exact", head: true })
    .eq("departure_id", ours.departureId);
  expect(count).toBe(1);
});

test("admins find a booking by reference; others are refused [DASH-ADM-090-096, DASH-ADM-004]", async ({ page, browser }) => {
  await signInAdmin(page, ADMIN);
  await page.goto("/dashboard/admin/");
  await expect(page.getByText("Current and upcoming bookings")).toBeVisible();
  await page.goto(`/dashboard/admin/bookings/?q=${encodeURIComponent(reference)}`);
  await page.getByRole("link", { name: reference }).first().click();
  await expect(page.getByText(/Sample Second Traveller/)).toBeVisible();
  await expect(page.getByText(/Cancelled less than 30 days before departure: 100 % charged/)).toBeVisible();

  const ctx = await browser.newContext();
  const op = await ctx.newPage();
  await signIn(op, "owner@operator-a.test");
  expect((await op.goto("/dashboard/admin/bookings/"))?.status()).toBe(403);
  await ctx.close();
  // Another customer can't open this reservation (SEC-013).
  const ctx2 = await browser.newContext();
  const other = await ctx2.newPage();
  await signIn(other, second.email, second.password);
  expect((await other.goto(`/dashboard/journey/reservations/${reservationId}/`))?.status()).toBe(404);
  await ctx2.close();
});

test.describe("booking screens are accessible", () => {
  for (const theme of ["light", "dark"] as const) {
    test(`journey, operator and admin booking screens (${theme})`, async ({ page, browser }) => {
      await setTheme(page, theme);
      await signIn(page, customer.email, customer.password);
      const offerId = (await adminDb().from("offers").select("id").eq("request_id", requestId).eq("status", "accepted").single())
        .data!.id;
      for (const path of [
        "/dashboard/journey/requests/",
        `/dashboard/journey/requests/${requestId}/`,
        `/dashboard/journey/requests/${requestId}/accept/${offerId}/`,
        "/dashboard/journey/offers/",
        `/dashboard/journey/reservations/${reservationId}/`,
      ]) {
        await page.goto(path);
        await expectNoSeriousA11yIssues(page);
      }
      const ctx = await browser.newContext({ colorScheme: theme });
      const op = await ctx.newPage();
      await setTheme(op, theme);
      await signIn(op, "owner@operator-a.test");
      for (const path of [
        `/dashboard/operator/${ORG.operatorA}/`,
        `/dashboard/operator/${ORG.operatorA}/offers/`,
        `/dashboard/operator/${ORG.operatorA}/offers/${requestId}/?departure=${ours.departureId}`,
        `/dashboard/operator/${ORG.operatorA}/bookings/${reservationId}/`,
        `/dashboard/operator/${ORG.operatorA}/cabins/${ours.vesselId}/`,
      ]) {
        await op.goto(path);
        await expectNoSeriousA11yIssues(op);
      }
      await ctx.close();
      const adminCtx = await browser.newContext({ colorScheme: theme });
      const admin = await adminCtx.newPage();
      await setTheme(admin, theme);
      await signInAdmin(admin, ADMIN);
      for (const path of ["/dashboard/admin/bookings/", `/dashboard/admin/bookings/${reservationId}/`]) {
        await admin.goto(path);
        await expectNoSeriousA11yIssues(admin);
      }
      await adminCtx.close();
    });
  }
});
