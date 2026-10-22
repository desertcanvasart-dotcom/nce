import "server-only";
import { siteUrl } from "@/lib/env";
import {
  digestEmail,
  escalationEmail,
  reminderEmail,
  requestEmail,
  whatsappParams,
  type Links,
  type RequestSummary,
} from "@/lib/requests/message";
import { actionToken, ACTIONS } from "@/lib/requests/tokens";
import { getAdminDb } from "@/server/db/admin";
import { serverEnv } from "@/server/env";
import { recordSkipped, sendEmail, sendWhatsAppTemplate, whatsappOn } from "@/server/messaging/send";
import { emailsFor } from "@/server/teams/people";
import { sendPendingNotices } from "@/server/messaging/notices";

/**
 * ADR-099: sending booking requests to operators and chasing answers. Runs with the admin client: it acts for no
 * signed-in person (right after a customer asks, and from the scheduler's tick).
 */
const replyUrl = (token: string) => `${siteUrl}/operator-reply/${token}/`;

function links(requestId: string): { links: Links; tokens: string[] } | null {
  const secret = serverEnv.ACTION_LINK_SECRET;
  if (!secret) return null;
  const tokens = ACTIONS.map((a) => actionToken(secret, requestId, a));
  const [confirm, decline, hold, other] = tokens.map(replyUrl) as [string, string, string, string];
  return { links: { confirm, decline, hold, other }, tokens };
}

export async function requestSummary(
  requestId: string,
): Promise<(RequestSummary & { orgId: string; status: string; holdUntil: string | null }) | null> {
  const db = getAdminDb();
  const { data: r } = await db
    .from("booking_requests")
    .select(
      "id, reference, org_id, status, hold_until, cabins, guest_count, lead_nationality, shown, created_at, buyer_name, operator:organisations!booking_requests_org_id_fkey(display_name), vessel:vessels(name), departure:departures(departs_on, schedule:schedules(origin, destination, nights))",
    )
    .eq("id", requestId)
    .maybeSingle();
  if (!r || !r.departure?.schedule) return null;
  const cabinIds = [
    ...new Set([
      ...(r.cabins as { cabin_type_id: string }[]).map((c) => c.cabin_type_id),
      ...(r.shown as { cabin_type_id: string }[]).map((s) => s.cabin_type_id),
    ]),
  ];
  const { data: cabins } = await db.from("cabin_types").select("id, name").in("id", cabinIds);
  const name = new Map((cabins ?? []).map((c) => [c.id, c.name]));
  const counts = new Map<string, number>();
  for (const c of r.cabins as { cabin_type_id: string }[]) counts.set(c.cabin_type_id, (counts.get(c.cabin_type_id) ?? 0) + 1);
  // ADR-102: a guest who chose the vessel's own sightseeing; the operator sees it on every line.
  const withSightseeing = (r.cabins as { package?: string }[]).some((c) => c.package === "with_sightseeing");
  return {
    reference: r.reference,
    orgId: r.org_id,
    status: r.status,
    holdUntil: r.hold_until,
    operator: r.operator?.display_name ?? "Operator",
    vessel: r.vessel?.name ?? "Ship",
    origin: r.departure.schedule.origin,
    destination: r.departure.schedule.destination,
    departsOn: r.departure.departs_on,
    nights: r.departure.schedule.nights,
    lines: [...counts].map(([id, count]) => ({
      cabin: `${name.get(id) ?? "Cabin"}${withSightseeing ? ", with your sightseeing" : ""}`,
      count,
    })),
    guests: r.guest_count,
    nationality: r.lead_nationality,
    shown: (
      r.shown as { cabin_type_id: string; available: number | null; source: string | null; confirmed_at: string | null }[]
    ).map((s) => ({
      cabin: name.get(s.cabin_type_id) ?? "Cabin",
      available: s.available,
      source: s.source,
      confirmedAt: s.confirmed_at,
    })),
    createdAt: r.created_at,
    agency: r.buyer_name,
  };
}

/** The reservations contacts; without any, the company's owners and reservations staff by email. */
async function recipients(orgId: string): Promise<{ id: string | null; email: string | null; whatsapp: string | null }[]> {
  const db = getAdminDb();
  const { data: contacts } = await db
    .from("operator_contacts")
    .select("id, email, whatsapp, whatsapp_opt_in_at")
    .eq("org_id", orgId)
    .eq("reservations", true);
  if (contacts?.length)
    return contacts.map((c) => ({ id: c.id, email: c.email, whatsapp: c.whatsapp_opt_in_at ? c.whatsapp : null }));
  const { data: team } = await db
    .from("memberships")
    .select("user_id")
    .eq("org_id", orgId)
    .in("team_role", ["owner", "reservations"]);
  const emails = await emailsFor((team ?? []).map((m) => m.user_id));
  return [...emails.values()].map((email) => ({ id: null, email, whatsapp: null }));
}

async function slaHours(orgId: string) {
  const { data } = await getAdminDb().from("operator_settings").select("reply_sla_hours").eq("org_id", orgId).maybeSingle();
  return data?.reply_sla_hours ?? 6;
}

async function sendToOperator(requestId: string, kind: "booking_request.new" | "booking_request.reminder") {
  const s = await requestSummary(requestId);
  const signed = links(requestId);
  if (!s) return;
  const meta = { kind, orgId: s.orgId, requestId };
  const people = await recipients(s.orgId);
  if (!signed) {
    // No signing secret on this server: record why nothing went, once per person.
    for (const p of people)
      if (p.email)
        await recordSkipped("email", p.email, `Booking request ${s.reference}`, "", "ACTION_LINK_SECRET is not set", meta);
    return;
  }
  const hours = await slaHours(s.orgId);
  const mail = kind === "booking_request.new" ? requestEmail(s, signed.links, hours) : reminderEmail(s, signed.links, hours);
  for (const p of people) {
    if (p.email) await sendEmail(p.email, mail, meta);
    if (p.whatsapp && whatsappOn())
      await sendWhatsAppTemplate(
        p.whatsapp,
        kind === "booking_request.new" ? "nilecruz_booking_request" : "nilecruz_booking_reminder",
        whatsappParams(s),
        signed.tokens,
        mail.text,
        meta,
      );
  }
}

/** Right after a customer asks (and the dashboard notice the database already posted). */
export const notifyNewRequest = (requestId: string) => sendToOperator(requestId, "booking_request.new");

/**
 * The scheduler's tick (every 5 minutes while something is due; 09:00 Cairo for the digest): reminders at the reply
 * time, an alert to Nilecruz at twice it, and the daily digest.
 */
export async function runTick({ digest = false }: { digest?: boolean } = {}) {
  const db = getAdminDb();
  const { data: due, error } = await db.rpc("service_due_booking_requests");
  if (error) throw error;
  let reminded = 0;
  let escalated = 0;
  for (const d of due ?? []) {
    if (d.due === "remind") {
      await sendToOperator(d.request_id, "booking_request.reminder");
      reminded++;
    } else {
      const s = await requestSummary(d.request_id);
      if (s) {
        const hours = await slaHours(s.orgId);
        const mail = escalationEmail(s, hours, `${siteUrl}/dashboard/admin/operators/${s.orgId}/#requests`);
        if (serverEnv.ADMIN_ALERT_EMAIL)
          await sendEmail(serverEnv.ADMIN_ALERT_EMAIL, mail, {
            kind: "booking_request.escalation",
            orgId: s.orgId,
            requestId: d.request_id,
          });
        else
          await recordSkipped("email", "(no alert address)", mail.subject, mail.text, "ADMIN_ALERT_EMAIL is not set", {
            kind: "booking_request.escalation",
            orgId: s.orgId,
            requestId: d.request_id,
          });
        // The admin notice: on the Nilecruz company's notices, which admins read on the operator's page.
        const { data: nc } = await db.from("organisations").select("id").eq("kind", "nilecruz").limit(1).maybeSingle();
        if (nc)
          await db.from("notifications").insert({
            org_id: nc.id,
            kind: "booking_request.escalation",
            title: mail.subject.slice(0, 200),
            link: `/dashboard/admin/operators/${s.orgId}/`,
          });
      }
      escalated++;
    }
    await db.rpc("service_mark_booking_request", { req: d.request_id, what: d.due });
  }
  const digests = digest ? await sendDigests() : 0;
  // ADR-101: the emails behind dashboard notices go out on the same tick.
  const notices = await sendPendingNotices();
  return { reminded, escalated, digests, notices };
}

/** 09:00 Cairo, per operator with something open: waiting requests and holds ending today. */
export async function sendDigests(now = new Date()): Promise<number> {
  const db = getAdminDb();
  const today = now.toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" });
  const { data: open } = await db
    .from("booking_requests")
    .select(
      "id, org_id, reference, status, hold_until, operator:organisations!booking_requests_org_id_fkey(display_name), vessel:vessels(name), departure:departures(departs_on)",
    )
    .in("status", ["waiting", "held"]);
  const byOrg = new Map<string, NonNullable<typeof open>>();
  for (const r of open ?? []) byOrg.set(r.org_id, [...(byOrg.get(r.org_id) ?? []), r]);
  let sent = 0;
  for (const [orgId, rows] of byOrg) {
    const link = (id: string) => `${siteUrl}/dashboard/operator/${orgId}/requests/booking/${id}/`;
    const mail = digestEmail(
      rows[0]!.operator?.display_name ?? "Operator",
      rows
        .filter((r) => r.status === "waiting")
        .map((r) => ({
          reference: r.reference,
          vessel: r.vessel?.name ?? "",
          departsOn: r.departure?.departs_on ?? today,
          link: link(r.id),
        })),
      rows
        .filter(
          (r) =>
            r.status === "held" &&
            r.hold_until &&
            new Date(r.hold_until).toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" }) === today,
        )
        .map((r) => ({ reference: r.reference, vessel: r.vessel?.name ?? "", holdUntil: r.hold_until!, link: link(r.id) })),
    );
    if (!mail) continue;
    for (const p of await recipients(orgId))
      if (p.email) await sendEmail(p.email, mail, { kind: "booking_request.digest", orgId });
    sent++;
  }
  return sent;
}
