import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ds/Badge/Badge";
import { ActionForm } from "@/components/dashboard/ActionForm";
import { Input, Notice, Section, TextArea, ui } from "@/components/dashboard/ui";
import { CairoTime } from "@/components/shell/CairoTime";
import { ageInWords } from "@/lib/connections/age";
import { nowMs } from "@/lib/product/departures";
import { requireOrgRole } from "@/server/auth";
import { connectionsFor, pastePreview, ROUTE_LABEL, type Health } from "@/server/connections/queries";
import { RowTable } from "../../../_connections/RowTable";
import { isUuid } from "../../../sections";
import { applyPaste, createKey, discardPaste, previewPaste, removeFeed, revokeKey, saveFeed } from "./actions";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ orgId: string }>; searchParams: Promise<{ run?: string }> };

const HEALTH_BADGE: Record<Health["state"], { tone: "success" | "danger" | "accent" | "neutral"; text: string }> = {
  ok: { tone: "success", text: "Working" },
  problem: { tone: "danger", text: "Needs attention" },
  waiting: { tone: "accent", text: "Awaiting approval" },
  unused: { tone: "neutral", text: "Not used" },
};
const FEED_STATUS = {
  pending: { tone: "accent", text: "Awaiting Nilecruz approval" },
  active: { tone: "success", text: "Active: pulled every hour" },
  paused: { tone: "danger", text: "Paused by Nilecruz" },
  rejected: { tone: "danger", text: "Not approved" },
} as const;

/** DASH-OPR-016, 024–027: how this company keeps availability and prices current, and how well it is working. */
export default async function InventoryConnections({ params, searchParams }: Props) {
  const { orgId } = await params;
  if (!isUuid(orgId)) notFound();
  await requireOrgRole(orgId, ["owner"], { kind: "operator", returnTo: `/dashboard/operator/${orgId}/inventory/` });
  const sp = await searchParams;
  const [c, run] = await Promise.all([connectionsFor(orgId), sp.run && isUuid(sp.run) ? pastePreview(orgId, sp.run) : null]);
  const now = nowMs();
  const activeKeys = c.keys.filter((k) => !k.revoked_at);
  const formatHref = `/dashboard/operator/${orgId}/inventory/format/`;

  return (
    <>
      <h1 className={ui.pageTitle}>Inventory connections</h1>
      <p>
        Manual entry is always available in{" "}
        <Link href={`/dashboard/operator/${orgId}/schedules/`}>Routes, schedules and rates</Link>. To keep availability and prices
        current from your own system, paste them, let Nilecruz pull a feed every hour, or send them to our API. All three use the{" "}
        <Link href={formatHref}>Nilecruz inventory format v1</Link> and the same checks.
      </p>

      <Section title="Health" id="health">
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
              {c.health.map((h) => (
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
        <p className={ui.muted}>
          Availability from a feed or the API counts as confirmed for 2 hours, pasted or manual availability for 24 hours. Older
          availability is shown to travellers as “to be confirmed” and can’t be reserved.
        </p>
      </Section>

      <Section title="Paste JSON or XML" id="paste">
        {run && run.status === "previewed" ? (
          <>
            <p>
              <strong>{run.label}</strong>: {run.rows_received} rows checked · {run.rows_changed} will change ·{" "}
              {run.rows_unchanged} only re-confirmed · {run.rows_skipped} not applied (Nilecruz has newer data) ·{" "}
              {run.rows_failed} with problems. Nothing has been changed yet.
            </p>
            <RowTable rows={run.results} caption="Preview of the pasted rows" />
            <div className={ui.actions}>
              {run.rows_changed + run.rows_unchanged > 0 ? (
                <ActionForm
                  action={applyPaste.bind(null, orgId, run.id)}
                  submit={`Apply ${run.rows_changed + run.rows_unchanged} row${run.rows_changed + run.rows_unchanged === 1 ? "" : "s"}`}
                />
              ) : null}
              <ActionForm action={discardPaste.bind(null, orgId, run.id)} submit="Discard" variant="ghost" />
            </div>
          </>
        ) : (
          <>
            {run && run.status === "applied" ? (
              <Notice tone={run.rows_failed ? "error" : "success"}>
                Applied: {run.rows_changed} row{run.rows_changed === 1 ? "" : "s"} changed, {run.rows_unchanged} re-confirmed
                {run.rows_skipped ? `, ${run.rows_skipped} not applied` : ""}
                {run.rows_failed ? `, ${run.rows_failed} with problems (listed below)` : ""}.
              </Notice>
            ) : null}
            {run && run.status === "applied" && run.results.length ? <RowTable rows={run.results} caption="Rows that need attention" /> : null}
            <p className={ui.muted}>
              You’ll see every row checked before anything changes. Up to 2 MB or 5,000 rows at a time.
            </p>
            <ActionForm action={previewPaste.bind(null, orgId)} submit="Check the data" encType="multipart/form-data">
              <TextArea label="JSON or XML" name="data" rows={12} hint="In the Nilecruz inventory format v1." />
              <div className={ui.field}>
                <label className={ui.label} htmlFor="inventory-file">
                  Or choose a file (.json or .xml)
                </label>
                <input id="inventory-file" name="file" type="file" accept=".json,.xml,application/json,application/xml,text/xml" />
              </div>
            </ActionForm>
          </>
        )}
      </Section>

      <Section title="Feed" id="feed">
        {c.feed ? (
          <>
            <p className={ui.actions}>
              <Badge tone={FEED_STATUS[c.feed.status].tone}>{FEED_STATUS[c.feed.status].text}</Badge>
              {c.feed.status_reason ? <span>{c.feed.status_reason}</span> : null}
            </p>
            <dl className={ui.grid}>
              <div>
                <dt className={ui.label}>Address</dt>
                <dd className={ui.wrap}>{c.feed.url}</dd>
              </div>
              <div>
                <dt className={ui.label}>Last pull</dt>
                <dd>{c.feed.last_attempt_at ? <CairoTime value={c.feed.last_attempt_at} /> : "Not pulled yet"}</dd>
              </div>
              <div>
                <dt className={ui.label}>Next pull</dt>
                <dd>{c.feed.status === "active" && c.feed.next_pull_at ? <CairoTime value={c.feed.next_pull_at} /> : "—"}</dd>
              </div>
              <div>
                <dt className={ui.label}>Failures in a row</dt>
                <dd>{c.feed.consecutive_failures}</dd>
              </div>
            </dl>
          </>
        ) : (
          <p className={ui.muted}>No feed yet. Nilecruz pulls an approved feed every hour.</p>
        )}
        <ActionForm action={saveFeed.bind(null, orgId)} submit={c.feed ? "Change the address" : "Save and ask for approval"} variant="outline">
          <Input
            label="Feed address"
            name="url"
            type="url"
            required
            defaultValue={c.feed?.url}
            hint="An https:// address on the public internet. A new or changed address needs Nilecruz’s approval before it is pulled."
          />
        </ActionForm>
        {c.feed ? <ActionForm action={removeFeed.bind(null, orgId)} submit="Remove the feed" variant="ghost" /> : null}
      </Section>

      <Section title="API keys" id="api">
        <p>
          Your system signs each request with a private key that only you hold; Nilecruz keeps the matching public key. Two keys
          can be active at once, so you can switch to a new key before revoking the old one. See{" "}
          <Link href={`${formatHref}#signing`}>signing requests</Link>.
        </p>
        {c.keys.length ? (
          <div className={ui.tableWrap}>
            <table className={`${ui.table} ${ui.stack}`}>
              <caption className="visually-hidden">API keys</caption>
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Key ID</th>
                  <th scope="col">Created</th>
                  <th scope="col">Last used</th>
                  <th scope="col">Status</th>
                  <th scope="col">
                    <span className="visually-hidden">Action</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {c.keys.map((k) => (
                  <tr key={k.id}>
                    <th scope="row" data-label="Name">
                      {k.label}
                    </th>
                    <td data-label="Key ID">
                      <code>{k.key_id}</code>
                    </td>
                    <td data-label="Created">
                      <CairoTime value={k.created_at} />
                    </td>
                    <td data-label="Last used">{k.last_used_at ? <CairoTime value={k.last_used_at} /> : "Never"}</td>
                    <td data-label="Status">{k.revoked_at ? <Badge>Revoked</Badge> : <Badge tone="success">Active</Badge>}</td>
                    <td data-label="Action">
                      {k.revoked_at ? null : (
                        <ActionForm action={revokeKey.bind(null, orgId, k.id)} submit={`Revoke ${k.label}`} variant="ghost" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        {activeKeys.length < 2 ? (
          <ActionForm action={createKey.bind(null, orgId)} submit="Create a key" variant="outline" resetOnSuccess>
            <Input label="Key name" name="label" required maxLength={80} hint="The system that will use it, for example “Reservations system”." />
          </ActionForm>
        ) : (
          <p className={ui.muted}>Two keys are active. Revoke one to create another.</p>
        )}
      </Section>

      <Section title="Recent activity" id="activity">
        {c.runs.length ? (
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
                {c.runs.slice(0, 20).map((r) => (
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
        ) : (
          <p className={ui.muted}>Nothing yet. Pastes, feed pulls and API calls will appear here.</p>
        )}
      </Section>
    </>
  );
}
