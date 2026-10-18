import { PNG } from "pngjs";
import { expect, test } from "@playwright/test";
import { adminDb, LOCAL, ORG, signIn, signInAdmin } from "../support/local-auth";
import { expectNoSeriousA11yIssues, setTheme } from "./helpers";

test.skip(!LOCAL, "needs the local Supabase stack: pnpm with-local-db pnpm test:e2e");
// Its own admin accounts and run-unique data, so it never collides with other files or a second CI pass.
test.describe.configure({ mode: "serial", timeout: 120_000 });

const ADMIN = "tours@nilecruz.test";
const CONTENT = "content@nilecruz.test";
const RUN = Date.now();
const TOUR = `Sample Tour ${RUN}`;
const SUPPLIER = `Sample Supplier ${RUN}`;
const PROGRAM = `Sample Program ${RUN}`;
const SCHEDULE = `T${RUN % 1_000_000}`;
const isoIn = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
let tourId = "";
let programId = "";
let scheduleLabel = "";

function png(): Buffer {
  const img = new PNG({ width: 48, height: 32 });
  img.data.fill(90);
  return PNG.sync.write(img);
}

test.beforeAll(async () => {
  // A cruise schedule to attach tours and a program to: two departures a week apart.
  const db = adminDb();
  const { data: v, error } = await db
    .from("vessels")
    .insert({
      slug: `sample-tours-${RUN}`,
      name: `Sample Tours Ship ${RUN}`,
      type: "motor",
      visibility: "private",
      operator_org_id: ORG.operatorA,
      is_sample: true,
    })
    .select("id")
    .single();
  if (error) throw error;
  const { data: s } = await db
    .from("schedules")
    .insert({
      vessel_id: v.id,
      code: SCHEDULE,
      origin: "Luxor",
      destination: "Aswan",
      nights: 4,
      sailing_days: [1, 2, 3, 4, 5, 6, 7],
    })
    .select("id")
    .single();
  await db
    .from("departures")
    .insert([10, 17].map((d) => ({ schedule_id: s!.id, vessel_id: v.id, departs_on: isoIn(d), returns_on: isoIn(d + 4) })));
  scheduleLabel = `Sample Tours Ship ${RUN}: Luxor → Aswan, 4 nights (${SCHEDULE})`;
});

test("an admin builds a tour, publishes it as information, then makes it bookable [DASH-ADM-058-069, 073]", async ({ page }) => {
  await signInAdmin(page, ADMIN);
  await page.goto("/dashboard/admin/tours/suppliers/");
  const add = page.locator("form", { has: page.getByRole("button", { name: "Add supplier" }) });
  await add.getByLabel("Company").fill(SUPPLIER);
  await add.getByLabel("Email").fill("ops@sample-supplier.test");
  await add.getByRole("button", { name: "Add supplier" }).click();
  await expect(page.getByRole("heading", { name: SUPPLIER })).toBeVisible();

  await page.goto("/dashboard/admin/tours/");
  const create = page.locator("form", { has: page.getByRole("button", { name: "Create tour" }) });
  await create.getByLabel("Name").fill(TOUR);
  await create.getByLabel("Kind").selectOption("excursion");
  await create.getByLabel("Location").fill("Aswan");
  await create.getByLabel("Duration: hours").fill("4");
  await create.getByRole("button", { name: "Create tour" }).click();
  await expect(page.getByRole("heading", { level: 1, name: TOUR })).toBeVisible();
  tourId = page.url().match(/tours\/([0-9a-f-]{36})\//)![1]!;
  await adminDb().from("tours").update({ is_sample: true }).eq("id", tourId);

  // Publishing needs an English description.
  await page.getByRole("combobox", { name: /^Visibility/ }).selectOption("published");
  await page.getByRole("button", { name: "Save visibility" }).click();
  await expect(page.getByText("Add an English description before publishing.")).toBeVisible();

  const en = page.locator("form", { has: page.getByRole("button", { name: "Save English texts" }) });
  await en.getByLabel("Description").fill("A sample excursion used by the tests.");
  await en.getByLabel("Itinerary").fill("Meet at the hotel\nVisit the site\nReturn");
  await en.getByLabel("Included", { exact: true }).fill("Guide\nEntry tickets");
  await en.getByLabel("Not included").fill("Tips");
  await en.getByLabel("Meeting point or pickup").fill("Hotel lobby, 15 minutes before the start.");
  await en.getByRole("button", { name: "Save English texts" }).click();
  await expect(page.getByText("English texts saved.")).toBeVisible();

  await page.getByRole("combobox", { name: /^Visibility/ }).selectOption("published");
  await page.getByRole("button", { name: "Save visibility" }).click();
  await expect(page.getByText("Published.", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Published: information only")).toBeVisible();
  await expect(
    page.getByText(/To become bookable it needs: a supplier, cancellation bands, a future session with a price\./),
  ).toBeVisible();

  const bands = page.locator("form", { has: page.getByRole("button", { name: "Save bands" }) });
  await bands.getByLabel("Band 1: days before").fill("2");
  await bands.getByLabel("% charged").first().fill("80");
  await bands.getByLabel("Band 2: days before").fill("7");
  await bands.getByLabel("% charged").nth(1).fill("10");
  await bands.getByRole("button", { name: "Save bands" }).click();
  await expect(page.getByText("Add a band from 0 days, so a late cancellation is covered too.")).toBeVisible();
  await bands.getByLabel("Band 3: days before").fill("0");
  await bands.getByLabel("% charged").nth(2).fill("100");
  await bands.getByRole("button", { name: "Save bands" }).click();
  await expect(page.getByText("Cancellation bands saved.")).toBeVisible();

  const details = page.locator("form", { has: page.getByRole("button", { name: "Save details" }) });
  await details.getByLabel("Supplier").selectOption({ label: SUPPLIER });
  await details.getByRole("button", { name: "Save details" }).click();
  await expect(page.getByText("Tour details saved.")).toBeVisible();

  const schedules = page.locator("form", { has: page.getByRole("button", { name: "Save schedules" }) });
  await schedules.getByLabel(scheduleLabel).check();
  await schedules.getByRole("button", { name: "Save schedules" }).click();
  await expect(page.getByText("Offered with 1 cruise schedule.")).toBeVisible();

  const photo = page.locator("form", { has: page.getByRole("button", { name: "Upload photo" }) });
  await photo.getByLabel(/^Photo/).setInputFiles({ name: "sample.png", mimeType: "image/png", buffer: png() });
  await photo.getByLabel("Description for screen readers (English)").fill("Grey test card");
  await photo.getByLabel("Credit").fill("Sample fixture");
  await photo.getByLabel("Nilecruz has the right to publish this photo").check();
  await photo.getByRole("button", { name: "Upload photo" }).click();
  await expect(page.getByText("Photo added.")).toBeVisible();

  // Sessions: shared per guest every day for three weeks, and a private group option on two weekdays.
  await page.getByRole("link", { name: /Sessions and prices/ }).click();
  const s = page.locator("form", { has: page.getByRole("button", { name: "Create sessions" }) });
  await s.getByLabel("From").fill(isoIn(9));
  await s.getByLabel("To").fill(isoIn(30));
  await s.getByLabel("Start times (Cairo)").fill("08:00");
  for (const d of ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]) await s.getByLabel(d).check();
  await s.getByLabel("Sold as").selectOption("shared:per_guest");
  await s.getByLabel("Capacity").fill("20");
  await s.getByLabel("Price").fill("45.50");
  await s.getByRole("button", { name: "Create sessions" }).click();
  await expect(page.getByText("22 sessions created.")).toBeVisible({ timeout: 30_000 }); // bulk insert, slow on a busy machine
  await s.getByRole("button", { name: "Create sessions" }).click();
  await expect(page.getByText("0 sessions created; 22 already existed and were left as they are.")).toBeVisible({
    timeout: 30_000,
  });
  await s.getByLabel("Sold as").selectOption("private:per_group");
  await s.getByLabel("Capacity").fill("6");
  await s.getByLabel("Price").fill("380");
  await s.getByRole("button", { name: "Create sessions" }).click();
  await expect(page.getByText("22 sessions created.")).toBeVisible({ timeout: 30_000 }); // bulk insert, slow on a busy machine
  await page.reload();
  await expect(page.getByRole("row", { name: /08:00 Cairo Private, per group 6 US\$380 On sale/ }).first()).toBeVisible();

  await page.goto(`/dashboard/admin/tours/${tourId}/`);
  await expect(page.getByText("Published: bookable")).toBeVisible();
});

test("a program linked to a schedule shows which departures have every tour [DASH-ADM-070, 071]", async ({ page }) => {
  await signInAdmin(page, ADMIN);
  await page.goto("/dashboard/admin/tours/");
  const create = page.locator("form", { has: page.getByRole("button", { name: "Create program" }) });
  await create.getByLabel("Program name").fill(PROGRAM);
  await create.getByLabel("Days").fill("3");
  await create.getByRole("button", { name: "Create program" }).click();
  await expect(page.getByRole("heading", { level: 1, name: PROGRAM })).toBeVisible();
  programId = page.url().match(/programs\/([0-9a-f-]{36})\//)![1]!;
  await adminDb().from("programs").update({ is_sample: true }).eq("id", programId);

  const item = page.locator("form", { has: page.getByRole("button", { name: "Add to the program" }) });
  await item.getByLabel("Day").selectOption("2");
  await item.getByLabel("Tour").selectOption({ label: TOUR });
  await item.getByRole("button", { name: "Add to the program" }).click();
  await expect(page.getByRole("link", { name: TOUR })).toBeVisible();

  const schedules = page.locator("form", { has: page.getByRole("button", { name: "Save schedules" }) });
  await schedules.getByLabel(scheduleLabel).check();
  await schedules.getByRole("button", { name: "Save schedules" }).click();
  await expect(page.getByText("Linked to 1 cruise schedule.")).toBeVisible();

  // Day 2 of the second departure loses its sessions: that departure can't take the program.
  const day2 = isoIn(18);
  await adminDb()
    .from("tour_sessions")
    .update({ status: "cancelled" })
    .eq("tour_id", tourId)
    .gte("starts_at", `${day2}T00:00:00Z`)
    .lte("starts_at", `${day2}T23:59:59Z`);
  await page.reload();
  await expect(page.getByText(/1 of 2 departures have every tour available for 1 guest\./)).toBeVisible();
  await expect(page.getByRole("cell", { name: new RegExp(`No ${TOUR} session on ${day2} \\(day 2\\)`) })).toBeVisible();

  // Its private session (6 places) comes back: enough for 1 guest, not for a party of 8.
  await adminDb().from("tour_sessions").update({ status: "scheduled" }).eq("tour_id", tourId).eq("kind", "private");
  await page.reload();
  await expect(page.getByText(/2 of 2 departures have every tour available for 1 guest\./)).toBeVisible();
  await page.getByLabel("Guests in the party").fill("8");
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText(/1 of 2 departures have every tour available for 8 guests\./)).toBeVisible();
});

test("content admins write texts but not prices; operators have no access [DATA-042, ADR-087]", async ({ page, browser }) => {
  await signInAdmin(page, CONTENT);
  await page.goto(`/dashboard/admin/tours/${tourId}/`);
  await expect(page.getByRole("button", { name: "Save Spanish texts" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Save bands" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Save details" })).toHaveCount(0);
  const es = page.locator("form", { has: page.getByRole("button", { name: "Save Spanish texts" }) });
  await es.getByLabel("Description").fill("Una excursión de prueba.");
  await es.getByRole("button", { name: "Save Spanish texts" }).click();
  await expect(page.getByText(/Spanish texts saved/)).toBeVisible();
  await page.goto(`/dashboard/admin/tours/${tourId}/sessions/`);
  await expect(page.getByRole("button", { name: "Create sessions" })).toHaveCount(0);

  const ctx = await browser.newContext();
  const operator = await ctx.newPage();
  await signIn(operator, "owner@operator-a.test");
  const res = await operator.goto("/dashboard/admin/tours/");
  expect(res?.status()).toBe(403);
  await ctx.close();
});

test.describe("tour screens are accessible", () => {
  for (const theme of ["light", "dark"] as const) {
    test(`tours, tour, sessions, suppliers, program (${theme})`, async ({ page }) => {
      await setTheme(page, theme);
      await signInAdmin(page, ADMIN);
      for (const path of [
        "/dashboard/admin/tours/",
        `/dashboard/admin/tours/${tourId}/`,
        `/dashboard/admin/tours/${tourId}/sessions/`,
        "/dashboard/admin/tours/suppliers/",
        `/dashboard/admin/tours/programs/${programId}/`,
      ]) {
        await page.goto(path);
        await expectNoSeriousA11yIssues(page);
      }
    });
  }
});
