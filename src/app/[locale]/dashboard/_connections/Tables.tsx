import { Badge } from "@/components/ds/Badge/Badge";
import { ui } from "@/components/dashboard/ui";
import { CairoTime } from "@/components/shell/CairoTime";
import { ageInWords } from "@/lib/connections/age";
import { nowMs } from "@/lib/product/departures";
import { ROUTE_LABEL, type Health, type Run } from "@/server/connections/queries";

const HEALTH_BADGE: Record<Health["state"], { tone: "success" | "danger" | "accent" | "neutral"; text: string }> = {
  ok: { tone: "success", text: "Working" },
  problem: { tone: "danger", text: "Needs attention" },
  waiting: { tone: "accent", text: "Awaiting approval" },
  unused: { tone: "neutral", text: "Not used" },
};

export const FEED_STATUS = {
  pending: { tone: "accent", text: "Awaiting Nilecruz approval" },
  active: { tone: "success", text: "Active: pulled every hour" },
  paused: { tone: "danger", text: "Paused by Nilecruz" },
  rejected: { tone: "danger", text: "Not approved" },
} as const;

/** DASH-OPR-027, DASH-ADM-045: per route, the last success, the data's age, rows changed and the last problem. */
export function HealthTable({ health }: { health: Health[] }) {
  const now = nowMs();
  return (
    <div className={ui.tableWrap}>
      <table className={`${ui.table} ${ui.stack}`}>
        <caption className="visually-hidden">Health of each connection</caption>
        <thead>
          <tr>
            <th scope="col">Route</th>
            <th scope="col">Status</th>
            <th scope="col">Last success</th>
            <th scope="col">Data age</th>
            <th scope="col" className={ui.num}>
              Rows changed
            </th>
            <th scope="col">Last problem</th>
          </tr>
        </thead>
        <tbody>
          {health.map((h) => (
            <tr key={h.route}>
              <th scope="row" data-label="Route">
                {ROUTE_LABEL[h.route]}
              </th>
              <td data-label="Status">
                <Badge tone={HEALTH_BADGE[h.state].tone}>{HEALTH_BADGE[h.state].text}</Badge>
              </td>
              <td data-label="Last success">{h.lastSuccess ? <CairoTime value={h.lastSuccess} /> : "—"}</td>
              <td data-label="Data age">{h.state === "unused" ? "—" : ageInWords(h.lastSuccess, now)}</td>
              <td data-label="Rows changed" className={ui.num}>
                {h.rowsChanged ?? "—"}
              </td>
              <td data-label="Last problem">{h.lastProblem ?? "None"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Recent pastes, feed pulls and API calls. */
export function RunsTable({ runs }: { runs: Run[] }) {
  if (!runs.length) return <p className={ui.muted}>Nothing yet. Pastes, feed pulls and API calls will appear here.</p>;
  return (
    <div className={ui.tableWrap}>
      <table className={`${ui.table} ${ui.stack}`}>
        <caption className="visually-hidden">Recent pastes, pulls and API calls</caption>
        <thead>
          <tr>
            <th scope="col">When</th>
            <th scope="col">Route</th>
            <th scope="col" className={ui.num}>
              Rows
            </th>
            <th scope="col" className={ui.num}>
              Changed
            </th>
            <th scope="col" className={ui.num}>
              Problems
            </th>
            <th scope="col">Note</th>
          </tr>
        </thead>
        <tbody>
          {runs.slice(0, 20).map((r) => (
            <tr key={r.id}>
              <td data-label="When">
                <CairoTime value={r.finished_at ?? r.created_at} />
              </td>
              <td data-label="Route">{ROUTE_LABEL[r.source]}</td>
              <td data-label="Rows" className={ui.num}>
                {r.rows_received}
              </td>
              <td data-label="Changed" className={ui.num}>
                {r.rows_changed}
              </td>
              <td data-label="Problems" className={ui.num}>
                {r.status === "failed" ? "Failed" : r.rows_failed}
              </td>
              <td data-label="Note">{r.error ?? (r.rows_skipped ? `${r.rows_skipped} not applied (newer data)` : "")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
