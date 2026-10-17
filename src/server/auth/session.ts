import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import type { Identity, Membership } from "@/lib/auth/workspaces";
import { getDb } from "@/server/db";

export type Session = Identity & {
  userId: string;
  email: string;
  fullName: string | null;
  locale: "en" | "es" | "ja";
  /** Assurance level of this session: aal2 after two-step sign-in. */
  aal: "aal1" | "aal2";
  /** aal2 when the person has a verified authenticator, so two-step is available. */
  nextAal: "aal1" | "aal2";
};

/**
 * The signed-in person for this request, or null (SEC-005). `getUser()` asks Supabase Auth to validate the
 * session token, so a forged or revoked cookie never counts.
 *
 * Cached per request AND per session cookie: when an action signs someone in, completes two-step or signs out,
 * the cookies change, so the page rendered after the action reads the new session, not the old one.
 */
export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const key = store
    .getAll()
    .filter((c) => c.name.startsWith("sb-"))
    .map((c) => `${c.name}=${c.value}`)
    .sort()
    .join(";");
  return sessionFor(key);
}

const sessionFor = cache(async (_cookieKey: string): Promise<Session | null> => {
  const db = await getDb();
  const { data: auth, error } = await db.auth.getUser();
  if (error || !auth.user) return null;
  const user = auth.user;

  const [{ data: profile }, { data: rows }, { data: level }] = await Promise.all([
    db.from("profiles").select("full_name, locale, platform_role, admin_role").eq("id", user.id).maybeSingle(),
    db.from("memberships").select("org_id, team_role, organisations(display_name, kind, status)").eq("user_id", user.id),
    db.auth.mfa.getAuthenticatorAssuranceLevel(),
  ]);
  if (!profile) return null;

  const memberships: Membership[] = (rows ?? []).flatMap((r) =>
    r.organisations
      ? [
          {
            orgId: r.org_id,
            orgName: r.organisations.display_name,
            kind: r.organisations.kind,
            status: r.organisations.status,
            teamRole: r.team_role,
          },
        ]
      : [],
  );

  return {
    userId: user.id,
    email: user.email ?? "",
    fullName: profile.full_name,
    locale: profile.locale === "es" || profile.locale === "ja" ? profile.locale : "en",
    platformRole: profile.platform_role,
    adminRole: profile.admin_role,
    memberships,
    aal: level?.currentLevel === "aal2" ? "aal2" : "aal1",
    nextAal: level?.nextLevel === "aal2" ? "aal2" : "aal1",
  };
});
