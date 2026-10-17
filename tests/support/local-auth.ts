import { createClient } from "@supabase/supabase-js";
import { expect, type Page } from "@playwright/test";
import { totp } from "./totp";

/** End-to-end helpers against the LOCAL stack only (set by `pnpm with-local-db`). Never staging. */
export const LOCAL = process.env.E2E_LOCAL_DB === "1";
export const PASSWORD = "nilecruz-local-only";

export const ORG = {
  operatorA: "00000000-0000-4000-b000-00000000000a",
  operatorB: "00000000-0000-4000-b000-00000000000b",
  partner: "00000000-0000-4000-b000-0000000000c1",
};

export function adminDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  if (!/^http:\/\/(127\.0\.0\.1|localhost)/.test(url))
    throw new Error("Refusing: end-to-end tests run only against local Supabase.");
  return createClient(url, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });
}

/** A fresh, confirmed customer for tests that change account details. */
export async function newUser(prefix: string) {
  const email = `${prefix}.${Date.now()}.${Math.floor(Math.random() * 1e6)}@example.test`;
  const password = "Nile-river-2027";
  const { data, error } = await adminDb().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "E2E Traveller" },
  });
  if (error) throw error;
  return { id: data.user.id, email, password };
}

/** The newest email to an address in the local mail catcher (Mailpit), and the first Nilecruz link in it. */
export async function latestLink(to: string, after = 0): Promise<string> {
  const base = process.env.MAILPIT_URL!;
  for (let i = 0; i < 40; i++) {
    const res = await fetch(`${base}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`);
    const list = (await res.json()) as { messages: { ID: string; Created: string; To: { Address: string }[] }[] };
    // Mailpit's search matches substrings ("a@x" also finds "new.a@x"), so check the exact recipient.
    const msg = list.messages?.find(
      (m) => Date.parse(m.Created) >= after && m.To.some((t) => t.Address.toLowerCase() === to.toLowerCase()),
    );
    if (msg) {
      const full = (await (await fetch(`${base}/api/v1/message/${msg.ID}`)).json()) as { HTML: string };
      const href = /href="([^"]*token_hash=[^"]+)"/.exec(full.HTML)?.[1];
      if (href) return href.replace(/&amp;/g, "&");
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`No email with a link reached ${to}`);
}

/** Signs in and waits until the server has answered (left the sign-in page), unless a failure is expected. */
export async function signIn(
  page: Page,
  email: string,
  password = PASSWORD,
  path = "/account/sign-in/",
  { expectFailure = false } = {},
) {
  await page.goto(path);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  if (!expectFailure) await page.waitForURL((u) => !u.pathname.endsWith("/account/sign-in/"), { timeout: 15_000 });
}

/** Sign in as a seeded admin, including the two-step code (ADR-064). */
export async function signInAdmin(page: Page, email = "admin@nilecruz.test") {
  await signIn(page, email);
  await expect(page).toHaveURL(/\/account\/two-step\//);
  await page.getByLabel("Six-digit code").fill(totp());
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForURL((u) => !u.pathname.endsWith("/account/two-step/"), { timeout: 15_000 });
}
