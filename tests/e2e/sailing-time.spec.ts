import { expect, test } from "@playwright/test";
import { LOCAL, newUser, ORG, signIn } from "../support/local-auth";
import { sampleReservations } from "../support/sailing";

test.skip(!LOCAL, "needs the local Supabase stack: pnpm with-local-db pnpm test:e2e");
test.describe.configure({ mode: "serial", timeout: 180_000 });

const RUN = Date.now();
const OWNER = "owner@operator-a.test";
let customer = { id: "", email: "", password: "" };
let S: Awaited<ReturnType<typeof sampleReservations>>;

test.beforeAll(async () => {
  customer = await newUser("sailing-time");
  S = await sampleReservations({
    run: `${RUN}st`,
    customer,
    ownerEmail: OWNER,
    bands: [{ from_days: 0, percent: 100 }],
    departsIn: 60,
    count: 1,
  });
});

test("the operator sets a morning sailing; the customer is told to arrive the day before [PROPOSED-019]", async ({
  page,
  browser,
}) => {
  const op = await (await browser.newContext()).newPage();
  await signIn(op, OWNER);
  await op.goto(`/dashboard/operator/${ORG.operatorA}/schedules/${S.vesselId}/${S.scheduleId}/`);
  await op.getByLabel("Sails on the first day").selectOption("morning");
  await op.getByLabel("Exact time (optional)").fill("13:00");
  await op.getByRole("button", { name: "Save schedule" }).click();
  await expect(op.getByText("13:00 is around noon; choose that, or correct the time.")).toBeVisible();
  await op.getByLabel("Exact time (optional)").fill("08:00");
  await op.getByRole("button", { name: "Save schedule" }).click();
  await expect(op.getByText(/Schedule saved/)).toBeVisible();

  await signIn(page, customer.email, customer.password);
  await page.goto(`/dashboard/journey/reservations/${S.ids[0]}/`);
  const sailing = page.locator("section", { has: page.getByRole("heading", { name: "Sailing" }) });
  await expect(sailing).toContainText(`Sails from ${S.origin} in the morning (08:00 Cairo time).`);
  await expect(sailing).toContainText(`Plan to arrive in ${S.origin} the day before`);
  await page.goto("/dashboard/journey/");
  await expect(page.locator("section", { has: page.getByRole("heading", { name: "Next trip" }) })).toContainText(
    "the day before",
  );
});
