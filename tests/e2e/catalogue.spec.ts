import { PNG } from "pngjs";
import { expect, test, type Page } from "@playwright/test";
import { adminDb, LOCAL, newUser, ORG, signIn, signInAdmin } from "../support/local-auth";
import { expectNoSeriousA11yIssues, setTheme } from "./helpers";

test.skip(!LOCAL, "needs the local Supabase stack: pnpm with-local-db pnpm test:e2e");
// One admin account across the file: run in order (two-step codes are single-use; sessions would collide).
test.describe.configure({ mode: "serial", timeout: 90_000 });

// One super admin of its own, so these tests never share a session with dashboard.spec (ADR-068).
const EDITOR = "editor@nilecruz.test";
const VESSEL = "00000000-0000-4000-8000-000000000003"; // Sample Steamer One (private draft of operator A)
// CI runs the suite twice on one database: everything a test creates carries this run's stamp.
const RUN = Date.now();

function png(): Buffer {
  const img = new PNG({ width: 64, height: 40 });
  img.data.fill(180);
  return PNG.sync.write(img);
}

async function fillScores(page: Page, value: string) {
  for (const input of await page.locator('input[name^="s_"]').all()) await input.fill(value);
}

test.describe("admin catalogue (DASH-ADM-010–034)", () => {
  test.describe.configure({ mode: "serial" });

  test("search and filters find vessels and mark incomplete ones", async ({ page }) => {
    await signInAdmin(page, EDITOR);
    await page.goto("/dashboard/admin/catalogue/?q=steamer");
    await expect(page.getByRole("link", { name: "Sample Steamer One" })).toBeVisible();
    await expect(page.getByRole("row", { name: /Sample Steamer One/ }).getByText("Incomplete")).toBeVisible();
    await page.goto("/dashboard/admin/catalogue/?visibility=published");
    await expect(page.getByRole("link", { name: "Sample Dahabiya One" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Sample Steamer One" })).toHaveCount(0);
  });

  test("edit details, descriptions and a photo; readiness updates", async ({ page }) => {
    await signInAdmin(page, EDITOR);
    await page.goto(`/dashboard/admin/catalogue/${VESSEL}/`);
    const details = page.locator("form", { has: page.getByRole("button", { name: "Save details" }) });
    await details.getByLabel("Category").selectOption("deluxe");
    await details.getByLabel("Route").fill("Luxor–Aswan");
    await details.getByLabel("Families").check();
    await details.getByRole("button", { name: "Save details" }).click();
    await expect(page.getByText("Details saved.")).toBeVisible();

    const desc = page.locator("form", { has: page.getByRole("button", { name: "Save descriptions" }) });
    await desc.getByLabel("English").fill("A sample description for the end-to-end test.");
    await desc.getByRole("button", { name: "Save descriptions" }).click();
    await expect(page.getByText(/Descriptions saved/)).toBeVisible();

    const upload = page.locator("form", { has: page.getByRole("button", { name: "Upload photo" }) });
    await upload.getByLabel(/^Photo/).setInputFiles({ name: "sample.png", mimeType: "image/png", buffer: png() });
    await upload.getByLabel("Description for screen readers (English)").fill(`Grey test card ${RUN}`);
    await upload.getByLabel("Credit").fill("Sample test fixture");
    await upload.getByRole("button", { name: "Upload photo" }).click();
    await expect(upload.getByText(/Confirm Nilecruz may publish this photo/i)).toBeVisible();
    await upload.getByLabel("Nilecruz has the right to publish this photo").check();
    await upload.getByLabel(/^Photo/).setInputFiles({ name: "sample.png", mimeType: "image/png", buffer: png() });
    await upload.getByRole("button", { name: "Upload photo" }).click();
    await expect(page.getByText("Photo added.")).toBeVisible();
    await expect(page.getByRole("img", { name: `Grey test card ${RUN}` })).toBeVisible();

    const ready = page.locator("#readiness").locator("..");
    await expect(ready.getByText("✓ At least one photo with a description and credit")).toBeVisible();
    await expect(ready.getByText("✗ Departures with rates and availability")).toBeVisible();
  });

  test("publishing is refused until ready; a showcase is dated and explained (DATA-021, DATA-024)", async ({ page }) => {
    await signInAdmin(page, EDITOR);
    await page.goto(`/dashboard/admin/catalogue/${VESSEL}/`);
    await page.getByRole("button", { name: "Publish" }).click();
    await expect(page.getByText("Not published: the readiness check is not complete.")).toBeVisible();
    const showcase = page.locator("form", { has: page.getByRole("button", { name: "Showcase while incomplete" }) });
    await showcase.getByLabel("Show until").fill("2027-06-30");
    await showcase.getByLabel("Reason").fill("Preview for the launch campaign");
    await showcase.getByRole("button", { name: "Showcase while incomplete" }).click();
    await expect(page.getByText(/Showcased until 2027-06-30/).first()).toBeVisible();
    // Anonymous visitors can now read it, flagged by its showcase state; it is never bookable (no rates exist).
    const { data } = await adminDb().from("vessels").select("visibility, showcase_reason").eq("id", VESSEL).single();
    expect(data).toEqual({ visibility: "showcase", showcase_reason: "Preview for the launch campaign" });
    await expect(page.getByText("Visibility now: Showcase")).toBeVisible();
    await page.getByRole("button", { name: "Make private" }).click();
    await expect(page.getByText("Visibility now: Private draft")).toBeVisible();
  });

  test("an evaluation is scored by the method and stays internal until published (ADR-070)", async ({ page }) => {
    await signInAdmin(page, EDITOR);
    await page.goto(`/dashboard/admin/catalogue/${VESSEL}/evaluations/new/`);
    await page.getByLabel("Assessment date").fill("2026-10-01");
    await page.getByLabel("Evaluator or team").fill(`Sample inspection team ${RUN}`);
    await page.getByLabel("Verdict").selectOption("recommended_with_reservations");
    await fillScores(page, "4");
    await expect(page.getByText("Overall: 80.00 / 100 (preview; saved by the database)")).toBeVisible();
    await page.locator('input[name="s_hygiene_0"]').fill("5");
    await expect(page.getByText("Hygiene: 12.75 of 15")).toBeVisible();
    await page.getByRole("button", { name: "Save evaluation" }).click();
    await expect(page.getByText("Evaluation saved.")).toBeVisible();
    const row = page.getByRole("row", { name: new RegExp(`Sample inspection team ${RUN}`) });
    await expect(row.getByText("80.75 / 100")).toBeVisible();
    await expect(row.getByText("No (internal)")).toBeVisible();
  });

  test("external ratings and safety observations are kept apart from the score", async ({ page }) => {
    await signInAdmin(page, EDITOR);
    await page.goto(`/dashboard/admin/catalogue/${VESSEL}/`);
    const rating = page.locator("form", { has: page.getByRole("button", { name: "Add external rating" }) });
    await rating.getByLabel("Source").fill(`Sample review site ${RUN}`);
    await rating.getByLabel("Rating").fill("4.5");
    await rating.getByLabel("Date read").fill("2026-10-10");
    await rating.getByRole("button", { name: "Add external rating" }).click();
    await expect(page.getByText(/never as our score/)).toBeVisible();
    await expect(page.getByText(new RegExp(`Sample review site ${RUN}: 4.5 / 5, read 2026-10-10`))).toBeVisible();

    const safety = page.locator("form", { has: page.getByRole("button", { name: "Record observation" }) });
    await safety.getByLabel("Date observed").fill("2026-10-05");
    await safety.getByLabel("Notes").fill(`Sample observation ${RUN}: life-jacket locker label faded.`);
    await safety.getByRole("button", { name: "Record observation" }).click();
    await expect(page.getByText("Safety observation recorded (internal only).")).toBeVisible();
  });

  test("CSV import previews every row, then creates private drafts and skips duplicates", async ({ page }) => {
    await signInAdmin(page, EDITOR);
    await page.goto("/dashboard/admin/catalogue/import/");
    await expect(page.getByText(/covers vessel profiles only/)).toBeVisible();
    const tpl = await page.request.get("/dashboard/admin/catalogue/import/template/");
    expect(tpl.headers()["content-type"]).toContain("text/csv");
    expect(await tpl.text()).toContain("source_ref,name,type,route,category");

    const stamp = Date.now();
    const csv = [
      "source_ref,name,type,route,category,cabin_count,max_guests,deck_count,year_built,description_en",
      `E2E-${stamp}-1,Sample Import Alpha ${stamp},sail,Esna–Aswan,luxury,6,12,2,2018,A sample row.`,
      `E2E-${stamp}-2,Sample Import Beta ${stamp},motor,,standard,40,80,4,,`,
      `seed:1,Already There,motor,,,,,,,`,
      `E2E-${stamp}-4,Broken Row,felucca,,,0,,,,`,
    ].join("\n");
    await page.getByLabel(/CSV file/).setInputFiles({ name: "vessels.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
    await page.getByRole("button", { name: "Check the file" }).click();
    await expect(
      page.getByText("2 ready to import · 1 already in the catalogue (skipped) · 1 with problems (skipped)"),
    ).toBeVisible();
    await expect(page.getByText(/Type must be sail, motor or steam/)).toBeVisible();
    await page.getByRole("button", { name: "Import 2 as private drafts" }).click();
    await expect(page.getByText(/2 private drafts created/)).toBeVisible();
    const { data } = await adminDb().from("vessels").select("visibility").like("source_ref", `E2E-${stamp}-%`);
    expect(data?.map((r) => r.visibility)).toEqual(["private", "private"]);
  });

  test("the activity history shows what changed", async ({ page }) => {
    await signInAdmin(page, EDITOR);
    await page.goto("/dashboard/admin/activity/?table=vessels");
    await expect(page.getByRole("cell", { name: /Changed vessel/ }).first()).toBeVisible();
    await page.goto("/dashboard/admin/");
    await expect(page.getByRole("link", { name: /Private vessel drafts/ })).toBeVisible();
  });
});

test.describe("operators: apply, approve, team, submit (DASH-ADM-035–044, DASH-OPR-006/007)", () => {
  test.describe.configure({ mode: "serial" });
  const stamp = Date.now();
  let applicant: { id: string; email: string; password: string };
  let colleague: { id: string; email: string; password: string };
  let orgId = "";

  test("a customer applies and sees the waiting page", async ({ page }) => {
    applicant = await newUser("applicant");
    await signIn(page, applicant.email, applicant.password);
    await page.goto("/account/apply-operator/");
    await page.getByLabel("Company name (as travellers know it)").fill(`Sample Applicant ${stamp}`);
    await page.getByLabel("Country of registration").fill("Egypt");
    await page.getByRole("button", { name: "Send application" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(`Sample Applicant ${stamp} is waiting for approval`);
    orgId = new URL(page.url()).pathname.split("/")[3]!;
  });

  test("an admin approves the application", async ({ page }) => {
    await signInAdmin(page, EDITOR);
    await page.goto("/dashboard/admin/operators/?status=applied");
    await page.getByRole("link", { name: `Sample Applicant ${stamp}` }).click();
    await page.getByLabel("Decision").selectOption("approved");
    await page.getByRole("button", { name: "Save decision" }).click();
    await expect(page.getByText(/Approved: the operator can now work/)).toBeVisible();
  });

  test("the owner invites a colleague, who accepts", async ({ page, browser }) => {
    colleague = await newUser("colleague");
    await signIn(page, applicant.email, applicant.password);
    await page.goto(`/dashboard/operator/${orgId}/team/`);
    await page.getByLabel("Email").fill(colleague.email);
    await page.getByLabel("Role").selectOption("reservations");
    await page.getByRole("button", { name: "Send invitation" }).click();
    await expect(page.getByText(/already has a Nilecruz account and will see it when they sign in/)).toBeVisible();

    const ctx = await browser.newContext();
    const p2 = await ctx.newPage();
    await signIn(p2, colleague.email, colleague.password);
    await p2.getByRole("button", { name: `Join Sample Applicant ${stamp}` }).click();
    await expect(p2).toHaveURL(new RegExp(`/dashboard/operator/${orgId}/$`));
    await ctx.close();
  });

  test("the operator proposes a vessel, gets feedback, resubmits, and it is approved", async ({ page, browser }) => {
    await signIn(page, applicant.email, applicant.password);
    await page.goto(`/dashboard/operator/${orgId}/cruises/`);
    await page.getByRole("button", { name: "Propose a new vessel" }).click();
    await page.getByLabel("Name").fill(`Sample Proposed ${stamp}`);
    await page.getByLabel("Type").selectOption("sail");
    await page.getByLabel("Cabins").fill("8");
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page.getByText(/Draft saved/)).toBeVisible();
    await page.getByRole("button", { name: "Submit for review" }).click();
    await expect(page.getByText("Under review. It is locked until Nilecruz decides.")).toBeVisible();
    const subUrl = page.url();

    const adminCtx = await browser.newContext();
    const admin = await adminCtx.newPage();
    await signInAdmin(admin, EDITOR);
    await admin.goto("/dashboard/admin/submissions/?status=submitted");
    await admin.getByRole("link", { name: `New: Sample Proposed ${stamp}` }).click();
    await admin.getByLabel("What should the operator change?").fill("Please add the deck count.");
    await admin.getByRole("button", { name: "Request changes" }).click();
    await expect(admin.getByText("Changes requested: “Please add the deck count.”")).toBeVisible();

    await page.goto(subUrl);
    await expect(page.getByText("Nilecruz: “Please add the deck count.”")).toBeVisible();
    await page.getByLabel("Decks").fill("2");
    await page.getByRole("button", { name: "Save draft" }).click();
    await page.getByRole("button", { name: "Resubmit for review" }).click();
    await expect(page.getByText("Under review. It is locked until Nilecruz decides.")).toBeVisible();

    await admin.reload();
    await admin.getByRole("button", { name: "Approve" }).click();
    await expect(admin).toHaveURL(/\/dashboard\/admin\/catalogue\/[0-9a-f-]{36}\/$/);
    await expect(admin.getByRole("heading", { level: 1 })).toHaveText(`Sample Proposed ${stamp}`);
    await adminCtx.close();
  });

  test("a company awaiting approval can't reach cruises", async ({ page }) => {
    await signIn(page, "owner@operator-b.test");
    const res = await page.goto(`/dashboard/operator/${ORG.operatorB}/cruises/`);
    expect(res?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("waiting for approval");
  });
});

test.describe("4b screens are accessible", () => {
  test.describe.configure({ mode: "serial" });
  for (const theme of ["light", "dark"] as const) {
    test(`catalogue, editor, evaluation, import, operators, submissions (${theme})`, async ({ page }) => {
      await setTheme(page, theme);
      await signInAdmin(page, EDITOR);
      for (const path of [
        "/dashboard/admin/",
        "/dashboard/admin/catalogue/",
        `/dashboard/admin/catalogue/${VESSEL}/`,
        `/dashboard/admin/catalogue/${VESSEL}/evaluations/new/`,
        "/dashboard/admin/catalogue/import/",
        "/dashboard/admin/operators/",
        `/dashboard/admin/operators/${ORG.operatorA}/`,
        "/dashboard/admin/submissions/",
        "/dashboard/admin/activity/",
      ]) {
        await page.goto(path);
        await expectNoSeriousA11yIssues(page);
      }
    });
  }
  test("operator team, cruises and the application form", async ({ page }) => {
    await signIn(page, "owner@operator-a.test");
    for (const path of [`/dashboard/operator/${ORG.operatorA}/team/`, `/dashboard/operator/${ORG.operatorA}/cruises/`]) {
      await page.goto(path);
      await expectNoSeriousA11yIssues(page);
    }
    const u = await newUser("a11y");
    await page.getByRole("button", { name: "Sign out" }).click();
    await signIn(page, u.email, u.password);
    await page.goto("/account/apply-operator/");
    await expectNoSeriousA11yIssues(page);
  });
});
