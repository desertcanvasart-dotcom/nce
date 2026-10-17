import { expect, test } from "@playwright/test";
import { totp } from "../support/totp";
import { adminDb, latestLink, LOCAL, newUser, PASSWORD, signIn } from "../support/local-auth";
import { expectNoSeriousA11yIssues, setTheme } from "./helpers";

test.skip(!LOCAL, "needs the local Supabase stack: pnpm with-local-db pnpm test:e2e");

test.describe("sign-up and email confirmation (SEC-005, SEC-014)", () => {
  test("a new customer signs up, confirms by email and lands in My journey", async ({ page }) => {
    const email = `signup.${Date.now()}@example.test`;
    const since = Date.now() - 1000;
    await page.goto("/account/sign-up/");
    await page.getByLabel("Your name").fill("Amira Test");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("Felucca-at-dawn-1");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText(/we have sent a link to confirm it/)).toBeVisible();

    const link = await latestLink(email, since);
    expect(link).toContain("/account/confirm/?token_hash=");
    await page.goto(link);
    // Opening the link alone changes nothing; the person presses Confirm.
    await page.getByRole("button", { name: "Confirm" }).click();
    await expect(page).toHaveURL(/\/dashboard\/journey\/$/);
    await expect(page.getByRole("heading", { level: 1, name: "My journey" })).toBeVisible();
  });

  test("a used link is refused and offers a new one", async ({ page }) => {
    const { email } = await newUser("reused");
    const since = Date.now() - 1000;
    await page.goto("/account/reset-password/");
    await page.getByLabel("Email").fill(email);
    await page.getByRole("button", { name: "Send the link" }).click();
    const link = await latestLink(email, since);
    await page.goto(link);
    await page.getByRole("button", { name: "Confirm" }).click();
    await expect(page).toHaveURL(/\/account\/reset-password\/new\/$/);
    await page.context().clearCookies();
    await page.goto(link);
    await page.getByRole("button", { name: "Confirm" }).click();
    await expect(page.getByText(/This link has expired or was already used/)).toBeVisible();
  });

  test("sign-up checks fields on the server and explains the rules", async ({ page }) => {
    await page.goto("/account/sign-up/");
    await page.getByLabel("Email").fill("not-an-email");
    await page.getByLabel("Password").fill("short");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText("Tell us your name.")).toBeVisible();
    await expect(page.getByText("Enter an email address like name@example.com.")).toBeVisible();
    await expect(page.getByText("Use at least 10 characters.")).toBeVisible();
  });
});

test.describe("sign-in and sign-out (SEC-005)", () => {
  test("a wrong password gets one message that doesn't reveal whether the account exists", async ({ page }) => {
    await signIn(page, "customer@example.test", "wrong-password-1", undefined, { expectFailure: true });
    await expect(page.getByText(/That email and password don't match an account/)).toBeVisible();
    await signIn(page, "nobody@example.test", "wrong-password-1", undefined, { expectFailure: true });
    await expect(page.getByText(/That email and password don't match an account/)).toBeVisible();
  });

  test("session cookies are httpOnly and SameSite=Lax", async ({ page, context }) => {
    await signIn(page, "customer@example.test");
    await expect(page).toHaveURL(/\/dashboard\/journey\/$/);
    const auth = (await context.cookies()).filter((c) => c.name.startsWith("sb-"));
    expect(auth.length).toBeGreaterThan(0);
    for (const c of auth) {
      expect(c.httpOnly, c.name).toBe(true);
      expect(c.sameSite, c.name).toBe("Lax");
    }
  });

  test("sign-out ends the session on the server, so copied cookies stop working", async ({ page, context, browser }) => {
    await signIn(page, "customer@example.test");
    await expect(page).toHaveURL(/\/dashboard\/journey\/$/);
    const stolen = await context.cookies();
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/$/);
    await page.goto("/dashboard/");
    await expect(page).toHaveURL(/\/account\/sign-in\/\?next=/);

    const other = await browser.newContext();
    await other.addCookies(stolen);
    const p2 = await other.newPage();
    await p2.goto("/dashboard/journey/");
    await expect(p2).toHaveURL(/\/account\/sign-in\//);
    await other.close();
  });

  test("sign-out refuses a request from another site", async ({ request }) => {
    const res = await request.post("/account/sign-out/", { headers: { Origin: "https://evil.example" }, maxRedirects: 0 });
    expect(res.status()).toBe(403);
    const get = await request.get("/account/sign-out/", { maxRedirects: 0 });
    expect(get.status()).toBe(405);
  });

  test("a return link to another site is ignored after sign-in", async ({ page }) => {
    await signIn(page, "customer@example.test", PASSWORD, "/account/sign-in/?next=https%3A%2F%2Fevil.example%2F");
    await expect(page).toHaveURL(/localhost:\d+\/dashboard\/journey\/$/);
  });

  test("sign-in works without JavaScript", async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await signIn(page, "customer@example.test");
    await expect(page).toHaveURL(/\/dashboard\/journey\/$/);
    await ctx.close();
  });
});

test.describe("password reset and account security (SEC-014, DASH-CUS-013)", () => {
  test("a forgotten password is reset through a single-use link", async ({ page }) => {
    const user = await newUser("reset");
    const since = Date.now() - 1000;
    await page.goto("/account/reset-password/");
    await page.getByLabel("Email").fill(user.email);
    await page.getByRole("button", { name: "Send the link" }).click();
    await expect(page.getByText(/a link is on its way/)).toBeVisible();
    await page.goto(await latestLink(user.email, since));
    await page.getByRole("button", { name: "Confirm" }).click();
    await page.getByLabel("New password", { exact: true }).fill("Aswan-sunset-2028");
    await page.getByLabel("New password again").fill("Aswan-sunset-2028");
    await page.getByRole("button", { name: "Save the new password" }).click();
    await expect(page).toHaveURL(/\/dashboard\/journey\/$/);
    await page.getByRole("button", { name: "Sign out" }).click();
    await signIn(page, user.email, "Aswan-sunset-2028");
    await expect(page).toHaveURL(/\/dashboard\/journey\/$/);
  });

  test("an ordinary session can't set a password without the current one", async ({ page }) => {
    const user = await newUser("noreset");
    await signIn(page, user.email, user.password);
    await page.goto("/account/reset-password/new/");
    await page.getByLabel("New password", { exact: true }).fill("Edfu-temple-2029");
    await page.getByLabel("New password again").fill("Edfu-temple-2029");
    await page.getByRole("button", { name: "Save the new password" }).click();
    await expect(page.getByText(/open a new password link from your email first/)).toBeVisible();
  });

  test("changing the password needs the current one", async ({ page }) => {
    const user = await newUser("changepw");
    await signIn(page, user.email, user.password);
    await page.goto("/account/security/");
    const form = page.locator("form", { has: page.getByRole("button", { name: "Change password" }) });
    await form.getByLabel("Current password").fill("not-my-password-1");
    await form.getByLabel("New password", { exact: true }).fill("Kom-Ombo-2027x");
    await form.getByLabel("New password again").fill("Kom-Ombo-2027x");
    await form.getByRole("button", { name: "Change password" }).click();
    await expect(form.getByText("That isn't your current password.")).toBeVisible();
    await form.getByLabel("Current password").fill(user.password);
    await form.getByLabel("New password", { exact: true }).fill("Kom-Ombo-2027x");
    await form.getByLabel("New password again").fill("Kom-Ombo-2027x");
    await form.getByRole("button", { name: "Change password" }).click();
    await expect(page.getByText("Your password has been changed.")).toBeVisible();
  });

  test("changing email needs both addresses confirmed", async ({ page }) => {
    const user = await newUser("changemail");
    const next = `new.${user.email}`;
    await signIn(page, user.email, user.password);
    await page.goto("/account/security/");
    const since = Date.now() - 1000;
    const form = page.locator("form", { has: page.getByRole("button", { name: "Change email" }) });
    await form.getByLabel("New email").fill(next);
    await form.getByLabel("Current password").fill(user.password);
    await form.getByRole("button", { name: "Change email" }).click();
    await expect(page.getByText(/We have sent a link to your old and your new address/)).toBeVisible();
    await page.goto(await latestLink(user.email, since));
    await page.getByRole("button", { name: "Confirm" }).click();
    await expect(page.getByText(/One address is confirmed/)).toBeVisible();
    await page.goto(await latestLink(next, since));
    await page.getByRole("button", { name: "Confirm" }).click();
    await expect(page.getByText("Your email has been changed.")).toBeVisible();
    const { data } = await adminDb().auth.admin.getUserById(user.id);
    expect(data.user?.email).toBe(next);
  });

  test("a customer turns two-step sign-in on and is asked for a code next time", async ({ page }) => {
    const user = await newUser("twostep");
    await signIn(page, user.email, user.password);
    await page.goto("/account/security/");
    await page.getByRole("button", { name: "Set up two-step sign-in" }).click();
    await expect(page.getByRole("img", { name: "QR code for your authenticator app" })).toBeVisible();
    const secret = (await page.locator("text=Key:").locator("span").textContent())!.trim();
    await page.getByLabel("Six-digit code").fill(totp(secret));
    await page.getByRole("button", { name: "Turn on" }).click();
    await expect(page.getByText("Two-step sign-in is on.")).toBeVisible();

    await page.goto("/dashboard/journey/");
    await page.getByRole("button", { name: "Sign out" }).click();
    await signIn(page, user.email, user.password);
    await expect(page).toHaveURL(/\/account\/two-step\//);
    await page.getByLabel("Six-digit code").fill("000000");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByText(/That code didn't work/)).toBeVisible();
    await page.getByLabel("Six-digit code").fill(totp(secret));
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page).toHaveURL(/\/dashboard\/journey\/$/);
  });
});

test.describe("account pages in three languages (I18N)", () => {
  test("Spanish and Japanese pages are translated and not indexed", async ({ page }) => {
    await page.goto("/es/account/sign-in/");
    await expect(page.getByRole("heading", { level: 1, name: "Iniciar sesión" })).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await page.goto("/ja/account/sign-up/");
    await expect(page.getByRole("heading", { level: 1, name: "アカウントを作成" })).toBeVisible();
  });

  for (const theme of ["light", "dark"] as const) {
    test(`account pages have no serious accessibility issues (${theme})`, async ({ page }) => {
      await setTheme(page, theme);
      for (const path of ["/account/sign-in/", "/account/sign-up/", "/account/reset-password/", "/es/account/sign-in/"]) {
        await page.goto(path);
        await expectNoSeriousA11yIssues(page);
      }
      await signIn(page, "customer@example.test");
      await page.goto("/account/security/");
      await expectNoSeriousA11yIssues(page);
    });
  }
});
