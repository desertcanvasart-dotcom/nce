/**
 * PAGE-107: the screenshots on /operators/connect/, taken from the LOCAL system with sample data only (the seed and
 * what the end-to-end tests leave behind), never a real operator, guest or price.
 *
 *   ACTION_LINK_SECRET=<the e2e test secret> pnpm with-local-db pnpm start --port 3100     (a production build)
 *   pnpm tsx scripts/operator-shots.ts [--base http://localhost:3100]
 *
 * Saves PNGs to the scratch folder given by --out (default ./.shots); scripts/operator-shots.py turns them into the
 * page's WebP files in public/images/operators/.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { chromium, type Locator, type Page } from "@playwright/test";
import { actionToken } from "../src/lib/requests/tokens";
import type { Database } from "../src/server/db/database.types";
import { ACTION_LINK_TEST_SECRET } from "../tests/support/requests";
import { totp } from "../tests/support/totp";

const arg = (name: string, fallback: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1]! : fallback;
};
const base = arg("base", "http://localhost:3100");
const out = resolve(arg("out", ".shots"));
mkdirSync(out, { recursive: true });

const ORG_A = "00000000-0000-4000-b000-00000000000a";
const PASSWORD = "nilecruz-local-only"; // the local seed's password (supabase/seed-users.md)

const status = JSON.parse(execFileSync("supabase", ["status", "-o", "json"], { encoding: "utf8" })) as Record<string, string>;
if (!/^http:\/\/(127\.0\.0\.1|localhost)/.test(status.API_URL ?? "")) throw new Error("Local Supabase only.");
const db = createClient<Database>(status.API_URL!, status.SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

async function signIn(page: Page, email: string, admin = false) {
  await page.goto(`${base}/account/sign-in/`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL((u) => !u.pathname.endsWith("/account/sign-in/"));
  if (admin && page.url().includes("/account/two-step/")) {
    await page.getByLabel("Six-digit code").fill(totp());
    await page.getByRole("button", { name: "Continue" }).click();
    await page.waitForURL((u) => !u.pathname.endsWith("/account/two-step/"));
  }
}

async function shoot(target: Locator, name: string) {
  // The admin banner "Email isn’t set up on this server" only shows locally (no email key); staging and production have one.
  await target.page().evaluate(() =>
    document.querySelectorAll('[role="alert"]').forEach((e) => {
      if (e.textContent?.includes("Email isn’t set up")) e.remove();
    }),
  );
  await target.scrollIntoViewIfNeeded();
  await target.page().waitForTimeout(300);
  await target.screenshot({ path: `${out}/${name}.png` });
  console.log(`- ${name}`);
}
const section = (page: Page, id: string) => page.locator(`section:has(> h2#${id})`);

async function main() {
  // Sample data: operator A's latest availability, booking request and allotment; the latest sheet ingest.
  const { data: inv } = await db
    .from("inventory")
    .select("departure_id, vessel:vessels!inner(id, operator_org_id, is_sample), departure:departures!inner(schedule_id)")
    .eq("vessel.operator_org_id", ORG_A)
    .eq("vessel.is_sample", true)
    .order("confirmed_at", { ascending: false })
    .limit(1)
    .single();
  // A request still waiting for an answer shows the buttons; any request will do if none waits.
  const { data: requests } = await db
    .from("booking_requests")
    .select("id, status")
    .eq("org_id", ORG_A)
    .order("created_at", { ascending: false })
    .limit(50);
  const request = requests?.find((r) => r.status === "waiting") ?? requests?.[0];
  const { data: sheet } = await db.from("sheet_ingests").select("id").order("created_at", { ascending: false }).limit(1).single();
  if (!inv || !request || !sheet) throw new Error("Run the end-to-end tests first: they leave the sample data these use.");
  const vesselId = inv.vessel.id;
  const scheduleId = inv.departure.schedule_id;

  const browser = await chromium.launch();
  const context = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1440, height: 900 } });
  await context.addInitScript(() => localStorage.setItem("nc-theme", "light"));
  const page = await context.newPage();

  // The one-tap reply page needs no sign-in (opening it changes nothing).
  await page.goto(`${base}/operator-reply/${actionToken(ACTION_LINK_TEST_SECRET, request.id, "confirm")}/`);
  await shoot(page.locator("main").last(), "one-tap-reply");

  await signIn(page, "owner@operator-a.test");
  const op = `${base}/dashboard/operator/${ORG_A}`;
  await page.goto(`${op}/requests/booking/${request.id}/`);
  await shoot(page.locator("main").last(), "booking-request");
  await page.goto(`${op}/schedules/${vesselId}/${scheduleId}/`);
  await shoot(section(page, "rates"), "dashboard-inventory");
  await page.goto(`${op}/cabins/${vesselId}/`);
  await shoot(section(page, "cabins"), "dashboard-cabins");
  await page.goto(`${op}/inventory/`);
  await shoot(section(page, "health"), "connection-health");
  await shoot(section(page, "allotments"), "allotments");
  await page.goto(`${op}/inventory/format/`);
  await shoot(page.locator("main").last(), "format-page");

  await context.clearCookies();
  await signIn(page, "admin@nilecruz.test", true);
  await page.goto(`${base}/dashboard/admin/sheets/${sheet.id}/`);
  await shoot(page.locator("main").last(), "sheet-preview");

  await browser.close();
  console.log(`Saved to ${out}`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
