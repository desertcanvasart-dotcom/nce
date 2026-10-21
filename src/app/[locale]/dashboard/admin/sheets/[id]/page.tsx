import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ds/Badge/Badge";
import { ActionForm } from "@/components/dashboard/ActionForm";
import { Input, Section, Select, ui } from "@/components/dashboard/ui";
import { CairoTime } from "@/components/shell/CairoTime";
import type { MappedRow, Unmatched } from "@/lib/sheets/map";
import { requireAdmin } from "@/server/auth";
import { getDb } from "@/server/db";
import { isUuid } from "../../../sections";
import { confirmSheet, editRow, mapName, rejectSheet, setSheetOperator } from "../actions";
import { SHEET_STATUS } from "../status";

type Result = { status: string; vessel: string; date: string; cabin: string; available: number; messages: string[] };

/**
 * ADR-099, Part B: one sheet: the original next to the rows read from it, what changes against today's data, the names
 * to map, and the rows the sheet no longer lists (shown only; nothing is ever deleted).
 */
export default async function SheetReview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  await requireAdmin(["catalogue"], `/dashboard/admin/sheets/${id}/`);
  const db = await getDb();
  const { data: s } = await db
    .from("sheet_ingests")
    .select("*, operator:organisations(display_name), run:inventory_runs(results, status)")
    .eq("id", id)
    .maybeSingle();
  if (!s) notFound();
  const st = SHEET_STATUS[s.status]!;
  const [{ data: file }, { data: operators }, { data: ships }, { data: current }] = await Promise.all([
    s.file_path ? db.storage.from("sheets").createSignedUrl(s.file_path, 600) : Promise.resolve({ data: null }),
    db.from("organisations").select("id, display_name").eq("kind", "operator").eq("status", "approved").order("display_name"),
    s.org_id
      ? db.from("vessels").select("slug, name, cabin_types(code, name)").eq("operator_org_id", s.org_id).order("name")
      : Promise.resolve({ data: [] as { slug: string; name: string; cabin_types: { code: string; name: string }[] }[] }),
    s.org_id
      ? db
          .from("inventory")
          .select(
            "available, source, confirmed_at, vessel:vessels!inner(slug, operator_org_id), departure:departures!inner(departs_on), cabin:cabin_types(code)",
          )
          .eq("vessel.operator_org_id", s.org_id)
          .gt("departure.departs_on", new Date().toISOString().slice(0, 10))
          .limit(2000)
      : Promise.resolve({ data: [] }),
  ]);
  const rows = (s.rows ?? []) as MappedRow[];
  const unmatched = (s.unmatched ?? []) as Unmatched[];
  const results = ((s.run as { results: Result[] } | null)?.results ?? []) as Result[];
  const nameOf = new Map((ships ?? []).map((v) => [v.slug, v.name]));
  const resultFor = (r: MappedRow) =>
    "unmapped" in r
      ? undefined
      : results.find((x) => x.vessel === nameOf.get(r.vessel) && x.date === r.date && x.cabin === r.cabin);
  type Inv = {
    available: number;
    source: string;
    vessel: { slug: string } | null;
    departure: { departs_on: string } | null;
    cabin: { code: string } | null;
  };
  const key = (v: string, d: string, c: string) => `${v}|${d}|${c}`;
  const now = new Map(
    ((current ?? []) as Inv[]).map((i) => [key(i.vessel?.slug ?? "", i.departure?.departs_on ?? "", i.cabin?.code ?? ""), i]),
  );
  const listed = new Set(rows.flatMap((r) => ("unmapped" in r ? [] : [key(r.vessel, r.date, r.cabin)])));
  const notListed = [...now.entries()].filter(([k]) => !listed.has(k)).slice(0, 100);
  const open = ["preview", "received", "unknown_sender", "failed"].includes(s.status);
  const isImage = /\.(png|jpe?g)$/i.test(s.file_name ?? "");

  return (
    <>
      <p>
        <Link href="/dashboard/admin/sheets/">← Vacancy sheets</Link>
      </p>
      <h1 className={ui.pageTitle}>{s.file_name ?? "Message text"}</h1>
      <p className={ui.actions}>
        <Badge tone={st.tone}>{st.text}</Badge>
        <span className={ui.muted}>
          {s.operator?.display_name ?? "Unknown sender"} · {s.channel}
          {s.sender ? ` from ${s.sender}` : ""} · received <CairoTime value={s.received_at} />
          {s.sheet_date ? ` · as of ${s.sheet_date}` : " · no date on the sheet (the received time is used)"}
          {s.parser_version ? ` · read by ${s.parser_version}` : ""}
          {s.auto_confirmed ? " · auto-confirmed" : ""}
        </span>
      </p>
      {s.error ? <p className={ui.error}>{s.error}</p> : null}
      {(s.notes as string[]).length ? (
        <ul className={ui.list}>
          {(s.notes as string[]).map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      ) : null}

      {!s.org_id ? (
        <Section title="Which operator sent this?" id="operator">
          <p className={ui.muted}>
            The sender isn’t one of an operator’s contacts. Add them as a contact on the operator’s page so later sheets are
            recognised.
          </p>
          <ActionForm action={setSheetOperator.bind(null, id)} submit="Read it for this operator">
            <Select
              label="Operator"
              name="org_id"
              required
              placeholder="Choose"
              options={(operators ?? []).map((o) => ({ value: o.id, label: o.display_name }))}
            />
          </ActionForm>
        </Section>
      ) : null}

      <Section title="Original" id="original">
        {file?.signedUrl ? (
          <>
            {isImage ? (
              // eslint-disable-next-line @next/next/no-img-element -- a private, short-lived signed link, not a site image
              <img src={file.signedUrl} alt={`The sheet as sent: ${s.file_name}`} className={ui.preview} />
            ) : null}
            <p>
              <a href={file.signedUrl} target="_blank" rel="noopener noreferrer">
                Open the original ({s.file_name})
              </a>{" "}
              <span className={ui.muted}>(link valid 10 minutes)</span>
            </p>
          </>
        ) : s.body_text ? (
          <pre className={ui.prewrap}>{s.body_text.slice(0, 5000)}</pre>
        ) : (
          <p className={ui.muted}>No file.</p>
        )}
      </Section>

      {open && unmatched.length ? (
        <Section title={`Names to map (${unmatched.length})`} id="names">
          <p className={ui.muted}>Each mapping is kept for this operator’s later sheets.</p>
          {unmatched.map((u) => {
            const ship = (ships ?? []).find((v) => v.slug === u.vessel_slug);
            const options =
              u.kind === "vessel"
                ? (ships ?? []).map((v) => ({ value: v.slug, label: v.name }))
                : (ship?.cabin_types ?? []).map((c) => ({ value: c.code, label: `${c.name} (${c.code})` }));
            return (
              <ActionForm
                key={`${u.kind}-${u.vessel_slug}-${u.name}`}
                action={mapName.bind(null, id, s.org_id!, u.kind, u.name, u.vessel_slug ?? null)}
                submit="Save this name"
                variant="outline"
              >
                <Select
                  label={u.kind === "vessel" ? `Ship “${u.name}” is` : `Cabin “${u.name}” on ${ship?.name ?? u.vessel_slug} is`}
                  name="target"
                  required
                  placeholder="Choose"
                  options={options}
                />
              </ActionForm>
            );
          })}
        </Section>
      ) : null}

      <Section title={`Rows read (${rows.length})`} id="rows">
        {rows.length ? (
          <div className={ui.tableWrap}>
            <table className={`${ui.table} ${ui.stack}`}>
              <caption className="visually-hidden">Rows read from the sheet</caption>
              <thead>
                <tr>
                  <th scope="col">As written</th>
                  <th scope="col">Date</th>
                  <th scope="col">Ship and cabin</th>
                  <th scope="col" className={ui.num}>
                    Free
                  </th>
                  <th scope="col">Today on Nilecruz</th>
                  <th scope="col">Check</th>
                  {open ? <th scope="col">Edit</th> : null}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const res = resultFor(r);
                  const was = "unmapped" in r ? undefined : now.get(key(r.vessel, r.date, r.cabin));
                  const changed = res && (res.status === "changed" || res.status === "new");
                  return (
                    <tr key={i} className={changed ? ui.highlight : undefined}>
                      <td data-label="As written">{r.label}</td>
                      <td data-label="Date">{r.date}</td>
                      <td data-label="Ship and cabin">
                        {"unmapped" in r ? <em>name to map</em> : `${nameOf.get(r.vessel)} · ${r.cabin}`}
                      </td>
                      <td data-label="Free" className={ui.num}>
                        {r.available}
                      </td>
                      <td data-label="Today">{was ? `${was.available} (${was.source})` : "—"}</td>
                      <td data-label="Check">
                        {"unmapped" in r
                          ? "waiting for a name"
                          : res
                            ? `${res.status}${res.messages.length ? `: ${res.messages.join(" ")}` : ""}`
                            : "—"}
                      </td>
                      {open ? (
                        <td data-label="Edit">
                          <ActionForm action={editRow.bind(null, id, i)} submit="Change" variant="ghost">
                            <Input
                              label={`Free, row ${i + 1}`}
                              name="available"
                              type="number"
                              min={0}
                              max={400}
                              defaultValue={r.available}
                            />
                          </ActionForm>
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className={ui.muted}>No rows.</p>
        )}
      </Section>

      {notListed.length ? (
        <Section title={`On Nilecruz but not on this sheet (${notListed.length})`} id="not-listed">
          <p className={ui.muted}>Shown so you can check with the operator. Nothing is removed.</p>
          <ul className={ui.list}>
            {notListed.map(([k, v]) => {
              const [slug, date, code] = k.split("|");
              return (
                <li key={k}>
                  {nameOf.get(slug!) ?? slug} · {date} · {code}: {v.available} free ({v.source})
                </li>
              );
            })}
          </ul>
        </Section>
      ) : null}

      {s.status === "preview" ? (
        <Section title="Decide" id="decide">
          <ActionForm action={confirmSheet.bind(null, id)} submit="Confirm and update availability">
            <p className={ui.muted}>
              Rows are checked again now. Sheet data counts as confirmed for 7 days; newer data already on Nilecruz is never
              overwritten.
            </p>
          </ActionForm>
          <ActionForm action={rejectSheet.bind(null, id)} submit="Reject" variant="outline">
            <Input label="Why (kept with the sheet)" name="why" maxLength={500} />
          </ActionForm>
        </Section>
      ) : null}
    </>
  );
}
