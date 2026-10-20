import { expect, test } from "@playwright/test";
import ExcelJS from "exceljs";
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { adminDb, LOCAL, newUser, signInAdmin } from "../support/local-auth";
import { sampleReservations } from "../support/sailing";
import { expectNoSeriousA11yIssues } from "./helpers";

test.skip(!LOCAL, "needs the local Supabase stack: pnpm with-local-db pnpm test:e2e");
test.describe.configure({ mode: "serial", timeout: 180_000 });

/** Operator loop, Part B (ADR-099): a real Excel vacancy sheet → the existing preview → confirmed as source `sheet`. */
const RUN = Date.now();
let S: Awaited<ReturnType<typeof sampleReservations>>;
let second = "";
let file = "";
const ADMIN = "product@nilecruz.test";

test.beforeAll(async () => {
  const someone = await newUser("sheet-sailing");
  S = await sampleReservations({
    run: `${RUN}sh`,
    customer: someone,
    ownerEmail: "owner@operator-a.test",
    bands: [{ from_days: 0, percent: 100 }],
    departsIn: 45,
    count: 0,
  });
  const db = adminDb();
  const later = new Date(Date.parse(`${S.departsOn}T00:00:00Z`) + 7 * 86_400_000).toISOString().slice(0, 10);
  const { data: d } = await db
    .from("departures")
    .insert({
      schedule_id: S.scheduleId,
      vessel_id: S.vesselId,
      departs_on: later,
      returns_on: new Date(Date.parse(`${later}T00:00:00Z`) + 4 * 86_400_000).toISOString().slice(0, 10),
    })
    .select("id")
    .single();
  second = d!.id;
  await db.from("inventory").insert({
    departure_id: second,
    cabin_type_id: S.cabinTypeId,
    vessel_id: S.vesselId,
    available: 5,
    confirmed_at: new Date(Date.now() - 10 * 86_400_000).toISOString(),
  });
  await db
    .from("inventory")
    .update({ confirmed_at: new Date(Date.now() - 10 * 86_400_000).toISOString() })
    .eq("departure_id", S.departureId);

  // The operator's sheet, as Excel: a date above the table, the ship written with "MS", and one cabin name we don't know.
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("November");
  ws.addRow([`Sample Operator A: vacancies`]);
  ws.addRow([`As of: ${new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)}`]);
  ws.addRow([]);
  ws.addRow(["Ship", "Departure", "Cabin", "Free"]);
  ws.addRow([`MS Sample Cancel Ship ${RUN}sh`, new Date(`${S.departsOn}T00:00:00Z`), "Double", 2]);
  ws.addRow([`MS Sample Cancel Ship ${RUN}sh`, new Date(`${later}T00:00:00Z`), "Dbl cabin", 1]);
  const dir = join(tmpdir(), "nilecruz-e2e-sheets");
  mkdirSync(dir, { recursive: true });
  file = join(dir, `vacancies-${RUN}.xlsx`);
  await wb.xlsx.writeFile(file);
});

test("an admin uploads an Excel sheet, maps an unknown cabin name once, and confirms: availability from the sheet [ADR-099 Part B]", async ({
  page,
}) => {
  await signInAdmin(page, ADMIN);
  await page.goto("/dashboard/admin/sheets/");
  await page.getByLabel("Operator").selectOption({ label: "Sample Operator A" });
  await page.getByLabel(/^File/).setInputFiles(file);
  await page.getByRole("button", { name: "Read this sheet" }).click();
  await page.waitForURL(/\/dashboard\/admin\/sheets\/[0-9a-f-]{36}\/$/);
  const id = page.url().match(/sheets\/([0-9a-f-]{36})\//)![1]!;
  await expect(page.getByText("To review", { exact: true })).toBeVisible();
  await expect(page.getByText(/read by sheets-v1\/table/)).toBeVisible(); // a plain table: read without AI
  await expect(page.getByRole("link", { name: /Open the original/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Names to map (1)" })).toBeVisible();
  await expectNoSeriousA11yIssues(page);

  await page.getByLabel(/Cabin “Dbl cabin” on .* is/).selectOption({ label: "Double (DBL)" });
  await page.getByRole("button", { name: "Save this name" }).click();
  // The name is saved and the sheet read again: nothing left to map (the section, and its form, go away).
  await expect(page.getByRole("heading", { name: /Names to map/ })).toHaveCount(0);
  await expect(page.getByText("name to map")).toHaveCount(0);

  await page.getByRole("button", { name: "Confirm and update availability" }).click();
  await expect(page.getByText("Confirmed", { exact: true })).toBeVisible(); // the status; the decide form goes away
  const { data } = await adminDb()
    .from("inventory")
    .select("departure_id, available, source")
    .in("departure_id", [S.departureId, second]);
  expect(Object.fromEntries((data ?? []).map((r) => [r.departure_id, `${r.available} ${r.source}`]))).toEqual({
    [S.departureId]: "2 sheet",
    [second]: "1 sheet",
  });
  const { data: alias } = await adminDb()
    .from("operator_aliases")
    .select("target, vessel_slug")
    .eq("sheet_name", "Dbl cabin")
    .eq("vessel_slug", `sample-cancel-${RUN}sh`)
    .single();
  expect(alias).toEqual({ target: "DBL", vessel_slug: `sample-cancel-${RUN}sh` });
  expect((await adminDb().from("sheet_ingests").select("status, sheet_date").eq("id", id).single()).data!.status).toBe(
    "confirmed",
  );
});
