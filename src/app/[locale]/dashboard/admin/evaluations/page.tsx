import Link from "next/link";
import { ui } from "@/components/dashboard/ui";
import { VERDICTS } from "@/lib/evaluation/method";
import { requireAdmin } from "@/server/auth";
import { getDb } from "@/server/db";

/** DASH-ADM-026: evaluations live in each vessel's editor; this is the list across all vessels. */
export default async function EvaluationsPage() {
  await requireAdmin(["catalogue", "finance"], "/dashboard/admin/evaluations/");
  const db = await getDb();
  const { data } = await db
    .from("evaluations")
    .select("id, vessel_id, assessed_on, evaluator, verdict, overall_score, published, vessel:vessels(name)")
    .order("assessed_on", { ascending: false })
    .limit(200);
  const rows = data ?? [];
  return (
    <>
      <h1 className={ui.pageTitle}>Vessel evaluations</h1>
      <p className={ui.muted}>
        Add or edit an evaluation from the vessel’s page in the catalogue. Unpublished evaluations stay internal.
      </p>
      {rows.length ? (
        <div className={ui.tableWrap}>
          <table className={ui.table}>
            <caption className="visually-hidden">Evaluations, newest first</caption>
            <thead>
              <tr>
                <th scope="col">Vessel</th>
                <th scope="col">Assessed</th>
                <th scope="col">Evaluator</th>
                <th scope="col">Verdict</th>
                <th scope="col" className={ui.num}>
                  Score
                </th>
                <th scope="col">Published</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id}>
                  <td>
                    <Link href={`/dashboard/admin/catalogue/${e.vessel_id}/#evaluations`}>{e.vessel?.name}</Link>
                  </td>
                  <td>{e.assessed_on}</td>
                  <td>{e.evaluator}</td>
                  <td>{VERDICTS.find((v) => v.value === e.verdict)?.label}</td>
                  <td className={ui.num}>{Number(e.overall_score).toFixed(2)}</td>
                  <td>{e.published ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className={ui.muted}>No evaluations yet.</p>
      )}
    </>
  );
}
