import { Badge } from "@/components/ds/Badge/Badge";
import { ui } from "@/components/dashboard/ui";
import type { RowResult } from "@/server/connections/queries";

const ROW_STATUS: Record<RowResult["status"], { tone: "success" | "danger" | "accent" | "neutral"; text: string }> = {
  new: { tone: "success", text: "New" },
  changed: { tone: "success", text: "Changes" },
  unchanged: { tone: "neutral", text: "Re-confirmed" },
  skipped: { tone: "accent", text: "Not applied" },
  error: { tone: "danger", text: "Problem" },
};

/** One line per sailing and cabin type: what will happen (preview) or what needs attention (after applying). */
export function RowTable({ rows, caption }: { rows: RowResult[]; caption: string }) {
  return (
    <div className={ui.tableWrap}>
      <table className={`${ui.table} ${ui.stack}`}>
        <caption className="visually-hidden">{caption}</caption>
        <thead>
          <tr>
            <th scope="col" className={ui.num}>
              Row
            </th>
            <th scope="col">Sailing and cabin</th>
            <th scope="col">Result</th>
            <th scope="col">Notes</th>
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 500).map((r) => (
            <tr key={r.i}>
              <td data-label="Row" className={ui.num}>
                {r.i}
              </td>
              <td data-label="Sailing and cabin">{r.label}</td>
              <td data-label="Result">
                <Badge tone={ROW_STATUS[r.status].tone}>{ROW_STATUS[r.status].text}</Badge>
              </td>
              <td data-label="Notes">{r.messages.join(" ")}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > 500 ? <p className={ui.muted}>Showing the first 500 of {rows.length} rows.</p> : null}
    </div>
  );
}
