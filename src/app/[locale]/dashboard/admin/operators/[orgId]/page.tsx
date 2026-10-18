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
import { connectVessel, disconnectVessel, setOperatorStatus } from "../actions";

const STATUS_LABEL = {
  applied: "Awaiting approval",
  approved: "Approved",
  paused: "Paused",
  rejected: "Rejected",
  nilecruz: "",
} as const;
const ROLE = { owner: "Owner", reservations: "Reservations", finance: "Finance", viewer: "Viewer" } as const;

/** DASH-ADM-042–044: one operator: application details, decision, team, connected vessels. */
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
    </>
  );
}
