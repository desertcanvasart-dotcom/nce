/**
 * PAGE-107: a tidy sample set for the screenshots on /operators/connect/, in the LOCAL database only, on top of the
 * seed (run it right after `supabase db reset`). Everything is flagged sample data; no real operator, guest or price.
 *
 *   ACTION_LINK_SECRET=<the e2e test secret> pnpm with-local-db pnpm start --port 3100     (a production build)
 *   pnpm tsx scripts/operator-sample.ts [--base http://localhost:3100]
 *   pnpm tsx scripts/operator-shots.ts
 *
 * Makes "Sample Dahabiya Nefertari" for Sample Operator A (Esna to Aswan, 4 nights, Saturdays): two cabin types, eight
 * sailings with prices, free cabins entered by hand, an allotment of suites, one pasted update (for connection
 * health), a guest's booking request waiting for an answer, and a clean weekly sheet waiting for review.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "@playwright/test";
import ExcelJS from "exceljs";
import { parseInventory } from "../src/lib/connections/format";
import type { Database } from "../src/server/db/database.types";
import { totp } from "../tests/support/totp";

const arg = (name: string, fallback: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1]! : fallback;
};
const base = arg("base", "http://localhost:3100");
const ORG_A = "00000000-0000-4000-b000-00000000000a";
const PASSWORD = "nilecruz-local-only"; // the local seed's password (supabase/seed-users.md)

const status = JSON.parse(execFileSync("supabase", ["status", "-o", "json"], { encoding: "utf8" })) as Record<string, string>;
if (!/^http:\/\/(127\.0\.0\.1|localhost)/.test(status.API_URL ?? "")) throw new Error("Local Supabase only.");
const admin = createClient<Database>(status.API_URL!, status.SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
async function as(email: string) {
  const c = createClient<Database>(status.API_URL!, status.PUBLISHABLE_KEY ?? status.ANON_KEY!, {
    auth: { persistSession: false },
  });
  const { error } = await c.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw error;
  return c;
}
const ok = (r: { error: unknown }) => {
  if (r.error) throw r.error;
};
const must = <T>(r: { data: T; error: unknown }): NonNullable<T> => {
  if (r.error) throw r.error;
  if (r.data === null || r.data === undefined) throw new Error("No data returned");
  return r.data as NonNullable<T>;
};

/** The next Saturdays (Cairo), the first at least 10 days away. */
function saturdays(n: number): string[] {
  const d = new Date(Date.now() + 10 * 86_400_000);
  while (d.getUTCDay() !== 6) d.setUTCDate(d.getUTCDate() + 1);
  return Array.from({ length: n }, (_, i) => new Date(d.getTime() + i * 7 * 86_400_000).toISOString().slice(0, 10));
}
const plus = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

async function main() {
  if ((await admin.from("vessels").select("id").eq("slug", "sample-dahabiya-nefertari").maybeSingle()).data)
    throw new Error("The sample set is already there: run `supabase db reset` first.");

  // The dahabiya, its cabins and its itinerary.
  const vessel = must(
    await admin
      .from("vessels")
      .insert({
        slug: "sample-dahabiya-nefertari",
        name: "Sample Dahabiya Nefertari",
        type: "sail",
        category: "luxury",
        visibility: "published",
        published_at: new Date().toISOString(),
        operator_org_id: ORG_A,
        cabin_count: 8,
        max_guests: 16,
        deck_count: 2,
        route_text: "Esna–Aswan",
        is_sample: true,
      })
      .select("id")
      .single(),
  );
  const cabins = must(
    await admin
      .from("cabin_types")
      .insert([
        {
          vessel_id: vessel.id,
          code: "DBL",
          name: "Double",
          deck: "Main",
          max_occupancy: 2,
          size_m2: 18,
          view: "river",
          balcony: false,
        },
        {
          vessel_id: vessel.id,
          code: "STE",
          name: "Suite",
          deck: "Upper",
          max_occupancy: 2,
          size_m2: 28,
          view: "river",
          balcony: true,
        },
      ])
      .select("id, code"),
  );
  const dbl = cabins.find((c) => c.code === "DBL")!.id;
  const ste = cabins.find((c) => c.code === "STE")!.id;
  const schedule = must(
    await admin
      .from("schedules")
      .insert({ vessel_id: vessel.id, code: "ES4", origin: "Esna", destination: "Aswan", nights: 4, sailing_days: [6] })
      .select("id")
      .single(),
  );
  const days = [
    "Esna: board at noon, the Temple of Khnum",
    "El Kab and a quiet mooring",
    "Edfu: the Temple of Horus",
    "Kom Ombo and the crocodile museum",
    "Aswan: leave after breakfast",
  ];
  ok(
    await admin.from("schedule_days").insert(
      days.map((title, i) => ({
        schedule_id: schedule.id,
        day_number: i + 1,
        locale: "en" as const,
        title,
        description: "",
      })),
    ),
  );
  const dates = saturdays(8);
  const deps = must(
    await admin
      .from("departures")
      .insert(dates.map((d) => ({ schedule_id: schedule.id, vessel_id: vessel.id, departs_on: d, returns_on: plus(d, 4) })))
      .select("id, departs_on"),
  ).sort((a, b) => a.departs_on.localeCompare(b.departs_on));
  ok(
    await admin.from("rates").insert(
      deps.flatMap((d) => [
        {
          departure_id: d.id,
          vessel_id: vessel.id,
          cabin_type_id: dbl,
          occupancy: 2,
          rate_plan: "international" as const,
          currency: "USD",
          amount_minor: 145000,
        },
        {
          departure_id: d.id,
          vessel_id: vessel.id,
          cabin_type_id: dbl,
          occupancy: 1,
          rate_plan: "international" as const,
          currency: "USD",
          amount_minor: 210000,
        },
        {
          departure_id: d.id,
          vessel_id: vessel.id,
          cabin_type_id: ste,
          occupancy: 2,
          rate_plan: "international" as const,
          currency: "USD",
          amount_minor: 195000,
        },
      ]),
    ),
  );
  ok(
    await admin.from("cancellation_policies").insert({
      vessel_id: vessel.id,
      bands: [
        { from_days: 30, percent: 0 },
        { from_days: 0, percent: 100 },
      ],
    }),
  );

  // Free cabins entered by hand on the first four sailings (booking requests), an allotment of suites.
  const day = 86_400_000;
  ok(
    await admin.from("inventory").insert(
      deps.slice(0, 4).flatMap((d) => [
        {
          departure_id: d.id,
          vessel_id: vessel.id,
          cabin_type_id: dbl,
          available: 4,
          confirmed_at: new Date(Date.now() - day).toISOString(),
          source: "manual" as const,
        },
        {
          departure_id: d.id,
          vessel_id: vessel.id,
          cabin_type_id: ste,
          available: 2,
          confirmed_at: new Date(Date.now() - day).toISOString(),
          source: "manual" as const,
        },
      ]),
    ),
  );
  ok(
    await admin.from("allotments").insert({
      org_id: ORG_A,
      vessel_id: vessel.id,
      cabin_type_id: ste,
      starts_on: dates[0]!,
      ends_on: dates[7]!,
      cabins: 2,
      release_days: 14,
      contract_ref: "SAMPLE-2027",
    }),
  );

  // One pasted update for the later sailings (the operator's own paste), so connection health has a recent run.
  const operator = await as("owner@operator-a.test");
  const doc = {
    cruises: [
      {
        id: "sample-dahabiya-nefertari",
        availability: deps.slice(4).map((d) => ({ date: d.departs_on, cabins: [{ type: "DBL", available: 5 }] })),
      },
    ],
  };
  const run = must(
    await operator.rpc("preview_inventory_paste", {
      target_org: ORG_A,
      input: parseInventory(JSON.stringify(doc)),
      label: "Sample paste",
    }),
  );
  ok(await operator.rpc("apply_inventory_paste", { run: run as string }));

  // A guest asks for a Double on the second sailing: a booking request waiting for the operator.
  const customer = await as("customer@example.test");
  ok(
    await customer.rpc("customer_request_booking", {
      dep: deps[1]!.id,
      cur: "USD",
      cabins: [{ cabin_type_id: dbl, ages: [52, 49] }],
      guests: [
        { full_name: "Sample Guest One", date_of_birth: "1974-04-12" },
        { full_name: "Sample Guest Two", date_of_birth: "1977-09-30" },
      ],
      terms_read: true,
    }),
  );

  // A clean weekly sheet, uploaded by an admin and left for review.
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Vacancies");
  ws.addRow(["Sample Operator A: vacancies"]);
  ws.addRow([]);
  ws.addRow(["Ship", "Departure", "Cabin", "Free"]);
  for (const d of deps.slice(0, 2)) {
    ws.addRow(["Sample Dahabiya Nefertari", new Date(`${d.departs_on}T00:00:00Z`), "Double", 3]);
    ws.addRow(["Sample Dahabiya Nefertari", new Date(`${d.departs_on}T00:00:00Z`), "Suite", 1]);
  }
  const dir = join(tmpdir(), "nilecruz-sample-sheet");
  mkdirSync(dir, { recursive: true });
  const file = join(dir, "nefertari-vacancies.xlsx");
  await wb.xlsx.writeFile(file);
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`${base}/account/sign-in/`);
  await page.getByLabel("Email").fill("admin@nilecruz.test");
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL((u) => !u.pathname.endsWith("/account/sign-in/"));
  if (page.url().includes("/account/two-step/")) {
    await page.getByLabel("Six-digit code").fill(totp());
    await page.getByRole("button", { name: "Continue" }).click();
    await page.waitForURL((u) => !u.pathname.endsWith("/account/two-step/"));
  }
  await page.goto(`${base}/dashboard/admin/sheets/`);
  await page.getByLabel("Operator").selectOption({ label: "Sample Operator A" });
  await page.getByLabel(/^File/).setInputFiles(file);
  await page.getByRole("button", { name: "Read this sheet" }).click();
  await page.waitForURL(/\/dashboard\/admin\/sheets\/[0-9a-f-]{36}\/$/);
  await browser.close();

  console.log(`Sample Dahabiya Nefertari ready: ${deps.length} sailings, a waiting request, a sheet to review.`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
