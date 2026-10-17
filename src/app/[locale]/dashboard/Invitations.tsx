import { ActionForm } from "@/components/dashboard/ActionForm";
import styles from "@/components/dashboard/ui.module.css";
import { acceptInvitation } from "./actions";
import { getDb } from "@/server/db";

const ROLE = { reservations: "reservations", finance: "finance", viewer: "viewer", owner: "owner" } as const;

/** Open invitations addressed to the signed-in email (ADR-073), shown on every dashboard page until accepted. */
export async function Invitations() {
  const db = await getDb();
  const { data } = await db
    .from("org_invitations")
    .select("id, team_role, org:organisations(display_name)")
    .is("accepted_at", null)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString());
  if (!data?.length) return null;
  return (
    <div className={styles.notice} role="status">
      {data.map((i) => (
        <ActionForm
          key={i.id}
          action={acceptInvitation.bind(null, i.id)}
          submit={`Join ${i.org?.display_name ?? "the team"}`}
          variant="outline"
          className={styles.actions}
        >
          <span>
            {i.org?.display_name ?? "A company"} invited you to its team as {ROLE[i.team_role]}.
          </span>
        </ActionForm>
      ))}
    </div>
  );
}
