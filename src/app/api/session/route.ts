import { cookies } from "next/headers";
import { DatabaseNotConfiguredError, getDb } from "@/server/db";

// Read per request so public pages can stay static and still show who is signed in (PERF-010, SEC-005).
export const dynamic = "force-dynamic";

/**
 * Whether this visitor is signed in, for the public header's client island (HeaderAccount). Only a yes or no:
 * the session cookies are httpOnly, so the page asks here instead of reading them. Never cached.
 */
export async function GET() {
  return Response.json({ signedIn: await signedIn() }, { headers: { "Cache-Control": "private, no-store" } });
}

async function signedIn(): Promise<boolean> {
  const store = await cookies();
  if (!store.getAll().some((c) => c.name.startsWith("sb-"))) return false; // anonymous: no network call
  try {
    // getUser() validates the token with Supabase Auth, so a forged or revoked cookie never counts.
    const { data, error } = await (await getDb()).auth.getUser();
    return !error && Boolean(data.user);
  } catch (e) {
    if (e instanceof DatabaseNotConfiguredError) return false;
    throw e;
  }
}
