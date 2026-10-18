import { readFileSync } from "node:fs";
import https from "node:https";
import { expect, test } from "@playwright/test";
import { pullSignature, sha256Hex, signRequest } from "../../src/lib/connections/signature";
import { FEED_PULL_TEST_SECRET, FEED_TEST_ORIGIN, FEED_TEST_PORT, FEED_TLS } from "../support/feed-tls";
import { adminDb, LOCAL, ORG, signIn, signInAdmin } from "../support/local-auth";
import { expectNoSeriousA11yIssues, setTheme } from "./helpers";

test.skip(!LOCAL, "needs the local Supabase stack: pnpm with-local-db pnpm test:e2e");
// Its own admin account, vessel and feed address per run, so it never collides with other files or a second CI pass.
test.describe.configure({ mode: "serial", timeout: 120_000 });

const ADMIN = "connections@nilecruz.test";
const OWNER = "owner@operator-a.test";
const RUN = Date.now();
const SLUG = `sample-connections-${RUN}`;
const CABIN = `C${RUN % 1_000_000}`;
const SCHEDULE = `S${RUN % 1_000_000}`;
const PAGE = `/dashboard/operator/${ORG.operatorA}/inventory/`;
const isoIn = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
let vesselId = "";
let cabinId = "";
let privateKeyPem = "";
let keyId = "";

function doc(date: string, available: number, price = "1250.00") {
  return JSON.stringify({
    format: "nilecruz-inventory/1",
    cruises: [
      {
        id: SLUG,
        availability: [
          {
            date,
            schedule: SCHEDULE,
            cabins: [{ type: CABIN, available, rates: [{ occupancy: 2, plan: "international", currency: "USD", price }] }],
          },
        ],
      },
    ],
  });
}

async function inventoryOn(date: string) {
  const { data } = await adminDb()
    .from("inventory")
    .select("available, source, departures!inner(departs_on)")
    .eq("cabin_type_id", cabinId)
    .eq("departures.departs_on", date)
    .maybeSingle();
  return data;
}

// A local https feed server (SEC-007 allows https only); its certificate is made by playwright.config.ts.
let server: https.Server;
test.beforeAll(async () => {
  const db = adminDb();
  const { data: v, error } = await db
    .from("vessels")
    .insert({
      slug: SLUG,
      name: `Sample Connections Ship ${RUN}`,
      type: "motor",
      visibility: "private",
      operator_org_id: ORG.operatorA,
      is_sample: true,
    })
    .select("id")
    .single();
  if (error) throw error;
  vesselId = v.id;
  const { data: c } = await db
    .from("cabin_types")
    .insert({ vessel_id: vesselId, code: CABIN, name: "Sample cabin", deck: "Main", max_occupancy: 2 })
    .select("id")
    .single();
  cabinId = c!.id;
  const { data: s } = await db
    .from("schedules")
    .insert({
      vessel_id: vesselId,
      code: SCHEDULE,
      origin: "Luxor",
      destination: "Aswan",
      nights: 4,
      sailing_days: [1, 2, 3, 4, 5, 6, 7],
    })
    .select("id")
    .single();
  const days = [6, 7, 8, 9];
  const { error: dErr } = await db
    .from("departures")
    .insert(days.map((d) => ({ schedule_id: s!.id, vessel_id: vesselId, departs_on: isoIn(d), returns_on: isoIn(d + 4) })));
  if (dErr) throw dErr;

  server = https.createServer({ key: readFileSync(FEED_TLS.key), cert: readFileSync(FEED_TLS.cert) }, (req, res) => {
    if (req.url === `/feed-${RUN}.xml`) {
      res.writeHead(200, { "Content-Type": "application/xml" });
      return res.end(`<?xml version="1.0"?>
<feed format="nilecruz-inventory/1"><cruises><cruise><id>${SLUG}</id><availability>
  <date date="${isoIn(8)}" schedule="${SCHEDULE}"><cabin type="${CABIN}" available="6" confirmed_at="${new Date().toISOString()}">
    <rate occupancy="2" plan="international" currency="USD" price="990.00"/></cabin></date>
</availability></cruise></cruises></feed>`);
    }
    res.writeHead(404).end();
  });
  await new Promise<void>((r) => server.listen(FEED_TEST_PORT, "127.0.0.1", r));
});
test.afterAll(() => new Promise<void>((r) => (server ? server.close(() => r()) : r())));

test("an owner pastes JSON, checks every row, then applies it [DASH-OPR-024]", async ({ page }) => {
  await signIn(page, OWNER);
  await page.goto(PAGE);
  const bad = JSON.parse(doc(isoIn(6), 4));
  bad.cruises[0].availability[0].cabins.push({ type: "NOPE", available: 1 });
  await page.getByRole("textbox", { name: "JSON or XML" }).fill(JSON.stringify(bad));
  await page.getByRole("button", { name: "Check the data" }).click();
  await expect(page.getByText(/2 rows checked · 1 will change/)).toBeVisible();
  await expect(
    page.getByRole("cell", { name: `Sample Connections Ship ${RUN} has no cabin type with the code “NOPE”.` }),
  ).toBeVisible();
  expect(await inventoryOn(isoIn(6))).toBeNull();
  await page.getByRole("button", { name: "Apply 1 row" }).click();
  await expect(page.getByText(/Applied: 1 row changed/)).toBeVisible();
  expect(await inventoryOn(isoIn(6))).toMatchObject({ available: 4, source: "paste" });
  // One row was refused, so the health panel says so in plain words (DASH-OPR-027).
  await expect(page.getByRole("row", { name: /Paste Needs attention .*1 of 2 rows could not be applied/ })).toBeVisible();
});

test("an owner creates an API key; a signed call applies once and replays change nothing [DASH-OPR-026, SEC-008, SEC-009]", async ({
  page,
  request,
}) => {
  await signIn(page, OWNER);
  await page.goto(PAGE);
  // Rotation leaves at most two active keys; make room in case an earlier run left two.
  const { data: active } = await adminDb().from("api_keys").select("id").eq("org_id", ORG.operatorA).is("revoked_at", null);
  if ((active ?? []).length >= 2) {
    await adminDb()
      .from("api_keys")
      .update({ revoked_at: new Date().toISOString() })
      .eq("org_id", ORG.operatorA)
      .is("revoked_at", null);
    await page.reload();
  }
  await page.getByLabel("Key name").fill(`E2E ${RUN}`);
  await page.getByRole("button", { name: "Create a key" }).click();
  const secret = page.locator("pre", { hasText: "BEGIN PRIVATE KEY" });
  await expect(secret).toBeVisible();
  privateKeyPem = (await secret.textContent())!;
  keyId = (await page.getByText(/^Key nck_[0-9a-f]{20} created/).textContent())!.match(/nck_[0-9a-f]{20}/)![0];
  const { data: stored } = await adminDb().from("api_keys").select("*").eq("key_id", keyId).single();
  expect(JSON.stringify(stored)).not.toContain("PRIVATE");

  const call = (body: string, idem: string, sigBody = body) => {
    const timestamp = String(Math.floor(Date.now() / 1000));
    const path = "/api/v1/inventory/";
    const signature = signRequest(privateKeyPem, {
      method: "POST",
      path,
      timestamp,
      idempotencyKey: idem,
      bodySha256: sha256Hex(sigBody),
    });
    return request.post(path, {
      data: body,
      headers: {
        "Content-Type": "application/json",
        "Nilecruz-Key": keyId,
        "Nilecruz-Timestamp": timestamp,
        "Nilecruz-Signature": signature,
        "Idempotency-Key": idem,
      },
    });
  };

  const first = await call(doc(isoIn(7), 3), `e2e-${RUN}-1`);
  expect(first.status()).toBe(200);
  expect(await first.json()).toMatchObject({ total: 1, changed: 1, failed: 0 });
  expect(await inventoryOn(isoIn(7))).toMatchObject({ available: 3, source: "api" });

  // Someone changes it by hand; replaying the same signed request must not put the old value back.
  await adminDb()
    .from("inventory")
    .update({ available: 1, confirmed_at: new Date().toISOString(), source: "manual" })
    .eq("cabin_type_id", cabinId)
    .eq("available", 3);
  const replay = await call(doc(isoIn(7), 3), `e2e-${RUN}-1`);
  expect(replay.status()).toBe(200);
  expect(replay.headers()["idempotent-replayed"]).toBe("true");
  expect(await inventoryOn(isoIn(7))).toMatchObject({ available: 1, source: "manual" });

  expect((await call(doc(isoIn(7), 2), `e2e-${RUN}-1`)).status()).toBe(422); // same key, different body
  expect((await call(doc(isoIn(7), 9), `e2e-${RUN}-2`, doc(isoIn(7), 2))).status()).toBe(401); // tampered body
  const unsigned = await request.post("/api/v1/inventory/", { data: doc(isoIn(7), 2) });
  expect(unsigned.status()).toBe(401);

  await page.reload();
  await expect(page.getByRole("row", { name: new RegExp(`E2E ${RUN}.*Never|E2E ${RUN}`) })).toBeVisible();
  await page.getByRole("button", { name: `Revoke E2E ${RUN}` }).click();
  // The revoke form disappears with the key, so the outcome is read from the page (ADR-076).
  await expect(page.getByRole("row", { name: new RegExp(`E2E ${RUN} ${keyId} .*Revoked`) })).toBeVisible();
  const afterRevoke = await call(doc(isoIn(7), 2), `e2e-${RUN}-3`);
  expect(afterRevoke.status()).toBe(401);
  expect((await afterRevoke.json()).error.code).toBe("unknown-key");
});

test("a feed waits for an admin's approval, then is pulled from the operator's server [DASH-OPR-025, DASH-ADM-047, SEC-007]", async ({
  page,
  browser,
}) => {
  await signIn(page, OWNER);
  await page.goto(PAGE);
  const feedForm = page.locator("form", { has: page.getByLabel("Feed address") });
  await feedForm.getByLabel("Feed address").fill("https://169.254.169.254/latest/meta-data/");
  await feedForm.getByRole("button").click();
  await expect(page.getByText("That address is on a private or internal network.")).toBeVisible();

  await feedForm.getByLabel("Feed address").fill(`${FEED_TEST_ORIGIN}/feed-${RUN}.xml`);
  await feedForm.getByRole("button").click();
  await expect(page.getByText(/Feed address saved/)).toBeVisible();
  await page.reload();
  await expect(page.getByText("Awaiting Nilecruz approval")).toBeVisible();
  expect(await inventoryOn(isoIn(8))).toBeNull();
  await page.goto(`/dashboard/operator/${ORG.operatorA}/`);
  await expect(page.getByRole("link", { name: "Your inventory feed is waiting for Nilecruz’s approval." })).toBeVisible();

  const ctx = await browser.newContext();
  const admin = await ctx.newPage();
  await signInAdmin(admin, ADMIN);
  await admin.goto("/dashboard/admin/");
  await expect(admin.getByRole("link", { name: /Inventory feeds awaiting approval/ })).toBeVisible();
  await admin.goto(`/dashboard/admin/operators/${ORG.operatorA}/`);
  const decision = admin.locator("form", { has: admin.getByRole("button", { name: "Save feed decision" }) });
  await decision.getByLabel("Decision").selectOption("active");
  await decision.getByRole("button", { name: "Save feed decision" }).click();
  await expect(admin.getByText(/Feed approved and pulled: 1 row changed/)).toBeVisible();
  await ctx.close();

  expect(await inventoryOn(isoIn(8))).toMatchObject({ available: 6, source: "feed" });
  await page.goto(PAGE);
  await expect(page.getByText("Active: pulled every hour")).toBeVisible();
  await expect(page.getByRole("row", { name: /Feed Working/ })).toBeVisible();
});

test("the scheduler's pull call must be signed [ADR-081]", async ({ request }) => {
  expect((await request.post("/api/internal/feeds/pull/")).status()).toBe(401);
  const ts = String(Math.floor(Date.now() / 1000));
  const wrong = await request.post("/api/internal/feeds/pull/", {
    headers: { "Nilecruz-Timestamp": ts, "Nilecruz-Signature": pullSignature("not-the-secret", ts) },
  });
  expect(wrong.status()).toBe(401);
  const ok = await request.post("/api/internal/feeds/pull/", {
    headers: { "Nilecruz-Timestamp": ts, "Nilecruz-Signature": pullSignature(FEED_PULL_TEST_SECRET, ts) },
  });
  expect(ok.status()).toBe(200);
  expect(await ok.json()).toHaveProperty("pulled");
});

test.describe("connection screens are accessible", () => {
  for (const theme of ["light", "dark"] as const) {
    test(`inventory connections, format document, admin operator page (${theme})`, async ({ page, browser }) => {
      await setTheme(page, theme);
      await signIn(page, OWNER);
      for (const path of [PAGE, `${PAGE}format/`]) {
        await page.goto(path);
        await expectNoSeriousA11yIssues(page);
      }
      const ctx = await browser.newContext({ colorScheme: theme });
      const admin = await ctx.newPage();
      await setTheme(admin, theme);
      await signInAdmin(admin, ADMIN);
      for (const path of [`/dashboard/admin/operators/${ORG.operatorA}/`, "/dashboard/admin/operators/", "/dashboard/admin/"]) {
        await admin.goto(path);
        await expectNoSeriousA11yIssues(admin);
      }
      await ctx.close();
    });
  }
});
