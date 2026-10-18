import Link from "next/link";
import { notFound } from "next/navigation";
import { Section, ui } from "@/components/dashboard/ui";
import { requireOrgRole } from "@/server/auth";
import { operatorOverview } from "@/server/product/queries";
import { isUuid } from "../../sections";

/** DASH-OPR-001, 004, 005: the operator's own business at a glance. */
export default async function OperatorOverview({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  if (!isUuid(orgId)) notFound();
  const { company } = await requireOrgRole(orgId, "any", {
    kind: "operator",
    allowPending: true,
    returnTo: `/dashboard/operator/${orgId}/`,
  });
  if (company.status !== "approved") return null; // the layout shows the company's status instead
  const o = await operatorOverview(orgId);
  return (
    <>
      <h1 className={ui.pageTitle}>Overview</h1>
      <Section title="Upcoming departures" id="upcoming">
        {o.upcoming.length ? (
          <div className={ui.tableWrap}>
            <table className={`${ui.table} ${ui.stack}`}>
              <caption className="visually-hidden">Next departures</caption>
              <thead>
                <tr>
                  <th scope="col">Departs</th>
                  <th scope="col">Vessel</th>
                  <th scope="col">Route</th>
                  <th scope="col" className={ui.num}>
                    Cabins available
                  </th>
                </tr>
              </thead>
              <tbody>
                {o.upcoming.map((d) => (
                  <tr key={d.id}>
                    <td data-label="Departs">{d.departs_on}</td>
                    <td data-label="Vessel">{d.vessel}</td>
                    <td data-label="Route">{d.route}</td>
                    <td data-label="Cabins available" className={ui.num}>
                      {d.available}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className={ui.muted}>
            No upcoming departures. Add cabin types and a schedule in{" "}
            <Link href={`/dashboard/operator/${orgId}/schedules/`}>Routes, schedules and rates</Link>.
          </p>
        )}
      </Section>
      <Section title="Inventory issues" id="issues">
        {o.issues.length ? (
          <ul className={ui.list}>
            {o.issues.map((i) => (
              <li key={i.href + i.text}>
                <Link href={i.href}>
                  {i.vessel}: {i.text}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className={ui.muted}>No issues.</p>
        )}
      </Section>
    </>
  );
}
