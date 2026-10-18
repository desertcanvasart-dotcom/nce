import Link from "next/link";
import { Badge } from "@/components/ds/Badge/Badge";
import { Button } from "@/components/ds/Button/Button";
import { Select, ui } from "@/components/dashboard/ui";
import { CairoTime } from "@/components/shell/CairoTime";
import { requireAdmin } from "@/server/auth";
import { connectionStatusByOrg } from "@/server/connections/queries";
import { getDb } from "@/server/db";

const STATUS = [
  { value: "applied", label: "Awaiting approval" },
  { value: "approved", label: "Approved" },
  { value: "paused", label: "Paused" },
  { value: "rejected", label: "Rejected" },
] as const;
const tone = { applied: "accent", approved: "success", paused: "neutral", rejected: "danger" } as const;
const CONNECTIONS = [
  { value: "problems", label: "With connection errors" },
  { value: "pending", label: "Feed awaiting approval" },
] as const;
const MODE = { manual: "manual", paste: "paste", feed: "feed", api: "API" } as const;

/** DASH-ADM-042, 045: operator applications and operators, with how each keeps its inventory current. */
export default async function OperatorsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; connections?: string }>;
}) {
  await requireAdmin(["catalogue", "finance"], "/dashboard/admin/operators/");
  const { status, connections } = await searchParams;
  const filter = STATUS.find((s) => s.value === status)?.value;
  const connFilter = CONNECTIONS.find((c) => c.value === connections)?.value;
  const db = await getDb();
  let q = db
    .from("organisations")
    .select("id, display_name, legal_name, status, created_at, vessels(count)")
    .eq("kind", "operator")
    .order("created_at", { ascending: false });
  if (filter) q = q.eq("status", filter);
  const { data } = await q;
  const conn = await connectionStatusByOrg((data ?? []).map((o) => o.id));
  const rows = (data ?? []).filter((o) =>
    connFilter === "problems" ? !!conn.get(o.id)?.problem : connFilter === "pending" ? conn.get(o.id)?.feed === "pending" : true,
  );
  return (
    <>
      <h1 className={ui.pageTitle}>Operators</h1>
      <form method="get" className={ui.grid} aria-label="Filter operators">
        <Select label="Status" name="status" placeholder="All" defaultValue={filter} options={STATUS} />
        <Select label="Connections" name="connections" placeholder="All" defaultValue={connFilter} options={CONNECTIONS} />
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
                <th scope="col">Inventory connections</th>
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
                  <td>
                    {conn
                      .get(o.id)!
                      .modes.map((m) => MODE[m])
                      .join(", ")}
                    {conn.get(o.id)!.feed === "pending" ? <Badge tone="accent">Feed awaiting approval</Badge> : null}
                    {conn.get(o.id)!.problem ? (
                      <>
                        {" "}
                        <Badge tone="danger">Error</Badge> <span className={ui.muted}>{conn.get(o.id)!.problem}</span>
                      </>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className={ui.muted}>No operators {filter || connFilter ? "match these filters" : "yet"}.</p>
      )}
    </>
  );
}
