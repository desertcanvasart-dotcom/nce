import Link from "next/link";
import { ui } from "@/components/dashboard/ui";
import { requireAdmin } from "@/server/auth";
import { getDb } from "@/server/db";

/** Admin view of every vessel's product (cabins, schedules, bookable departures). */
export default async function SailingsPage() {
  await requireAdmin(["catalogue"], "/dashboard/admin/sailings/");
  const db = await getDb();
  const [{ data: vessels }, { data: sums }] = await Promise.all([
    db.from("vessels").select("id, name, operator:organisations(display_name)").not("operator_org_id", "is", null).order("name"),
    db.rpc("vessel_product_summary"),
  ]);
  const by = new Map((sums ?? []).map((s) => [s.vessel_id, s]));
  return (
    <>
      <h1 className={ui.pageTitle}>Cabins and sailings</h1>
      <p className={ui.muted}>Vessels connected to an operator. Open one to work on its cabins, schedules or promotions.</p>
      <div className={ui.tableWrap}>
        <table className={`${ui.table} ${ui.stack}`}>
          <caption className="visually-hidden">Vessels and their product</caption>
          <thead>
            <tr>
              <th scope="col">Vessel</th>
              <th scope="col">Operator</th>
              <th scope="col" className={ui.num}>
                Cabin types
              </th>
              <th scope="col" className={ui.num}>
                Schedules
              </th>
              <th scope="col" className={ui.num}>
                Bookable departures
              </th>
            </tr>
          </thead>
          <tbody>
            {(vessels ?? []).map((v) => {
              const s = by.get(v.id);
              return (
                <tr key={v.id}>
                  <td data-label="Vessel">
                    <Link href={`/dashboard/admin/catalogue/${v.id}/schedules/`}>{v.name}</Link>
                  </td>
                  <td data-label="Operator">{v.operator?.display_name}</td>
                  <td data-label="Cabin types" className={ui.num}>
                    {s?.cabin_types ?? 0}
                  </td>
                  <td data-label="Schedules" className={ui.num}>
                    {s?.schedules ?? 0}
                  </td>
                  <td data-label="Bookable departures" className={ui.num}>
                    {s?.bookable_departures ?? 0}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
