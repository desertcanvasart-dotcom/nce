import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { refreshSignature } from "@/lib/connections/signature";
import { FEED_PULL_TEST_SECRET } from "../support/feed-tls";
import { adminDb, LOCAL, ORG } from "../support/local-auth";

/**
 * ADR-113: the Lake Nasser listing and route guide are built but hidden (noindex, unlinked, out of the sitemap) until a
 * real vessel sails to or from Abu Simbel; then they, the search route and the links appear without a code change.
 */
test.skip(!LOCAL, "needs the local Supabase stack: pnpm with-local-db pnpm test:e2e");
// One test changes the catalogue, so these run one after the other.
test.describe.configure({ mode: "serial", timeout: 90_000 });

const LISTING = "/cruises/lake-nasser/";
const GUIDE = "/nile-cruise-guide/routes/lake-nasser/";
const RUN = Date.now();

async function refresh(request: APIRequestContext) {
  const ts = String(Math.floor(Date.now() / 1000));
  const r = await request.post("/api/internal/catalogue/refresh/", {
    headers: { "nilecruz-timestamp": ts, "nilecruz-signature": refreshSignature(FEED_PULL_TEST_SECRET, ts) },
  });
  expect(r.status()).toBe(200);
}

// Indexing is off in tests (ALLOW_INDEXING), so every page says noindex; a hidden page also says nofollow.
const robots = (page: Page) => page.locator('meta[name="robots"]').getAttribute("content");
const mainLinks = (page: Page) =>
  page.locator("main a[href^='/']").evaluateAll((as) => as.map((a) => new URL((a as HTMLAnchorElement).href).pathname));

test("with no Lake Nasser sailings, both pages exist but are hidden [ADR-113, PAGE-008, PAGE-069]", async ({ page, request }) => {
  await page.goto(LISTING);
  await expect(page.getByRole("heading", { level: 1, name: "Lake Nasser cruises" })).toBeVisible();
  await expect(page.getByText("No Lake Nasser cruises are published yet.")).toBeVisible();
  expect(await robots(page)).toMatch(/noindex, nofollow/);

  await page.goto(GUIDE);
  await expect(page.getByRole("heading", { level: 1, name: "Lake Nasser cruises: Abu Simbel by water" })).toBeVisible();
  await expect(page.getByText("Draft for review")).toBeVisible();
  expect(await robots(page)).toMatch(/noindex, nofollow/);

  await page.goto("/cruises/");
  await expect(
    page.getByRole("navigation", { name: "Cruise types and routes" }).getByRole("link", { name: "Lake Nasser cruises" }),
  ).toHaveCount(0);
  for (const from of ["/nile-cruise-guide/routes/", "/destinations/abu-simbel/"]) {
    await page.goto(from);
    expect(await mainLinks(page), from).not.toContain(GUIDE);
  }
  const sitemap = await (await request.get("/sitemaps/sitemap/en.xml")).text();
  expect(sitemap).not.toContain(GUIDE);
  expect(sitemap).not.toContain(LISTING);
});

test("a published Aswan → Abu Simbel sailing makes them live, linked and searchable [ADR-113, DATA-012]", async ({
  page,
  request,
}) => {
  const db = adminDb();
  // A real (not sample) vessel: samples never open a gated page. Showcase, so it can't be booked; removed afterwards.
  const { data: v, error } = await db
    .from("vessels")
    .insert({
      slug: `lake-test-${RUN}`,
      name: `Lake Test Ship ${RUN}`,
      type: "motor",
      visibility: "showcase",
      showcase_until: "2027-12-31",
      showcase_reason: "Lake Nasser gating test",
      operator_org_id: ORG.operatorA,
      is_sample: false,
    })
    .select("id")
    .single();
  expect(error).toBeNull();
  try {
    const { data: s } = await db
      .from("schedules")
      .insert({ vessel_id: v!.id, code: "LN3", origin: "Aswan", destination: "Abu Simbel", nights: 3, sailing_days: [1] })
      .select("id")
      .single();
    await db
      .from("departures")
      .insert({ schedule_id: s!.id, vessel_id: v!.id, departs_on: "2027-03-01", returns_on: "2027-03-04" });
    await refresh(request);

    await page.goto(LISTING);
    await expect(page.getByRole("link", { name: new RegExp(`Lake Test Ship ${RUN}`) }).first()).toBeVisible();
    expect(await robots(page)).not.toMatch(/nofollow/);

    await page.goto(GUIDE);
    expect(await robots(page)).not.toMatch(/nofollow/);
    expect(await mainLinks(page)).toContain(LISTING);

    for (const from of ["/nile-cruise-guide/routes/", "/destinations/abu-simbel/"]) {
      await page.goto(from);
      expect(await mainLinks(page), from).toContain(GUIDE);
    }
    await page.goto("/cruises/");
    await expect(
      page.getByRole("navigation", { name: "Cruise types and routes" }).getByRole("link", { name: "Lake Nasser cruises" }),
    ).toBeVisible();
    // The search route comes from the departure itself.
    expect(await page.content()).toContain("Aswan → Abu Simbel");

    const sitemap = await (await request.get("/sitemaps/sitemap/en.xml")).text();
    expect(sitemap).toContain(GUIDE);
    expect(sitemap).toContain(LISTING);
  } finally {
    await db.from("vessels").delete().eq("id", v!.id);
    await refresh(request);
  }
});
