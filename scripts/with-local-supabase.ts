/**
 * Runs a command against the LOCAL Supabase stack (Docker), never staging:
 *   pnpm with-local-db pnpm build && pnpm with-local-db pnpm test:e2e
 * Next.js inlines NEXT_PUBLIC_* at build time, and .env.local points at staging, so end-to-end
 * builds must take their database settings from here. Variables set here override .env files.
 */
import { execFileSync, spawnSync } from "node:child_process";

const [cmd, ...args] = process.argv.slice(2);
if (!cmd) {
  console.error("Usage: pnpm with-local-db <command> [args…]");
  process.exit(2);
}

let status: Record<string, string>;
try {
  status = JSON.parse(
    execFileSync("supabase", ["status", "-o", "json"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }),
  );
} catch {
  console.error("Local Supabase is not running. Start it with `supabase start`.");
  process.exit(1);
}

const port = process.env.E2E_PORT ?? "3100";
const env = {
  ...process.env,
  NEXT_PUBLIC_SUPABASE_URL: status.API_URL!,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: status.PUBLISHABLE_KEY ?? status.ANON_KEY!,
  SUPABASE_SECRET_KEY: status.SECRET_KEY ?? status.SERVICE_ROLE_KEY!,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ?? `http://localhost:${port}`,
  MAILPIT_URL: status.MAILPIT_URL ?? status.INBUCKET_URL ?? "",
  E2E_LOCAL_DB: "1",
};
const r = spawnSync(cmd, args, { stdio: "inherit", env });
process.exit(r.status ?? 1);
