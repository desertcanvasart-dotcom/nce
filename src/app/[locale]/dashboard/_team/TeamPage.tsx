import { ActionForm } from "@/components/dashboard/ActionForm";
import { Input, Section, Select, ui } from "@/components/dashboard/ui";
import { CairoTime } from "@/components/shell/CairoTime";
import { requireOrgRole } from "@/server/auth";
import { getDb } from "@/server/db";
import { emailsFor } from "@/server/teams/people";
import { changeRole, inviteMember, removeMember, revokeInvitation, type CompanyKind } from "./actions";

const ROLES = {
  operator: [
    { value: "reservations", label: "Reservations: cruises, offers and bookings" },
    { value: "finance", label: "Finance: payments" },
    { value: "viewer", label: "Viewer: read only" },
  ],
  partner: [
    { value: "reservations", label: "Reservations: search, reserve, requests, passengers and client details" },
    { value: "finance", label: "Finance: company bookings and payments" },
  ],
} as const;
const ROLE_SHORT = { owner: "Owner", reservations: "Reservations", finance: "Finance", viewer: "Viewer" } as const;

/** DASH-ROLE-007, DASH-B2B-009: a company's team, managed by its owners. */
export async function TeamPage({ kind, orgId }: { kind: CompanyKind; orgId: string }) {
  const { session } = await requireOrgRole(orgId, ["owner"], {
    kind,
    returnTo: `/dashboard/${kind}/${orgId}/team/`,
  });
  const db = await getDb();
  const [{ data: members }, { data: invites }] = await Promise.all([
    db.from("memberships").select("user_id, team_role, profile:profiles(full_name)").eq("org_id", orgId),
    db
      .from("org_invitations")
      .select("id, email, team_role, created_at, expires_at")
      .eq("org_id", orgId)
      .is("accepted_at", null)
      .is("revoked_at", null),
  ]);
  const emails = await emailsFor((members ?? []).map((m) => m.user_id));

  return (
    <>
      <h1 className={ui.pageTitle}>Team</h1>
      <Section title="Members" id="members">
        <div className={ui.tableWrap}>
          <table className={ui.table}>
            <caption className="visually-hidden">Team members</caption>
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Email</th>
                <th scope="col">Role</th>
                <th scope="col">Change</th>
              </tr>
            </thead>
            <tbody>
              {(members ?? []).map((m) => (
                <tr key={m.user_id}>
                  <td>{m.profile?.full_name ?? "Unnamed"}</td>
                  <td>{emails.get(m.user_id) ?? "—"}</td>
                  <td>{ROLE_SHORT[m.team_role]}</td>
                  <td>
                    {m.team_role === "owner" || m.user_id === session.userId ? (
                      <span className={ui.muted}>Owner</span>
                    ) : (
                      <>
                        <ActionForm action={changeRole.bind(null, kind, orgId, m.user_id)} submit="Change role" variant="outline">
                          <Select
                            label={`Role for ${m.profile?.full_name ?? "member"}`}
                            name="team_role"
                            defaultValue={m.team_role}
                            options={ROLES[kind]}
                          />
                        </ActionForm>
                        <ActionForm
                          action={removeMember.bind(null, kind, orgId, m.user_id)}
                          submit="Remove from team"
                          variant="ghost"
                        />
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Invite someone" id="invite">
        <ActionForm action={inviteMember.bind(null, kind, orgId)} submit="Send invitation" resetOnSuccess>
          <div className={ui.grid}>
            <Input label="Email" name="email" type="email" inputMode="email" required autoComplete="email" />
            <Select label="Role" name="team_role" required placeholder="Choose a role" options={ROLES[kind]} />
          </div>
          <p className={ui.hint}>
            Invitations last 14 days. People who already have an account see the invitation when they sign in.
          </p>
        </ActionForm>
      </Section>

      {(invites ?? []).length ? (
        <Section title="Open invitations" id="invitations">
          <ul className={ui.list}>
            {(invites ?? []).map((i) => (
              <li key={i.id}>
                {i.email} · {ROLE_SHORT[i.team_role]} · sent <CairoTime value={i.created_at} time={false} />, expires{" "}
                <CairoTime value={i.expires_at} time={false} />
                <ActionForm action={revokeInvitation.bind(null, kind, orgId, i.id)} submit="Cancel invitation" variant="ghost" />
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </>
  );
}
