/**
 * Through the real API (PostgREST + Auth), as the app will call it: grants, RLS and sign-in together (SEC-001).
 * Needs the local stack: `supabase start`, then `pnpm test:db-api`. Uses only the seed's local-only users.
 */
import { createClient } from "@supabase/supabase-js";
import { execFileSync } from "node:child_process";
import { beforeAll, describe, expect, it } from "vitest";
import type { Database } from "@/server/db/database.types";

let url = "";
let anonKey = "";
const PASSWORD = "nilecruz-local-only";

beforeAll(() => {
  const status = JSON.parse(execFileSync("supabase", ["status", "-o", "json"], { encoding: "utf8" })) as Record<string, string>;
  url = status.API_URL!;
  anonKey = status.ANON_KEY!;
});

const client = () => createClient<Database>(url, anonKey, { auth: { persistSession: false } });
async function signedIn(email: string) {
  const c = client();
  const { error } = await c.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw error;
  return c;
}

describe("public API", () => {
  it("anonymous visitors see only showcase and published vessels", async () => {
    const { data, error } = await client().from("vessels").select("slug").order("slug");
    expect(error).toBeNull();
    expect(data?.map((v) => v.slug)).toEqual(["sample-motor-one", "sample-sail-one"]);
  });
  it("anonymous visitors cannot read private facts or organisations", async () => {
    expect((await client().from("vessel_private").select("*")).error?.code).toBe("42501");
    expect((await client().from("organisations").select("*")).error?.code).toBe("42501");
    expect((await client().from("audit_log").select("*")).error?.code).toBe("42501");
  });
});

describe("signed-in roles", () => {
  it("a new customer profile is created on sign-up data, and only it is visible", async () => {
    const c = await signedIn("customer@example.test");
    const { data } = await c.from("profiles").select("platform_role");
    expect(data).toEqual([{ platform_role: "customer" }]);
    expect((await c.from("audit_log").select("id")).data).toEqual([]);
  });
  it("an operator sees its own drafts but not another operator's", async () => {
    const c = await signedIn("owner@operator-a.test");
    const { data } = await c.from("vessels").select("slug").order("slug");
    expect(data?.map((v) => v.slug)).toEqual(["sample-motor-one", "sample-sail-one", "sample-steam-one"]);
  });
  it("an operator cannot publish", async () => {
    const c = await signedIn("owner@operator-a.test");
    const { error } = await c
      .from("vessels")
      .update({ visibility: "published", published_at: new Date().toISOString() })
      .eq("slug", "sample-steam-one");
    expect(error?.code).toBe("42501");
  });
  it("an admin sees every vessel and the audit trail", async () => {
    const c = await signedIn("admin@nilecruz.test");
    expect((await c.from("vessels").select("id")).data).toHaveLength(4);
    expect((await c.from("audit_log").select("id").limit(1)).data).toHaveLength(1);
  });
});
