import Link from "next/link";
import { Section, ui } from "@/components/dashboard/ui";
import { requireAdmin } from "@/server/auth";
import { overviewCounts } from "@/server/catalogue/queries";
import { recentActivity } from "@/server/catalogue/activity";
import { adminBookingCounts } from "@/server/bookings/queries";
import { awaitingVerificationCount, openCancellationCount } from "@/server/payments/queries";
import { adminConnectionCounts } from "@/server/connections/queries";
import { ActivityTable } from "./activity/ActivityTable";

/**
 * DASH-ADM-001–004, 006, 007, 009: the working queue. Each counter links to its pre-filtered list.
 * Payments and cancellations join the queue with their batch; until then they say so.
 */
export default async function AdminOverview() {
  await requireAdmin(undefined, "/dashboard/admin/");
  const [counts, activity, connections, bookings, toVerify, toCancel] = await Promise.all([
    overviewCounts(),
    recentActivity({ page: 1, pageSize: 10 }),
    adminConnectionCounts(),
    adminBookingCounts(),
    awaitingVerificationCount(),
    openCancellationCount(),
  ]);
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
        <Link className={ui.counter} href="/dashboard/admin/finance/#verify">
          <span className={ui.counterValue}>{toVerify}</span>
          <span className={ui.counterLabel}>Payments awaiting verification</span>
        </Link>
        <Link className={ui.counter} href="/dashboard/admin/finance/#cancellations">
          <span className={ui.counterValue}>{toCancel}</span>
          <span className={ui.counterLabel}>Cancellation requests and refund reviews</span>
        </Link>
        <Link className={ui.counter} href="/dashboard/admin/bookings/#reservations">
          <span className={ui.counterValue}>{bookings.currentAndUpcoming}</span>
          <span className={ui.counterLabel}>Current and upcoming bookings</span>
        </Link>
        <Link className={ui.counter} href="/dashboard/admin/operators/?connections=problems">
          <span className={ui.counterValue}>{connections.errors}</span>
          <span className={ui.counterLabel}>Inventory connection errors</span>
        </Link>
        <Link className={ui.counter} href="/dashboard/admin/operators/?connections=pending">
          <span className={ui.counterValue}>{connections.pendingFeeds}</span>
          <span className={ui.counterLabel}>Inventory feeds awaiting approval</span>
        </Link>
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
