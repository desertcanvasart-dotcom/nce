import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/dashboard/ActionForm";
import { Badge } from "@/components/ds/Badge/Badge";
import { Input, Section, Select, ui } from "@/components/dashboard/ui";
import { CairoTime } from "@/components/shell/CairoTime";
import { requireAdmin } from "@/server/auth";
import { getDb } from "@/server/db";
import { isUuid } from "../../../sections";
import { setPartnerStatus } from "../actions";
import { PARTNER_STATUS, partnerTone } from "../status";

const ROLE = { owner: "Owner", reservations: "Reservations", finance: "Finance", viewer: "Viewer" } as const;
const FIELDS = [
  ["country", "Country of registration"],
  ["registration_number", "Registration or licence number"],
  ["website", "Website"],
  ["contact_name", "Contact name"],
  ["contact_phone", "Contact phone"],
] as const;

/** DASH-ADM-086–088: an agency's company and registration details, its team, and the trade-access decision. */
export default async function PartnerPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  if (!isUuid(orgId)) notFound();
  await requireAdmin(["catalogue"], `/dashboard/admin/partners/${orgId}/`);
  const db = await getDb();
  const { data: o } = await db
    .from("organisations")
    .select(
      "id, display_name, legal_name, status, status_reason, registration, created_at, memberships(team_role, profile:profiles(full_name))",
    )
    .eq("id", orgId)
    .eq("kind", "partner")
    .maybeSingle();
  if (!o) notFound();
  const reg = (o.registration ?? {}) as Record<string, string>;
  return (
    <>
      <p>
        <Link href="/dashboard/admin/partners/">← Travel partners</Link>
      </p>
      <h1 className={ui.pageTitle}>{o.display_name}</h1>
      <p>
        <Badge tone={partnerTone[o.status]}>{PARTNER_STATUS.find((s) => s.value === o.status)?.label}</Badge>{" "}
        <span className={ui.muted}>
          Applied <CairoTime value={o.created_at} />
          {o.status_reason ? ` · ${o.status_reason}` : ""}
        </span>
      </p>
      <Section title="Company and registration" id="company">
        <dl className={ui.grid}>
          <div>
            <dt className={ui.label}>Legal name</dt>
            <dd>{o.legal_name ?? "—"}</dd>
          </div>
          {FIELDS.map(([k, label]) => (
            <div key={k}>
              <dt className={ui.label}>{label}</dt>
              <dd>{reg[k] || "—"}</dd>
            </div>
          ))}
        </dl>
      </Section>
      <Section title="Team" id="team">
        <ul className={ui.list}>
          {o.memberships.map((m, i) => (
            <li key={i}>
              {m.profile?.full_name ?? "Unnamed"} · {ROLE[m.team_role]}
            </li>
          ))}
        </ul>
      </Section>
      <Section title="Trade access" id="decision">
        <ActionForm action={setPartnerStatus.bind(null, o.id)} submit="Save decision">
          <div className={ui.grid}>
            <Select
              label="Decision"
              name="status"
              required
              placeholder="Choose"
              options={[
                { value: "approved", label: "Approve trade access" },
                { value: "paused", label: "Pause (keeps bookings and payments)" },
                { value: "rejected", label: "Reject" },
              ]}
            />
            <Input label="Reason" name="reason" maxLength={500} hint="Required unless approving; kept with the record." />
          </div>
        </ActionForm>
      </Section>
    </>
  );
}
