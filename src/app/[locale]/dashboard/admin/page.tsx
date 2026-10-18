import Link from "next/link";
import { Section, ui } from "@/components/dashboard/ui";
import { requireAdmin } from "@/server/auth";
import { overviewCounts } from "@/server/catalogue/queries";
import { recentActivity } from "@/server/catalogue/activity";
import { ActivityTable } from "./activity/ActivityTable";

/**
 * DASH-ADM-001, 002, 007, 009: the working queue. Each counter links to its pre-filtered list.
 * Payments, bookings, cancellations and feed errors join the queue with their batches; until then they say so.
 */
export default async function AdminOverview() {
  await requireAdmin(undefined, "/dashboard/admin/");
  const [counts, activity] = await Promise.all([overviewCounts(), recentActivity({ page: 1, pageSize: 10 })]);
  const later = [
    ["Payments awaiting verification", "4f"],
    ["Current and upcoming bookings", "4e"],
    ["Cancellation requests and refund reviews", "4f"],
    ["Inventory connection errors", "4c"],
  ] as const;
  return (
    <>
      <h1 className={ui.pageTitle}>Overview</h1>
      <p className={ui.muted}>What needs attention across the marketplace. This is a working queue, not a reporting tool.</p>
      <div className={ui.counters}>
        <Link className={ui.counter} href="/dashboard/admin/operators/?status=applied">
          <span className={ui.counterValue}>{counts.applications}</span>
          <span className={ui.counterLabel}>Operator applications awaiting approval</span>
        </Link>
        <Link className={ui.counter} href="/dashboard/admin/catalogue/?visibility=private">
          <span className={ui.counterValue}>{counts.drafts}</span>
          <span className={ui.counterLabel}>Private vessel drafts</span>
        </Link>
        <Link className={ui.counter} href="/dashboard/admin/submissions/?status=submitted">
          <span className={ui.counterValue}>{counts.submissions}</span>
          <span className={ui.counterLabel}>Cruise submissions awaiting review</span>
        </Link>
        {later.map(([label, batch]) => (
          <div key={label} className={ui.counter}>
            <span className={ui.counterValue} aria-hidden="true">
              –
            </span>
            <span className={ui.counterLabel}>
              {label} <span className={ui.muted}>(arrives with Batch {batch})</span>
            </span>
          </div>
        ))}
      </div>
      <Section title="Latest activity" id="latest">
        <ActivityTable rows={activity.rows} />
        <p>
          <Link href="/dashboard/admin/activity/">All activity</Link>
        </p>
      </Section>
    </>
  );
}
