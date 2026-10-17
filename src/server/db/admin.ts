import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { serverEnv } from "@/server/env";
import { DatabaseNotConfiguredError } from "./client";
import type { Database } from "./database.types";

/**
 * Admin client: uses the secret key and BYPASSES row-level security.
 * Only for trusted server jobs (imports, webhooks, scheduled tasks), never for work done on a visitor's behalf.
 * Every change it makes is still written to the audit log by the database triggers (SEC-010).
 */
export function getAdminDb() {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = serverEnv.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new DatabaseNotConfiguredError();
  return createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
