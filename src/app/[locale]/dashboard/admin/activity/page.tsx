import Link from "next/link";
import { Button } from "@/components/ds/Button/Button";
import { Input, Select, ui } from "@/components/dashboard/ui";
import { requireAdmin } from "@/server/auth";
import { ACTIVITY_TABLES, recentActivity } from "@/server/catalogue/activity";
import { ActivityTable } from "./ActivityTable";

type Props = { searchParams: Promise<{ table?: string; from?: string; to?: string; page?: string }> };

/** DASH-ADM-008: browse the activity history (the append-only audit log, SEC-010). */
export default async function ActivityPage({ searchParams }: Props) {
  await requireAdmin(undefined, "/dashboard/admin/activity/");
  const sp = await searchParams;
  const date = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);
  const table = ACTIVITY_TABLES.some((t) => t.value === sp.table) ? sp.table : undefined;
  const list = await recentActivity({ table, from: date(sp.from), to: date(sp.to), page: Number(sp.page) || 1 });
  const qs = (page: number) =>
    `?${new URLSearchParams(Object.entries({ table, from: date(sp.from), to: date(sp.to), page: String(page) }).filter(([, v]) => !!v) as [string, string][]).toString()}`;
  return (
    <>
      <h1 className={ui.pageTitle}>Activity history</h1>
      <p className={ui.muted}>
        Every change to the catalogue, companies, teams and roles, as recorded. Entries can’t be edited or deleted.
      </p>
      <form method="get" className={ui.grid} role="search" aria-label="Filter activity">
        <Select label="Record type" name="table" placeholder="All" defaultValue={table} options={ACTIVITY_TABLES} />
        <Input label="From (Cairo date)" name="from" type="date" defaultValue={date(sp.from)} />
        <Input label="To (Cairo date)" name="to" type="date" defaultValue={date(sp.to)} />
        <div className={ui.filterSubmit}>
          <Button type="submit">Filter</Button>
        </div>
      </form>
      <p className={ui.muted}>{list.total} entries</p>
      <ActivityTable rows={list.rows} />
      {list.pages > 1 ? (
        <nav className={ui.pager} aria-label="Pages">
          {list.page > 1 ? <Link href={qs(list.page - 1)}>Newer</Link> : null}
          <span>
            Page {list.page} of {list.pages}
          </span>
          {list.page < list.pages ? <Link href={qs(list.page + 1)}>Older</Link> : null}
        </nav>
      ) : null}
    </>
  );
}
