import Link from "next/link";
import { Badge } from "@/components/ds/Badge/Badge";
import { Button } from "@/components/ds/Button/Button";
import { Select, ui } from "@/components/dashboard/ui";
import { CairoTime } from "@/components/shell/CairoTime";
import { requireAdmin } from "@/server/auth";
import { getDb } from "@/server/db";
import { PARTNER_STATUS, partnerTone } from "./status";

/** DASH-ADM-086–089: travel partner applications and partners (buyers, kept apart from operators, the suppliers). */
export default async function PartnersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdmin(["catalogue"], "/dashboard/admin/partners/");
  const { status } = await searchParams;
  const filter = PARTNER_STATUS.find((s) => s.value === status)?.value;
  const db = await getDb();
  let q = db
    .from("organisations")
    .select("id, display_name, legal_name, status, registration, created_at, memberships(count)")
    .eq("kind", "partner")
    .order("created_at", { ascending: false });
  if (filter) q = q.eq("status", filter);
  const { data } = await q;
  const rows = data ?? [];
  return (
    <>
      <h1 className={ui.pageTitle}>Travel partners</h1>
      <p className={ui.muted}>
        Agencies that book for their clients. They see trade and company rates only once approved; pausing keeps their bookings
        and payments.
      </p>
      <form method="get" className={ui.grid} aria-label="Filter travel partners">
        <Select label="Status" name="status" placeholder="All" defaultValue={filter} options={PARTNER_STATUS} />
        <div className={ui.filterSubmit}>
          <Button type="submit">Filter</Button>
        </div>
      </form>
      {rows.length ? (
        <div className={ui.tableWrap}>
          <table className={ui.table}>
            <caption className="visually-hidden">Travel partners</caption>
            <thead>
              <tr>
                <th scope="col">Agency</th>
                <th scope="col">Status</th>
                <th scope="col">Country</th>
                <th scope="col">Applied (Cairo)</th>
                <th scope="col" className={ui.num}>
                  Team
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => {
                const reg = (o.registration ?? {}) as Record<string, string>;
                return (
                  <tr key={o.id}>
                    <td>
                      <Link href={`/dashboard/admin/partners/${o.id}/`}>{o.display_name}</Link>
                      {o.legal_name ? <span className={ui.muted}> · {o.legal_name}</span> : null}
                    </td>
                    <td>
                      <Badge tone={partnerTone[o.status]}>{PARTNER_STATUS.find((s) => s.value === o.status)?.label}</Badge>
                    </td>
                    <td>{reg.country ?? "—"}</td>
                    <td>
                      <CairoTime value={o.created_at} />
                    </td>
                    <td className={ui.num}>{(o.memberships as unknown as { count: number }[])[0]?.count ?? 0}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className={ui.muted}>No travel partners{filter ? " with this status" : " yet"}.</p>
      )}
    </>
  );
}
