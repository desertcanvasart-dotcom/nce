import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ds/Badge/Badge";
import { ActionForm } from "@/components/dashboard/ActionForm";
import { Notice, Section, ui } from "@/components/dashboard/ui";
import { CSV_COLUMNS, type ImportRow } from "@/lib/catalogue/csv";
import { requireAdmin } from "@/server/auth";
import { getDb } from "@/server/db";
import { isUuid } from "../../../sections";
import { confirmImport, discardImport, previewImport } from "./actions";

type Props = { searchParams: Promise<{ batch?: string; created?: string; skipped?: string }> };

/** DASH-ADM-020–025, DASH-BND-004: vessel CSV import with a preview before anything is written. */
export default async function ImportPage({ searchParams }: Props) {
  await requireAdmin(["catalogue"], "/dashboard/admin/catalogue/import/");
  const sp = await searchParams;
  type Summary = { ok: number; duplicate: number; error: number };
  let batch: { id: string; file_name: string; status: string; rows: ImportRow[]; summary: Summary } | null = null;
  if (sp.batch) {
    if (!isUuid(sp.batch)) notFound();
    const db = await getDb();
    const { data } = await db
      .from("vessel_import_batches")
      .select("id, file_name, status, rows, summary")
      .eq("id", sp.batch)
      .maybeSingle();
    if (!data) notFound();
    const sum = data.summary as Partial<Summary>;
    batch = {
      ...data,
      rows: data.rows as ImportRow[],
      summary: { ok: sum.ok ?? 0, duplicate: sum.duplicate ?? 0, error: sum.error ?? 0 },
    };
  }

  return (
    <>
      <p>
        <Link href="/dashboard/admin/catalogue/">← Catalogue</Link>
      </p>
      <h1 className={ui.pageTitle}>Import vessels from CSV</h1>
      <Notice>
        This import covers vessel profiles only. It does not import cabins, departure prices, availability, cancellation policies
        or evaluations; add those in the vessel’s editor and, from Batch 4c, in the operator’s schedules.
      </Notice>

      {batch && sp.created ? (
        <Notice tone="success">
          {sp.created} private draft{sp.created === "1" ? "" : "s"} created from {batch.file_name}.{" "}
          {Number(sp.skipped) > 0 ? `${sp.skipped} skipped because they now exist.` : ""}
        </Notice>
      ) : null}

      {batch && batch.status === "previewed" ? (
        <Section title={`Preview of ${batch.file_name}`} id="preview">
          <p>
            {batch.summary.ok} ready to import · {batch.summary.duplicate} already in the catalogue (skipped) ·{" "}
            {batch.summary.error} with problems (skipped)
          </p>
          <div className={ui.tableWrap}>
            <table className={ui.table}>
              <caption className="visually-hidden">Rows in the file</caption>
              <thead>
                <tr>
                  <th scope="col">Line</th>
                  <th scope="col">Result</th>
                  <th scope="col">Vessel</th>
                  <th scope="col">Notes</th>
                </tr>
              </thead>
              <tbody>
                {batch.rows.map((r) => (
                  <tr key={r.line}>
                    <td className={ui.num}>{r.line}</td>
                    <td>
                      {r.status === "ok" ? (
                        <Badge tone="success">Ready</Badge>
                      ) : r.status === "duplicate" ? (
                        <Badge>Skipped</Badge>
                      ) : (
                        <Badge tone="danger">Problem</Badge>
                      )}
                    </td>
                    <td>{r.vessel ? `${r.vessel.name} (${r.vessel.slug})` : ""}</td>
                    <td>{r.messages.join(" ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={ui.actions}>
            {batch.summary.ok > 0 ? (
              <ActionForm action={confirmImport.bind(null, batch.id)} submit={`Import ${batch.summary.ok} as private drafts`} />
            ) : null}
            <ActionForm action={discardImport.bind(null, batch.id)} submit="Discard" variant="ghost" />
          </div>
        </Section>
      ) : null}

      <Section title="Upload a file" id="upload">
        <ol>
          <li>
            <a href="/dashboard/admin/catalogue/import/template/" download>
              Download the template
            </a>{" "}
            (columns: {CSV_COLUMNS.join(", ")}).
          </li>
          <li>Fill one row per vessel and delete the example row. Save as “CSV UTF-8”.</li>
          <li>Upload it: you will see every row checked before anything is written.</li>
        </ol>
        <ActionForm action={previewImport} submit="Check the file" encType="multipart/form-data">
          <div className={ui.field}>
            <label className={ui.label} htmlFor="file">
              CSV file (up to 2 MB, 2,000 rows)
            </label>
            <input id="file" name="file" type="file" accept=".csv,text/csv" required />
          </div>
        </ActionForm>
      </Section>
    </>
  );
}
