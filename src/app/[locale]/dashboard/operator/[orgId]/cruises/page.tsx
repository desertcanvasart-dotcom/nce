import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ds/Badge/Badge";
import { ActionForm } from "@/components/dashboard/ActionForm";
import { Section, ui } from "@/components/dashboard/ui";
import { CairoTime } from "@/components/shell/CairoTime";
import { STATUS_LABEL } from "@/lib/catalogue/submission-states";
import { requireOrgRole } from "@/server/auth";
import { getDb } from "@/server/db";
import { isUuid } from "../../../sections";
import { startSubmission } from "./actions";

/** DASH-OPR-006: the operator's vessels and submissions. */
export default async function CruisesPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  if (!isUuid(orgId)) notFound();
  await requireOrgRole(orgId, ["owner", "reservations"], { kind: "operator", returnTo: `/dashboard/operator/${orgId}/cruises/` });
  const db = await getDb();
  const [{ data: subs }, { data: vessels }] = await Promise.all([
    db
      .from("vessel_submissions")
      .select("id, status, proposal, updated_at, vessel:vessels(name)")
      .eq("org_id", orgId)
      .order("updated_at", { ascending: false }),
    db.from("vessels").select("id, name, visibility").eq("operator_org_id", orgId).order("name"),
  ]);
  return (
    <>
      <h1 className={ui.pageTitle}>Cruises and submissions</h1>
      <p className={ui.muted}>
        Prepare your vessel information here and submit it. Nilecruz reviews every submission; while it is under review it is
        locked.
      </p>
      <ActionForm action={startSubmission.bind(null, orgId, null)} submit="Propose a new vessel" variant="outline" />

      <Section title="Your submissions" id="submissions">
        {(subs ?? []).length ? (
          <ul className={ui.list}>
            {(subs ?? []).map((s) => (
              <li key={s.id}>
                <Link href={`/dashboard/operator/${orgId}/cruises/${s.id}/`}>
                  {s.vessel?.name ?? `New: ${(s.proposal as { name?: string }).name || "unnamed"}`}
                </Link>{" "}
                <Badge
                  tone={
                    s.status === "changes_requested"
                      ? "accent"
                      : s.status === "approved"
                        ? "success"
                        : s.status === "rejected"
                          ? "danger"
                          : "neutral"
                  }
                >
                  {STATUS_LABEL[s.status]}
                </Badge>{" "}
                <span className={ui.muted}>
                  <CairoTime value={s.updated_at} />
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className={ui.muted}>No submissions yet.</p>
        )}
      </Section>

      <Section title="Your vessels" id="vessels">
        {(vessels ?? []).length ? (
          <ul className={ui.list}>
            {(vessels ?? []).map((v) => (
              <li key={v.id} className={ui.actions}>
                <span>
                  {v.name} <span className={ui.muted}>({v.visibility === "private" ? "private draft" : v.visibility})</span>
                </span>
                <ActionForm action={startSubmission.bind(null, orgId, v.id)} submit="Propose changes" variant="ghost" />
              </li>
            ))}
          </ul>
        ) : (
          <p className={ui.muted}>
            No vessels are connected to your company yet. Nilecruz connects them, or approves the vessels you propose.
          </p>
        )}
      </Section>
    </>
  );
}
