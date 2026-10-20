import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ds/Badge/Badge";
import { ActionForm } from "@/components/dashboard/ActionForm";
import { Input, Section, Select, ui } from "@/components/dashboard/ui";
import { CairoTime } from "@/components/shell/CairoTime";
import { requireAdmin } from "@/server/auth";
import { getDb } from "@/server/db";
import { emailsFor } from "@/server/teams/people";
import { isUuid } from "../../../sections";
import { DEFAULT_CHILD_BANDS, type Band } from "@/lib/product/pricing";
import { saveOperatorBands } from "../../../_product/actions";
import { connectionsFor } from "@/server/connections/queries";
import { FEED_STATUS, HealthTable, RunsTable } from "../../../_connections/Tables";
import { connectVessel, decideFeed, disconnectVessel, revokeOperatorKey, setOperatorStatus } from "../actions";
import { operatorContacts, orgBookingRequests, replySla, replyStats, REQUEST_STATUS } from "@/server/requests/queries";
import { setReplySla } from "../../../_requests/actions";
import { Contacts, ReplyStats } from "../../../_requests/Bits";

const STATUS_LABEL = {
  applied: "Awaiting approval",
  approved: "Approved",
  paused: "Paused",
  rejected: "Rejected",
  nilecruz: "",
} as const;
const ROLE = { owner: "Owner", reservations: "Reservations", finance: "Finance", viewer: "Viewer" } as const;

/** DASH-ADM-042–047: one operator: application details, decision, team, connected vessels, inventory connections. */
export default async function OperatorPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  if (!isUuid(orgId)) notFound();
  const session = await requireAdmin(["catalogue", "finance"], `/dashboard/admin/operators/${orgId}/`);
  const canEdit = session.adminRole === "super" || session.adminRole === "catalogue";
  const db = await getDb();
  const [{ data: org }, { data: members }, { data: vessels }, { data: free }] = await Promise.all([
    db.from("organisations").select("*").eq("id", orgId).eq("kind", "operator").maybeSingle(),
    db.from("memberships").select("user_id, team_role, created_at, profile:profiles(full_name)").eq("org_id", orgId),
    db.from("vessels").select("id, name, visibility").eq("operator_org_id", orgId).order("name"),
    db.from("vessels").select("id, name").is("operator_org_id", null).order("name").limit(1000),
  ]);
  if (!org) notFound();
  const [connections, contacts, stats, sla, booking] = await Promise.all([
    connectionsFor(orgId),
    operatorContacts(orgId),
    replyStats(orgId),
    replySla(orgId),
    orgBookingRequests(orgId),
  ]);
  const open = booking.filter((b) => b.status === "waiting" || b.status === "held");
  const { feed } = connections;
  const emails = await emailsFor((members ?? []).map((m) => m.user_id));
  const reg = (org.registration ?? {}) as Record<string, string>;

  return (
    <>
      <p>
        <Link href="/dashboard/admin/operators/">← Operators</Link>
      </p>
      <h1 className={ui.pageTitle}>{org.display_name}</h1>
      <p className={ui.actions}>
        <Badge tone={org.status === "approved" ? "success" : org.status === "applied" ? "accent" : "neutral"}>
          {STATUS_LABEL[org.status]}
        </Badge>
        {org.status_reason ? <span className={ui.muted}>{org.status_reason}</span> : null}
      </p>

      <Section title="Application" id="application">
        <dl className={ui.grid}>
          <div>
            <dt className={ui.label}>Legal name</dt>
            <dd>{org.legal_name ?? "—"}</dd>
          </div>
          {Object.entries(reg).map(([k, v]) => (
            <div key={k}>
              <dt className={ui.label}>{k.replace(/_/g, " ")}</dt>
              <dd>{v || "—"}</dd>
            </div>
          ))}
          <div>
            <dt className={ui.label}>Applied</dt>
            <dd>
              <CairoTime value={org.created_at} />
            </dd>
          </div>
        </dl>
        {canEdit ? (
          <ActionForm action={setOperatorStatus.bind(null, orgId)} submit="Save decision">
            <div className={ui.grid}>
              <Select
                label="Decision"
                name="status"
                required
                placeholder="Choose"
                options={[
                  { value: "approved", label: "Approve marketplace access" },
                  { value: "paused", label: "Pause access" },
                  { value: "rejected", label: "Reject" },
                ]}
              />
              <Input label="Reason (shown to the operator)" name="reason" maxLength={500} hint="Required to pause or reject." />
            </div>
          </ActionForm>
        ) : null}
      </Section>

      <Section title="Team" id="team">
        <ul className={ui.list}>
          {(members ?? []).map((m) => (
            <li key={m.user_id}>
              {m.profile?.full_name ?? "Unnamed"} · {emails.get(m.user_id) ?? "email unavailable"} · {ROLE[m.team_role]}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Child pricing" id="child-bands">
        <p className={ui.muted}>
          Share of the adult per-person rate by age on the departure date.{" "}
          {org.child_bands ? "This operator has its own bands." : "This operator uses the default bands."} Changes apply to rates
          created from now on.
        </p>
        {canEdit ? (
          <ActionForm action={saveOperatorBands.bind(null, orgId)} submit="Save bands" variant="outline">
            {((org.child_bands as Band[] | null) ?? DEFAULT_CHILD_BANDS)
              .concat(Array(2).fill(null))
              .slice(0, 6)
              .map((b: Band | null, i: number) => (
                <div key={i} className={ui.grid}>
                  <Input label={`Band ${i + 1}: from age`} name={`from_${i}`} inputMode="decimal" defaultValue={b?.from} />
                  <Input
                    label="up to (not including)"
                    name={`to_${i}`}
                    inputMode="decimal"
                    defaultValue={b?.to ?? undefined}
                    hint={b && b.to === null ? "Empty: no upper age" : undefined}
                  />
                  <Input label="% of adult rate" name={`percent_${i}`} inputMode="numeric" defaultValue={b?.percent} />
                </div>
              ))}
          </ActionForm>
        ) : null}
        {canEdit && org.child_bands ? (
          <ActionForm action={saveOperatorBands.bind(null, orgId)} submit="Use the default bands again" variant="ghost">
            <input type="hidden" name="reset" value="yes" />
          </ActionForm>
        ) : null}
      </Section>

      <Section title="Connected vessels" id="vessels">
        {(vessels ?? []).length ? (
          <ul className={ui.list}>
            {(vessels ?? []).map((v) => (
              <li key={v.id}>
                <Link href={`/dashboard/admin/catalogue/${v.id}/`}>{v.name}</Link>{" "}
                <span className={ui.muted}>({v.visibility})</span>
                {canEdit ? (
                  <ActionForm action={disconnectVessel.bind(null, orgId, v.id)} submit="Disconnect" variant="ghost" />
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className={ui.muted}>No vessels connected.</p>
        )}
        {canEdit && org.status === "approved" ? (
          <ActionForm action={connectVessel.bind(null, orgId)} submit="Connect vessel" variant="outline">
            <Select
              label="Vessel without an operator"
              name="vessel_id"
              required
              placeholder="Choose a vessel"
              options={(free ?? []).map((v) => ({ value: v.id, label: v.name }))}
            />
          </ActionForm>
        ) : null}
      </Section>

      <Section title="Inventory connections" id="connections">
        <p className={ui.muted}>
          Manual entry is always available. Modes in use:{" "}
          {["Manual entry", feed?.status === "active" ? "feed" : null, connections.keys.some((k) => !k.revoked_at) ? "API" : null]
            .filter(Boolean)
            .join(", ")}
          .
        </p>
        <HealthTable health={connections.health} />
        <h3 className={ui.subTitle}>Feed</h3>
        {feed ? (
          <>
            <p className={ui.actions}>
              <Badge tone={FEED_STATUS[feed.status].tone}>{FEED_STATUS[feed.status].text}</Badge>
              {feed.status_reason ? <span className={ui.muted}>{feed.status_reason}</span> : null}
            </p>
            <p className={ui.wrap}>
              <span className={ui.label}>Address: </span>
              {feed.url}
            </p>
            {canEdit ? (
              <ActionForm action={decideFeed.bind(null, orgId)} submit="Save feed decision">
                <div className={ui.grid}>
                  <Select
                    label="Decision"
                    name="decision"
                    required
                    placeholder="Choose"
                    options={[
                      { value: "active", label: "Approve: pull every hour" },
                      { value: "paused", label: "Pause pulls" },
                      { value: "rejected", label: "Don’t approve" },
                    ]}
                  />
                  <Input
                    label="Reason (shown to the operator)"
                    name="reason"
                    maxLength={500}
                    hint="Required to pause or not approve."
                  />
                </div>
              </ActionForm>
            ) : null}
          </>
        ) : (
          <p className={ui.muted}>No feed.</p>
        )}
        <h3 className={ui.subTitle}>API keys</h3>
        {connections.keys.length ? (
          <ul className={ui.list}>
            {connections.keys.map((k) => (
              <li key={k.id}>
                {k.label} · <code>{k.key_id}</code> · {k.revoked_at ? "revoked" : "active"} · last used{" "}
                {k.last_used_at ? <CairoTime value={k.last_used_at} /> : "never"}
                {canEdit && !k.revoked_at ? (
                  <ActionForm action={revokeOperatorKey.bind(null, orgId, k.id)} submit={`Revoke ${k.label}`} variant="ghost" />
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className={ui.muted}>No API keys.</p>
        )}
        <h3 className={ui.subTitle}>Recent activity</h3>
        <RunsTable runs={connections.runs.slice(0, 10)} />
      </Section>

      <Section title={`Booking requests open (${open.length})`} id="requests">
        {open.length ? (
          <ul className={ui.list}>
            {open.map((b) => (
              <li key={b.id}>
                {b.reference} · {b.vessel?.name} · {b.departure?.departs_on} · asked <CairoTime value={b.created_at} />{" "}
                <Badge tone={REQUEST_STATUS[b.status]!.tone}>{REQUEST_STATUS[b.status]!.text}</Badge>
                {b.escalated_at ? (
                  <>
                    {" "}
                    <Badge tone="danger">Phone the operator</Badge>
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className={ui.muted}>None open.</p>
        )}
        {canEdit ? (
          <ActionForm action={setReplySla.bind(null, orgId)} submit="Save reply time" variant="outline">
            <Input
              label="Reply time (hours)"
              name="hours"
              type="number"
              min={1}
              max={72}
              defaultValue={sla}
              hint="A reminder goes to the operator then; Nilecruz is alerted at twice it."
            />
          </ActionForm>
        ) : null}
      </Section>
      <ReplyStats stats={stats} slaHours={sla} />
      <Contacts orgId={orgId} contacts={contacts} canEdit={canEdit} admin />
    </>
  );
}
