import Link from "next/link";
import { ui } from "@/components/dashboard/ui";
import { CairoTime } from "@/components/shell/CairoTime";
import type { ActivityRow } from "@/server/catalogue/activity";

export function ActivityTable({ rows }: { rows: ActivityRow[] }) {
  if (!rows.length) return <p className={ui.muted}>No activity yet.</p>;
  return (
    <div className={ui.tableWrap}>
      <table className={ui.table}>
        <caption className="visually-hidden">Marketplace activity, newest first</caption>
        <thead>
          <tr>
            <th scope="col">When (Cairo)</th>
            <th scope="col">Who</th>
            <th scope="col">What</th>
            <th scope="col">Record</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>
                <CairoTime value={r.at} />
              </td>
              <td>{r.who}</td>
              <td>
                {r.what}
                {r.changed.length ? <span className={ui.muted}> ({r.changed.join(", ")})</span> : null}
              </td>
              <td>{r.href ? <Link href={r.href}>{r.record}</Link> : r.record}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
