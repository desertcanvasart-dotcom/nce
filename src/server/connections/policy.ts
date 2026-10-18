import "server-only";
import { readFileSync } from "node:fs";
import { env } from "@/lib/env";
import type { FetchPolicy } from "@/lib/connections/safe-fetch";

/**
 * The end-to-end tests pull a feed from a local test server. Its origin is allowed only when this app runs against
 * a local database (the Docker stack used by tests), so setting the variable on staging or production does nothing.
 */
function usesLocalDatabase(): boolean {
  try {
    const host = new URL(env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname;
    return host === "127.0.0.1" || host === "localhost";
  } catch {
    return false;
  }
}

export function fetchPolicy(): FetchPolicy {
  const origins = process.env.NILECRUZ_FEED_TEST_ORIGINS;
  if (!origins || !usesLocalDatabase()) return {};
  const caPath = process.env.NILECRUZ_FEED_TEST_CA;
  return {
    testOrigins: origins.split(",").map((o) => o.trim()).filter(Boolean),
    ca: caPath ? readFileSync(caPath, "utf8") : undefined,
  };
}

export const FEED_LIMITS = { timeoutMs: 20_000 } as const;
