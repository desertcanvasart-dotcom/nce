import Link from "next/link";
import { Badge } from "@/components/ds/Badge/Badge";
import { Button } from "@/components/ds/Button/Button";
import { Select, ui } from "@/components/dashboard/ui";
import { CairoTime } from "@/components/shell/CairoTime";
import { requireAdmin } from "@/server/auth";
import { getDb } from "@/server/db";

const STATUS = [
  { value: "applied", label: "Awaiting approval" },
  { value: "approved", label: "Approved" },
  { value: "paused", label: "Paused" },
  { value: "rejected", label: "Rejected" },
] as const;
const tone = { applied: "accent", approved: "success", paused: "neutral", rejected: "danger" } as const;

/** DASH-ADM-042: operator applications and operators. */
export default async function OperatorsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdmin(["catalogue", "finance"], "/dashboard/admin/operators/");
  const { status } = await searchParams;
  const filter = STATUS.find((s) => s.value === status)?.value;
  const db = await getDb();
  let q = db
    .from("organisations")
    .select("id, display_name, legal_name, status, created_at, vessels(count)")
    .eq("kind", "operator")
    .order("created_at", { ascending: false });
  if (filter) q = q.eq("status", filter);
  const { data } = await q;
  const rows = data ?? [];
  return (
    <>
      <h1 className={ui.pageTitle}>Operators</h1>
      <form method="get" className={ui.grid} aria-label="Filter operators">
        <Select label="Status" name="status" placeholder="All" defaultValue={filter} options={STATUS} />
        <div className={ui.filterSubmit}>
          <Button type="submit">Filter</Button>
        </div>
      </form>
      {rows.length ? (
        <div className={ui.tableWrap}>
          <table className={ui.table}>
            <caption className="visually-hidden">Operators</caption>
            <thead>
              <tr>
                <th scope="col">Company</th>
                <th scope="col">Status</th>
                <th scope="col">Applied (Cairo)</th>
                <th scope="col" className={ui.num}>
                  Vessels
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id}>
                  <td>
                    <Link href={`/dashboard/admin/operators/${o.id}/`}>{o.display_name}</Link>
                    {o.legal_name ? <span className={ui.muted}> · {o.legal_name}</span> : null}
                  </td>
                  <td>
                    <Badge tone={tone[o.status]}>{STATUS.find((s) => s.value === o.status)?.label}</Badge>
                  </td>
                  <td>
                    <CairoTime value={o.created_at} />
                  </td>
                  <td className={ui.num}>{(o.vessels as unknown as { count: number }[])[0]?.count ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className={ui.muted}>No operators {filter ? "with this status" : "yet"}.</p>
      )}
    </>
  );
}
