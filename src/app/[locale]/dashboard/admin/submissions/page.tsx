import Link from "next/link";
import { Badge } from "@/components/ds/Badge/Badge";
import { Button } from "@/components/ds/Button/Button";
import { Select, ui } from "@/components/dashboard/ui";
import { CairoTime } from "@/components/shell/CairoTime";
import { STATUS_LABEL, type SubmissionStatus } from "@/lib/catalogue/submission-states";
import { requireAdmin } from "@/server/auth";
import { getDb } from "@/server/db";

/** DASH-ADM-035–037: the submissions queue. */
export default async function SubmissionsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdmin(["catalogue"], "/dashboard/admin/submissions/");
  const { status } = await searchParams;
  const filter = (Object.keys(STATUS_LABEL) as SubmissionStatus[]).find((s) => s === status);
  const db = await getDb();
  let q = db
    .from("vessel_submissions")
    .select("id, status, proposal, updated_at, submitted_at, vessel:vessels(name), org:organisations(display_name)")
    .neq("status", "draft")
    .order("updated_at", { ascending: false });
  if (filter) q = q.eq("status", filter);
  const { data } = await q;
  const rows = data ?? [];
  return (
    <>
      <h1 className={ui.pageTitle}>Cruise submissions</h1>
      <p className={ui.muted}>
        Operators’ proposals for new vessels or changes. Drafts stay private to the operator until submitted.
      </p>
      <form method="get" className={ui.grid} aria-label="Filter submissions">
        <Select
          label="Status"
          name="status"
          placeholder="All except drafts"
          defaultValue={filter}
          options={(["submitted", "changes_requested", "approved", "rejected"] as const).map((s) => ({
            value: s,
            label: STATUS_LABEL[s],
          }))}
        />
        <div className={ui.filterSubmit}>
          <Button type="submit">Filter</Button>
        </div>
      </form>
      {rows.length ? (
        <div className={ui.tableWrap}>
          <table className={ui.table}>
            <caption className="visually-hidden">Submissions</caption>
            <thead>
              <tr>
                <th scope="col">Vessel</th>
                <th scope="col">Operator</th>
                <th scope="col">Status</th>
                <th scope="col">Last change (Cairo)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id}>
                  <td>
                    <Link href={`/dashboard/admin/submissions/${s.id}/`}>
                      {s.vessel?.name ?? `New: ${(s.proposal as { name?: string }).name ?? "unnamed"}`}
                    </Link>
                  </td>
                  <td>{s.org?.display_name}</td>
                  <td>
                    <Badge
                      tone={
                        s.status === "submitted"
                          ? "accent"
                          : s.status === "approved"
                            ? "success"
                            : s.status === "rejected"
                              ? "danger"
                              : "neutral"
                      }
                    >
                      {STATUS_LABEL[s.status]}
                    </Badge>
                  </td>
                  <td>
                    <CairoTime value={s.updated_at} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className={ui.muted}>Nothing here.</p>
      )}
    </>
  );
}
