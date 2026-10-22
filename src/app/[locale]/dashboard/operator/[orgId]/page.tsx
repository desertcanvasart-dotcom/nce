import Link from "next/link";
import { notFound } from "next/navigation";
import { Section, ui } from "@/components/dashboard/ui";
import { requireOrgRole } from "@/server/auth";
import { offerView } from "@/lib/bookings/bookings";
import { nowMs } from "@/lib/product/departures";
import { notices, orgOffers, visibleRequests } from "@/server/bookings/queries";
import { connectionIssues } from "@/server/connections/queries";
import { operatorOverview } from "@/server/product/queries";
import { Notices } from "../../_bookings/Notices";
import { isUuid } from "../../sections";
import { Holds } from "../../_sales/Sales";
import { markOrgNoticesRead } from "./offers/actions";

/** DASH-OPR-001–005: the operator's own business at a glance: requests, offers, departures, inventory issues. */
export default async function OperatorOverview({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  if (!isUuid(orgId)) notFound();
  const { company } = await requireOrgRole(orgId, "any", {
    kind: "operator",
    allowPending: true,
    returnTo: `/dashboard/operator/${orgId}/`,
  });
  if (company.status !== "approved") return null; // the layout shows the company's status instead
  const [o, connection, requests, offers, items] = await Promise.all([
    operatorOverview(orgId),
    connectionIssues(orgId),
    visibleRequests(),
    orgOffers(orgId),
    notices({ orgId }),
  ]);
  const now = nowMs();
  const newRequests = requests.filter((r) => r.status === "open" && !r.offers.some((x) => x.org_id === orgId)).length;
  const outstanding = offers.filter((x) => offerView(x, now) === "open").length;
  const inventoryHref = `/dashboard/operator/${orgId}/inventory/`;
  return (
    <>
      <h1 className={ui.pageTitle}>Overview</h1>
      <div className={ui.counters}>
        <Link className={ui.counter} href={`/dashboard/operator/${orgId}/offers/#requests`}>
          <span className={ui.counterValue}>{newRequests}</span>
          <span className={ui.counterLabel}>New requests to answer</span>
        </Link>
        <Link className={ui.counter} href={`/dashboard/operator/${orgId}/offers/#offers`}>
          <span className={ui.counterValue}>{outstanding}</span>
          <span className={ui.counterLabel}>Outstanding offers</span>
        </Link>
      </div>
      <Notices items={items} markRead={markOrgNoticesRead.bind(null, orgId)} />
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
                    Free
                  </th>
                  <th scope="col" className={ui.num}>
                    Held
                  </th>
                  <th scope="col" className={ui.num}>
                    Booked
                  </th>
                </tr>
              </thead>
              <tbody>
                {o.upcoming.map((d) => (
                  <tr key={d.id}>
                    <td data-label="Departs">{d.departs_on}</td>
                    <td data-label="Vessel">{d.vessel}</td>
                    <td data-label="Route">
                      {d.route}
                      {d.stopSale ? (
                        <span className={ui.muted}>
                          {d.stopSale === "all" ? " · sales stopped" : " · sales stopped for some cabins"}
                        </span>
                      ) : null}
                    </td>
                    <td data-label="Free" className={ui.num}>
                      {d.available}
                    </td>
                    <td data-label="Held" className={ui.num}>
                      {d.held}
                    </td>
                    <td data-label="Booked" className={ui.num}>
                      {d.booked}
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
      {/* ADR-103: every team member sees the holds (Inventory connections is for owners). */}
      <Holds orgId={orgId} canEdit={false} />
      <Section title="Inventory issues" id="issues">
        {o.issues.length || connection.length ? (
          <ul className={ui.list}>
            {connection.map((text) => (
              <li key={text}>
                <Link href={inventoryHref}>{text}</Link>
              </li>
            ))}
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
