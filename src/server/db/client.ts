import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { sessionCookieOptions } from "@/lib/auth/cookies";
import { env } from "@/lib/env";
import type { Database } from "./database.types";

export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super("Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
  }
}

/**
 * Request-scoped client: acts as the signed-in visitor (or anonymously), so row-level security applies (SEC-001).
 * Use this for everything a visitor or dashboard user reads or changes.
 */
export async function getDb() {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new DatabaseNotConfiguredError();
  const store = await cookies();
  return createServerClient<Database>(url, key, {
    cookieOptions: sessionCookieOptions(),
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // Server components cannot set cookies; the proxy refreshes the session instead (Batch 4a).
        }
      },
    },
  });
}
