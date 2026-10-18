import "server-only";
import { getAdminDb } from "@/server/db/admin";

/**
 * Account emails are not readable through the API (they live in Supabase Auth). These helpers use the
 * admin client and must only be called after the caller passed requireAdmin or requireOrgRole.
 */
export async function emailsFor(userIds: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (!userIds.length) return out;
  const db = getAdminDb();
  await Promise.all(
    [...new Set(userIds)].map(async (id) => {
      const { data } = await db.auth.admin.getUserById(id);
      if (data.user?.email) out.set(id, data.user.email);
    }),
  );
  return out;
}

export async function accountExists(email: string): Promise<boolean> {
  const db = getAdminDb();
  for (let page = 1; page < 50; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    if (data.users.some((u) => u.email?.toLowerCase() === email)) return true;
    if (data.users.length < 200) return false;
  }
  return false;
}

/** A new address gets Supabase Auth's (branded) invitation email; it sets a password on arrival (ADR-073). */
export async function sendAuthInvite(email: string, redirectTo: string): Promise<{ ok: boolean; rateLimited?: boolean }> {
  const db = getAdminDb();
  const { error } = await db.auth.admin.inviteUserByEmail(email, { redirectTo, data: { locale: "en" } });
  if (!error) return { ok: true };
  return { ok: false, rateLimited: error.code?.startsWith("over_") ?? false };
}
