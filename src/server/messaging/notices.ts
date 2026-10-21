import "server-only";
import { siteUrl } from "@/lib/env";
import { emailedElsewhere, noticeEmail, OPTIONAL_KINDS, rolesFor } from "@/lib/notices/email";
import { getAdminDb } from "@/server/db/admin";
import { serverEnv } from "@/server/env";
import { emailsFor } from "@/server/teams/people";
import { recordSkipped, sendEmail } from "./send";

/**
 * PROPOSED-005, DASH-BND-007 (ADR-101): the emails behind dashboard notices. Called from the scheduler's tick (every
 * minute while something waits). Each notice goes to its person, or to its company's team by role, or for Nilecruz to
 * ADMIN_ALERT_EMAIL. Without a sender the notice is marked "skipped" and admins see a banner; a failed send is tried
 * again, up to 3 times within a day.
 */
type Row = { id: string; kind: string; title: string; link: string | null; user_id: string | null; org_id: string | null };

export async function sendPendingNotices(limit = 100): Promise<{ sent: number; skipped: number; failed: number }> {
  const db = getAdminDb();
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const { data, error } = await db
    .from("notifications")
    .select("id, kind, title, link, user_id, org_id")
    .or(`email_status.eq.pending,and(email_status.eq.failed,email_attempts.lt.3,created_at.gt.${since})`)
    .order("created_at")
    .limit(limit);
  if (error) throw error;
  const tally = { sent: 0, skipped: 0, failed: 0 };
  const orgs = new Map<string, string>();
  for (const n of (data ?? []) as Row[]) {
    const outcome = await sendOne(n, orgs);
    await db.rpc("service_mark_notice_email", { notice: n.id, outcome });
    if (outcome === "sent") tally.sent++;
    else if (outcome === "failed") tally.failed++;
    else tally.skipped++;
  }
  return tally;
}

async function sendOne(n: Row, orgKinds: Map<string, string>): Promise<"sent" | "skipped" | "failed" | "none"> {
  const db = getAdminDb();
  const meta = { kind: `notice.${n.kind}`, orgId: n.org_id };
  if (n.user_id) {
    const [{ data: profile }, emails] = await Promise.all([
      db.from("profiles").select("optional_emails").eq("id", n.user_id).maybeSingle(),
      emailsFor([n.user_id]),
    ]);
    const to = emails.get(n.user_id);
    if (!to) return "none";
    if (OPTIONAL_KINDS.has(n.kind) && profile?.optional_emails === false) return "skipped";
    return combine([await deliver(to, n, "person", meta)]);
  }
  if (!n.org_id) return "none";
  let kind = orgKinds.get(n.org_id);
  if (!kind) {
    const { data: org } = await db.from("organisations").select("kind").eq("id", n.org_id).single();
    kind = org?.kind ?? "";
    orgKinds.set(n.org_id, kind);
  }
  if (emailedElsewhere(n.kind, kind)) return "none";
  if (kind === "nilecruz") {
    const to = serverEnv.ADMIN_ALERT_EMAIL;
    if (!to) {
      await recordSkipped("email", "(no alert address)", n.title, "", "ADMIN_ALERT_EMAIL is not set", meta);
      return "skipped";
    }
    return combine([await deliver(to, n, "admin", meta)]);
  }
  const { data: team } = await db.from("memberships").select("user_id, team_role").eq("org_id", n.org_id);
  const roles = kind === "tour_office" ? ["owner", "reservations", "finance", "viewer"] : rolesFor(n.kind);
  const emails = await emailsFor((team ?? []).filter((m) => roles.includes(m.team_role)).map((m) => m.user_id));
  if (!emails.size) return "none";
  const results: ("sent" | "skipped" | "failed")[] = [];
  for (const to of emails.values()) results.push(await deliver(to, n, "company", meta));
  return combine(results);
}

async function deliver(
  to: string,
  n: Row,
  audience: "person" | "company" | "admin",
  meta: { kind: string; orgId: string | null },
) {
  return sendEmail(to, noticeEmail(n, siteUrl, audience), meta);
}

/** Sent if any went; failed (to retry) if any failed and none went; skipped when there's no sender. */
const combine = (r: ("sent" | "skipped" | "failed")[]) =>
  r.includes("sent") ? "sent" : r.includes("failed") ? "failed" : "skipped";
