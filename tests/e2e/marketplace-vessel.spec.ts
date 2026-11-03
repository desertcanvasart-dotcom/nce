import { expect, test } from "@playwright/test";
import { refreshSignature } from "@/lib/connections/signature";
import { FEED_PULL_TEST_SECRET } from "../support/feed-tls";
import { adminDb, LOCAL, newUser, signIn } from "../support/local-auth";
import { insertEvaluation } from "../support/evaluation";
import { sampleReservations } from "../support/sailing";
import { expectNoSeriousA11yIssues, setTheme } from "./helpers";

test.skip(!LOCAL, "needs the local Supabase stack: pnpm with-local-db pnpm test:e2e");
test.describe.configure({ mode: "serial", timeout: 150_000 });

/**
 * Batch 5-2, the exit criterion: listing → vessel → sign-in → reserve (ADR-093). A published sample motor ship
 * (US$1,000 per person for two) with two itineraries, a day-by-day programme, a morning sailing, a published evaluation
 * and an external rating.
 */
const RUN = Date.now();
const NAME = `Sample Cancel Ship ${RUN}vp`;
let S: Awaited<ReturnType<typeof sampleReservations>>;
let slug = "";
let evaluationId = "";

async function refreshCatalogue(request: import("@playwright/test").APIRequestContext) {
  const ts = String(Math.floor(Date.now() / 1000));
  await request.post("/api/internal/catalogue/refresh/", {
    headers: { "nilecruz-timestamp": ts, "nilecruz-signature": refreshSignature(FEED_PULL_TEST_SECRET, ts) },
  });
}

test.beforeAll(async ({ request }) => {
  const someone = await newUser("vessel-sailing");
  S = await sampleReservations({
    run: `${RUN}vp`,
    customer: someone,
    ownerEmail: "owner@operator-a.test",
    bands: [{ from_days: 0, percent: 100 }],
    departsIn: 45,
    count: 0,
  });
  const db = adminDb();
  slug = `sample-cancel-${RUN}vp`;
  await db.from("vessels").update({ max_guests: 60, cabin_count: 30, deck_count: 3 }).eq("id", S.vesselId);
  await db.from("schedules").update({ sailing_period: "morning", sails_at: "08:00" }).eq("id", S.scheduleId);
  // Availability from a feed, just confirmed: instant booking (ADR-099; manual data becomes a booking request).
  await db.from("inventory").update({ source: "feed", confirmed_at: new Date().toISOString() }).eq("vessel_id", S.vesselId);
  await db.from("schedule_days").insert([
    { schedule_id: S.scheduleId, day_number: 1, locale: "en", title: "Board and sail", description: "Check in and set off." },
    { schedule_id: S.scheduleId, day_number: 5, locale: "en", title: "Arrive", description: "Check out after breakfast." },
  ]);
  const { data: long } = await db
    .from("schedules")
    .insert({
      vessel_id: S.vesselId,
      code: "CX7",
      origin: S.origin,
      destination: S.destination,
      nights: 7,
      sailing_days: [1, 2, 3, 4, 5, 6, 7],
    })
    .select("id")
    .single();
  evaluationId = await insertEvaluation(db, S.vesselId);
  const { error } = await db.from("external_ratings").insert({
    vessel_id: S.vesselId,
    source_name: "Sample Review Site",
    rating: 4.5,
    scale: 5,
    review_count: 120,
    retrieved_on: "2026-10-10",
  });
  if (error || !long) throw error ?? new Error("no schedule");
  const ts = String(Math.floor(Date.now() / 1000));
  await request.post("/api/internal/catalogue/refresh/", {
    headers: { "nilecruz-timestamp": ts, "nilecruz-signature": refreshSignature(FEED_PULL_TEST_SECRET, ts) },
  });
});

test("the vessel page: itineraries, decks, evaluation and ratings, no cabin prices for visitors [PAGE-072, DATA-018, 031, 034, DASH-PUB-002, 003, DASH-CUS-017, BND-003]", async ({
  page,
}) => {
  await page.goto("/cruises/");
  await page.getByRole("article", { name: NAME }).getByRole("link", { name: NAME }).click();
  await page.waitForURL(new RegExp(`/cruises/${slug}/$`));
  // One H1 for the vessel, whichever itinerary is shown (DATA-031).
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(NAME);
  await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toContainText("Nile cruise ships");
  // SEO-013 (Batch 6): the page links to its vessel-type hub by the hub's keyword.
  await expect(page.getByRole("link", { name: "What’s it like on a Nile cruise ship?" })).toHaveAttribute(
    "href",
    "/vessels/motor-cruise-ships/",
  );
  await expect(page.getByText(`From check-in on day 1 in ${S.origin} to check-out on day 5 in ${S.destination}.`)).toBeVisible();
  await expect(page.getByText(`Sails from ${S.origin} in the morning (08:00 Cairo time).`)).toBeVisible();
  await expect(page.getByText(`Plan to arrive in ${S.origin} the day before.`)).toBeVisible();
  await expect(page.getByText("Board and sail")).toBeVisible();
  await expect(page.getByText(/Schematic: not a floor plan/)).toBeVisible();
  await expect(page.getByRole("tab", { name: "Main deck" })).toBeVisible();
  // A verified, complete evaluation is published: its score, conclusion, evaluator and notes.
  await expect(page.getByText("80/100").first()).toBeVisible();
  await expect(page.locator("#evaluation")).toContainText("Assessed on");
  await expect(page.locator("#evaluation")).toContainText("Former boat manager");
  await expect(page.locator("#evaluation")).toContainText("A sample note on hygiene.");
  // EXP-009: the score unfolds into its seven dimensions.
  await expect(page.getByRole("img", { name: /^Evaluation 80 out of 100: / })).toBeVisible();
  await expect(page.getByText("Recommended", { exact: false }).first()).toBeVisible();
  await expect(page.locator("#ratings")).toContainText("4.5 of 5 on Sample Review Site, 120 reviews");
  // One public price; cabins show facts only (ADR-025).
  await expect(page.getByText("US$1,000", { exact: true })).toHaveCount(1);
  await expect(page.getByText(/per person, two sharing/)).toHaveCount(0);
  // The head as search engines see it, on a fresh load: after a client-side navigation the listing's canonical can
  // linger while the vessel page's metadata streams in.
  await page.reload();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new RegExp(`/cruises/${slug}/$`));
  const ld = (await page.locator('script[type="application/ld+json"]').allTextContents()).join("\n");
  expect(ld).toContain('"TouristTrip"');
  expect(ld).toContain('"lowPrice":"1000.00"');
  expect(ld).toContain('"priceCurrency":"USD"');
  expect(ld).not.toContain("AggregateRating");

  // Another itinerary, chosen by its length; it swaps in place and the address carries it. The canonical stays the vessel URL.
  await page.getByRole("link", { name: new RegExp(`^7 nights .*${S.origin} → ${S.destination}`) }).click();
  await expect(page.getByText(`to check-out on day 8 in ${S.destination}.`)).toBeVisible();
  expect(page.url()).toContain("?itinerary=CX7");
  await page.reload();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new RegExp(`/cruises/${slug}/$`));
});

test("an unverified evaluation is never shown: not its score, not in structured data", async ({ page, request }) => {
  const db = adminDb();
  await db.from("evaluations").update({ verified: false }).eq("id", evaluationId);
  await refreshCatalogue(request);
  try {
    // A cached page regenerates after the refresh: read it until it has.
    await expect(async () => {
      await page.goto(`/cruises/${slug}/`);
      await expect(page.locator("#evaluation")).toContainText("We haven’t published our evaluation of this vessel yet.", {
        timeout: 2_000,
      });
    }).toPass({ timeout: 30_000 });
    await expect(page.getByText("80/100")).toHaveCount(0);
    await expect(page.locator("dt", { hasText: "Nilecruz score" })).toHaveCount(0);
    const ld = (await page.locator('script[type="application/ld+json"]').allTextContents()).join("\n");
    expect(ld).not.toContain("80");
  } finally {
    await db.from("evaluations").update({ verified: true }).eq("id", evaluationId);
    await refreshCatalogue(request);
  }
});

test("an information-only vessel offers a request instead [DASH-PUB-010, DASH-BND-002]", async ({ page }) => {
  await page.goto("/cruises/sample-motor-one/");
  await expect(page.getByText("This boat can’t be booked on Nilecruz yet.", { exact: false }).first()).toBeVisible();
  await expect(page.getByText("Information only")).toHaveCount(0);
  await expect(page.getByText("Not given")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "See prices and dates" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Ask for an offer", exact: true }).first()).toBeVisible();
  // No cabin types yet: no cabins section, and no link to one.
  await expect(page.locator("#cabins")).toHaveCount(0);
  await expect(page.locator('a[href="#cabins"]')).toHaveCount(0);
});

test("asking for an offer needs no account, and keeps the boat, cruise and date [DASH-PUB-010]", async ({ page }) => {
  await page.goto("/cruises/sample-motor-one/");
  await page.getByRole("link", { name: "Ask for an offer", exact: true }).first().click();
  await page.waitForURL(/\/cruises\/sample-motor-one\/ask\/$/);
  await expect(page.getByRole("heading", { level: 1, name: "Ask for an offer on this boat" })).toBeVisible();
  await expect(page.getByText("No account needed.", { exact: false })).toBeVisible();
  // From a date on the calendar: its cruise and day come along.
  const { data: its } = await adminDb()
    .from("schedules")
    .select("code, vessels!inner(slug)")
    .eq("vessels.slug", "sample-motor-one")
    .eq("active", true)
    .limit(1);
  const code = its![0]!.code;
  await page.goto(`/cruises/sample-motor-one/ask/?itinerary=${code}&date=2027-02-01`);
  await expect(page.getByLabel("Cruise")).toHaveValue(code);
  await expect(page.getByLabel("Preferred departure date")).toHaveValue("2027-02-01");
  const email = `guest-${RUN}@example.test`;
  await page.getByLabel("Your name").fill("Sample Guest");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Send my request" }).click();
  await expect(page.getByRole("status")).toContainText("Thank you.");
  const { data: m } = await adminDb()
    .from("contact_messages")
    .select("topic, nights, departs_on, guests, vessel:vessels(slug)")
    .eq("email", email)
    .single();
  expect(m).toMatchObject({ topic: "offer", departs_on: "2027-02-01", guests: 2, vessel: { slug: "sample-motor-one" } });
});

test("listing → vessel → sign-in → reserve, at the published rate [DATA-033, DASH-PUB-008, 009, DASH-CUS-016]", async ({
  page,
}) => {
  const customer = await newUser("vessel-booker");
  await page.goto(`/cruises/${slug}/`);
  // The hero's button (the section bar repeats it).
  await page.getByRole("link", { name: "See prices and dates" }).first().click();
  // Prices need an account: the visitor is asked to sign in, and comes back.
  await page.waitForURL(/\/account\/sign-in\/\?next=/);
  await signIn(page, customer.email, customer.password, new URL(page.url()).pathname + new URL(page.url()).search);
  await page.waitForURL(new RegExp(`/cruises/${slug}/reserve/`));
  await expect(page.getByRole("heading", { level: 1, name: `Prices and dates: ${NAME}` })).toBeVisible();
  await expect(page.getByText("from US$1,000 per person, two sharing")).toBeVisible();
  await page
    .getByRole("link", { name: /to/ })
    .filter({ hasText: /2026|2027/ })
    .first()
    .click();
  await expect(page.getByText(/Schematic: not a floor plan/)).toBeVisible();
  await page
    .getByRole("group", { name: "Main deck" })
    .getByLabel(/Double/)
    .check();
  await page.getByLabel("Adults per cabin (18 and over)").selectOption("2");
  await page.getByRole("button", { name: "See the price" }).click();
  await expect(page.getByRole("heading", { name: "3. Guests and reserving" })).toBeVisible();
  await expect(page.getByText("US$2,000", { exact: true })).toBeVisible();
  await page.getByLabel("Cabin 1, guest 1: full name").fill("Sample Guest One");
  await page.getByLabel("Date of birth").nth(0).fill("1980-02-02");
  await page.getByLabel("Nationality").fill("GB");
  await page.getByLabel("Cabin 1, guest 2: full name").fill("Sample Guest Two");
  await page.getByLabel("Date of birth").nth(1).fill("1982-03-03");
  await page.getByLabel("I have read the terms and the cancellation policy").check();
  await page.getByRole("button", { name: "Reserve" }).click();
  await page.waitForURL(/\/dashboard\/journey\/reservations\/[0-9a-f-]{36}\/$/);
  await expect(page.getByText("US$2,000").first()).toBeVisible();
  // ADR-094: the operator sells; Nilecruz books as its agent. An unpaid booking costs nothing to cancel.
  await expect(page.getByText(/Booked through Nilecruz, acting as booking agent for the operator of/)).toBeVisible();
  await expect(page.getByText(/the operator; booked through Nilecruz as its agent/)).toBeVisible();
  await expect(page.getByText("You have paid nothing yet, so cancelling costs nothing", { exact: false })).toBeVisible();
});

test("'Ask for an offer' opens a request prefilled with the route and dates", async ({ page }) => {
  const customer = await newUser("vessel-asker");
  await signIn(page, customer.email, customer.password);
  await page.goto(
    `/dashboard/journey/requests/?route=${encodeURIComponent(`${S.origin}→${S.destination}`)}&from=${S.departsOn}&nights=4`,
  );
  await expect(page.getByLabel("Route")).toHaveValue(`${S.origin}→${S.destination}`);
  await expect(page.getByLabel("Earliest departure")).toHaveValue(S.departsOn);
  await expect(page.getByLabel("Shortest stay (nights)")).toHaveValue("4");
});

test.describe("vessel and reserve screens are accessible", () => {
  for (const theme of ["light", "dark"] as const) {
    test(`vessel page and the reserve steps (${theme})`, async ({ page }) => {
      await setTheme(page, theme);
      await page.goto(`/cruises/${slug}/`);
      await expectNoSeriousA11yIssues(page);
      const customer = await newUser("vessel-axe");
      await signIn(page, customer.email, customer.password);
      await page.goto(`/cruises/${slug}/reserve/`);
      await expectNoSeriousA11yIssues(page);
      await page.goto(`/cruises/${slug}/reserve/?itinerary=CX4&dep=${S.departureId}`);
      await expectNoSeriousA11yIssues(page);
      await page.goto(`/cruises/${slug}/reserve/?itinerary=CX4&dep=${S.departureId}&cabin=${S.cabinTypeId}&adults=2&cabins=1`);
      await expectNoSeriousA11yIssues(page);
    });
  }
});
