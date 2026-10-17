/**
 * Give one person a role (ADR-066). Every change is written to the audit log by the database trigger.
 *   pnpm grant-role --email you@example.com --role super --target staging
 * Roles: super | catalogue | finance | content (admin sub-roles), or customer (removes admin).
 * Targets: local (Docker) or staging. Production is refused. Run only with Faris's approval per person.
 */
import { createClient } from "@supabase/supabase-js";
import { execFileSync } from "node:child_process";

const STAGING_REF = "fmidxxcadbuzxaxyohtk";
const arg = (n: string) => {
  const i = process.argv.indexOf(`--${n}`);
  return i > -1 ? process.argv[i + 1] : undefined;
};
const email = arg("email")?.trim().toLowerCase();
const role = arg("role");
const target = arg("target");
const ADMIN_ROLES = ["super", "catalogue", "finance", "content"] as const;

if (!email || !role || !target || ![...ADMIN_ROLES, "customer"].includes(role)) {
  console.error("Usage: pnpm grant-role --email <email> --role super|catalogue|finance|content|customer --target local|staging");
  process.exit(2);
}

let url: string;
let key: string;
if (target === "local") {
  const s = JSON.parse(execFileSync("supabase", ["status", "-o", "json"], { encoding: "utf8" })) as Record<string, string>;
  url = s.API_URL!;
  key = s.SECRET_KEY ?? s.SERVICE_ROLE_KEY!;
} else if (target === "staging") {
  url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  key = process.env.SUPABASE_SECRET_KEY ?? "";
  if (new URL(url).hostname !== `${STAGING_REF}.supabase.co`)
    throw new Error("Refusing: NEXT_PUBLIC_SUPABASE_URL is not the staging project.");
} else {
  throw new Error("--target must be local or staging. Production is never a target.");
}

const db = createClient(url, key, { auth: { persistSession: false } });

async function findUser(address: string) {
  for (let page = 1; page < 100; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === address);
    if (hit) return hit;
    if (data.users.length < 200) return null;
  }
  return null;
}

async function main() {
  const user = await findUser(email!);
  if (!user) {
    console.error(`No account for ${email} on ${target}. Sign up first, then run this again.`);
    process.exit(1);
  }
  const update =
    role === "customer" ? { platform_role: "customer", admin_role: null } : { platform_role: "admin", admin_role: role };
  const { error } = await db.from("profiles").update(update).eq("id", user.id);
  if (error) throw error;
  console.log(
    `${email} on ${target}: ${role === "customer" ? "customer (no admin role)" : `admin (${role})`}. Logged in the audit log.`,
  );
  if (role !== "customer") console.log("Next sign-in: the admin workspace asks them to set up two-step sign-in first.");
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
